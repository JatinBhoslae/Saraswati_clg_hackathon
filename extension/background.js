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
let _mutedWhatsAppChats = []; // Local cache of names
const BACKEND_URL = "http://localhost:5001/api";

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
    await fetch(`${BACKEND_URL}/log`, {
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
    const res = await fetch(`${BACKEND_URL}/focus`);
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
        const muteRes = await fetch(`${BACKEND_URL}/whatsapp/muted`);
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

// -----------------------------------------------------------
// 📅 SCHEDULER ENGINE (Local Decision)
// -----------------------------------------------------------
async function checkScheduler() {
  try {
    const res = await fetch(`${BACKEND_URL}/schedule/status`);
    if (!res.ok) return;

    const data = await res.json();
    const { activeMode, schedulerEnabled, manualOverride: backendOverride } = data;
    
    // Use the backend's manual override state
    if (backendOverride) {
      console.log("⏸️ Scheduler paused due to Backend Manual Override");
      return;
    }

    if (!schedulerEnabled) return;

    const shouldBeOn = activeMode.includes("Office Mode");

    if (shouldBeOn && !localFocus) {
      console.log("🤖 [Auto] Activating Office Mode based on schedule...");
      applyFocusState(true);
    } else if (!shouldBeOn && localFocus) {
      console.log("🤖 [Auto] Deactivating Office Mode as schedule ended.");
      applyFocusState(false);
    }
  } catch (e) {
    console.warn("Scheduler check failed:", e.message);
  }
}

// Helper to apply focus state to all browser components
async function applyFocusState(newMode) {
  await chrome.storage.local.set({ focusMode: newMode });

  // 0. Fetch latest priority keywords to broadcast
  let priorityKeywords = [];
  try {
    const res = await fetch(`${BACKEND_URL}/keywords`);
    const data = await res.json();
    priorityKeywords = data.keywords || [];
  } catch(e) {}

  // 1. Manage Notifications (Native Level)
  if (chrome.contentSettings && chrome.contentSettings.notifications) {
    if (newMode) {
      // 🎯 FORCE BLOCK distracting platforms at the browser level
      // ... (custom sites fetch logic)
      chrome.contentSettings.notifications.set({
        primaryPattern: "<all_urls>",
        setting: "block"
      });
      console.log("🔒 Site-specific native blocks applied for Focus Mode");
    } else {
      // Restore defaults — Tell Chrome to let the user decide again
      chrome.contentSettings.notifications.set({
        primaryPattern: "<all_urls>",
        setting: "allow" 
      });
      // Also clear to ensure no cached extension-locks remain in the Chrome UI
      chrome.contentSettings.notifications.clear({});
      console.log("🔓 Focus Mode OFF: Native notification guard released.");
    }
  }

  // 2. Broadcast to all tabs & Mute/Unmute
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id && !tab.url?.startsWith("chrome://")) {
        // Mute tab to block notification sounds (like Whatsapp ding)
        chrome.tabs.update(tab.id, { muted: newMode }).catch(() => {});
        
        // Notify content scripts to enable/update JS-level interception
        chrome.tabs.sendMessage(tab.id, {
          type: "EXTENSION_STATE_CHANGED",
          focusMode: newMode,
          priorityKeywords: priorityKeywords
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
// 🔄 SYNC FOCUS MODE STATE WITH DASHBOARD
// -----------------------------------------------------------
setInterval(async () => {
  try {
    const focusRes = await fetch(`${BACKEND_URL}/focus`);
    const siteRes = await fetch(`${BACKEND_URL}/custom-sites`);
    const kwRes = await fetch(`${BACKEND_URL}/keywords`);
    
    if (focusRes.ok && siteRes.ok && kwRes.ok) {
      const { focusMode: backendFocusMode } = await focusRes.json();
      const { sites: backendSites = [] } = await siteRes.json();
      const { keywords: backendKeywords = [] } = await kwRes.json();
      
      const { 
        focusMode: localFocusMode, 
        siteCount = 0, 
        kwCount = 0 
      } = await chrome.storage.local.get(["focusMode", "siteCount", "kwCount"]);
      
      // Re-apply if toggle changed OR if sites list changed OR if keywords list changed
      if (
        localFocusMode !== backendFocusMode || 
        siteCount !== backendSites.length || 
        kwCount !== backendKeywords.length
      ) {
        console.log(`🔄 Sync Triggered (Total Change Detection)`);
        await chrome.storage.local.set({ 
          siteCount: backendSites.length,
          kwCount: backendKeywords.length 
        });
        await applyFocusState(backendFocusMode);
      }
    }
  } catch (e) {
    // Backend offline
  }
}, 2500);

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

  // 1. Fetch custom sites and priority keywords from our persistent backend store
  let customSites = [];
  let priorityKeywords = [];
  try {
    const [sitesRes, kwRes] = await Promise.all([
      fetch(`${BACKEND_URL}/custom-sites`),
      fetch(`${BACKEND_URL}/keywords`)
    ]);
    if (sitesRes.ok) {
      const data = await sitesRes.json();
      customSites = data.sites || [];
    }
    if (kwRes.ok) {
      const data = await kwRes.json();
      priorityKeywords = data.keywords || [];
    }
  } catch (e) {
    // Backend offline, fallback gracefully
  }

  // 2. Classify the site, overriding with custom rules if applicable
  let type = classifySite(url);
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    
    // Normalize user-entered sites to strip protocol and www
    const isCustomBlocked = customSites.some(rawSite => {
      let cleanSite = rawSite.trim().toLowerCase();
      cleanSite = cleanSite.replace(/^https?:\/\//, "");
      cleanSite = cleanSite.replace(/^www\./, "");
      cleanSite = cleanSite.split('/')[0]; // Strip paths
      return hostname.includes(cleanSite) || cleanSite.includes(hostname);
    });

    // Strategy Change: If common distracting hostname but contains priority metadata
    // (e.g. WhatsApp with a priority contact name), we treat as Productive
    const hasPriorityKW = priorityKeywords.some(kw => url.toLowerCase().includes(kw.toLowerCase()));

    if (hasPriorityKW) {
      type = "productive";
    } else if (isCustomBlocked) {
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
  // [SITE BLOCKING RESTORED & ENHANCED WITH PRIORITY BYPASS]
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

  // Extension state (focus + keywords)
  if (message.type === "GET_EXTENSION_STATE") {
    (async () => {
      const { focusMode = false } = await chrome.storage.local.get("focusMode");
      try {
        const kwRes = await fetch(`${BACKEND_URL}/keywords`);
        const { keywords = [] } = kwRes.ok ? await kwRes.json() : {};
        sendResponse({ focusMode, priorityKeywords: keywords });
      } catch (e) {
        sendResponse({ focusMode, priorityKeywords: [] });
      }
    })();
    return true; // Keep message channel open for async response
  }

  // Focus mode queries
  if (message.type === "GET_FOCUS_MODE") {
    chrome.storage.local.get("focusMode", (data) => {
      sendResponse({ focusMode: data.focusMode || false });
    });
    return true; 
  }

  // Focus mode toggle
  if (message.type === "TOGGLE_FOCUS_MODE") {
    chrome.storage.local.get("focusMode", (data) => {
      const newMode = !data.focusMode;
      
      // Update store and backend
      fetch(`${BACKEND_URL}/focus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focusMode: newMode }),
      }).catch(() => {});

      // Apply changes locally (mute, block, notify)
      // Removed native OS block to allow our interception scripts to track for the dashboard
      applyFocusState(newMode);

      console.log(`🎯 Focus Mode ${newMode ? "ON — notifications intercepted" : "OFF — notifications restored"}`);
      sendResponse({ focusMode: newMode });
    });
    return true;
  }

  // Handle blocked notifications reported by the content script
  if (message.type === "NOTIFICATION_BLOCKED") {
    console.log("🔕 Notification blocked from:", message.data?.hostname);
    
    // Update local counter
    sessionStats.blocked++;
    
    // Send to backend so it counts towards 'Blocked Today' logs table
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

    // Also heavily forward this to the new Unified Action Center AI Router!
    fetch(`${BACKEND_URL}/notifications/route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: message.data?.hostname || "Web Platform",
        sender: "Background Alert",
        content: message.data?.title || "Silently intercepted browser notification",
        metadata: { source: "Focus Mode Observer" }
      })
    }).catch(() => {});
    
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
    fetch(`${BACKEND_URL}/whatsapp/chats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chats: message.chats }),
    }).catch(() => {});
    return false;
  }

  if (message.type === "UPDATE_GMAIL_EMAILS") {
    fetch(`${BACKEND_URL}/gmail/emails`, {
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

  // Handle live content scans for priority keywords
  if (message.type === "SCAN_CONTENT_MATCH") {
    chrome.storage.local.get("focusMode", (data) => {
      if (!data.focusMode) return;
      
      // Perform a silent fetch of keywords to check match
      fetch(`${BACKEND_URL}/keywords`)
        .then(res => res.json())
        .then(kwData => {
          const keywords = kwData.keywords || [];
          const found = keywords.some(kw => message.text.toLowerCase().includes(kw.toLowerCase()));
          
           if (found) {
             console.log("💎 Priority keyword detected in page content! Ensuring unblocked state...");
           }
        }).catch(() => {});
    });
    return false;
  }
});

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ focusMode: false, manualOverride: false });

  // ⏰ Create scheduler alarm (every minute)
  chrome.alarms.create("checkScheduler", { periodInMinutes: 1 });

  if (chrome.contentSettings && chrome.contentSettings.notifications) {
    chrome.contentSettings.notifications.clear({});
  }
  console.log("✅ Context-Aware Productivity Assistant v2.0 installed!");
});

// Listen for alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "checkScheduler") {
    checkScheduler();
  }
});
