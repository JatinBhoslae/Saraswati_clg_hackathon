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
 let activePresetId = null;
 let mutedApps = [];
 let mutedUsersByPreset = {};  // shape: { work: { whatsapp: ["Rahul"], gmail: ["boss@work.com"] }, home: {} }

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
// 💬 Platform Specific Data
// -----------------------------------------------------------
let whatsappChats = [];
let mutedWhatsAppChatNames = []; // Global list of chat names muted from dashboard
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
    activityLogs.push(logEntry);
    
    // Award XP based on productivity
    if (logEntry.type === "productive") {
      this.addXP(10);
    } else if (logEntry.type === "distraction") {
      // Small penalty or no XP
    }

    // Auto-trim to prevent memory issues
    if (activityLogs.length > MAX_LOGS) {
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
  getMutedWhatsAppChats() {
    return mutedWhatsAppChatNames;
  },
  muteWhatsAppChat(name) {
    if (!mutedWhatsAppChatNames.includes(name)) {
      mutedWhatsAppChatNames.push(name);
    }
  },
  unmuteWhatsAppChat(name) {
    mutedWhatsAppChatNames = mutedWhatsAppChatNames.filter(n => n !== name);
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
      // Starting focus mode
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

  // Preset
  getActivePreset() { return activePresetId; },
  setActivePreset(id) { activePresetId = id; },

  // Muted Apps
  getMutedApps() { return mutedApps; },
  setMutedApps(arr) { mutedApps = Array.isArray(arr) ? arr : []; },

  // Muted Users per Preset
  getMutedUsers(presetId) {
    return mutedUsersByPreset[presetId] || {};
  },
  addMutedUser(presetId, app, identifier) {
    if (!mutedUsersByPreset[presetId]) mutedUsersByPreset[presetId] = {};
    if (!mutedUsersByPreset[presetId][app]) mutedUsersByPreset[presetId][app] = [];
    if (!mutedUsersByPreset[presetId][app].includes(identifier)) {
      mutedUsersByPreset[presetId][app].push(identifier);
    }
  },
  removeMutedUser(presetId, app, identifier) {
    if (mutedUsersByPreset[presetId]?.[app]) {
      mutedUsersByPreset[presetId][app] = mutedUsersByPreset[presetId][app].filter(u => u !== identifier);
    }
  },

  // === UTILS ===

  /** Reset everything (useful for testing) */
  reset() {
    activityLogs = [];
    focusMode = false;
    focusModeStartTime = null;
    totalFocusTimeMs = 0;
    customBlockedSites = [];
    activePresetId = null;
    mutedApps = [];
    mutedUsersByPreset = {};
  },
};

module.exports = store;
