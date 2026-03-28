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
  let mutedWhatsAppChats = []; // Local cache
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

  // 🔔 NEW: Listen for automation requests from Dashboard UI
  window.addEventListener("__pa_automate_mute__", function(e) {
    if (!contextAlive || !isContextValid()) return;
    const { name } = e.detail || {};
    if (name) {
        console.log(`🤖 Extension received automation request from Dashboard for: ${name}`);
        safeSendMessage({ type: "AUTOMATE_WA_MUTE", name });
    }
  });

  // -----------------------------------------------------------
  // 📡 BROADCAST FOCUS STATE TO PAGE CONTEXT
  // -----------------------------------------------------------
  function broadcastUpdates(isActive, blockedSites = [], mutedWhatsAppChats = []) {
    try {
      window.dispatchEvent(
        new CustomEvent("__pa_update__", { 
          detail: { 
            on: isActive, 
            blockedSites,
            mutedWhatsAppChats
          } 
        })
      );
    } catch (e) {}
  }

  function broadcastKeywords(keywords) {
    try {
      window.dispatchEvent(
        new CustomEvent("__pa_keywords__", { detail: { keywords } })
      );
    } catch (e) {}
  }

  // -----------------------------------------------------------
  // 🔄 GET INITIAL EXTENSION STATE
  // -----------------------------------------------------------
   // 🔄 GET INITIAL SYNC DATA
  safeSendMessage({ type: "GET_SYNC_DATA" }, function (response) {
    if (response) {
      focusModeActive = response.focusMode || false;
      mutedWhatsAppChats = response.mutedWhatsAppChats || [];
      broadcastUpdates(focusModeActive, response.blockedSites, mutedWhatsAppChats);
      
      // Also get keywords for the smart filter
      safeSendMessage({ type: "GET_EXTENSION_STATE" }, function (extResponse) {
        if (extResponse && extResponse.priorityKeywords) {
          broadcastKeywords(extResponse.priorityKeywords);
        }
      });
    }
  });

  function applyMuteVisuals() {
    scrapeWhatsApp();
  }



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
        if (message.type === "FOCUS_MODE_CHANGED" || message.type === "EXTENSION_STATE_CHANGED") {
          focusModeActive = message.focusMode;
          broadcastUpdates(focusModeActive, message.blockedSites || [], message.mutedWhatsAppChats || []);
          if (message.priorityKeywords) {
            broadcastKeywords(message.priorityKeywords);
          }
        } else if (message.type === "MUTE_LIST_UPDATE") {
          mutedWhatsAppChats = message.mutedNames;
          broadcastUpdates(focusModeActive, [], mutedWhatsAppChats);
          applyMuteVisuals();
        } else if (message.type === "TRIGGER_WA_MUTE_DOM") {
          console.log(`🎯 [ContentScript] Triggering DOM automation for: ${message.name}`);
          automateWhatsAppMute(message.name);
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
          const name = nameEl.title;
          const isMuted = mutedWhatsAppChats.includes(name);
          
          chats.push({
            id: index,
            name: name,
            snippet: snippetEl ? snippetEl.innerText : "...",
            time: timeEl ? timeEl.innerText : "",
            unread: !!el.querySelector("span[aria-label*='unread']"),
            isMuted: isMuted
          });

          // Apply visual mute to the DOM element
          if (isMuted) {
            el.style.opacity = "0.3";
            el.style.filter = "grayscale(1) contrast(0.8)";
            el.style.transition = "all 0.4s ease";
            if (!el.querySelector(".saraswati-mute-badge")) {
                const badge = document.createElement("div");
                badge.className = "saraswati-mute-badge";
                badge.innerText = "🔇 SARASWATI MUTED";
                badge.style.cssText = "font-size: 8px; font-weight: 900; color: #10b981; background: rgba(16,185,129,0.1); padding: 2px 6px; border-radius: 4px; margin-top: 4px; width: fit-content; border: 1px solid rgba(16,185,129,0.2);";
                nameEl.parentElement.appendChild(badge);
            }
          } else {
            el.style.opacity = "1";
            el.style.filter = "none";
            const badge = el.querySelector(".saraswati-mute-badge");
            if (badge) badge.remove();
          }
        }

      } catch (err) {}
    });

    if (chats.length > 0) {
      safeSendMessage({ type: "UPDATE_WHATSAPP_CHATS", chats });
    }
  }

  // -----------------------------------------------------------
  // 🤖 WHATSAPP AUTOMATION (DOM-LEVEL)
  // -----------------------------------------------------------
  async function automateWhatsAppMute(targetName) {
    if (!window.location.hostname.includes("whatsapp.com")) return;
    console.log(`🤖 [Automation] Starting mute sequence for: "${targetName}"...`);

    // 1. Find the chat element more robustly
    let targetEl = null;

    // Search all spans with titles first
    const spans = Array.from(document.querySelectorAll("span[title]"));
    const targetSpan = spans.find(s => s.title === targetName);

    if (targetSpan) {
        // Find the closest parent that acts as a row/button (usually has relative/absolute positioning)
        targetEl = targetSpan.closest("div[role='row']") || targetSpan.closest("div[role='button']") || targetSpan.closest("nav + div > div > div");
    }

    if (!targetEl) {
        console.warn(`🕵️ Chat "${targetName}" not found via title search, trying role search...`);
        const rows = document.querySelectorAll("div[role='row']");
        for (const r of rows) {
            if (r.innerText.includes(targetName)) {
                targetEl = r;
                break;
            }
        }
    }

    if (!targetEl) {
        console.error(`❌ [Automation] Could not find chat item for: ${targetName}`);
        return;
    }

    try {
        console.log("🖱️ [Automation] Found chat, triggering Right-Click...");
        targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
        await new Promise(r => setTimeout(r, 300));

        const rect = targetEl.getBoundingClientRect();
        const ev = new MouseEvent("contextmenu", {
            bubbles: true,
            cancelable: true,
            view: window,
            button: 2,
            buttons: 2,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2
        });
        targetEl.dispatchEvent(ev);

        // 3. Wait for context menu
        await new Promise(r => setTimeout(r, 600));

        // 4. Find the "Mute" menu item
        const menuItems = Array.from(document.querySelectorAll("div[role='button'], li, [role='listitem']"));
        let muteOption = menuItems.find(i => {
            const text = i.innerText.toLowerCase();
            return text.includes("mute") && !text.includes("unmute");
        });

        if (muteOption) {
            console.log("✅ [Automation] Found Mute option, clicking...");
            muteOption.click();

            // 5. Wait for the dialog
            await new Promise(r => setTimeout(r, 1000));

            // 6. Select "8 hours" (User's preferred default)
            const labels = Array.from(document.querySelectorAll("label, span, div"));
            const eightHoursBtn = labels.find(l => l.innerText.toLowerCase().includes("8 hours"));
            const alwaysBtn = labels.find(l => {
                const text = l.innerText.toLowerCase();
                return text === "always" || text.includes("1 year") || text === "8 hours";
            });

            const durationBtn = eightHoursBtn || alwaysBtn;

            if (durationBtn) {
                console.log(`✅ [Automation] Selecting duration: "${durationBtn.innerText}"...`);
                durationBtn.click();
                await new Promise(r => setTimeout(r, 400));
            }

            // 7. Click confirm
            const buttons = Array.from(document.querySelectorAll("button"));
            const confirmBtn = buttons.find(b => {
                const text = b.innerText.toLowerCase();
                return text === "mute notifications" || text === "mute";
            });

            if (confirmBtn) {
                console.log("🚀 [Automation] Clicking final confirm button!");
                confirmBtn.click();
                return;
            }
            console.warn("⚠️ [Automation] Could not find confirmation button in dialog.");
        } else {
            console.warn("⚠️ [Automation] 'Mute' option not in menu - is it already muted?");
        }
    } catch (e) {
        console.error("❌ [Automation] CRITICAL ERROR", e);
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

  // 👁️ LIVE MUTATION OBSERVER (Instant Dashboard Sync)
  const chatListObserver = new MutationObserver(() => {
    // Throttled scrape to avoid performance hits on rapid typing
    if (this._scrapeTimeout) clearTimeout(this._scrapeTimeout);
    this._scrapeTimeout = setTimeout(scrapeWhatsApp, 500);
  });

  function startChatObserver() {
    const list = document.querySelector("div[aria-label='Chat list']");
    if (list) {
      console.log("👁️ [Observer] Chat list found, starting instant sync...");
      chatListObserver.observe(list, { childList: true, subtree: true, characterData: true });
    } else {
      // Retry in 5s if not loaded yet
      setTimeout(startChatObserver, 5000);
    }
  }

  // Run scrapers logic
  registerInterval(() => {
    scrapeGmail();
    // WhatsApp is now handled by observer for "new messages", 
    // but we still poll occasionally to refresh unread counts/visuals
    scrapeWhatsApp(); 
  }, 10000);

  startChatObserver();

  // 🧠 CONTENT INTELLIGENCE (Senior Spec: Step 2)
  function scanPageForKeywords() {
    if (!focusModeActive || !contextAlive) return;
    const bodyText = document.body.innerText || "";
    safeSendMessage({ 
      type: "SCAN_CONTENT_MATCH", 
      text: bodyText.substring(0, 2000),
      url: window.location.href 
    });
  }
  registerInterval(scanPageForKeywords, 30000);

  const titleNode = document.querySelector("title");
  if (titleNode) {
    titleObserver.observe(titleNode, { subtree: true, characterData: true, childList: true });
  }

  console.log("🧠 Productivity Assistant: Active (v2.4)");
})();
