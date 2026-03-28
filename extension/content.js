// ============================================================
// 📄 CONTENT SCRIPT (v2.3)
// Context-Aware Productivity Assistant
// ============================================================

(function () {
  "use strict";

  // 🛡️ GUARD — exit if extension context is dead
  if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.id) {
    return;
  }

  let focusModeActive = false;
  let contextAlive = true;

  // -----------------------------------------------------------
  // 🛡️ SAFE CHROME API WRAPPER
  // -----------------------------------------------------------
  function isContextValid() {
    try {
      return !!(chrome && chrome.runtime && chrome.runtime.id);
    } catch (e) {
      return false;
    }
  }

  function safeSendMessage(message, callback) {
    if (!contextAlive || !isContextValid()) {
      contextAlive = false;
      cleanup();
      return;
    }
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          const errMsg = chrome.runtime.lastError.message;
          console.warn(`⚠️ Messaging error: ${errMsg}`);
          if (errMsg.includes("context invalidated")) {
            contextAlive = false;
            cleanup();
          }
          if (callback) callback({ error: errMsg });
          return;
        }
        if (callback) callback(response);
      });
    } catch (e) {
      contextAlive = false;
      cleanup();
    }
  }

  // -----------------------------------------------------------
  // 🧹 CLEANUP
  // -----------------------------------------------------------
  const intervalIds = [];
  function registerInterval(fn, ms) {
    const id = setInterval(() => {
      if (!contextAlive || !isContextValid()) {
        contextAlive = false;
        cleanup();
        return;
      }
      try { fn(); } catch (e) { contextAlive = false; cleanup(); }
    }, ms);
    intervalIds.push(id);
    return id;
  }

  function cleanup() {
    intervalIds.forEach((id) => clearInterval(id));
    intervalIds.length = 0;
  }

  // -----------------------------------------------------------
  // 🛡️ INJECT NOTIFICATION BLOCKER INTO PAGE CONTEXT
  // -----------------------------------------------------------
  function injectNotificationBlocker() {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("page-script.js");
    script.onload = function () {
      this.remove(); // Clean up the DOM once script is verified and executed
    };
    var target = document.documentElement || document.head;
    if (target) {
      target.prepend(script);
    }
  }

  injectNotificationBlocker();

  // -----------------------------------------------------------
  // 🔔 LISTEN FOR BLOCKED NOTIFICATION EVENTS FROM PAGE
  // When the injected script blocks a notification, it fires
  // a CustomEvent. We catch it here and forward to background.
  // -----------------------------------------------------------
  window.addEventListener("__pa_notif_blocked__", function (e) {
    if (!contextAlive || !isContextValid()) return;

    const detail = e.detail || {};
    safeSendMessage({
      type: "NOTIFICATION_BLOCKED",
      data: {
        url: window.location.href,
        hostname: window.location.hostname,
        title: detail.title || "Unknown",
        body: detail.body || "",
        source: detail.source || "unknown",
        timestamp: new Date().toISOString(),
      },
    });
  });

  // -----------------------------------------------------------
  // 📡 BROADCAST FOCUS STATE TO PAGE CONTEXT
  // -----------------------------------------------------------
  function broadcastFocus(isActive) {
    try {
      window.dispatchEvent(
        new CustomEvent("__pa_focus__", { detail: { on: isActive } })
      );
    } catch (e) {}
  }

  // -----------------------------------------------------------
  // 🔄 GET INITIAL FOCUS STATE
  // -----------------------------------------------------------
  safeSendMessage({ type: "GET_FOCUS_MODE" }, function (response) {
    if (response) {
      focusModeActive = response.focusMode || false;
      broadcastFocus(focusModeActive);
    }
  });

  // -----------------------------------------------------------
  // 👂 LISTEN FOR FOCUS MODE CHANGES FROM BACKGROUND
  // -----------------------------------------------------------
  if (isContextValid()) {
    try {
      chrome.runtime.onMessage.addListener(function (message) {
        if (!contextAlive || !isContextValid()) {
          contextAlive = false;
          cleanup();
          return;
        }
        if (message.type === "FOCUS_MODE_CHANGED") {
          focusModeActive = message.focusMode;
          broadcastFocus(focusModeActive);
        }
      });
    } catch (e) {
      contextAlive = false;
    }
  }

  // -----------------------------------------------------------
  // 📊 INTERACTION TRACKING
  // -----------------------------------------------------------
  var interaction = {
    scrolls: 0, clicks: 0, keys: 0,
    start: Date.now(), lastActive: Date.now(), idle: false,
  };

  document.addEventListener("scroll", function () {
    interaction.scrolls++; interaction.lastActive = Date.now(); interaction.idle = false;
  }, { passive: true });

  document.addEventListener("click", function () {
    interaction.clicks++; interaction.lastActive = Date.now(); interaction.idle = false;
  });

  document.addEventListener("keydown", function () {
    interaction.keys++; interaction.lastActive = Date.now(); interaction.idle = false;
  });

  registerInterval(function () {
    if (Date.now() - interaction.lastActive > 60000) interaction.idle = true;
  }, 10000);

  registerInterval(function () {
    const activeScore = interaction.scrolls + interaction.clicks * 2 + interaction.keys * 3;
    const level = interaction.idle ? "Idle" : (activeScore > 30 ? "High" : (activeScore > 5 ? "Medium" : "Low"));
    
    safeSendMessage({
      type: "INTERACTION_REPORT",
      data: {
        url: window.location.href,
        title: document.title,
        timeSpentSec: Math.round((Date.now() - interaction.start) / 1000),
        scrollCount: interaction.scrolls,
        clickCount: interaction.clicks,
        keyPressCount: interaction.keys,
        activityLevel: level,
        isIdle: interaction.idle,
        timestamp: new Date().toISOString(),
      },
    });

    // Reset counters for the next window
    interaction.scrolls = 0; 
    interaction.clicks = 0; 
    interaction.keys = 0;
  }, 30000);

  window.addEventListener("beforeunload", function () {
    if (!contextAlive || !isContextValid()) return;
    safeSendMessage({
      type: "PAGE_UNLOAD",
      data: {
        url: window.location.href,
        timeSpentSec: Math.round((Date.now() - interaction.start) / 1000),
      },
    });
  });
  // -----------------------------------------------------------
  // 🕵️ BACKGROUND PUSH DETECTOR (TITLE FIX)
  // -----------------------------------------------------------
  const titleObserver = new MutationObserver(() => {
    if (!contextAlive || !isContextValid() || !focusModeActive) return;
    const rawTitle = document.title || "";
    if (/^[\(\[]\d+[\)\]]/.test(rawTitle)) {
      const cleanTitle = rawTitle.replace(/^[\(\[]\d+[\)\]]\s*/, "");
      if (document.title !== cleanTitle) document.title = cleanTitle;
      safeSendMessage({
        type: "NOTIFICATION_BLOCKED",
        data: {
          url: window.location.href,
          hostname: window.location.hostname,
          title: "Background Push (Hidden)",
          body: "A background notification was silenced",
          source: "title_observer",
          timestamp: new Date().toISOString(),
        },
      });
    }
  });

  const titleNode = document.querySelector("title");
  if (titleNode) {
    titleObserver.observe(titleNode, { subtree: true, characterData: true, childList: true });
  }

  // -----------------------------------------------------------
  // 💬 WHATSAPP WEB — REAL CHAT SCRAPER
  // Runs on web.whatsapp.com to extract the real chat list
  // and send it to background.js / popup on demand
  // -----------------------------------------------------------
  const isWhatsApp = window.location.hostname.includes("whatsapp.com");

  if (isWhatsApp) {
    let lastChatCount = 0;

    function scrapeWhatsAppChats() {
      const chats = [];
      try {
        // WhatsApp Web uses different selectors across versions
        const selectors = [
          '[data-testid="cell-frame-container"]',
          '[data-testid="chat-list-item-container"]',
          '._ahlk',        // newer WA Web
          '#pane-side [role="listitem"]',
          '#pane-side .Jf',
          'div[class*="chat-list-item"]', // Fallback generic
        ];

        let items = [];
        for (const sel of selectors) {
          items = document.querySelectorAll(sel);
          if (items.length > 0) {
            console.log(`🧠 Scraper: Found ${items.length} items using selector: ${sel}`);
            break;
          }
        }

        if (items.length === 0) {
          console.warn("🧠 Scraper: No chat list items found. Looking for side pane...");
          const pane = document.querySelector("#pane-side") || document.querySelector('[data-testid="chat-list"]');
          if (pane) {
            console.log("🧠 Scraper: Pane found, try generic descent...");
            items = pane.querySelectorAll('div[role="listitem"]') || pane.querySelectorAll(':scope > div > div');
          }
        }

        items.forEach((item, idx) => {
          try {
            // Try multiple name selectors
            const nameEl =
              item.querySelector('[data-testid="cell-frame-title"]') ||
              item.querySelector('._ao3e') ||
              item.querySelector('span[title]') ||
              item.querySelector('.ggj6brxn') ||
              item.querySelector('span[dir="auto"]');

            const name = nameEl?.textContent?.trim() || nameEl?.getAttribute("title") || `Chat ${idx + 1}`;

            // Skip some common generic names
            if (!name || name === "Status" || name === "New Chat" || name === "Channels") return;

            // Last message
            const msgEl =
              item.querySelector('[data-testid="last-msg-status"]') ||
              item.querySelector('._ao3e.grs7u7a4') ||
              item.querySelector('.Tae59c7d') ||
              item.querySelector('[data-testid="conversation-info-header-chat-title"] + *');
            const lastMsg = msgEl?.textContent?.trim() || "";

            // Time
            const timeEl =
              item.querySelector('[data-testid="cell-frame-secondary-detail"]') ||
              item.querySelector('._ahlp') ||
              item.querySelector('div[class*="time"]');
            const time = timeEl?.textContent?.trim() || "";

            // Unread badge
            const badgeEl =
              item.querySelector('[data-testid="icon-unread-count"]') ||
              item.querySelector('._ahlq') ||
              item.querySelector('.nU_j1');
            const unreadCountText = badgeEl?.textContent?.trim() || "0";
            const unread = parseInt(unreadCountText) || 0;

            // Avatar letter 
            const avatarEl = item.querySelector('[data-testid="chat-list-item-avatar"]');
            const initialsText = avatarEl?.getAttribute("aria-label") || name.slice(0, 2).toUpperCase();

            // Detect if group 
            // Groups usually have comma-separated names OR specific Icons OR no 'online' status usually
            const isGroup = name.includes(",") || 
              !!item.querySelector('[data-testid="group"]') ||
              !!item.querySelector('svg[data-testid*="group"]') ||
              (name.split(" ").length > 3);

            if (name && name !== "") {
              chats.push({ 
                id: `wa_real_${idx}`, 
                name, 
                lastMsg, 
                time, 
                unread, 
                isGroup, 
                initials: initialsText.replace("Avatar of ", "").slice(0, 2).toUpperCase() 
              });
            }
          } catch (err) {}
        });
      } catch (err) {
        console.error("🧠 WhatsApp Scrape Error:", err);
      }

      console.log(`🧠 Scraper complete: ${chats.length} chats ready`);
      return chats;
    }

    // Send chats to background whenever they become available
    function tryDispatchChats() {
      const chats = scrapeWhatsAppChats();
      if (chats.length > 0 && chats.length !== lastChatCount) {
        lastChatCount = chats.length;
        safeSendMessage({ type: "WHATSAPP_CHATS", chats, timestamp: Date.now() });
        // Also store in page's local storage for dashboard to read
        try {
          localStorage.setItem("__fa_wa_chats__", JSON.stringify({ chats, at: Date.now() }));
        } catch (e) {}
      }
    }

    // Wait for WA Web to load the chat list (it's React-rendered)
    let waObserver = null;
    function waitForChatList() {
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        const chats = scrapeWhatsAppChats();
        if (chats.length > 0) {
          clearInterval(poll);
          tryDispatchChats();

          // Observe DOM for any later chat changes (incoming messages)
          const pane = document.querySelector("#pane-side");
          if (pane) {
            waObserver = new MutationObserver(() => tryDispatchChats());
            waObserver.observe(pane, { childList: true, subtree: true });
          }
        }
        if (attempts > 60) clearInterval(poll); // give up after 60s
      }, 1000);
    }

    waitForChatList();

    // Respond to on-demand scrape requests from popup/dashboard
    if (isContextValid()) {
      chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
        if (message.type === "GET_WHATSAPP_CHATS") {
          const chats = scrapeWhatsAppChats();
          sendResponse({ chats });
          return true;
        }
      });
    }
  }

  // -----------------------------------------------------------
  // 🔕 PLATFORM MUTE CHANGED (overlay UI hint on muted pages)
  // -----------------------------------------------------------
  if (isContextValid()) {
    chrome.runtime.onMessage.addListener(function(message) {
      if (message.type === "PLATFORM_MUTE_CHANGED") {
        const { muted } = message;
        // Show a brief toast on the page
        try {
          let toast = document.getElementById("__fa_mute_toast__");
          if (!toast) {
            toast = document.createElement("div");
            toast.id = "__fa_mute_toast__";
            toast.style.cssText = `
              position: fixed; bottom: 20px; right: 20px; z-index: 999999;
              background: ${muted ? "rgba(220,38,38,0.92)" : "rgba(22,163,74,0.92)"};
              color: white; padding: 10px 18px; border-radius: 10px;
              font-family: Inter, sans-serif; font-size: 13px; font-weight: 600;
              backdrop-filter: blur(8px);
              box-shadow: 0 4px 20px rgba(0,0,0,0.3);
              transition: opacity 0.3s ease;
            `;
            document.body.appendChild(toast);
          }
          toast.textContent = muted
            ? "🔕 Focus Assistant: Notifications muted"
            : "🔔 Focus Assistant: Notifications restored";
          toast.style.opacity = "1";
          setTimeout(() => { toast.style.opacity = "0"; }, 3000);
        } catch(e) {}
      }
    });
  }

  // -----------------------------------------------------------
  // 🌉 DASHBOARD BRIDGE
  // Dashboard is a regular webpage, it can't call chrome.runtime directly.
  // It sends window.postMessage, we relay it to background.
  // -----------------------------------------------------------
  window.addEventListener("PA_DASHBOARD_REQUEST", function (event) {
    if (!event.detail) return;
    
    const { type, requestId, ...payload } = event.detail;
    if (!type) return;

    console.log(`🌉 Bridge: Received Event [${type}] (id: ${requestId}), relaying...`);

    safeSendMessage({ type, ...payload }, (response) => {
      console.log(`🌉 Bridge: Relay response for [${type}] (id: ${requestId}).`);
      // Dispatch response as a custom event back to the dashboard
      window.dispatchEvent(new CustomEvent("PA_EXTENSION_RESPONSE_" + requestId, {
        detail: response
      }));
    });
  });

  console.log("🧠 Productivity Assistant: Active (v3.0)");
})();

