// ============================================================
// 🛡️ PAGE CONTEXT NOTIFICATION BLOCKER
// Context-Aware Productivity Assistant
// Runs in the MAIN world to override window.Notification
// ============================================================

(function() {
  "use strict";
  
  // State: whether focus mode is currently active
  let _focusModeActive = false;
  let _muteList = []; // Array of chat names to mute

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
    // 1. Check Global Focus Mode
    if (_focusModeActive) {
      _logBlocked(title, options, "focus_mode");
      
      this.title = title;
      this.body = (options && options.body) || "";
      this.close = function() {};
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
      if (_focusModeActive || _muteList.includes(title)) {
        _logBlocked(title, options, _focusModeActive ? "focus_mode" : "strict_mute");
        return Promise.resolve();
      }
      return _origShow.call(this, title, options);
    };
  }

  window.Notification = _SilentNotification;

  // === 3. Listen for updates from content script ===
  window.addEventListener("__pa_update__", function (e) {
    if (e.detail) {
      if (typeof e.detail.on !== 'undefined') _focusModeActive = !!e.detail.on;
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
    }
  });
})();
