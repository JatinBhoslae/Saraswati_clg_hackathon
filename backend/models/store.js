// ============================================================
// 💾 IN-MEMORY DATA STORE
// Context-Aware Productivity Assistant
// ============================================================
// Centralized data store for logs, focus mode state, etc.
// In production, replace with MongoDB/PostgreSQL.
// ============================================================

const { ActivityLog, CustomSite } = require("./db");

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
let customBlockedSites = [];

// Initialization - Load from DB
async function initStore() {
  try {
    const logs = await ActivityLog.find().sort({ timestamp: -1 }).limit(MAX_LOGS).lean();
    activityLogs = logs.reverse(); // oldest to newest in array

    const sites = await CustomSite.find().lean();
    if (sites.length === 0) {
      // Default sites if DB is fully empty
      const defaultSites = ["youtube.com", "instagram.com", "twitter.com", "reddit.com"];
      customBlockedSites = defaultSites;
      await CustomSite.insertMany(defaultSites.map(s => ({ site: s })));
    } else {
      customBlockedSites = sites.map((s) => s.site);
    }
    console.log("✅ Store synced successfully with MongoDB");
  } catch (err) {
    console.error("🔴 Failed to sync store from MongoDB", err);
  }
}

// Call initStore immediately on backend boot
initStore();

// -----------------------------------------------------------
// 💬 Platform Specific Data
// -----------------------------------------------------------
let whatsappChats = [];
let gmailEmails = [];

// -----------------------------------------------------------
// 🏆 Gamification Engine State
// -----------------------------------------------------------
let xp = 0;
let level = 1;
let dailyStreak = 0;
let lastActiveDate = null;
let achievements = [];
let gmailTokens = null;

// Achievement definitions
const ACHIEVEMENT_LIST = [
  { id: "focus_1h", title: "Unstoppable", desc: "1 hour of continuous focus", icon: "⭐" },
  { id: "distr_0", title: "Clean Slate", desc: "No distractions for 2 hours", icon: "🛡️" },
  { id: "streak_7", title: "Weekly Warrior", desc: "7-day focus streak", icon: "🔥" },
];

/** Calculate Level based on XP (standard RPG curve) */
function calculateLevel(currentXp) {
  return Math.floor(Math.sqrt(currentXp / 100)) + 1;
}

// -----------------------------------------------------------
// 📤 STORE API
// -----------------------------------------------------------
const store = {
  // === LOG OPERATIONS ===

  /** Add a log entry to the store and award XP */
  addLog(logEntry) {
    const fullLog = { ...logEntry, timestamp: new Date() };
    activityLogs.push(fullLog);
    
    // Award XP based on productivity
    if (logEntry.type === "productive") {
      this.addXP(10);
    }
    
    // Non-blocking Write-Through to DB
    ActivityLog.create(fullLog).catch(err => console.error("DB Error saving log:", err));

    // Auto-trim to prevent memory issues
    if (activityLogs.length > MAX_LOGS) {
      // Memory cleanup, we let DB keep history
      activityLogs = activityLogs.slice(-MAX_LOGS);
    }

    this.updateStreak();
  },

  /** Update daily streak logic */
  updateStreak() {
    const today = new Date().toISOString().split('T')[0];
    if (lastActiveDate !== today) {
      if (lastActiveDate) {
        const lastDate = new Date(lastActiveDate);
        const diff = Math.floor((new Date(today) - lastDate) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          dailyStreak += 1;
        } else if (diff > 1) {
          dailyStreak = 1;
        }
      } else {
        dailyStreak = 1;
      }
      lastActiveDate = today;
    }
  },

  addXP(amount) {
    xp += amount;
    const newLevel = calculateLevel(xp);
    if (newLevel > level) {
      level = newLevel;
      // You could trigger a notification here if we had sockets
    }
  },

  /** Get all logs (returns reference — treat as read-only) */
  getLogs() {
    return activityLogs;
  },

  /** Clear all logs */
  clearLogs() {
    activityLogs = [];
    ActivityLog.deleteMany({}).catch(() => {});
  },

  // === GAMIFICATION ACCESSORS ===
  getGamificationStats() {
    return {
      xp,
      level,
      dailyStreak,
      achievements,
      nextLevelXp: Math.pow(level, 2) * 100,
      availableAchievements: ACHIEVEMENT_LIST
    };
  },

  // === PLATFORM OPERATIONS ===
  setWhatsAppChats(chats) {
    whatsappChats = chats;
  },
  getWhatsAppChats() {
    return whatsappChats;
  },
  setGmailEmails(emails) {
    gmailEmails = emails;
  },
  getGmailEmails() {
    return gmailEmails;
  },
  setGmailTokens(tokens) {
    gmailTokens = tokens;
  },
  getGmailTokens() {
    return gmailTokens;
  },

  // === FOCUS MODE OPERATIONS ===

  /** Set focus mode on/off and track time */
  setFocusMode(newMode) {
    if (newMode && !focusMode) {
      focusModeStartTime = Date.now();
      this.addXP(5); // Reward for starting focus
    } else if (!newMode && focusMode && focusModeStartTime) {
      // Ending focus mode — accumulate time
      const sessionMs = Date.now() - focusModeStartTime;
      totalFocusTimeMs += sessionMs;
      
      // Reward deep work time (1 XP per minute)
      this.addXP(Math.floor(sessionMs / 60000));
      focusModeStartTime = null;
    }
    focusMode = newMode;
  },

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
      CustomSite.create({ site }).catch(err => console.error("DB Error saving site:", err));
    }
  },

  removeCustomSite(site) {
    customBlockedSites = customBlockedSites.filter((s) => s !== site);
    CustomSite.deleteOne({ site }).catch(() => {});
  },

  reset() {
    activityLogs = [];
    focusMode = false;
    focusModeStartTime = null;
    totalFocusTimeMs = 0;
    customBlockedSites = [];
    ActivityLog.deleteMany({}).catch(() => {});
    CustomSite.deleteMany({}).catch(() => {});
  },
};

module.exports = store;


