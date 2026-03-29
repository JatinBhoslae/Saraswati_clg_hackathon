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
      const cleanContent = (content || "").toLowerCase().trim();
      const cleanSender = (sender || "").toLowerCase().trim();

      const priorityKeywords = store.getPriorityKeywords() || [];
      const bossKeywords = ["boss", "manager", "team lead", "urgent", "meeting", "call"];
      
      const activeMode = store.getCurrentMode();
      const automationActive = activeMode.includes("Office Mode");
      const focusActive = activeMode.includes("Focus Mode");
      
      let decision = { decision: "deliver", reason: "normal", status: "allowed", mode: "normal", priority: 5 };

      // 🆘 STAGE 0: URGENCY DETECTION (Message-Level Override)
      const detectUrgency = (text) => {
        if (!text) return false;
        // Normalize: lowercase + remove punctuation
        const normalized = text.toLowerCase().replace(/[^\w\s]/g, "");
        const urgentKws = ["urgent", "emergency", "asap", "immediately", "right now", "call me", "important", "fast", "as soon as possible", "plz call now", "call now", "urgent!!"];
        return urgentKws.some(kw => normalized.includes(kw.replace(/[^\w\s]/g, "")));
      };

      const isUrgentMsg = detectUrgency(content);
      const isPriority = priorityKeywords.some(kw => cleanContent.includes(kw.toLowerCase()) || cleanSender.includes(kw.toLowerCase()));
      // Boss keys only pierce the shield during an active scheduler block (Office Mode)
      const isBoss = automationActive && bossKeywords.some(kw => cleanContent.includes(kw) || cleanSender.includes(kw));

      if (isUrgentMsg || isPriority || isBoss) {
        decision = { 
          decision: "deliver", 
          reason: isUrgentMsg ? "urgent" : (isBoss ? "boss" : "priority"), 
          status: "allowed", 
          mode: automationActive ? "automation" : focusActive ? "focus" : "normal",
          priority: isUrgentMsg ? 10 : 8
        };
      } 
      // 🛑 STAGE 2: RESTRICTIVE MODE ENFORCEMENT
      else if (automationActive || focusActive) {
        decision = { 
          decision: "delay", 
          reason: "distraction", 
          status: "blocked", 
          mode: automationActive ? "automation" : "focus",
          priority: 3
        };
      } 
      // 🎭 STAGE 3: INTELLIGENT ROUTING (Normal Mode)
      else {
        try {
          const prompt = `
            You are an intelligent notification router. My current state is: ${activeMode}.
            Return JSON: { "decision": "deliver" | "delay" | "suppress", "reason": "reason", "priority": 1-10 }
            
            NOTIFICATION: From: ${sender}, Platform: ${platform}, Content: ${content}
          `;
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
          const result = await model.generateContent(prompt);
          const aiResponse = JSON.parse(result.response.text());
          
          decision = {
            decision: aiResponse.decision || "deliver",
            reason: aiResponse.reason || "normal",
            status: aiResponse.decision === "deliver" ? "allowed" : "blocked",
            mode: "normal",
            priority: aiResponse.priority || 5
          };
        } catch (aiError) {
          console.error("⚠️ AI Fallback:", aiError.message);
          decision = { decision: "deliver", reason: "fallback", status: "allowed", mode: "normal", priority: 5 };
        }
      }

      console.log(`🧠 Router [${activeMode}]: ${decision.status.toUpperCase()} (${decision.reason}) from ${sender}`);

      const notification = await NotificationRecord.create({
        platform,
        sender,
        content,
        metadata: { ...metadata, mode: decision.mode, status: decision.status, reason: decision.reason },
        decision: decision.decision,
        reason: decision.reason,
        priority: decision.priority || 5,
        timestamp: new Date(),
        read: false
      });
      
      res.json({ success: true, notification });
      
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
