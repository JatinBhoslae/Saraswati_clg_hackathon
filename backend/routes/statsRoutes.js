// ============================================================
// 📊 STATS ROUTES
// Handles productivity statistics & AI analytics
// ============================================================

const express = require("express");
const router = express.Router();
const {
  calculateProductivityScore,
  generateSummary,
  generateSmartSuggestions,
} = require("../ai/classifier");

module.exports = function (store) {
  // ---------------------------------------------------------
  // GET /api/stats — Get productivity statistics
  // Returns counts, charts data, score, suggestions
  // ---------------------------------------------------------
  router.get("/stats", (req, res) => {
    const logs = store.getLogs();
    const total = logs.length;
    const productive = logs.filter((l) => l.type === "productive").length;
    const distraction = logs.filter((l) => l.type === "distraction").length;
    const neutral = logs.filter((l) => l.type === "neutral").length;
    const blocked = logs.filter((l) => l.action === "blocked").length;

    // Calculate AI productivity score
    const productivityScore = calculateProductivityScore(logs);

    // Activity by hour (for bar chart)
    const activityByHour = {};
    logs.forEach((log) => {
      const hour = new Date(log.timestamp).getHours();
      const label = `${hour.toString().padStart(2, "0")}:00`;
      if (!activityByHour[label]) {
        activityByHour[label] = {
          hour: label,
          productive: 0,
          distraction: 0,
          neutral: 0,
        };
      }
      if (activityByHour[label][log.type] !== undefined) {
        activityByHour[label][log.type]++;
      }
    });

    // Activity by date (for trend chart)
    const activityByDate = {};
    logs.forEach((log) => {
      const date = log.date;
      if (!activityByDate[date]) {
        activityByDate[date] = {
          date,
          productive: 0,
          distraction: 0,
          neutral: 0,
          total: 0,
        };
      }
      if (activityByDate[date][log.type] !== undefined) {
        activityByDate[date][log.type]++;
      }
      activityByDate[date].total++;
    });

    // Top sites
    const siteCounts = {};
    logs.forEach((log) => {
      if (!siteCounts[log.hostname]) {
        siteCounts[log.hostname] = {
          hostname: log.hostname,
          type: log.type,
          count: 0,
        };
      }
      siteCounts[log.hostname].count++;
    });
    const topSites = Object.values(siteCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Focus time calculation
    const focusState = store.getFocusState();
    let currentFocusMs = 0;
    if (focusState.focusMode && focusState.startTime) {
      currentFocusMs = Date.now() - focusState.startTime;
    }
    const totalFocusMinutes = Math.round(
      (focusState.totalTimeMs + currentFocusMs) / 60000
    );

    res.json({
      total,
      productive,
      distraction,
      neutral,
      blocked,
      productivityScore,
      focusMode: focusState.focusMode,
      focusTimeMinutes: totalFocusMinutes,
      activityByHour: Object.values(activityByHour).sort((a, b) =>
        a.hour.localeCompare(b.hour)
      ),
      activityByDate: Object.values(activityByDate).sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
      topSites,
      // Pie chart data
      pieData: [
        { name: "Productive", value: productive, color: "#22c55e" },
        { name: "Distraction", value: distraction, color: "#ef4444" },
        { name: "Neutral", value: neutral, color: "#6366f1" },
      ],
    });
  });

  // ---------------------------------------------------------
  // GET /api/summary — Get AI-generated activity summary
  // Returns a human-readable summary of recent activity
  // ---------------------------------------------------------
  router.get("/summary", (req, res) => {
    const logs = store.getLogs();
    const summary = generateSummary(logs);
    res.json(summary);
  });

  // ---------------------------------------------------------
  // GET /api/suggestions — Get AI smart suggestions
  // Returns personalized productivity tips
  // ---------------------------------------------------------
  router.get("/suggestions", (req, res) => {
    const logs = store.getLogs();
    const focusState = store.getFocusState();

    // Build stats object for the suggestion engine
    const productive = logs.filter((l) => l.type === "productive").length;
    const distraction = logs.filter((l) => l.type === "distraction").length;
    const blocked = logs.filter((l) => l.action === "blocked").length;

    // Top sites
    const siteCounts = {};
    logs.forEach((log) => {
      if (!siteCounts[log.hostname]) {
        siteCounts[log.hostname] = {
          hostname: log.hostname,
          type: log.type,
          count: 0,
        };
      }
      siteCounts[log.hostname].count++;
    });
    const topSites = Object.values(siteCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const stats = {
      total: logs.length,
      productive,
      distraction,
      blocked,
      productivityScore: calculateProductivityScore(logs),
      focusMode: focusState.focusMode,
      topSites,
    };

    const suggestions = generateSmartSuggestions(stats);
    res.json({ suggestions });
  });

  return router;
};
