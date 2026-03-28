// ============================================================
// 🧠 BACKGROUND SERVICE WORKER (v2.0)
// Context-Aware Productivity Assistant
// ============================================================
// This is the brain of the extension. It:
// 1. Listens for tab changes
// 2. Classifies websites (productive / distraction / neutral)
// 3. Blocks distracting sites when Focus Mode is ON
// 4. Sends activity logs to the backend
// 5. Handles interaction reports from content script
// 6. Generates smart notification summaries
// ============================================================

// -----------------------------------------------------------
// 📋 CONFIGURATION
// -----------------------------------------------------------
let _focusState = false;
let _blockedSites = [];
let _mutedWhatsAppChats = []; // Local cache of names
let _backendUrl = "http://localhost:5001/api";

// Site classification rules (mirrors backend AI module)
const SITE_RULES = {
  productive: [
    "github.com", "gitlab.com", "stackoverflow.com",
    "leetcode.com", "hackerrank.com", "codepen.io",
    "developer.mozilla.org", "docs.google.com", "notion.so",
    "figma.com", "linkedin.com", "medium.com", "dev.to",
    "coursera.org", "udemy.com", "khanacademy.org",
    "w3schools.com", "freecodecamp.org", "geeksforgeeks.org",
    "replit.com", "codeforces.com", "codechef.com",
    "visualstudio.com", "npmjs.com", "overleaf.com",
    "arxiv.org", "scholar.google.com", "trello.com",
    "slack.com",
  ],
  distraction: [
    "youtube.com", "instagram.com", "facebook.com",
    "twitter.com", "x.com", "tiktok.com", "reddit.com",
    "netflix.com", "twitch.tv", "9gag.com", "buzzfeed.com",
    "tumblr.com", "pinterest.com", "snapchat.com",
    "discord.com", "disneyplus.com", "hulu.com",
    "primevideo.com", "hotstar.com",
  ],
};

// -----------------------------------------------------------
// 🏷️ CLASSIFY SITE
// Takes a URL → returns: productive / distraction / neutral
// Uses rule-based matching + keyword heuristic fallback
// -----------------------------------------------------------
function classifySite(url) {
  try {
    const hostname = new URL(url).hostname.replace("www.", "").toLowerCase();
    const fullPath = new URL(url).pathname.toLowerCase();

    // Check productive sites
    for (const domain of SITE_RULES.productive) {
      if (hostname.includes(domain)) return "productive";
    }

    // Check distraction sites
    for (const domain of SITE_RULES.distraction) {
      if (hostname.includes(domain)) return "distraction";
    }

    // Keyword heuristic fallback (AI-like)
    const urlText = hostname + fullPath;
    const distractionKW = ["game", "play", "watch", "stream", "meme", "funny", "gossip", "entertainment", "viral"];
    const productiveKW = ["docs", "api", "tutorial", "learn", "course", "code", "develop", "research", "documentation", "wiki", "guide"];

    for (const kw of distractionKW) {
      if (urlText.includes(kw)) return "distraction";
    }
    for (const kw of productiveKW) {
      if (urlText.includes(kw)) return "productive";
    }

    return "neutral";
  } catch (e) {
    return "neutral";
  }
}

// -----------------------------------------------------------
// 🚦 DECISION ENGINE
// Block only if focus mode is ON AND site is a distraction
// -----------------------------------------------------------
function shouldBlock(type, focusMode) {
  return focusMode && type === "distraction";
}

// -----------------------------------------------------------
// 📤 SEND LOG TO BACKEND
// -----------------------------------------------------------
async function sendLog(logData) {
  try {
    await fetch(`${_backendUrl}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(logData),
    });
    console.log("📤 Log sent:", logData.url, `[${logData.type}]`);
  } catch (error) {
    console.warn("❌ Backend unreachable:", error.message);
  }
}

// -----------------------------------------------------------
// 🔔 SHOW NOTIFICATION
// -----------------------------------------------------------
function showBlockedNotification(url) {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "🔒 Site Blocked — Focus Mode",
      message: `${hostname} was blocked because you're in Focus Mode. Stay productive! 💪`,
    });
  } catch (e) {
    console.warn("Notification error:", e);
  }
}

// -----------------------------------------------------------
// 📊 SESSION TRACKING
// Track counts for smart notification summaries
// -----------------------------------------------------------
let sessionStats = {
  productive: 0,
  distraction: 0,
  neutral: 0,
  blocked: 0,
  startTime: Date.now(),
};

// -----------------------------------------------------------
// 🔄 BACKEND FOCUS SYNC
// Poll backend for focus mode state (in case toggled from dashboard)
// -----------------------------------------------------------
async function syncFocusState() {
  try {
    const res = await fetch(`${_backendUrl}/focus`);
    if (res.ok) {
      const { focusMode } = await res.json();
      const stored = await chrome.storage.local.get("focusMode");
      
      if (focusMode !== stored.focusMode) {
        console.log(`🔄 Syncing Focus Mode from Backend: ${focusMode ? "ON" : "OFF"}`);
        applyFocusState(focusMode);
      }
    }
    // 3. Sync Muted WhatsApp Chats
    try {
        const muteRes = await fetch(`${_backendUrl}/whatsapp/muted`);
        const mutedNames = await muteRes.json();
        if (JSON.stringify(mutedNames) !== JSON.stringify(_mutedWhatsAppChats)) {
            _mutedWhatsAppChats = mutedNames;
            // Broadcast to all WhatsApp tabs
            chrome.tabs.query({ url: "*://web.whatsapp.com/*" }, (tabs) => {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, { 
                        type: "MUTE_LIST_UPDATE", 
                        mutedNames: _mutedWhatsAppChats 
                    });
                });
            });
        }
    } catch (e) {
        console.error("Mute sync failed", e);
    }
  } catch (e) {
    // console.warn("Focus sync failed");
  }
}

// Helper to apply focus state to all browser components
async function applyFocusState(newMode) {
  await chrome.storage.local.set({ focusMode: newMode });

  // 1. Block/Unblock notifications at browser level
  if (chrome.contentSettings && chrome.contentSettings.notifications) {
    if (newMode) {
      chrome.contentSettings.notifications.set({ primaryPattern: "<all_urls>", setting: "block" });
    } else {
      chrome.contentSettings.notifications.clear({});
    }
  }

  // 2. Broadcast to all tabs & Mute/Unmute
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id && !tab.url?.startsWith("chrome://")) {
        // Mute tab to block sounds
        chrome.tabs.update(tab.id, { muted: newMode }).catch(() => {});
        
        // Notify content scripts
        chrome.tabs.sendMessage(tab.id, {
          type: "FOCUS_MODE_CHANGED",
          focusMode: newMode,
        }).catch(() => {});
      }
    });
  });
}

// Start polling
setInterval(syncFocusState, 5000);

// Reset session stats every 2 hours
setInterval(() => {
  const elapsed = Date.now() - sessionStats.startTime;
  if (elapsed > 2 * 60 * 60 * 1000) {
    // Generate session summary notification before reset
    generateSessionSummary();
    sessionStats = {
      productive: 0,
      distraction: 0,
      neutral: 0,
      blocked: 0,
      startTime: Date.now(),
    };
  }
}, 300000); // Check every 5 min

// -----------------------------------------------------------
// 🧠 GENERATE SESSION SUMMARY
// Smart notification summary (Phase 4 requirement)
// -----------------------------------------------------------
function generateSessionSummary() {
  const total = sessionStats.productive + sessionStats.distraction + sessionStats.neutral;
  if (total === 0) return;

  const score = total > 0
    ? Math.round(((sessionStats.productive + sessionStats.neutral * 0.3) / total) * 100)
    : 0;

  let emoji = "📊";
  if (score >= 80) emoji = "🏆";
  else if (score >= 60) emoji = "💪";
  else if (score >= 40) emoji = "⚠️";
  else emoji = "🔴";

  const message = `You had ${total} activities: ${sessionStats.productive} productive, ${sessionStats.distraction} distractions. Score: ${score}%`;

  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon48.png",
    title: `${emoji} Session Summary`,
    message: message,
  });
}

// -----------------------------------------------------------
// 🔄 HANDLE TAB CHANGE
// Main logic: classify → decide → block/log
// -----------------------------------------------------------
async function handleTabChange(tabId, url) {
  // Skip internal Chrome pages
  if (!url || url.startsWith("chrome://") || url.startsWith("chrome-extension://")) {
    return;
  }

  // 1. Fetch custom sites from our persistent backend store
  let customSites = [];
  try {
    const res = await fetch(`${_backendUrl}/custom-sites`);
    if (res.ok) {
      const data = await res.json();
      customSites = data.sites || [];
    }
  } catch (e) {
    // Backend offline, fallback gracefully
  }

  // 2. Classify the site, overriding with custom rules if applicable
  let type = classifySite(url);
  try {
    const hostname = new URL(url).hostname;
    if (customSites.some(s => hostname.includes(s))) {
      type = "distraction";
    }
  } catch (e) {}

  // 3. Check focus mode status
  const { focusMode = false } = await chrome.storage.local.get("focusMode");

  // 4. Track session stats
  if (type === "productive") sessionStats.productive++;
  else if (type === "distraction") sessionStats.distraction++;
  else sessionStats.neutral++;

  // 4. Decision: should we block?
  if (shouldBlock(type, focusMode)) {
    // Block by redirecting to blocked page
    const blockedPageUrl =
      chrome.runtime.getURL("blocked.html") +
      "?url=" +
      encodeURIComponent(url);
    chrome.tabs.update(tabId, { url: blockedPageUrl });

    // Show notification
    showBlockedNotification(url);

    // Update blocked count
    sessionStats.blocked++;

    // Log the block
    sendLog({
      url,
      type,
      action: "blocked",
      timestamp: new Date().toISOString(),
    });
  } else {
    // Log the allowed visit
    sendLog({
      url,
      type,
      action: "allowed",
      timestamp: new Date().toISOString(),
    });
  }
}

// -----------------------------------------------------------
// 👂 EVENT LISTENERS
// -----------------------------------------------------------

// Listen for tab activation (switching between tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      handleTabChange(activeInfo.tabId, tab.url);
    }
  } catch (error) {
    console.warn("Tab activation error:", error.message);
  }
});

// Listen for tab URL updates (navigating to a new page)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    handleTabChange(tabId, tab.url);
  }
});

// Listen for messages from popup & content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_SYNC_DATA") {
    sendResponse({ 
      focusMode: _focusState, 
      blockedSites: _blockedSites,
      mutedWhatsAppChats: _mutedWhatsAppChats
    });
    return true;
  }

  // Focus mode queries
  if (message.type === "GET_FOCUS_MODE") {
    chrome.storage.local.get("focusMode", (data) => {
      sendResponse({ focusMode: data.focusMode || false });
    });
    return true; // Keep message channel open for async response
  }

  // Focus mode toggle
  if (message.type === "TOGGLE_FOCUS_MODE") {
    chrome.storage.local.get("focusMode", (data) => {
      const newMode = !data.focusMode;
      
      // Update store and backend
      fetch(`${_backendUrl}/focus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focusMode: newMode }),
      }).catch(() => {});

      // Apply changes locally (mute, block, notify)
      applyFocusState(newMode);

      console.log(`🎯 Focus Mode ${newMode ? "ON — all notifications blocked" : "OFF — notifications restored"}`);
      sendResponse({ focusMode: newMode });
    });
    return true;
  }

  // Handle blocked notifications reported by the content script
  if (message.type === "NOTIFICATION_BLOCKED") {
    console.log("🔕 Notification blocked from:", message.data?.hostname);
    
    // Update local counter
    sessionStats.blocked++;
    
    // Send to backend so it counts towards 'Blocked Today'
    sendLog({
      url: message.data?.url || "",
      hostname: message.data?.hostname || "unknown",
      type: "distraction", // Notifications are treated as distractions when blocked
      action: "blocked",
      timestamp: message.data?.timestamp || new Date().toISOString(),
      metadata: {
        source: message.data?.source,
        title: message.data?.title
      }
    });
    
    return false;
  }

  // Interaction report from content script (Phase 4)
  if (message.type === "INTERACTION_REPORT") {
    // Store interaction data for future ML model training
    console.log("📊 Interaction:", message.data?.url, {
      time: message.data?.timeSpentSec + "s",
      idle: message.data?.isIdle,
    });
    return false;
  }

  // Page unload report
  if (message.type === "PAGE_UNLOAD") {
    console.log("📦 Page closed:", message.data?.url, `(${message.data?.timeSpentSec}s)`);
    return false;
  }

  // === PLATFORM DATA HANDLERS ===
  if (message.type === "UPDATE_WHATSAPP_CHATS") {
    fetch(`${_backendUrl}/platforms/whatsapp/chats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chats: message.chats }),
    }).catch(() => {});
    return false;
  }

  if (message.type === "UPDATE_GMAIL_EMAILS") {
    fetch(`${_backendUrl}/platforms/gmail/emails`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails: message.emails }),
    }).catch(() => {});
    return false;
  }

  // Remote Automation: Trigger mute sequence in the WhatsApp tab
  if (message.type === "AUTOMATE_WA_MUTE") {
    chrome.tabs.query({ url: "*://web.whatsapp.com/*" }, (tabs) => {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { 
                type: "TRIGGER_WA_MUTE_DOM", 
                name: message.name 
            });
        });
    });
    sendResponse({ status: "forwarded" });
    return true;
  }
});

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ focusMode: false });
  if (chrome.contentSettings && chrome.contentSettings.notifications) {
    chrome.contentSettings.notifications.clear({});
  }
  console.log("✅ Context-Aware Productivity Assistant v2.0 installed!");
});
