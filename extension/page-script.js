// ============================================================
// 🛡️ PAGE CONTEXT NOTIFICATION BLOCKER
// Context-Aware Productivity Assistant
// Runs in the MAIN world to override window.Notification
// ============================================================

(function() {
  "use strict";
  
  // State: whether focus mode is currently active
  let _focusModeActive = false;
  let _muteList = []; // Array of chat names to mute (friend's logic)
  let _priorityKeywords = []; // Personas that bypass focus (my logic)

  function _logBlocked(title, options, source = "unknown") {
    window.dispatchEvent(
      new CustomEvent("__pa_notif_blocked__", {
        detail: {
          title: title,
          body: (options && options.body) || "",
          source: source,
        },
      })
    );
    console.log(`🔕 [Productivity Assistant] Blocked (${source}):`, title);
  }

  // === 1. Override window.Notification ===
  const _OrigNotification = window.Notification;
  
  function _SilentNotification(title, options) {
    // 1. Check for PRIORITY BYPASS (My logic: Senior Spec Step 4)
    const isPriority = _priorityKeywords.some(kw => 
      title.toLowerCase().includes(kw.toLowerCase()) || 
      (options && options.body && options.body.toLowerCase().includes(kw.toLowerCase()))
    );

    if (isPriority) {
        console.log("💎 [Priority Mode] Delivering Whitelisted Persona:", title);
        return new _OrigNotification(title, options);
    }

    // 2. Check Global Focus Mode
    if (_focusModeActive) {
      _logBlocked(title, options, "focus_mode");
      
      this.title = title;
      this.body = (options && options.body) || "";
      this.close = function() {};
      this.onclick = null;
      this.onshow = null;
      this.onerror = null;
      this.onclose = null;
      this.addEventListener = function() {};
      this.removeEventListener = function() {};
      return this;
    }

    // 2. Check Specific Mute List
    if (_muteList.includes(title)) {
      _logBlocked(title, options, "strict_mute");
      
      this.title = title;
      this.body = (options && options.body) || "";
      this.close = function() {};
      this.addEventListener = function() {};
      this.removeEventListener = function() {};
      return this;
    }

    // 3. Otherwise, show normally
    return new _OrigNotification(title, options);
  }
  
  _SilentNotification.permission = _OrigNotification.permission;
  _SilentNotification.requestPermission = function() {
    if (_focusModeActive) return Promise.resolve("denied");
    return _OrigNotification.requestPermission.apply(_OrigNotification, arguments);
  };
  _SilentNotification.prototype = _OrigNotification.prototype;

  // === 2. Override ServiceWorkerRegistration.showNotification ===
  if (typeof ServiceWorkerRegistration !== "undefined" && ServiceWorkerRegistration.prototype) {
    const _origShow = ServiceWorkerRegistration.prototype.showNotification;
    ServiceWorkerRegistration.prototype.showNotification = function(title, options) {
      const isPriority = _priorityKeywords.some(kw => 
        title.toLowerCase().includes(kw.toLowerCase()) || 
        (options && options.body && options.body.toLowerCase().includes(kw.toLowerCase()))
      );

      if (isPriority) {
         return _origShow.call(this, title, options);
      }

      if (_focusModeActive || _muteList.includes(title)) {
        _logBlocked(title, options, _focusModeActive ? "focus_mode" : "strict_mute");
        return Promise.resolve();
      }
      return _origShow.call(this, title, options);
    };
  }

  window.Notification = _focusModeActive ? _SilentNotification : _OrigNotification;

  // === 3. Listen for updates from content script ===
  window.addEventListener("__pa_update__", function (e) {
    if (e.detail) {
      if (typeof e.detail.on !== 'undefined') {
          _focusModeActive = !!e.detail.on;
          window.Notification = _focusModeActive ? _SilentNotification : _OrigNotification;
      }
      if (e.detail.mutedWhatsAppChats && Array.isArray(e.detail.mutedWhatsAppChats)) {
        _muteList = e.detail.mutedWhatsAppChats;
      }
      console.log(`🧠 [Script Update] Focus: ${_focusModeActive}, Muted: ${_muteList.length}`);
    }
  });

  // Legacy support for focus event
  window.addEventListener("__pa_focus__", function (e) {
    if (e.detail) {
      _focusModeActive = !!e.detail.on;
      window.Notification = _focusModeActive ? _SilentNotification : _OrigNotification;
    }
  });

  window.addEventListener("__pa_keywords__", function(e) {
    if (e.detail && e.detail.keywords) {
      _priorityKeywords = e.detail.keywords;
      console.log("💎 Priority Personas synced:", _priorityKeywords);
    }
  });
})();
