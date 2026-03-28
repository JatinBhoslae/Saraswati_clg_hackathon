// ============================================================
// 📤 LOG ROUTES
// Handles activity log CRUD operations
// ============================================================

const express = require("express");
const router = express.Router();
const { classifySite } = require("../ai/classifier");

// -----------------------------------------------------------
// The log store is passed in via factory function
// This keeps routes modular & testable
// -----------------------------------------------------------
module.exports = function (store) {
  // ---------------------------------------------------------
  // POST /api/log — Save an activity log
  // Body: { url, type?, action?, timestamp? }
  // If type is not provided, AI classifier determines it
  // ---------------------------------------------------------
  router.post("/log", (req, res) => {
    const { url, type, action, timestamp } = req.body;

    // Validate required fields
    if (!url) {
      return res.status(400).json({ error: "url is required" });
    }

    // Extract hostname for cleaner display
    let hostname = url;
    try {
      hostname = new URL(url).hostname.replace("www.", "");
    } catch (e) {
      // If URL is malformed, use as-is
    }

    // Use AI classifier if type not provided
    let classifiedType = type;
    if (!classifiedType) {
      // 1st priority: Check user's custom blocked sites
      const customSites = store.getCustomSites() || [];
      const isCustomBlocked = customSites.some((s) => hostname.includes(s));
      if (isCustomBlocked) {
        classifiedType = "distraction";
      } else {
        // 2nd priority: Baseline AI classifier rules
        classifiedType = classifySite(url);
      }
    }

    // Create log entry with unique ID
    const logEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 7),
      url,
      hostname,
      type: classifiedType,
      action: action || "allowed",
      timestamp: timestamp || new Date().toISOString(),
      date: new Date(timestamp || Date.now()).toLocaleDateString(),
      time: new Date(timestamp || Date.now()).toLocaleTimeString(),
    };

    // Store in memory
    store.addLog(logEntry);

    console.log(
      `📝 Log: ${logEntry.hostname} [${logEntry.type}] → ${logEntry.action}`
    );
    res.status(201).json({ success: true, log: logEntry });
  });

  // ---------------------------------------------------------
  // GET /api/logs — Get all activity logs
  // Query params: ?limit=50&type=productive&action=blocked&date=...
  // ---------------------------------------------------------
  router.get("/logs", (req, res) => {
    let logs = [...store.getLogs()].reverse(); // Most recent first

    // Filter by type
    if (req.query.type) {
      logs = logs.filter((log) => log.type === req.query.type);
    }

    // Filter by action
    if (req.query.action) {
      logs = logs.filter((log) => log.action === req.query.action);
    }

    // Filter by date
    if (req.query.date) {
      logs = logs.filter((log) => log.date === req.query.date);
    }

    // Limit results
    const limit = parseInt(req.query.limit) || 100;
    logs = logs.slice(0, limit);

    res.json({
      total: store.getLogs().length,
      returned: logs.length,
      logs,
    });
  });

  return router;
};
