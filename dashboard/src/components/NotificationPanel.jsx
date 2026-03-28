import React from "react";

const NotificationPanel = ({ blockedNotifications }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-6 relative overflow-hidden mt-6">
      {/* Glow effect */}
      <div className="absolute -left-6 -top-6 w-32 h-32 rounded-full blur-3xl opacity-20 bg-gradient-to-br from-rose-500 to-orange-500" />

      <h3 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2 mb-4 relative z-10">
        <span>🔕</span> Blocked Notifications
      </h3>

      {blockedNotifications > 0 ? (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-5 mb-4 isolate text-rose-300">
          <p className="font-semibold text-rose-400 mb-1">
            Focus Mode Saved You!
          </p>
          <p className="text-sm">
            You missed <strong>{blockedNotifications}</strong> distracting
            notifications while in focus mode.
          </p>
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 mb-4 text-slate-400">
          <p className="text-sm">
            No notifications have been blocked today. Turn on Focus Mode to automatically block push notifications!
          </p>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
