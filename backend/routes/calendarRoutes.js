const express = require('express');
const { google } = require('googleapis');
const { GoogleAuth } = require('../models/db');
require('dotenv').config();

module.exports = function(store) {
  const router = express.Router();

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:5001/api/calendar/auth/callback"
  );

  // URL for OAuth Login
  router.get('/auth', (req, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.readonly', 'email']
    });
    res.redirect(url);
  });

  // Callback after Google Login
  router.get('/auth/callback', async (req, res) => {
    const { code } = req.query;
    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Save/Update tokens in DB
      const info = await google.oauth2('v2').userinfo.get({ auth: oauth2Client });
      const email = info.data.email;

      await GoogleAuth.findOneAndUpdate(
        { email },
        { 
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiryDate: tokens.expiry_date,
          email
        },
        { upsert: true }
      );

      // Redirect back to dashboard UI
      res.redirect('http://localhost:5173/schedule?auth=success');
    } catch (err) {
      console.error("Google Auth Callback Error:", err);
      res.status(500).send("Authentication failed");
    }
  });

  // Fetch today's events and update store
  router.get('/sync', async (req, res) => {
    try {
      const auth = await GoogleAuth.findOne();
      if (!auth) {
        return res.status(401).json({ error: "No Google account linked" });
      }

      oauth2Client.setCredentials({
        access_token: auth.accessToken,
        refresh_token: auth.refreshToken,
        expiry_date: auth.expiryDate
      });

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const now = new Date();
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];
      const processedEvents = events.map(e => ({
        title: e.summary || "No Title",
        start: e.start.dateTime || e.start.date,
        end: e.end.dateTime || e.end.date,
        type: (e.summary || "").toLowerCase().match(/holiday|leave|off|vacation/) ? "holiday" : 
              (e.summary || "").toLowerCase().includes("lunch") ? "lunch" : 
              (e.summary || "").toLowerCase().includes("work") ? "work" : "event"
      }));
      
      store.setCalendarEvents(processedEvents);

      // --- New: Materialize into DB Schedules ---
      for (const e of processedEvents) {
        if (e.type === "work" || e.type === "lunch") {
          const startTimeStr = new Date(e.start).toTimeString().slice(0, 5);
          const endTimeStr = new Date(e.end).toTimeString().slice(0, 5);
          const dayName = new Date(e.start).toLocaleDateString('en-US', { weekday: 'short' });
          
          // Check if similar schedule already exists to avoid duplicates
          const existing = store.getSchedules().find(s => 
            s.label === e.title && s.startTime === startTimeStr && s.days.includes(dayName)
          );
          
          if (!existing) {
            await store.addSchedule({
              label: e.title,
              startTime: startTimeStr,
              endTime: endTimeStr,
              days: [dayName],
              type: "once",
              lunchStartTime: e.type === "lunch" ? startTimeStr : "",
              lunchEndTime: e.type === "lunch" ? endTimeStr : ""
            });
          }
        }
      }
      
      res.json({ 
        success: true, 
        count: events.length,
        processed: processedEvents 
      });
    } catch (err) {
      console.error("Calendar Sync Error:", err);
      res.status(500).json({ error: "Failed to sync calendar" });
    }
  });

  return router;
};
