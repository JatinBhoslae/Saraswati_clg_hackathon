const express = require("express");
const router = express.Router();

const PRESET_CONFIGS = {
  work: {
    label: "Work Mode",
    focusMode: true,
    notificationBatchMinutes: 120,
    blockedSites: [
      "youtube.com","instagram.com","twitter.com","x.com","reddit.com",
      "tiktok.com","facebook.com","snapchat.com","pinterest.com","tumblr.com",
      "9gag.com","buzzfeed.com","netflix.com","twitch.tv","primevideo.com"
    ],
    mutedApps: ["whatsapp","instagram","outlook"],
    allowedApps: ["gmail"],
  },
  home: {
    label: "Home Mode",
    focusMode: false,
    notificationBatchMinutes: 30,
    blockedSites: ["tiktok.com","reddit.com","9gag.com"],
    mutedApps: [],
    allowedApps: ["whatsapp","gmail","outlook","instagram"],
  },
  vacation: {
    label: "Vacation Mode",
    focusMode: false,
    notificationBatchMinutes: 0,
    blockedSites: [],
    mutedApps: ["whatsapp","instagram","gmail","outlook"],
    allowedApps: [],
  },
  deepwork: {
    label: "Deep Work",
    focusMode: true,
    notificationBatchMinutes: 240,
    blockedSites: [
      "youtube.com","instagram.com","twitter.com","x.com","reddit.com",
      "tiktok.com","facebook.com","snapchat.com","pinterest.com","tumblr.com",
      "netflix.com","twitch.tv","linkedin.com","news.ycombinator.com","discord.com"
    ],
    mutedApps: ["whatsapp","instagram","outlook"],
    allowedApps: [],
  },
  meeting: {
    label: "Meeting Mode",
    focusMode: false,
    notificationBatchMinutes: 999,
    blockedSites: ["youtube.com","instagram.com","twitter.com","reddit.com","tiktok.com","9gag.com"],
    mutedApps: ["whatsapp","instagram"],
    allowedApps: ["gmail","outlook"],
  },
  student: {
    label: "Student Mode",
    focusMode: true,
    notificationBatchMinutes: 60,
    blockedSites: [
      "youtube.com","instagram.com","twitter.com","reddit.com","tiktok.com",
      "facebook.com","netflix.com","twitch.tv","9gag.com","snapchat.com","discord.com"
    ],
    mutedApps: ["instagram","whatsapp"],
    allowedApps: ["gmail"],
  },
  night: {
    label: "Night Mode",
    focusMode: false,
    notificationBatchMinutes: 0,
    blockedSites: ["reddit.com","twitter.com","x.com"],
    mutedApps: ["gmail","outlook"],
    allowedApps: ["whatsapp"],
  },
  gym: {
    label: "Gym Mode",
    focusMode: true,
    notificationBatchMinutes: 999,
    blockedSites: [
      "youtube.com","instagram.com","twitter.com","reddit.com","tiktok.com",
      "facebook.com","netflix.com","twitch.tv","9gag.com","snapchat.com","discord.com"
    ],
    mutedApps: ["whatsapp","instagram","gmail","outlook"],
    allowedApps: [],
  },
};

const DEFAULT_BLOCKED_SITES = ["youtube.com","instagram.com","twitter.com","reddit.com"];

module.exports = function(store) {

  // GET /api/presets/active
  router.get("/active", (req, res) => {
    const id = store.getActivePreset();
    if (!id) return res.json({ preset: null });
    res.json({ preset: { id, ...PRESET_CONFIGS[id] } });
  });

  // GET /api/presets/list
  router.get("/list", (req, res) => {
    const list = Object.entries(PRESET_CONFIGS).map(([id, cfg]) => ({
      id, label: cfg.label, focusMode: cfg.focusMode,
      blockedSiteCount: cfg.blockedSites.length, mutedApps: cfg.mutedApps,
    }));
    res.json({ presets: list });
  });

  // POST /api/presets/activate
  router.post("/activate", (req, res) => {
    const { presetId } = req.body;
    if (!presetId || !PRESET_CONFIGS[presetId]) {
      return res.status(400).json({ error: "Invalid preset ID", valid: Object.keys(PRESET_CONFIGS) });
    }
    const cfg = PRESET_CONFIGS[presetId];
    store.setCustomSites(cfg.blockedSites);
    store.setFocusMode(cfg.focusMode);
    store.setMutedApps(cfg.mutedApps);
    store.setActivePreset(presetId);
    console.log(`⚡ Preset activated: ${cfg.label}`);
    res.json({ success: true, presetId, applied: cfg });
  });

  // POST /api/presets/deactivate
  router.post("/deactivate", (req, res) => {
    store.setActivePreset(null);
    store.setFocusMode(false);
    store.setCustomSites(DEFAULT_BLOCKED_SITES);
    store.setMutedApps([]);
    res.json({ success: true });
  });

  // GET /api/presets/:id  — config for one preset (used by detail page)
  router.get("/:id", (req, res) => {
    const { id } = req.params;
    if (!PRESET_CONFIGS[id]) return res.status(404).json({ error: "Not found" });
    res.json({ id, ...PRESET_CONFIGS[id], isActive: store.getActivePreset() === id });
  });

  // GET /api/presets/:id/muted-users
  router.get("/:id/muted-users", (req, res) => {
    const { id } = req.params;
    if (!PRESET_CONFIGS[id]) return res.status(404).json({ error: "Not found" });
    res.json({ presetId: id, mutedUsers: store.getMutedUsers(id) });
  });

  // POST /api/presets/:id/mute-user
  // Body: { app: "whatsapp", identifier: "Rahul Sharma" }
  router.post("/:id/mute-user", (req, res) => {
    const { id } = req.params;
    const { app, identifier } = req.body;
    if (!PRESET_CONFIGS[id]) return res.status(404).json({ error: "Not found" });
    if (!app || !identifier) return res.status(400).json({ error: "app and identifier required" });
    store.addMutedUser(id, app, identifier);
    res.json({ success: true, mutedUsers: store.getMutedUsers(id) });
  });

  // POST /api/presets/:id/unmute-user
  router.post("/:id/unmute-user", (req, res) => {
    const { id } = req.params;
    const { app, identifier } = req.body;
    if (!PRESET_CONFIGS[id]) return res.status(404).json({ error: "Not found" });
    store.removeMutedUser(id, app, identifier);
    res.json({ success: true, mutedUsers: store.getMutedUsers(id) });
  });

  return router;
};
