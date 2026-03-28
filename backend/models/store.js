// ============================================================
// 💾 IN-MEMORY DATA STORE
// Context-Aware Productivity Assistant
// ============================================================
// Centralized data store for logs, focus mode state, etc.
// In production, replace with MongoDB/PostgreSQL.
// ============================================================

const MAX_LOGS = 1000; // Prevent memory overflow

// -----------------------------------------------------------
// 📋 Activity Logs Storage
// -----------------------------------------------------------
let activityLogs = [];

// -----------------------------------------------------------
// 🎯 Focus Mode State
// -----------------------------------------------------------
let focusMode = false;
let focusModeStartTime = null;
let totalFocusTimeMs = 0;

// -----------------------------------------------------------
// 🛑 Custom Blocked Sites
// -----------------------------------------------------------
let customBlockedSites = [
  "youtube.com",
  "instagram.com",
  "twitter.com",
  "reddit.com",
];

// -----------------------------------------------------------
// 📤 STORE API
// -----------------------------------------------------------
const store = {
  // === LOG OPERATIONS ===

  /** Add a log entry to the store */
  addLog(logEntry) {
    activityLogs.push(logEntry);
    // Auto-trim to prevent memory issues
    if (activityLogs.length > MAX_LOGS) {
      activityLogs = activityLogs.slice(-MAX_LOGS);
    }
  },

  /** Get all logs (returns reference — treat as read-only) */
  getLogs() {
    return activityLogs;
  },

  /** Clear all logs */
  clearLogs() {
    activityLogs = [];
  },

  // === FOCUS MODE OPERATIONS ===

  /** Set focus mode on/off and track time */
  setFocusMode(newMode) {
    if (newMode && !focusMode) {
      // Starting focus mode
      focusModeStartTime = Date.now();
    } else if (!newMode && focusMode && focusModeStartTime) {
      // Ending focus mode — accumulate time
      totalFocusTimeMs += Date.now() - focusModeStartTime;
      focusModeStartTime = null;
    }
    focusMode = newMode;
  },

  /** Get current focus state */
  getFocusState() {
    return {
      focusMode,
      startTime: focusModeStartTime,
      totalTimeMs: totalFocusTimeMs,
    };
  },

  // === CUSTOM SITES OPERATIONS ===
  getCustomSites() {
    return customBlockedSites;
  },

  setCustomSites(sitesArray) {
    customBlockedSites = sitesArray;
  },

  addCustomSite(site) {
    if (!customBlockedSites.includes(site)) {
      customBlockedSites.push(site);
    }
  },

  removeCustomSite(site) {
    customBlockedSites = customBlockedSites.filter((s) => s !== site);
  },

  // === UTILS ===

  /** Reset everything (useful for testing) */
  reset() {
    activityLogs = [];
    focusMode = false;
    focusModeStartTime = null;
    totalFocusTimeMs = 0;
    customBlockedSites = [];
  },
};

module.exports = store;

