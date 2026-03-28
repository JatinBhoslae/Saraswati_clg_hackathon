const express = require("express");

module.exports = function(store) {
  const router = express.Router();

  // === WHATSAPP ROUTES ===
  router.get("/whatsapp/chats", (req, res) => {
    res.json(store.getWhatsAppChats());
  });

  router.post("/whatsapp/chats", (req, res) => {
    const { chats } = req.body;
    if (Array.isArray(chats)) {
      store.setWhatsAppChats(chats);
      res.json({ status: "success", count: chats.length });
    } else {
      res.status(400).json({ status: "error", message: "Invalid chats data" });
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
