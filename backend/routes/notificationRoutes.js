const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy-key-for-now");

// In-Memory Notification Queue (Unified Action Layer)
let notifications = [];

module.exports = (userContextRef) => {
  const router = express.Router();

  router.post('/route', async (req, res) => {
    try {
      const { platform, sender, content, metadata } = req.body;
      
      // Construct prompt for Gemini
      const prompt = `
You are an intelligent Notification Router for a productivity assistant.
Your goal is to decide whether an incoming notification should be delivered immediately,
delayed (batched for later), or suppressed based on the user's real-time context.

Current User Context:
${JSON.stringify(userContextRef(), null, 2)}

Incoming Notification:
Platform: ${platform}
Sender: ${sender}
Content: "${content}"

Task:
Analyze the user's context and the urgency/importance of the notification.
Return ONLY a valid JSON object matching this schema:
{
  "decision": "deliver" | "delay" | "suppress",
  "reason": "short explanation of why this decision was made",
  "priority": 1-10 // 10 is highest urgency
}
`;

      let decision = { decision: "deliver", reason: "Direct forward (AI analysis skipped)", priority: 5 };
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        decision = JSON.parse(text);
      } catch (aiError) {
        console.error("⚠️ AI Router Fallback Triggered (Gemini Error):", aiError.message);
        decision = { decision: "deliver", reason: "Fallback logic due to API processing error", priority: 5 };
      }

      console.log(`🧠 AI Notification Decision for [${platform} from ${sender}]: ${decision.decision}`);
      
      const notificationRecord = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        platform,
        sender,
        content,
        metadata: metadata || {},
        decision: decision.decision || "deliver",
        reason: decision.reason,
        priority: decision.priority || 5,
        timestamp: new Date().toISOString(),
        read: false
      };
      
      notifications.unshift(notificationRecord);

      res.json({
        success: true,
        notification: notificationRecord
      });
      
    } catch (error) {
      console.error("AI Notification Router error:", error);
      res.status(500).json({ error: "Failed to process notification routing" });
    }
  });

  // GET all notifications for the Action Center
  router.get('/', (req, res) => {
    res.json({ notifications });
  });

  // Mark notification as read
  router.post('/:id/read', (req, res) => {
    const { id } = req.params;
    const notif = notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      res.json({ success: true, notification: notif });
    } else {
      res.status(404).json({ error: "Notification not found" });
    }
  });

  // Perform quick action
  router.post('/:id/action', (req, res) => {
    const { id } = req.params;
    const { actionType, payload } = req.body; // e.g., 'reply', 'archive'
    
    // In a real implementation this would call Gmail APIs / WhatsApp APIs
    console.log(`⚙️ Executing [${actionType}] on Notification ${id} with payload:`, payload);
    
    // Remove or archive from the queue
    notifications = notifications.filter(n => n.id !== id);
    
    res.json({ success: true, message: `Action ${actionType} executed` });
  });

  return router;
};
