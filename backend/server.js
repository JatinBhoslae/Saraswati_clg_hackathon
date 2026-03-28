// ============================================================
// 🖥️ BACKEND SERVER
// Context-Aware Productivity Assistant
// ============================================================
// Express.js server that:
// 1. Receives activity logs from the Chrome extension
// 2. Stores them in-memory (MVP) — modular store
// 3. Provides APIs for the dashboard to fetch stats & logs
// 4. AI-powered classification, scoring & suggestions
// ============================================================

const express = require("express");
const cors = require("cors");

// Import modular components
const store = require("./models/store");
const logRoutes = require("./routes/logRoutes");
const statsRoutes = require("./routes/statsRoutes");
const focusRoutes = require("./routes/focusRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const notificationRoutes = require("./routes/notificationRoutes");

const app = express();
const PORT = process.env.PORT || 5001;

// -----------------------------------------------------------
// 🔧 MIDDLEWARE
// -----------------------------------------------------------
app.use(cors()); // Allow cross-origin requests from extension & dashboard
app.use(express.json()); // Parse JSON request bodies

// -----------------------------------------------------------
// 📤 API ROUTES (modular)
// -----------------------------------------------------------

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "✅ Productivity Assistant Backend is running!",
    version: "2.0.0",
    endpoints: {
      "POST /api/log": "Save an activity log",
      "GET /api/logs": "Get all activity logs (query: limit, type, action, date)",
      "GET /api/stats": "Get productivity statistics & chart data",
      "GET /api/summary": "Get AI-generated activity summary",
      "GET /api/suggestions": "Get AI smart suggestions",
      "POST /api/focus": "Toggle focus mode",
      "GET /api/focus": "Get focus mode status",
      "GET /api/custom-sites": "Get custom blocked sites",
      "POST /api/custom-sites": "Add custom blocked site",
      "DELETE /api/custom-sites": "Remove custom blocked site",
    },
  });
});

// Mount modular routes
app.use("/api", logRoutes(store));
app.use("/api", statsRoutes(store));
app.use("/api", focusRoutes(store));
app.use("/api", settingsRoutes(store));
app.use("/api/notifications", notificationRoutes(() => userContext));

// -----------------------------------------------------------
// 🧠 GLOBAL CONTEXT STORE (Context Engine)
// -----------------------------------------------------------
let userContext = {
  activityLevel: 'Idle',
  inMeeting: false,
  deepWork: false,
  currentTask: 'Unknown',
  lastUpdated: new Date().toISOString()
};

app.post("/api/context", (req, res) => {
  const { activityLevel, inMeeting, deepWork, currentTask } = req.body;
  userContext = {
    ...userContext,
    activityLevel: activityLevel !== undefined ? activityLevel : userContext.activityLevel,
    inMeeting: inMeeting !== undefined ? inMeeting : userContext.inMeeting,
    deepWork: deepWork !== undefined ? deepWork : userContext.deepWork,
    currentTask: currentTask !== undefined ? currentTask : userContext.currentTask,
    lastUpdated: new Date().toISOString()
  };
  console.log("🧠 Context Engine Updated:", userContext);
  res.json({ success: true, context: userContext });
});

app.get("/api/context", (req, res) => {
  res.json({ context: userContext });
});

// -----------------------------------------------------------
// 🔕 PLATFORM MUTE RULES (in-memory, dashboard ↔ extension bridge)
// -----------------------------------------------------------
const muteRules = {};

app.post("/api/mute-rules", (req, res) => {
  const { platform, config } = req.body;
  if (!platform) return res.status(400).json({ error: "platform required" });
  muteRules[platform] = { ...(muteRules[platform] || {}), ...config, updatedAt: new Date().toISOString() };
  console.log(`🔕 Mute rule [${platform}] updated:`, config);
  res.json({ success: true, platform, rules: muteRules[platform] });
});

app.get("/api/mute-rules", (req, res) => {
  res.json({ rules: muteRules });
});

app.get("/api/mute-rules/:platform", (req, res) => {
  const { platform } = req.params;
  res.json({ platform, rules: muteRules[platform] || {} });
});

// -----------------------------------------------------------
// ❌ 404 Handler
// -----------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    hint: "Visit / to see all available endpoints",
  });
});

// -----------------------------------------------------------
// 🚀 START SERVER
// -----------------------------------------------------------
app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════════════════════╗
  ║  🧠 Context-Aware Productivity Assistant — Backend v2.0  ║
  ║  📡 API:       http://localhost:${PORT}                      ║
  ║  📊 Dashboard: http://localhost:5173                      ║
  ║  🤖 AI:        Classifier + Scorer + Suggestions active   ║
  ╚════════════════════════════════════════════════════════════╝
  `);
});
