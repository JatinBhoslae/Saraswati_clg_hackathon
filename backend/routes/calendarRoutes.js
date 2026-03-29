const express = require('express');
const { google } = require('googleapis');
const axios = require('axios');
const { GoogleAuth } = require('../models/db');
require('dotenv').config();

const N8N_WEBHOOK_URL = "https://saahilgange.app.n8n.cloud/webhook-test/get-events"; // Test URL from user
const N8N_PROD_URL = "https://saahilgange.app.n8n.cloud/webhook/get-events";

async function syncCalendarToStore(store) {
  try {
    console.log("🕒 Starting Autonomous Multi-Source Sync...");
    
    // 1. Fetch from n8n (Priority Source)
    let n8nEvents = [];
    try {
      // We try the test URL first as requested, then the prod if it fails
      const n8nResponse = await axios.get(N8N_WEBHOOK_URL).catch(() => axios.get(N8N_PROD_URL));
      n8nEvents = n8nResponse.data || [];
      if (!Array.isArray(n8nEvents)) n8nEvents = [n8nEvents];
      console.log(`📡 n8n Sync: Received ${n8nEvents.length} events.`);
    } catch (n8nErr) {
      console.log("⚠️ n8n Webhook unavailable (User might need to click 'Execute' or move to Production). Falling back to Google API.");
    }

    // 2. Fetch from Official Google API (Fallback/Secondary)
    let googleEvents = [];
    const gAuth = await GoogleAuth.findOne();
    if (gAuth) {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_CALENDAR_REDIRECT_URI || "http://localhost:5001/api/calendar/auth/callback"
      );
      oauth2Client.setCredentials({
        access_token: gAuth.accessToken,
        refresh_token: gAuth.refreshToken,
        expiry_date: gAuth.expiryDate
      });
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const gRes = await calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });
      googleEvents = gRes.data.items || [];
    }

    // 3. Unify & Process
    const rawEvents = [...googleEvents, ...n8nEvents];
    const processedEvents = rawEvents.map(e => {
        // Handle both Google API format and possible n8n formats
        const title = e.summary || e.title || e.text || "Synced Event";
        const startRaw = e.start?.dateTime || e.start?.date || e.start || e.startTime;
        const endRaw = e.end?.dateTime || e.end?.date || e.end || e.endTime;
        
        return {
            title,
            start: startRaw,
            end: endRaw,
            type: title.toLowerCase().match(/holiday|leave|off|vacation/) ? "holiday" : 
                  title.toLowerCase().match(/lunch|break/) ? "lunch" : 
                  title.toLowerCase().match(/work|office|project|focus|meeting/) ? "work" : "event"
        };
    });

    store.setCalendarEvents(processedEvents);

    // 4. Materialize Cards
    for (const e of processedEvents) {
      if (!e.start || !e.end) continue;
      const startDate = new Date(e.start);
      const startTimeStr = startDate.toTimeString().slice(0, 5);
      const endTimeStr = new Date(e.end).toTimeString().slice(0, 5);
      const dayName = startDate.toLocaleDateString('en-US', { weekday: 'short' });
      
      const existing = store.getSchedules().find(s => 
        (s.label.includes(e.title)) && s.startTime === startTimeStr && s.days.includes(dayName)
      );
      
      if (!existing) {
        const finalLabel = e.type === 'event' ? `🌀 EXTERNAL: ${e.title}` : e.title;
        await store.addSchedule({
          label: finalLabel,
          startTime: startTimeStr,
          endTime: endTimeStr,
          days: [dayName],
          type: "once",
          isActive: e.type !== 'event',
          priorityKeywords: [], // User will select later
          lunchStartTime: e.type === "lunch" ? startTimeStr : "",
          lunchEndTime: e.type === "lunch" ? endTimeStr : ""
        });
      }
    }
    return { success: true, count: rawEvents.length };
  } catch (err) {
    console.error("Autonomous Sync Error:", err);
    return { error: err.message };
  }
}

module.exports = function(store) {
  const router = express.Router();
  
  // 🔐 DECOUPLED REDIRECT: We use a specific env var to avoid conflict with Gmail
  const REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI || "http://localhost:5001/api/calendar/auth/callback";

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
  
  router.get('/auth', (req, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.readonly', 'email'],
      prompt: 'consent'
    });
    res.redirect(url);
  });

  router.get('/auth/callback', async (req, res) => {
    const { code } = req.query;
    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      const info = await google.oauth2('v2').userinfo.get({ auth: oauth2Client });
      const email = info.data.email;
      await GoogleAuth.findOneAndUpdate({ email }, { 
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
        email
      }, { upsert: true });
      res.redirect('http://localhost:5173/schedule?auth=success');
    } catch (err) {
      res.status(500).send("Authentication failed");
    }
  });

  router.get('/sync', async (req, res) => {
    const result = await syncCalendarToStore(store);
    if (result.error) return res.status(500).json(result);
    res.json(result);
  });

  return router;
};

module.exports.syncCalendarToStore = syncCalendarToStore;
