import React, { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import * as Tooltip from '@radix-ui/react-tooltip';

export default function ActionCenter() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000); // Polling for demo
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("http://localhost:5001/api/notifications");
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, actionType, payload = {}) => {
    try {
      await fetch(`http://localhost:5001/api/notifications/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType, payload }),
      });
      // Optimistic update
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Action error:", err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await fetch(`http://localhost:5001/api/notifications/${id}/read`, { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {}
  };

  // Quick Action Forms
  const ReplyBox = ({ notif }) => {
    const [replyText, setReplyText] = useState("");

    return (
      <div className="mt-3 flex gap-2 w-full animate-fade-in">
        <input
          type="text"
          className="flex-1 bg-[var(--surface)] text-[var(--text-primary)] px-3 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:border-[var(--primary)] text-sm transition-colors"
          placeholder={`Reply to ${notif.sender}...`}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && replyText.trim()) {
              handleAction(notif.id, "reply", { text: replyText });
            }
          }}
        />
        <button
          className="bg-[var(--primary)] text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-opacity-90 transition-opacity"
          onClick={() => {
            if (replyText.trim()) handleAction(notif.id, "reply", { text: replyText });
          }}
        >
          Send
        </button>
      </div>
    );
  };

  const NotificationCard = ({ notif }) => {
    const [showReply, setShowReply] = useState(false);

    // Dynamic styles based on decision
    const getBadgeStyle = (decision) => {
      switch (decision) {
        case "deliver": return "bg-green-500/10 text-green-500 border border-green-500/20";
        case "delay": return "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20";
        case "suppress": return "bg-red-500/10 text-red-500 border border-red-500/20";
        default: return "bg-gray-500/10 text-gray-400";
      }
    };

    const getPlatformIcon = (platform) => {
      switch (platform.toLowerCase()) {
        case "whatsapp": return "💬";
        case "gmail": return "📧";
        case "slack": return "👔";
        default: return "🔔";
      }
    };

    return (
      <div 
        className={`p-4 rounded-xl border transition-all duration-300 ${
          notif.read ? "bg-[var(--surface)] border-[var(--border)]" : "bg-[var(--surface-light)] border-[var(--primary)] shadow-sm"
        }`}
        onMouseEnter={() => !notif.read && markAsRead(notif.id)}
      >
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-[var(--surface-dark)] flex items-center justify-center text-xl shrink-0 border border-[var(--border)]">
              {getPlatformIcon(notif.platform)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-[var(--text-primary)] truncate">
                  {notif.sender}
                </span>
                <span className="text-xs text-[var(--text-secondary)] shrink-0">
                  • {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                {notif.content}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <span className={`text-xs px-2 py-1 rounded-full uppercase tracking-wider font-bold ${getBadgeStyle(notif.decision)} cursor-help`}>
                    {notif.decision}
                  </span>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content className="bg-gray-900 text-white p-2 rounded text-xs max-w-xs shadow-xl" sideOffset={5}>
                    {notif.reason}
                    <Tooltip.Arrow className="fill-gray-900" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </Tooltip.Provider>

            <div className="flex gap-2 opacity-50 hover:opacity-100 transition-opacity">
              <button 
                onClick={() => setShowReply(!showReply)}
                className="p-1.5 hover:bg-[var(--surface-dark)] rounded-md text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
                title="Reply"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11" /></svg>
              </button>
              <button 
                onClick={() => handleAction(notif.id, 'archive')}
                className="p-1.5 hover:bg-[var(--surface-dark)] rounded-md text-[var(--text-secondary)] hover:text-red-400 transition-colors"
                title="Archive"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" /></svg>
              </button>
            </div>
          </div>
        </div>

        {showReply && <ReplyBox notif={notif} />}
      </div>
    );
  };

  return (
    <div className="p-6 max-h-[calc(100vh-64px)] overflow-y-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Unified Action Center
          </h2>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            AI-Filtered Cross-App Workflow Hub
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-[var(--surface)] border border-[var(--border)] px-4 py-2 rounded-xl text-sm font-medium">
          <div className="flex items-center gap-2 text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            Delivered: {notifications.filter(n => n.decision === 'deliver').length}
          </div>
          <div className="flex items-center gap-2 text-yellow-400">
            <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
            Delayed: {notifications.filter(n => n.decision === 'delay').length}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto flex flex-col gap-4">
        {loading ? (
          <div className="text-center py-10 text-[var(--text-secondary)] animate-pulse">
            Syncing AI Router State...
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 bg-[var(--surface)] rounded-2xl border border-[var(--border)] border-dashed">
            <div className="text-4xl mb-4">🌟</div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Inbox Zero</h3>
            <p className="text-[var(--text-secondary)] mt-2 max-w-sm mx-auto">
              Your context is protected. AI router hasn't let any distractions through.
            </p>
          </div>
        ) : (
          notifications.map((notif) => (
            <NotificationCard key={notif.id} notif={notif} />
          ))
        )}
      </div>
    </div>
  );
}
