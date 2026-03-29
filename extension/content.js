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
  let mutedInstagramChats = []; // 📸 NEW: Local cache for IG
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
  window.addEventListener("__pa_notif_event__", function (e) {
    if (!contextAlive || !isContextValid()) return;

    const detail = e.detail || {};
    safeSendMessage({
      type: "NOTIFICATION_EVENT",
      data: {
        status: detail.status || "blocked", 
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
    const { name, platform } = e.detail || {};
    if (name) {
        console.log(`🤖 Extension received automation request from Dashboard for: ${name} [${platform || 'whatsapp'}]`);
        const type = platform === "instagram" ? "AUTOMATE_IG_MUTE" : "AUTOMATE_WA_MUTE";
        safeSendMessage({ type, name });
    }
  });

  // ⚡ Force instant scheduler re-check (Bypass 1-min delay)
  window.addEventListener("__pa_force_sync__", function() {
    if (!contextAlive || !isContextValid()) return;
    console.log("⚡ Dashboard triggered instant mode switch check...");
    safeSendMessage({ type: "FORCE_SCHEDULER_CHECK" });
  });

  // -----------------------------------------------------------
  // 📡 BROADCAST FOCUS STATE TO PAGE CONTEXT
  // -----------------------------------------------------------
  // 📡 BROADCAST FOCUS STATE TO PAGE CONTEXT
  function broadcastUpdates(isActive, blockedSites = [], mutedWhatsAppChats = [], mutedInstagramChats = []) {
    try {
      window.dispatchEvent(
        new CustomEvent("__pa_update__", { 
          detail: { 
            on: isActive, 
            blockedSites,
            mutedWhatsAppChats,
            mutedInstagramChats
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
      mutedInstagramChats = response.mutedInstagramChats || []; // 📸 NEW
      broadcastUpdates(focusModeActive, response.blockedSites, mutedWhatsAppChats, mutedInstagramChats);
      
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
        if (message.type === "FOCUS_MODE_CHANGED" || message.type === "EXTENSION_STATE_CHANGED" || message.type === "MUTE_LIST_UPDATE") {
          if (typeof message.focusMode !== 'undefined') focusModeActive = message.focusMode;
          
          broadcastUpdates(
            focusModeActive, 
            message.blockedSites || [], 
            message.mutedWhatsAppChats || (typeof mutedWhatsAppChats !== 'undefined' ? mutedWhatsAppChats : []),
            message.mutedInstagramChats || []
          );

          if (message.mutedWhatsAppChats) mutedWhatsAppChats = message.mutedWhatsAppChats;

          if (message.priorityKeywords) {
            broadcastKeywords(message.priorityKeywords);
          }
        } else if (message.type === "TRIGGER_AUTO_REPLY") {
          processAutoReply(message.sender, message.reply);
        } else if (message.type === "TRIGGER_WA_MUTE_DOM") {
          automateWhatsAppMute(message.name);
        } else if (message.type === "TRIGGER_IG_MUTE_DOM") {
          automateInstagramMute(message.name);
        }
      });

      // 🧪 TEST INTERFACE (For User Verification)
      window.addEventListener("__pa_test_autoreply__", (e) => {
        const { name, text } = e.detail || {};
        if (name) {
          console.log(`🧪 [Test] Triggering manual auto-reply test for: ${name}`);
          processAutoReply(name, text || "🧪 Test Auto-Reply: System Functional.");
        }
      });

    } catch (e) {
      contextAlive = false;
    }
  }

  // 🤖 SMART AUTO-REPLY (DOM-LEVEL AUTOMATION)
  function getInputBox() {
    // 🌍 PLATFORM SPECIFIC SELECTORS (Higer Resilience)
    const selectors = [
      "div[contenteditable='true'][data-tab='10']", // WhatsApp
      "div[aria-label='Type a message']",           // WhatsApp En
      "div[aria-label='Type a message ']",          // WhatsApp En (Space)
      "div[aria-label='Type a message…']",         // WhatsApp En (Dots)
      "footer .selectable-text",                    // WhatsApp Secondary
      ".msg-form__contenteditable",                 // LinkedIn
      "div[role='textbox']",                        // Generalized Messenger/Slack
      "div[aria-label='Message Body']",             // Gmail
      "div[contenteditable='true']"                 // Final Generic Fallback
    ];
    for (const s of selectors) {
      const els = document.querySelectorAll(s);
      for (const el of els) {
        // Must be visible, clickable, and not a massive text block
        if (el && el.offsetParent !== null && el.innerText.length < 100) return el;
      }
    }
    return null;
  }

  function getSendButton() {
    const selectors = [
      "span[data-icon='send']",                      // WhatsApp Primary
      "button[aria-label='Send']",                  // WhatsApp/Messenger Alternates
      "button[aria-label='Enviar']",                // Localized Es/Pt
      ".msg-form__send-button",                     // LinkedIn
      "div[aria-label='Send']",                      // Messenger Primary
      ".T-I.J-J5-Ji.aoO.v7.T-I-atl.L3"             // Gmail Send
    ];
    for (const s of selectors) {
      const btn = document.querySelector(s);
      if (btn && btn.offsetParent !== null) {
        return btn.tagName === "BUTTON" ? btn : btn.closest("button") || btn;
      }
    }
    return null;
  }

  async function typeMessage(inputBox, text) {
    if (!inputBox) return false;
    inputBox.focus();
    // Simulate user-like typing
    document.execCommand('insertText', false, text);
    return true;
  }

  async function processAutoReply(senderName, replyText) {
    console.log(`🤖 [Auto-Reply] Heavy-duty trigger for: ${senderName}...`);

    // 1. 🎯 High-Fidelity Chat Selection
    const spans = Array.from(document.querySelectorAll("span[title]"));
    const targetSpan = spans.find(s => s.title === senderName);
    if (targetSpan) {
       const row = targetSpan.closest("div[role='row']") || targetSpan.closest("div[role='button']");
       if (row) {
          console.log("🖱️ [Auto-Reply] Clicking chat row...");
          row.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
          row.click();
       }
    }

    // 2. 🛡️ RESILIENT POLLING LOOP
    let attempts = 0;
    const maxAttempts = 15; // 7.5 seconds total
    
    const pollInterval = setInterval(async () => {
      attempts++;
      const inputBox = getInputBox();
      
      if (inputBox) {
        clearInterval(pollInterval);
        console.log(`🎯 [Auto-Reply] Input found (${attempts} attempts). Focus and Type...`);
        
        inputBox.focus();
        const success = await typeMessage(inputBox, replyText);
        
        if (success) {
          // 3. Wait for send button to activate
          setTimeout(() => {
            const sendBtn = getSendButton();
            if (sendBtn) {
              console.log("🚀 [Auto-Reply] Dispatching message!");
              sendBtn.click();
            } else {
              // Fallback: Trigger 'Enter' key
              console.warn("⚠️ [Auto-Reply] Send button missing, trying Enter key fallback...");
              inputBox.dispatchEvent(new KeyboardEvent("keydown", {
                bubbles: true, cancelable: true, keyCode: 13, key: "Enter"
              }));
            }
          }, 800);
        }
      } else if (attempts >= maxAttempts) {
        clearInterval(pollInterval);
        console.error(`🚫 [Auto-Reply] FAILED: Input box not found for ${senderName}. Try refreshing tab.`);
      }
    }, 500);
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
        type: "NOTIFICATION_EVENT",
        data: {
          url: window.location.href,
          status: "blocked",
          title: "Silent Notification", // We scrubbed the title, so we label it
          body: "A background notification was silenced",
          source: "title_observer",
          timestamp: new Date().toISOString(),
        },
      });
    }
  });

  // -----------------------------------------------------------
  // 📨 PRODUCTION DOM SCRAPER (Production Spec Step 5)
  // Extracts emergency signals directly from page content
  // -----------------------------------------------------------
  function normalizeText(text) {
    if (!text) return "";
    return text.toLowerCase().replace(/[^\w\s]/g, "").trim();
  }

  function isUrgent(text) {
    const normalized = normalizeText(text);
    const urgentKws = [
      "urgent", "emergency", "asap", "immediately", "right now", 
      "call me", "important", "fast", "now", "as soon as possible"
    ];
    return urgentKws.some(kw => normalized.includes(kw));
  }

  function extractMessageText() {
    // 1. Generic safety check (reads visible text)
    const pageText = document.body.innerText || "";
    if (isUrgent(pageText.slice(-500))) { // Check recent text additions
       return { found: true, content: pageText.slice(-200) };
    }
    return { found: false };
  }

  // 🕵️ DOM Mutation Observer for real-time extraction (WhatsApp/Gmail)
  const domObserver = new MutationObserver((mutations) => {
    if (!contextAlive || !isContextValid() || !focusModeActive) return;

    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          const text = node.innerText || node.textContent || "";
          if (text.length > 3 && isUrgent(text)) {
            console.log("🆘 [DOM Observer] Crisis signal detected in page content!");
            safeSendMessage({
              type: "NOTIFICATION_EVENT",
              data: {
                status: "allowed",
                title: "Crisis Extraction",
                body: text,
                source: "dom_observer",
                timestamp: new Date().toISOString()
              }
            });
          }
        });
      }
    }
  });

  if (document.body) {
    domObserver.observe(document.body, { childList: true, subtree: true });
  }

  // -----------------------------------------------------------
  // 📨 PLATFORM SCRAPERS (Specific)
  // -----------------------------------------------------------
  function scrapeWhatsApp() {
    if (!window.location.hostname.includes("whatsapp.com")) return;
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

  // 📸 INSTAGRAM AUTOMATION (DOM-LEVEL)
  async function automateInstagramMute(targetName) {
    if (!window.location.hostname.includes("instagram.com")) return;
    console.log(`🤖 [Automation] Starting Instagram mute sequence for: "${targetName}"...`);

    try {
        // 1. Find the chat row
        const labels = Array.from(document.querySelectorAll('span[dir="auto"]'));
        const targetLabel = labels.find(l => l.innerText === targetName);
        const row = targetLabel?.closest('div[role="button"][style*="height"]');

        if (!row) {
            console.warn(`🕵️ Instagram chat "${targetName}" not found. Ensure inbox is open.`);
            return;
        }

        row.scrollIntoView({ behavior: "smooth", block: "center" });
        await new Promise(r => setTimeout(r, 400));

        // 2. Trigger context menu (Right click)
        const rect = row.getBoundingClientRect();
        row.dispatchEvent(new MouseEvent("contextmenu", {
            bubbles: true, cancelable: true, view: window, button: 2, buttons: 2,
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2
        }));

        await new Promise(r => setTimeout(r, 600));

        // 3. Find "Mute messages"
        const menuItems = Array.from(document.querySelectorAll('div[role="dialog"] button, span'));
        const muteBtn = menuItems.find(i => i.innerText.toLowerCase().includes("mute messages"));

        if (muteBtn) {
            console.log("✅ [Automation] Found Mute messages, clicking...");
            muteBtn.click();
            
            // 4. Confirm Mute (Instagram usually has a sub-dialog or immediate action)
            await new Promise(r => setTimeout(r, 600));
            const confirmBtn = Array.from(document.querySelectorAll('button')).find(b => 
                b.innerText.toLowerCase().includes("mute") && !b.innerText.toLowerCase().includes("cancel")
            );
            if (confirmBtn) confirmBtn.click();
        }
    } catch (e) {
        console.error("❌ [IG Automation] ERROR", e);
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
  let scrapeTimeout = null;
  const chatListObserver = new MutationObserver(() => {
    // Throttled scrape to avoid performance hits on rapid typing
    if (scrapeTimeout) clearTimeout(scrapeTimeout);
    scrapeTimeout = setTimeout(scrapeWhatsApp, 500);
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
  // -----------------------------------------------------------
  // 📸 INSTAGRAM SCRAPER (Real-Time DM Sync)
  // -----------------------------------------------------------
  function scrapeInstagram() {
    if (!window.location.hostname.includes("instagram.com")) return;
    if (!contextAlive || !isContextValid()) return;

    // We look for elements that look like chat row items in the inbox
    // IG UI changes often, so we use broad selectors
    const chatRows = document.querySelectorAll('div[role="button"][style*="height"]');
    const chats = [];

    chatRows.forEach(row => {
      try {
        const nameNode = row.querySelector('span[dir="auto"]');
        const previewNode = row.querySelector('span[style*="color: rgb(142, 142, 142)"]'); // grey text
        
        if (nameNode) {
          const name = nameNode.innerText;
          const isMuted = mutedInstagramChats.includes(name);

          chats.push({
            id: `ig-${name.replace(/\s+/g, '-').toLowerCase()}`,
            name: name,
            displayName: name,
            lastAction: previewNode ? previewNode.innerText : "Active thread",
            count: 0, 
            muted: isMuted, 
            lastSynced: new Date().toISOString()
          });

          // Apply visual mute to the DOM element
          if (isMuted) {
            row.style.opacity = "0.3";
            row.style.filter = "grayscale(1) contrast(0.8)";
            row.style.transition = "all 0.4s ease";
            if (!row.querySelector(".saraswati-mute-badge")) {
                const badge = document.createElement("div");
                badge.className = "saraswati-mute-badge";
                badge.innerText = "🔇 SARASWATI MUTED";
                badge.style.cssText = "font-size: 8px; font-weight: 900; color: #10b981; background: rgba(16,185,129,0.1); padding: 2px 6px; border-radius: 4px; margin-top: 4px; width: fit-content; border: 1px solid rgba(16,185,129,0.2); pointer-events: none;";
                nameNode.parentElement.appendChild(badge);
            }
          } else {
            row.style.opacity = "1";
            row.style.filter = "none";
            const badge = row.querySelector(".saraswati-mute-badge");
            if (badge) badge.remove();
          }
        }
      } catch (e) {}
    });

    if (chats.length > 0) {
      safeSendMessage({ type: "UPDATE_INSTAGRAM_CHATS", chats });
    }
  }

  // Run scrapers logic
  registerInterval(() => {
    scrapeGmail();
    // WhatsApp is now handled by observer for "new messages", 
    // but we still poll occasionally to refresh unread counts/visuals
    scrapeWhatsApp(); 
    scrapeInstagram(); 
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
