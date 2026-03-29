const express = require("express");
const router = express.Router();
const store = require("../models/store");

// -----------------------------------------------------------
// 📸 INSTAGRAM REAL-TIME API
// -----------------------------------------------------------

/** 📤 POST — Ingest scraped chats from Extension (content.js) */
router.post("/chats", (req, res) => {
  const { chats } = req.body;
  if (!chats || !Array.isArray(chats)) return res.status(400).json({ error: "Invalid data" });

  console.log(`📸 [Sync] Received ${chats.length} real Instagram threads.`);
  store.setInstagramChats(chats);
  res.json({ success: true, count: chats.length });
});

/** 📥 GET — Fetch persistent chats for Dashboard UI */
router.get("/chats", (req, res) => {
  const chats = store.getInstagramChats();
  res.json({ chats });
});

/** 🔊 GET — Fetch calculated active mute list */
router.get("/muted", (req, res) => {
  res.json(store.getMutedInstagramChats());
});

/** 🔕 POST — Set schedule/mute for an Instagram chat */
router.post("/mute", (req, res) => {
  const { name, muteStartTime, muteEndTime, muteDays, muteType } = req.body;
  if (name) {
    store.muteInstagramChat(name, { muteStartTime, muteEndTime, muteDays, muteType });
    res.json({ success: true });
  } else {
    res.status(400).json({ error: "name required" });
  }
});

/** 🔊 POST — Clear mute for an Instagram chat */
router.post("/unmute", (req, res) => {
  const { name } = req.body;
  if (name) {
    store.unmuteInstagramChat(name);
    res.json({ success: true });
  } else {
    res.status(400).json({ error: "name required" });
  }
});

module.exports = router;
