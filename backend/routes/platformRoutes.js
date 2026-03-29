const express = require("express");
const ai = require("../ai/classifier");

module.exports = function(store) {
  const router = express.Router();

  // === WHATSAPP ROUTES ===
  router.get("/whatsapp/chats", (req, res) => {
    res.json(store.getWhatsAppChats());
  });

  router.post("/whatsapp/chats", (req, res) => {
    const { chats } = req.body;
    if (Array.isArray(chats)) {
      // Process chats through AI engine for urgency detection
      const enhancedChats = chats.map(chat => ({
        ...chat,
        isUrgent: ai.analyzeUrgency(chat.snippet)
      }));
      store.setWhatsAppChats(enhancedChats);
      res.json({ status: "success", count: chats.length });
    } else {
      res.status(400).json({ status: "error", message: "Invalid chats data" });
    }
  });

  router.get("/whatsapp/muted", (req, res) => {
    res.json(store.getMutedWhatsAppChats());
  });

  router.post("/whatsapp/mute", (req, res) => {
    const { name, muteStartTime, muteEndTime, muteDays, muteType } = req.body;
    if (name) {
      store.muteWhatsAppChat(name, { muteStartTime, muteEndTime, muteDays, muteType });
      res.json({ status: "success" });
    } else {
      res.status(400).json({ error: "name required" });
    }
  });

  router.post("/whatsapp/unmute", (req, res) => {
    const { name } = req.body;
    if (name) {
      store.unmuteWhatsAppChat(name);
      res.json({ status: "success" });
    } else {
      res.status(400).json({ error: "name required" });
    }
  });


  // === GMAIL ROUTES ===
  router.get("/gmail/emails", (req, res) => {
    res.json(store.getGmailEmails());
  });

  router.post("/gmail/emails", (req, res) => {
    const { emails } = req.body;
    if (Array.isArray(emails)) {
      store.setGmailEmails(emails);
      res.json({ status: "success", count: emails.length });
    } else {
      res.status(400).json({ status: "error", message: "Invalid emails data" });
    }
  });

  return router;
};
