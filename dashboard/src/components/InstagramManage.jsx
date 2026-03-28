import React, { useState, useCallback } from "react";

// ============================================================
// Instagram Notification Manager
// Instagram Graph API concepts + extension muting bridge
// ============================================================

const MOCK_ACCOUNTS = [
  { id: "ig-1", name: "dev.vibes", displayName: "Dev Vibes 💻", type: "account", avatar: "DV", followers: "124K", lastAction: "Story mention", count: 5, muted: false, color: "#E1306C" },
  { id: "ig-2", name: "design_daily", displayName: "Design Daily", type: "account", avatar: "DD", followers: "89K", lastAction: "Comment on your post", count: 2, muted: false, color: "#833AB4" },
  { id: "ig-3", name: "techcrunch", displayName: "TechCrunch", type: "account", avatar: "TC", followers: "8.2M", lastAction: "Tagged you", count: 0, muted: false, color: "#405DE6" },
  { id: "ig-4", name: "friends_squad", displayName: "Friends Squad 🎉", type: "group", avatar: "FS", followers: null, lastAction: "New collab post", count: 9, muted: false, color: "#C13584" },
  { id: "ig-5", name: "priya_creates", displayName: "Priya Creates", type: "account", avatar: "PC", followers: "34K", lastAction: "DM request", count: 1, muted: false, color: "#E1306C" },
  { id: "ig-6", name: "random_reels", displayName: "Random Reels", type: "account", avatar: "RR", followers: "210K", lastAction: "Liked your reel", count: 47, muted: false, color: "#833AB4" },
  { id: "ig-7", name: "college_batch", displayName: "College Batch 🎓", type: "group", avatar: "CB", followers: null, lastAction: "Thread reply", count: 13, muted: false, color: "#405DE6" },
];

const NOTIF_TYPES = [
  { id: "likes", label: "❤️ Likes", desc: "Post & reel likes" },
  { id: "comments", label: "💬 Comments", desc: "Post comments" },
  { id: "mentions", label: "📣 Mentions", desc: "Story & post tags" },
  { id: "dms", label: "✉️ DMs", desc: "Direct messages" },
  { id: "requests", label: "👋 Requests", desc: "Follow requests" },
  { id: "live", label: "🔴 Live", desc: "Live start alerts" },
];

const MUTE_DURATIONS = [
  { label: "1 Hour", value: 3600000 },
  { label: "8 Hours", value: 28800000 },
  { label: "Forever", value: -1 },
];

const InstagramManage = ({ setActiveTab, onMuteChange }) => {
  const [accounts, setAccounts] = useState(MOCK_ACCOUNTS);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [muteDuration, setMuteDuration] = useState(-1);
  const [muteAll, setMuteAll] = useState(false);
  const [mutedTypes, setMutedTypes] = useState(new Set());
  const [toast, setToast] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const sendToExtension = useCallback((config) => {
    const type = "PLATFORM_MUTE_UPDATE";
    const requestId = Math.random().toString(36).substring(7);
    
    window.dispatchEvent(new CustomEvent("PA_DASHBOARD_REQUEST", {
      detail: { type, requestId, platform: "instagram", config }
    }));

    fetch("http://localhost:5001/api/mute-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "instagram", config }),
    }).catch(() => {});
  }, []);

  const toggleMute = (id) => {
    setAccounts((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const newMuted = !a.muted;
        sendToExtension({ accountId: id, username: a.name, muted: newMuted, duration: muteDuration });
        showToast(`@${a.name} ${newMuted ? "muted 🔕" : "unmuted 🔔"}`);
        return { ...a, muted: newMuted };
      })
    );
  };

  const toggleNotifType = (typeId) => {
    setMutedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(typeId)) {
        next.delete(typeId);
        sendToExtension({ muteNotifType: typeId, muted: false });
        showToast(`${typeId} notifications restored 🔔`);
      } else {
        next.add(typeId);
        sendToExtension({ muteNotifType: typeId, muted: true });
        showToast(`${typeId} notifications muted 🔕`);
      }
      return next;
    });
  };

  const applyBulkMute = (mute) => {
    setAccounts((prev) => prev.map((a) => selected.has(a.id) ? { ...a, muted: mute } : a));
    sendToExtension({ bulk: true, accountIds: Array.from(selected), muted: mute });
    showToast(`${selected.size} accounts ${mute ? "muted 🔕" : "unmuted 🔔"}`);
    setSelected(new Set());
    setBulkMode(false);
  };

  const filtered = accounts.filter((a) => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.displayName.toLowerCase().includes(search.toLowerCase());
    if (filter === "account") return matchSearch && a.type === "account";
    if (filter === "group") return matchSearch && a.type === "group";
    if (filter === "muted") return matchSearch && a.muted;
    return matchSearch;
  });

  const mutedCount = accounts.filter((a) => a.muted).length;

  return (
    <div className="platform-manage-wrapper">
      {toast && <div className={`platform-toast ${toast.type}`}>{toast.msg}</div>}

      {/* Header */}
      <div className="platform-header instagram-grad">
        <button className="platform-back-btn" onClick={() => setActiveTab("manage")}>← Back</button>
        <div className="platform-header-left">
          <div className="platform-header-icon ig-icon">
            <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
          </div>
          <div>
            <h2 className="platform-header-title">Instagram Notifications</h2>
            <p className="platform-header-sub">{mutedCount} accounts muted · {mutedTypes.size} types silenced</p>
          </div>
        </div>
      </div>

      <div className="platform-body">
        {/* Notification Type Controls */}
        <div className="platform-control-panel">
          <h3 className="platform-section-title">Notification Types</h3>
          <div className="ig-notif-types-grid">
            {NOTIF_TYPES.map((t) => (
              <button
                key={t.id}
                className={`ig-notif-type-card ${mutedTypes.has(t.id) ? "muted-type" : ""}`}
                onClick={() => toggleNotifType(t.id)}
              >
                <span className="ig-notif-type-icon">{t.label.split(" ")[0]}</span>
                <span className="ig-notif-type-name">{t.label.split(" ").slice(1).join(" ")}</span>
                <span className="ig-notif-type-desc">{t.desc}</span>
                <span className={`ig-notif-type-state ${mutedTypes.has(t.id) ? "off" : "on"}`}>
                  {mutedTypes.has(t.id) ? "OFF" : "ON"}
                </span>
              </button>
            ))}
          </div>

          <div className="platform-duration-row" style={{ marginTop: 16 }}>
            <div className="platform-control-item" style={{ marginBottom: 12 }}>
              <div className="platform-control-info">
                <span className="platform-control-icon">🔕</span>
                <div>
                  <p className="platform-control-name">Mute All Instagram</p>
                  <p className="platform-control-desc">Silence all IG notifications instantly</p>
                </div>
              </div>
              <button className={`platform-toggle ${muteAll ? "active ig-toggle" : ""}`} onClick={() => { const v = !muteAll; setMuteAll(v); setAccounts(p => p.map(a => ({...a, muted: v}))); onMuteChange?.("instagram", v); sendToExtension({ muteAll: v }); showToast(v ? "All Instagram muted 🔕" : "Instagram restored 🔔"); }}>
                <span className="platform-toggle-knob" />
              </button>
            </div>

            <span className="platform-duration-label">⏱️ Mute Duration:</span>
            <div className="platform-duration-chips">
              {MUTE_DURATIONS.map((d) => (
                <button key={d.value} className={`platform-chip ${muteDuration === d.value ? "active ig-chip" : ""}`} onClick={() => setMuteDuration(d.value)}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Per-Account Controls */}
        <div className="platform-chat-panel">
          <div className="platform-chat-header">
            <h3 className="platform-section-title">Accounts &amp; Threads</h3>
            <div className="platform-chat-actions">
              <button className={`platform-action-btn ${bulkMode ? "active" : ""}`} onClick={() => { setBulkMode(!bulkMode); setSelected(new Set()); }}>
                {bulkMode ? "✕ Cancel" : "☑ Bulk Select"}
              </button>
              {bulkMode && selected.size > 0 && (
                <>
                  <button className="platform-action-btn danger" onClick={() => applyBulkMute(true)}>🔕 Mute {selected.size}</button>
                  <button className="platform-action-btn success" onClick={() => applyBulkMute(false)}>🔔 Unmute {selected.size}</button>
                </>
              )}
            </div>
          </div>

          <div className="platform-search-filter">
            <div className="platform-search-wrap">
              <span className="platform-search-icon">🔍</span>
              <input className="platform-search-input" placeholder="Search accounts..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="platform-filter-chips">
              {["all", "account", "group", "muted"].map((f) => (
                <button key={f} className={`platform-chip ${filter === f ? "active ig-chip" : ""}`} onClick={() => setFilter(f)}>
                  {f === "all" ? "All" : f === "account" ? "👤 Accounts" : f === "group" ? "👥 Threads" : "🔕 Muted"}
                </button>
              ))}
            </div>
          </div>

          <div className="platform-chat-list">
            {filtered.map((account) => (
              <div key={account.id} className={`platform-chat-item ${account.muted ? "muted" : ""} ${selected.has(account.id) ? "selected" : ""}`} onClick={bulkMode ? () => { const next = new Set(selected); next.has(account.id) ? next.delete(account.id) : next.add(account.id); setSelected(next); } : undefined}>
                {bulkMode && (
                  <div className={`platform-checkbox ${selected.has(account.id) ? "checked ig-check" : ""}`}>
                    {selected.has(account.id) && "✓"}
                  </div>
                )}

                <div className="platform-chat-avatar ig-avatar" style={{ background: `linear-gradient(135deg, ${account.color}, #833AB4)` }}>
                  {account.avatar}
                </div>

                <div className="platform-chat-info">
                  <div className="platform-chat-name-row">
                    <span className="platform-chat-name">{account.displayName}</span>
                    {account.followers && <span className="platform-badge-cat">{account.followers}</span>}
                    {account.count > 0 && <span className="platform-unread-badge">{account.count}</span>}
                  </div>
                  <p className="platform-chat-preview">@{account.name} · {account.lastAction}</p>
                </div>

                <div className="platform-chat-right">
                  {!bulkMode && (
                    <button className={`platform-mute-btn ${account.muted ? "muted-state" : ""}`} onClick={(e) => { e.stopPropagation(); toggleMute(account.id); }}>
                      {account.muted ? "🔕 Unmute" : "🔔 Mute"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstagramManage;
