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
const BACKEND_URL = "http://localhost:5001";

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
    await fetch(`${BACKEND_URL}/api/log`, {
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
// 🔕 PLATFORM MUTE RULES STORE
// Persisted via chrome.storage.local
// -----------------------------------------------------------
const PLATFORM_DOMAINS = {
  whatsapp: ["web.whatsapp.com", "whatsapp.com"],
  instagram: ["instagram.com", "www.instagram.com"],
  gmail: ["mail.google.com", "gmail.com"],
  outlook: ["outlook.live.com", "outlook.office.com", "mail.live.com"],
};

// Apply mute to all tabs matching a platform
async function applyPlatformMuteToTabs(platform, muted) {
  const domains = PLATFORM_DOMAINS[platform] || [];
  if (domains.length === 0) return;

  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (!tab.url) return;
      try {
        const hostname = new URL(tab.url).hostname;
        const matches = domains.some((d) => hostname.includes(d));
        if (matches) {
          chrome.tabs.update(tab.id, { muted }).catch(() => {});
          // Notify content script about mute state
          chrome.tabs.sendMessage(tab.id, {
            type: "PLATFORM_MUTE_CHANGED",
            platform,
            muted,
          }).catch(() => {});
          console.log(`🔕 Platform mute [${platform}] → ${muted ? "ON" : "OFF"} for tab: ${tab.url}`);
        }
      } catch (e) {}
    });
  });
}

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
    const res = await fetch(`${BACKEND_URL}/api/custom-sites`);
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
  console.log(`📡 Background: Received message [${message.type}] from ${sender.tab ? "tab " + sender.tab.id : "popup/extension"}`);

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
      chrome.storage.local.set({ focusMode: newMode }, () => {
        // Sync with backend
        fetch(`${BACKEND_URL}/api/focus`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ focusMode: newMode }),
        }).catch(() => {});

        // ============================================================
        // 🔕 BLOCK ALL NOTIFICATIONS AT BROWSER LEVEL
        // ============================================================
        if (chrome.contentSettings && chrome.contentSettings.notifications) {
          if (newMode) {
            chrome.contentSettings.notifications.set({ primaryPattern: "<all_urls>", setting: "block" });
          } else {
            chrome.contentSettings.notifications.clear({});
          }
        }

        // Also broadcast to content scripts (for page-level overrides) and mute tabs
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach((tab) => {
            if (tab.id && !tab.url?.startsWith("chrome://")) {
              // Mute tab to block notification sounds (like Whatsapp ding)
              chrome.tabs.update(tab.id, { muted: newMode }).catch(() => {});
              
              chrome.tabs.sendMessage(tab.id, {
                type: "FOCUS_MODE_CHANGED",
                focusMode: newMode,
              }).catch(() => {});
            }
          });
        });

        console.log(`🎯 Focus Mode ${newMode ? "ON — all notifications blocked" : "OFF — notifications restored"}`);
        sendResponse({ focusMode: newMode });
      });
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

    // Phase 6: Route to AI Notification Router (Unified Action Center)
    let inferredPlatform = "Browser Web Push";
    if (message.data?.hostname.includes("whatsapp")) inferredPlatform = "WhatsApp";
    else if (message.data?.hostname.includes("mail.google.com")) inferredPlatform = "Gmail";
    else if (message.data?.hostname.includes("instagram")) inferredPlatform = "Instagram";
    else if (message.data?.hostname.includes("office.com")) inferredPlatform = "Outlook";

    fetch(`${BACKEND_URL}/api/notifications/route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: inferredPlatform,
        sender: message.data?.title || "Unknown Sender",
        content: message.data?.body || "New notification",
        metadata: { url: message.data?.url }
      })
    }).catch((err) => console.error("Failed to route to AI:", err));
    
    return false;
  }

  // Interaction report from content script (Phase 4 & 5 Context Engine)
  if (message.type === "INTERACTION_REPORT") {
    // Check meeting status via URL
    const url = message.data?.url || "";
    const isMeeting = ["meet.google.com", "zoom.us", "teams.microsoft.com"].some(m => url.includes(m));

    chrome.storage.local.get("focusMode", (data) => {
      const isDeepWork = data.focusMode || message.data?.activityLevel === "High";
      
      const userContext = {
        activityLevel: message.data?.activityLevel || "Idle",
        inMeeting: isMeeting,
        deepWork: isDeepWork,
        currentTask: message.data?.title || "Unknown"
      };

      // Push Context to Backend
      fetch(`${BACKEND_URL}/api/context`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userContext)
      }).catch(err => console.error("Error updating Context on Backend:", err));
    });

    console.log("📊 Interaction:", message.data?.url, {
      time: message.data?.timeSpentSec + "s",
      idle: message.data?.isIdle,
      activityLevel: message.data?.activityLevel
    });
    return false;
  }

  // ──────────────────────────────────────────────────────────
  // ✉️ GMAIL DATA — Fetch via OAuth or active tab
  // ──────────────────────────────────────────────────────────
  
  if (message.type === "AUTHORIZE_GMAIL") {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError || !token) {
        sendResponse({ error: "auth_failed", message: chrome.runtime.lastError?.message });
      } else {
        sendResponse({ success: true, token });
      }
    });
    return true;
  }

  if (message.type === "GET_GMAIL_CHATS") {
    console.log("📨 Background: Fetching Gmail data...");
    
    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      if (chrome.runtime.lastError || !token) {
        console.warn("⚠️ Gmail Auth Failed:", chrome.runtime.lastError?.message);
        sendResponse({ error: "auth_required", message: chrome.runtime.lastError?.message });
        return;
      }

      try {
        // Fetch 50 threads for a better representation of "Frequent" senders
        const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=50", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        
        if (!data.threads) {
          sendResponse({ chats: [] });
          return;
        }

        // Fetch thread metadata (headers & labels)
        const threadDetails = await Promise.all(data.threads.map(async (t) => {
          try {
            const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${t.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            return res.json();
          } catch (e) { return null; }
        }));

        const sendersMap = new Map();
        threadDetails.forEach(thread => {
          if (!thread || !thread.messages) return;
          const firstMsg = thread.messages[0];
          const headers = firstMsg.payload.headers;
          const labelIds = firstMsg.labelIds || [];
          
          const from = headers.find(h => h.name === "From")?.value || "Unknown";
          const subject = headers.find(h => h.name === "Subject")?.value || "(No Subject)";
          
          const match = from.match(/^(.*?)\s*<([^>]+)>$/) || [null, from, from];
          const name = (match[1] || match[2]).replace(/["']/g, '');
          const email = match[2];

          // Smart category detection via Gmail Labels
          let category = "Updates";
          if (labelIds.includes("CATEGORY_PROMOTIONS")) category = "Promotions";
          else if (labelIds.includes("CATEGORY_SOCIAL")) category = "Social";
          else if (labelIds.includes("CATEGORY_FORUMS")) category = "Forums";
          else if (labelIds.includes("CATEGORY_PERSONAL")) category = "Personal";
          
          // Custom Work detection if it's not a generic category
          if (category === "Updates") {
            const domain = email.split('@')[1]?.toLowerCase() || "";
            if (["github.com", "atlassian.net", "jira.com", "slack.com", "microsoft.com", "google.com"].includes(domain)) {
              category = "Work";
            }
          }

          if (!sendersMap.has(email)) {
            sendersMap.set(email, {
              id: email,
              name: name,
              email: email,
              count: 1,
              lastMsg: subject,
              category: category,
              avatar: name.substring(0, 1).toUpperCase()
            });
          } else {
            const existing = sendersMap.get(email);
            existing.count++;
            // If we found a more specific category in another thread, update it
            if (existing.category === "Updates" && category !== "Updates") {
              existing.category = category;
            }
          }
        });

        // Sort by frequency (most emails first)
        const sortedChats = Array.from(sendersMap.values()).sort((a, b) => b.count - a.count);
        sendResponse({ chats: sortedChats });

      } catch (err) {
        console.error("❌ Gmail Fetch Error:", err);
        sendResponse({ error: "fetch_error", message: err.message });
      }
    });
    return true;
  }

  // ──────────────────────────────────────────────────────────
  // 💬 WHATSAPP CHATS — Cache scraped chats from content script
  // ──────────────────────────────────────────────────────────
  if (message.type === "WHATSAPP_CHATS") {
    const { chats, timestamp } = message;
    chrome.storage.local.set({ whatsappChats: { chats, at: timestamp } });
    console.log(`💬 WhatsApp chats cached: ${chats.length} chats`);
    return false;
  }

  // GET_WHATSAPP_CHATS — popup or dashboard requests cached chats
  if (message.type === "GET_WHATSAPP_CHATS") {
    // First try to ask any open WhatsApp Web tab directly for freshest data
    chrome.tabs.query({ url: ["*://web.whatsapp.com/*", "*://www.whatsapp.com/*"] }, (tabs) => {
      // Filter out any tabs that might not be fully loaded
      const waTabs = tabs.filter(t => t.url && t.url.includes("web.whatsapp.com"));
      
      if (waTabs.length > 0) {
        console.log(`🔍 Attempting live scrape on WhatsApp tab: ${waTabs[0].id}`);
        chrome.tabs.sendMessage(waTabs[0].id, { type: "GET_WHATSAPP_CHATS" }, (resp) => {
          if (chrome.runtime.lastError) {
            console.warn("⚠️ Live scrape failed:", chrome.runtime.lastError.message);
            // Fall back to cached if messaging fails
            chrome.storage.local.get("whatsappChats", (d) => {
              sendResponse({ 
                chats: d.whatsappChats?.chats || [], 
                source: "cache",
                error: "could_not_connect_to_tab" 
              });
            });
            return;
          }

          if (resp?.chats?.length > 0) {
            console.log(`✅ Live scrape successful: ${resp.chats.length} chats`);
            sendResponse({ chats: resp.chats, source: "live" });
          } else {
            console.log("📍 Tab returned empty chats, using cache");
            chrome.storage.local.get("whatsappChats", (d) => {
              sendResponse({ chats: d.whatsappChats?.chats || [], source: "cache" });
            });
          }
        });
      } else {
        // No WA tab open → return cached
        console.log("📍 No open WhatsApp tab found, returning cache");
        chrome.storage.local.get("whatsappChats", (d) => {
          sendResponse({ chats: d.whatsappChats?.chats || [], source: "cache", noTab: true });
        });
      }
    });
    return true; // async sendResponse
  }

  // Page unload report
  if (message.type === "PAGE_UNLOAD") {
    console.log("📦 Page closed:", message.data?.url, `(${message.data?.timeSpentSec}s)`);
    return false;
  }

  // ============================================================
  // 🔕 PLATFORM MUTE UPDATE (from dashboard)
  // Sent by ManagePage sub-pages: mutes matching tabs, stores rules
  // ============================================================
  if (message.type === "PLATFORM_MUTE_UPDATE") {
    const { platform, config } = message;
    if (!platform) return false;

    // Store mute config in local storage
    chrome.storage.local.get("platformMuteRules", (data) => {
      const rules = data.platformMuteRules || {};
      rules[platform] = { ...(rules[platform] || {}), ...config, updatedAt: Date.now() };
      chrome.storage.local.set({ platformMuteRules: rules });
    });

    // If muteAll or muteTabAudio is being set, mute/unmute tab audio
    if (typeof config.muteAll !== "undefined") {
      applyPlatformMuteToTabs(platform, config.muteAll);
    }
    if (typeof config.muteTabAudio !== "undefined") {
      applyPlatformMuteToTabs(platform, config.muteTabAudio);
    }

    // Block/unblock push notifications for the platform's URLs
    if (typeof config.blockPushNotifications !== "undefined" ||
        typeof config.muteAll !== "undefined") {
      const domains = PLATFORM_DOMAINS[platform] || [];
      if (chrome.contentSettings && chrome.contentSettings.notifications) {
        const shouldBlock = config.blockPushNotifications || config.muteAll;
        domains.forEach((domain) => {
          const pattern = `https://${domain}/*`;
          if (shouldBlock) {
            chrome.contentSettings.notifications.set({
              primaryPattern: pattern,
              setting: "block",
            });
          } else {
            chrome.contentSettings.notifications.set({
              primaryPattern: pattern,
              setting: "ask",
            });
          }
        });
      }
    }

    console.log(`🔕 Platform mute rule updated: [${platform}]`, config);
    sendResponse({ success: true, platform, config });
    return true;
  }
});

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ focusMode: false, platformMuteRules: {} });
  if (chrome.contentSettings && chrome.contentSettings.notifications) {
    chrome.contentSettings.notifications.clear({});
  }
  console.log("✅ Context-Aware Productivity Assistant v2.0 installed!");
});

// On startup: restore platform mute states
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get("platformMuteRules", (data) => {
    const rules = data.platformMuteRules || {};
    Object.entries(rules).forEach(([platform, config]) => {
      if (config.muteAll || config.muteTabAudio) {
        applyPlatformMuteToTabs(platform, true);
      }
    });
    console.log("🔄 Platform mute rules restored on startup:", Object.keys(rules));
  });
});
