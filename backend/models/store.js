// ============================================================
// 💾 IN-MEMORY DATA STORE
// Context-Aware Productivity Assistant
// ============================================================
// Centralized data store for logs, focus mode state, etc.
// In production, replace with MongoDB/PostgreSQL.
// ============================================================

const { 
  ActivityLog, 
  CustomSite, 
  PriorityKeyword, 
  UserSettings, 
  NotificationRecord,
  Schedule,
  GoogleAuth,
  WhatsAppChat,
  GmailEmail
} = require("./db");

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
let manualOverride = false;
let activePresetId = null;
 let mutedApps = [];
 let mutedUsersByPreset = {};  // shape: { work: { whatsapp: ["Rahul"], gmail: ["boss@work.com"] }, home: {} }

// -----------------------------------------------------------
// 🛑 Custom Blocked Sites & Keywords
// -----------------------------------------------------------
let customBlockedSites = [];
let priorityKeywords = [];

// 📅 Scheduler & Calendar State
let schedules = [];
let schedulerEnabled = true;
let todayCalendarEvents = [];
let calendarLastUpdated = null;

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

    const kw = await PriorityKeyword.find().lean();
    priorityKeywords = kw.map((k) => k.keyword);

    // Sync Gamification & Focus Mode
    let settings = await UserSettings.findOne().lean();
    if (!settings) {
      settings = await UserSettings.create({ focusMode: false, xp: 0, level: 1 });
    }
    
    focusMode = settings.focusMode || false;
    xp = settings.xp || 0;
    level = settings.level || 1;
    dailyStreak = settings.dailyStreak || 0;
    lastActiveDate = settings.lastActiveDate || null;
    totalFocusTimeMs = settings.totalFocusTimeMs || 0;
    manualOverride = settings.manualOverride || false;
    achievements = settings.achievements || [];

    const sch = await Schedule.find().lean();
    schedules = sch;

    const wa = await WhatsAppChat.find().sort({ lastSynced: -1 }).limit(50).lean();
    whatsappChats = wa;

    const gm = await GmailEmail.find().sort({ lastSynced: -1 }).limit(50).lean();
    gmailEmails = gm.map(e => ({
      ...e,
      time: e.time || new Date(e.lastSynced).toLocaleTimeString()
    }));

    console.log("✅ Store synced successfully with MongoDB (WA/GM persistent)");
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

/** Helper: Time string "HH:MM" to total minutes */
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

/** Helper: Check if current time is within HH:MM range */
function isWithinTimeRange(start, end) {
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const startMins = timeToMinutes(start);
  const endMins = timeToMinutes(end);
  return currentMins >= startMins && currentMins <= endMins;
}

/** Helper: Check if current day is in valid list (Mon-Sun) */
function isValidDay(days) {
  if (!days || days.length === 0) return true;
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const currentDay = dayNames[new Date().getDay()];
  return days.includes(currentDay);
}

/** Helper: Check for holidays in list of event strings */
function isHoliday(events) {
  if (!events || !Array.isArray(events)) return false;
  const keywords = ["holiday", "leave", "vacation", "off", "out of office", "ooo"];
  return events.some(e => {
    const text = e.toLowerCase();
    return keywords.some(kw => text.includes(kw));
  });
}

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
    const today = new Date().toISOString().split('T')[0];
    const fullLog = { ...logEntry, timestamp: new Date(), date: today };
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
      UserSettings.findOneAndUpdate({}, { dailyStreak, lastActiveDate }, { upsert: true }).catch(() => {});
    }
  },

  async addXP(amount) {
    xp += amount;
    const newLevel = calculateLevel(xp);
    if (newLevel > level) {
      level = newLevel;
    }
    UserSettings.findOneAndUpdate({}, { xp, level }, { upsert: true }).catch(() => {});
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
    // Persist to DB asynchronously
    chats.forEach(chat => {
      WhatsAppChat.findOneAndUpdate(
        { name: chat.name },
        { ...chat, lastSynced: new Date() },
        { upsert: true, new: true }
      ).catch(e => console.error("WA Persist failed", e));
    });
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
    // Persist to DB
    emails.forEach(email => {
      // Create a unique internal ID if none provided
      const id = email.id || `${email.subject}-${email.sender}-${email.time}`; 
      GmailEmail.findOneAndUpdate(
        { id },
        { ...email, lastSynced: new Date() },
        { upsert: true, new: true }
      ).catch(e => console.error("GM Persist failed", e));
    });
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
    UserSettings.findOneAndUpdate({}, { 
      focusMode, 
      totalFocusTimeMs 
    }, { upsert: true }).catch(() => {});
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
    priorityKeywords = [];
    activePresetId = null;
    mutedApps = [];
    mutedUsersByPreset = {};
    ActivityLog.deleteMany({}).catch(() => {});
    CustomSite.deleteMany({}).catch(() => {});
    PriorityKeyword.deleteMany({}).catch(() => {});
    UserSettings.deleteMany({}).catch(() => {});
    NotificationRecord.deleteMany({}).catch(() => {});
  },

  // === KEYWORD OPERATIONS (Context-Aware Engine) ===
  getPriorityKeywords() {
    return priorityKeywords;
  },

  addPriorityKeyword(keyword) {
    if (!priorityKeywords.includes(keyword)) {
      priorityKeywords.push(keyword);
      PriorityKeyword.create({ keyword }).catch(err => console.error("DB Error saving keyword:", err));
    }
  },

  removePriorityKeyword(keyword) {
    priorityKeywords = priorityKeywords.filter((k) => k !== keyword);
    PriorityKeyword.deleteOne({ keyword }).catch(() => {});
  },

  // === PRESETS & MUTED USERS (Friend's Additions) ===
  getActivePreset() { return activePresetId; },
  setActivePreset(id) { activePresetId = id; },

  getMutedApps() { return mutedApps; },
  setMutedApps(arr) { mutedApps = Array.isArray(arr) ? arr : []; },

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

  // === SCHEDULER OPERATIONS ===
  getSchedules() { return schedules; },
  async addSchedule(sch) {
    const s = await Schedule.create(sch);
    schedules.push(s);
    return s;
  },
  async removeSchedule(id) {
    await Schedule.findByIdAndDelete(id);
    schedules = schedules.filter(s => s._id.toString() !== id);
  },
  async updateSchedule(id, updates) {
    const s = await Schedule.findByIdAndUpdate(id, updates, { new: true });
    schedules = schedules.map(old => old._id.toString() === id ? s : old);
    return s;
  },
  setSchedulerEnabled(on) { schedulerEnabled = on; },
  getSchedulerEnabled() { return schedulerEnabled; },
  setManualOverride(on) { 
    manualOverride = on; 
    UserSettings.findOneAndUpdate({}, { manualOverride }, { upsert: true }).catch(() => {});
  },
  getManualOverride() { return manualOverride; },
  clearManualOverride() {
    manualOverride = false;
    UserSettings.findOneAndUpdate({}, { manualOverride }, { upsert: true }).catch(() => {});
  },
  setCalendarEvents(events) { 
    todayCalendarEvents = events; 
    calendarLastUpdated = new Date();
  },
  getCalendarEvents() { return todayCalendarEvents; },

  /** Final Decision Logic for Mode Switching */
  getCurrentMode() {
    // 1. Manual Override Check (Rule 1: Highest Priority)
    if (manualOverride) return focusMode ? "Office Mode (Manual)" : "Normal (Manual Override)";

    // 2. Holiday / Lunch Check (Calendar Events with Time-awareness)
    const now = new Date();
    const isSpecialTime = todayCalendarEvents.find(e => {
      const startTime = new Date(e.start);
      const endTime = new Date(e.end);
      return now >= startTime && now <= endTime;
    });

    if (isSpecialTime) {
      if (isSpecialTime.type === "holiday") return "Normal (Holiday)";
      if (isSpecialTime.type === "lunch") return "Normal (Lunch Break)";
      if (isSpecialTime.type === "work") return "Office Mode (Sync)";
    }

    // 2b. Check Internal Lunch Range (Within fixed schedules)
    const currentMins = now.getHours() * 60 + now.getMinutes();
    for (const s of schedules) {
        if (!s.isActive) continue;
        if (!isValidDay(s.days)) continue;
        
        const lStart = timeToMinutes(s.lunchStartTime);
        const lEnd = timeToMinutes(s.lunchEndTime);
        
        if (s.lunchStartTime && s.lunchEndTime && currentMins >= lStart && currentMins <= lEnd) {
            return "Normal (Lunch Break)";
        }
    }

    // 3. Fallback to Scheduler Check
    if (!schedulerEnabled) return "Normal (Disabled)";

    for (const s of schedules) {
        if (!s.isActive) continue;
        if (isValidDay(s.days) && isWithinTimeRange(s.startTime, s.endTime)) {
            return "Office Mode (Auto)";
        }
    }

    return "Normal Mode";
  }
};

module.exports = store;
