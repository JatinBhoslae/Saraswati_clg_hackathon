// ============================================================
// 🛡️ PAGE CONTEXT NOTIFICATION BLOCKER
// Context-Aware Productivity Assistant
// Runs in the MAIN world to override window.Notification
// ============================================================

(function() {
  "use strict";
  
  // State: whether focus mode is currently active
  let _focusBlocking = false;

  // === 1. Override window.Notification ===
  const _OrigNotification = window.Notification;
  
  function _SilentNotification(title, options) {
    if (_focusBlocking) {
      console.log("🔕 [Focus Mode] Notification blocked:", title);
      
      // 🔔 FIRE EVENT so content script can count this block
      window.dispatchEvent(new CustomEvent("__pa_notif_blocked__", {
        detail: { title: title, body: (options && options.body) || "", source: "notification" }
      }));
      
      // Return a dummy object so the site doesn't crash
      this.title = title;
      this.body = (options && options.body) || "";
      this.close = function() {};
      this.addEventListener = function() {};
      this.removeEventListener = function() {};
      return this;
    }
    return new _OrigNotification(title, options);
  }
  
  _SilentNotification.permission = _OrigNotification.permission;
  _SilentNotification.requestPermission = function() {
    if (_focusBlocking) return Promise.resolve("denied");
    return _OrigNotification.requestPermission.apply(_OrigNotification, arguments);
  };
  _SilentNotification.prototype = _OrigNotification.prototype;

  // === 2. Override ServiceWorkerRegistration.showNotification ===
  if (typeof ServiceWorkerRegistration !== "undefined" && ServiceWorkerRegistration.prototype) {
    const _origShow = ServiceWorkerRegistration.prototype.showNotification;
    ServiceWorkerRegistration.prototype.showNotification = function(title, options) {
      if (_focusBlocking) {
        console.log("🔕 [Focus Mode] Push notification blocked:", title);
        
        // 🔔 FIRE EVENT so content script can count this block
        window.dispatchEvent(new CustomEvent("__pa_notif_blocked__", {
          detail: { title: title, body: (options && options.body) || "", source: "push" }
        }));
        
        return Promise.resolve();
      }
      return _origShow.call(this, title, options);
    };
  }

  // === 3. Listen for focus mode toggle from content script ===
  window.addEventListener("__pa_focus__", function(e) {
    _focusBlocking = !!(e.detail && e.detail.on);
    window.Notification = _focusBlocking ? _SilentNotification : _OrigNotification;
    console.log(_focusBlocking
      ? "🔕 All notifications BLOCKED"
      : "🔔 Notifications restored");
  });
})();
