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
          if (
            chrome.runtime.lastError.message &&
            chrome.runtime.lastError.message.includes("context invalidated")
          ) {
            contextAlive = false;
            cleanup();
          }
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
    safeSendMessage({
      type: "INTERACTION_REPORT",
      data: {
        url: window.location.href,
        title: document.title,
        timeSpentSec: Math.round((Date.now() - interaction.start) / 1000),
        scrollCount: interaction.scrolls,
        clickCount: interaction.clicks,
        keyPressCount: interaction.keys,
        isIdle: interaction.idle,
        timestamp: new Date().toISOString(),
      },
    });
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
  // Because Chrome natively kills SW background pushes when
  // Focus is ON, we count blocked pushes by detecting when 
  // WhatsApp tries to update the tab title to "(1)..."
  // -----------------------------------------------------------
  const titleObserver = new MutationObserver(() => {
    if (!contextAlive || !isContextValid() || !focusModeActive) return;
    
    const rawTitle = document.title || "";
    // Detect numbers in brackets "(1) WhatsApp" or "[1] Slack"
    if (/^[\(\[]\d+[\)\]]/.test(rawTitle)) {
      console.log("🔕 [Focus Mode] Intercepted silent background push via Title!");
      
      // 1. Instantly scrub the distraction from the title
      const cleanTitle = rawTitle.replace(/^[\(\[]\d+[\)\]]\s*/, "");
      if (document.title !== cleanTitle) {
        document.title = cleanTitle; 
      }

      // 2. Fire proxy blocked event for the dashboard counter
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

  // -----------------------------------------------------------
  // 📨 PLATFORM SCRAPERS
  // -----------------------------------------------------------
  function scrapeWhatsApp() {
    if (!window.location.hostname.includes("whatsapp.com")) return;
    
    // Select the chat list items
    const chatElements = document.querySelectorAll("div[aria-label='Chat list'] > div");
    const chats = [];

    chatElements.forEach((el, index) => {
      if (index > 10) return; // Only 10 for performance
      try {
        const nameEl = el.querySelector("span[title]");
        const snippetEl = el.querySelector("div[role='gridcell'] span:last-child");
        const timeEl = el.querySelector("div[style*='color: var(--secondary)']"); 
        
        if (nameEl) {
          chats.push({
            id: index,
            name: nameEl.title,
            snippet: snippetEl ? snippetEl.innerText : "...",
            time: timeEl ? timeEl.innerText : "",
            unread: !!el.querySelector("span[aria-label*='unread']"),
          });
        }
      } catch (err) {}
    });

    if (chats.length > 0) {
      safeSendMessage({ type: "UPDATE_WHATSAPP_CHATS", chats });
    }
  }

  function scrapeGmail() {
    if (!window.location.hostname.includes("mail.google.com")) return;

    const emailRows = document.querySelectorAll("tr.zA");
    const emails = [];

    emailRows.forEach((row, index) => {
      if (index > 10) return;
      try {
        const sender = row.querySelector("span.bA4 span")?.innerText || "Unknown";
        const subject = row.querySelector("span.bog")?.innerText || "No Subject";
        const time = row.querySelector("td.xW")?.innerText || "";

        emails.push({
          id: index,
          sender,
          subject,
          time,
          isUnread: row.classList.contains("zE"),
        });
      } catch (err) {}
    });

    if (emails.length > 0) {
      safeSendMessage({ type: "UPDATE_GMAIL_EMAILS", emails });
    }
  }

  // Run scrapers every 10 seconds
  registerInterval(() => {
    scrapeWhatsApp();
    scrapeGmail();
  }, 10000);

  const titleNode = document.querySelector("title");
  if (titleNode) {
    titleObserver.observe(titleNode, { subtree: true, characterData: true, childList: true });
  }

  console.log("🧠 Productivity Assistant: Active (v2.4)");
})();
