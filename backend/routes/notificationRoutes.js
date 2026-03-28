const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const { NotificationRecord } = require('../models/db');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy-key-for-now");

// Unified Action Layer (Dashboard Action Center)

module.exports = (store) => {
  const router = express.Router();

  router.post('/route', async (req, res) => {
    try {
      const { platform, sender, content, metadata } = req.body;
      let decision;
      // Fallback/Hard-Heuristic Match (Seniors Spec Step 4)
      const priorityList = store.getPriorityKeywords() || [];
      const userContext = store.getFocusState();
      
      const isUrgent = priorityList.some(kw => 
        (content || "").toLowerCase().includes(kw.toLowerCase()) || 
        (sender || "").toLowerCase().includes(kw.toLowerCase())
      ) || ["mom", "dad", "urgent", "call", "asap", "meeting", "interview"].some(u => 
        (content || "").toLowerCase().includes(u) || (sender || "").toLowerCase().includes(u)
      );

      const activeMode = store.getCurrentMode();

      if (isUrgent) {
        decision = { decision: "deliver", reason: "Family priority or urgent keyword detected by engine", priority: 10 };
      } else {
        const prompt = `
          You are an intelligent notification router. I am currently in ${activeMode}.
          Identify if this notification is from a priority contact or vital for work.
          
          CRITICAL RULES:
          1. If the content contains "reel", "post", or an instagram/tiktok link -> delay
          2. If it's a "Promotion", "Newsletter", or "Junk" email -> suppress (delay)
          3. If it's from Google Meet, Teams, Slack, or an 'Office' group -> deliver
          4. If it's lunch break (${activeMode.includes('Lunch')}), deliver more casual content but still delay reels.
          
          Return JSON: { "decision": "deliver" | "delay" | "suppress", "reason": "reason", "priority": 1-10 }
          
          NOTIFICATION:
          From: ${sender}
          Platform: ${platform}
          Content: ${content}
        `;
        try {
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
          const result = await model.generateContent(prompt);
          const text = result.response.text();
          decision = JSON.parse(text);
        } catch (aiError) {
          console.error("⚠️ AI Router Fallback Triggered (Gemini Error):", aiError.message);
          decision = { decision: "deliver", reason: "Fallback logic due to AI service unavailability", priority: 5 };
        }
      }

      console.log(`🧠 AI Notification Decision for [${platform} from ${sender}]: ${decision.decision}`);
      
      const notification = await NotificationRecord.create({
        platform,
        sender,
        content,
        metadata: metadata || {},
        decision: decision.decision || "deliver",
        reason: decision.reason,
        priority: decision.priority || 5,
        timestamp: new Date(),
        read: false
      });
      
      res.json({
        success: true,
        notification
      });
      
    } catch (error) {
      console.error("AI Notification Router error:", error);
      res.status(500).json({ error: "Failed to process notification routing" });
    }
  });

  // GET all notifications for the Action Center
  router.get('/', async (req, res) => {
    try {
      const notifications = await NotificationRecord.find().sort({ timestamp: -1 }).limit(50).lean();
      res.json({ notifications });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Mark notification as read
  router.post('/:id/read', async (req, res) => {
    const { id } = req.params;
    try {
      const notification = await NotificationRecord.findByIdAndUpdate(id, { read: true }, { new: true });
      if (notification) {
        res.json({ success: true, notification });
      } else {
        res.status(404).json({ error: "Notification not found" });
      }
    } catch (err) {
      res.status(500).json({ error: "Update failed" });
    }
  });

  // Perform quick action
  router.post('/:id/action', async (req, res) => {
    const { id } = req.params;
    const { actionType, payload } = req.body; // e.g., 'reply', 'archive'
    
    try {
      console.log(`⚙️ Executing [${actionType}] on Notification ${id} with payload:`, payload);
      // Remove or archive from the queue
      await NotificationRecord.findByIdAndDelete(id);
      res.json({ success: true, message: `Action ${actionType} executed` });
    } catch (err) {
      res.status(500).json({ error: "Action failed" });
    }
  });

  return router;
};
