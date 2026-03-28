import React, { useState, useEffect, useCallback, useRef } from "react";

// ============================================================
// Gmail Notification Manager
// Uses Gmail REST API concepts + extension muting bridge
// ============================================================

const MOCK_SENDERS = [
  { id: "gm-1", name: "GitHub", email: "noreply@github.com", avatar: "GH", category: "Updates", count: 14, muted: false, color: "#24292e" },
  { id: "gm-2", name: "LinkedIn", email: "jobs@linkedin.com", avatar: "LI", category: "Social", count: 6, muted: false, color: "#0A66C2" },
  { id: "gm-3", name: "Jira Alerts", email: "jira@atlassian.com", avatar: "JA", category: "Work", count: 23, muted: false, color: "#0052CC" },
  { id: "gm-4", name: "Coursera", email: "no-reply@coursera.org", avatar: "CO", category: "Promotions", count: 3, muted: false, color: "#0056D2" },
  { id: "gm-5", name: "AWS Billing", email: "billing@amazonaws.com", avatar: "AW", category: "Alerts", count: 2, muted: false, color: "#FF9900" },
  { id: "gm-6", name: "Figma", email: "hello@figma.com", avatar: "FI", category: "Updates", count: 5, muted: false, color: "#F24E1E" },
  { id: "gm-7", name: "Notion", email: "team@makenotion.com", avatar: "NO", category: "Updates", count: 8, muted: false, color: "#ffffff" },
  { id: "gm-8", name: "Stack Overflow", email: "noreply@stackoverflow.com", avatar: "SO", category: "Social", count: 4, muted: false, color: "#F48024" },
];

const CATEGORIES = ["All", "Frequent", "Work", "Personal", "Social", "Promotions", "Updates"];

const MUTE_DURATIONS = [
  { label: "1 Hour", value: 3600000 },
  { label: "8 Hours", value: 28800000 },
  { label: "1 Week", value: 604800000 },
  { label: "Permanently", value: -1 },
];

const GmailManage = ({ setActiveTab, onMuteChange }) => {
  const [senders, setSenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [muteDuration, setMuteDuration] = useState(-1);
  const [muteAll, setMuteAll] = useState(false);
  const [blockCalendar, setBlockCalendar] = useState(false);
  const [digestMode, setDigestMode] = useState(false);
  const [toast, setToast] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState(new Set());

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

const sendMessageToExtension = (type, payload) => {
  return new Promise((resolve, reject) => {
    const requestId = Math.random().toString(36).substring(7);
    
    const handleResponse = (event) => {
      clearTimeout(timeout);
      window.removeEventListener("PA_EXTENSION_RESPONSE_" + requestId, handleResponse);
      resolve(event.detail);
    };

    const timeout = setTimeout(() => {
      window.removeEventListener("PA_EXTENSION_RESPONSE_" + requestId, handleResponse);
      reject(new Error("Bridge timeout"));
    }, 8000);

    window.addEventListener("PA_EXTENSION_RESPONSE_" + requestId, handleResponse);
    window.dispatchEvent(new CustomEvent("PA_DASHBOARD_REQUEST", {
      detail: { type, requestId, ...payload }
    }));
  });
};

  const fetchGmailData = useCallback(async () => {
    setLoading(true);
    setAuthRequired(false);
    try {
      const resp = await sendMessageToExtension("GET_GMAIL_CHATS");
      if (resp?.error === "auth_required") {
        setAuthRequired(true);
        setSenders(MOCK_SENDERS); // Show mock while waiting for auth
      } else if (resp?.chats) {
        // Map to our UI structure
        const realSenders = resp.chats.map(c => ({
          ...c,
          avatar: c.name[0],
          color: avatarColor(c.name),
          muted: false,
          category: c.category || "Updates"
        }));
        setSenders(realSenders);
      } else {
        setSenders(MOCK_SENDERS);
      }
    } catch (e) {
      console.error("Gmail Fetch Error:", e);
      setSenders(MOCK_SENDERS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGmailData();
  }, [fetchGmailData]);

  function avatarColor(name) {
    const colors = ["#EA4335", "#FBBC05", "#34A853", "#4285F4", "#DB4437"];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return colors[Math.abs(h) % colors.length];
  }

  function guessCategory(name) {
    const n = name.toLowerCase();
    if (n.includes("github") || n.includes("jira") || n.includes("notion")) return "Work";
    if (n.includes("linkedin") || n.includes("twitter") || n.includes("facebook")) return "Social";
    if (n.includes("promotion") || n.includes("offer") || n.includes("sale") || n.includes("discount")) return "Promotions";
    if (n.includes("alert") || n.includes("billing") || n.includes("security")) return "Alerts";
    return "Updates";
  }

  const toggleMute = (id) => {
    setSenders((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const newMuted = !s.muted;
        sendMessageToExtension("PLATFORM_MUTE_UPDATE", { platform: "gmail", senderId: id, email: s.email, muted: newMuted, duration: muteDuration });
        showToast(`${s.name} (${s.email}) ${newMuted ? "muted 🔕" : "unmuted 🔔"}`);
        return { ...s, muted: newMuted };
      })
    );
  };

  const applyBulkMute = (mute) => {
    setSenders((prev) => prev.map((s) => selected.has(s.id) ? { ...s, muted: mute } : s));
    sendMessageToExtension("PLATFORM_MUTE_UPDATE", { platform: "gmail", bulk: true, senderIds: Array.from(selected), muted: mute });
    showToast(`${selected.size} senders ${mute ? "muted 🔕" : "unmuted 🔔"}`);
    setSelected(new Set());
    setBulkMode(false);
  };

  const handleMuteAll = (val) => {
    setMuteAll(val);
    setSenders((prev) => prev.map((s) => ({ ...s, muted: val })));
    onMuteChange?.("gmail", val);
    sendMessageToExtension("PLATFORM_MUTE_UPDATE", { platform: "gmail", muteAll: val });
    showToast(val ? "All Gmail notifications muted 🔕" : "Gmail notifications restored 🔔");
  };

  const filtered = senders.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    
    if (!matchSearch) return false;
    if (filterCat === "All") return true;
    if (filterCat === "Frequent") return s.count > 2;
    return s.category === filterCat;
  });

  const mutedCount = senders.filter((s) => s.muted).length;

  return (
    <div className="platform-manage-wrapper">
      {toast && <div className={`platform-toast ${toast.type}`}>{toast.msg}</div>}

      {/* Header */}
      <div className="platform-header gmail-grad">
        <button className="platform-back-btn" onClick={() => setActiveTab("manage")}>← Back</button>
        <div className="platform-header-left">
          <div className="platform-header-icon gmail-icon">
            <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
              <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
            </svg>
          </div>
          <div>
            <h2 className="platform-header-title">Gmail Notifications</h2>
            <p className="platform-header-sub">{mutedCount} of {senders.length} senders muted</p>
          </div>
        </div>
      </div>

      <div className="platform-body">
        {authRequired && (
          <div className="auth-alert">
            <div className="auth-alert-icon">🔑</div>
            <div className="auth-alert-text">
              <strong>Gmail Access Required</strong>
              <p>Authorize the extension to fetch your real email senders for smart muting.</p>
            </div>
            <button className="auth-btn" onClick={fetchGmailData}>Grant Access</button>
          </div>
        )}

        {/* Global Controls */}
        <div className="platform-control-panel">
          <h3 className="platform-section-title">Global Controls</h3>
          <div className="platform-controls-grid">
            <div className="platform-control-item">
              <div className="platform-control-info">
                <span className="platform-control-icon">🔕</span>
                <div>
                  <p className="platform-control-name">Mute All Gmail</p>
                  <p className="platform-control-desc">Silence all inbox notifications</p>
                </div>
              </div>
              <button className={`platform-toggle ${muteAll ? "active gmail-toggle" : ""}`} onClick={() => handleMuteAll(!muteAll)}>
                <span className="platform-toggle-knob" />
              </button>
            </div>

            <div className="platform-control-item">
              <div className="platform-control-info">
                <span className="platform-control-icon">📅</span>
                <div>
                  <p className="platform-control-name">Block Calendar Alerts</p>
                  <p className="platform-control-desc">Mute Google Calendar meeting pings</p>
                </div>
              </div>
              <button className={`platform-toggle ${blockCalendar ? "active gmail-toggle" : ""}`} onClick={() => { setBlockCalendar(!blockCalendar); sendToExtension({ blockCalendar: !blockCalendar }); }}>
                <span className="platform-toggle-knob" />
              </button>
            </div>

            <div className="platform-control-item">
              <div className="platform-control-info">
                <span className="platform-control-icon">📋</span>
                <div>
                  <p className="platform-control-name">Digest Mode</p>
                  <p className="platform-control-desc">Bundle emails into hourly summaries</p>
                </div>
              </div>
              <button className={`platform-toggle ${digestMode ? "active gmail-toggle" : ""}`} onClick={() => { setDigestMode(!digestMode); sendToExtension({ digestMode: !digestMode }); }}>
                <span className="platform-toggle-knob" />
              </button>
            </div>
          </div>

          <div className="platform-duration-row">
            <span className="platform-duration-label">⏱️ Mute Duration:</span>
            <div className="platform-duration-chips">
              {MUTE_DURATIONS.map((d) => (
                <button key={d.value} className={`platform-chip ${muteDuration === d.value ? "active gmail-chip" : ""}`} onClick={() => setMuteDuration(d.value)}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Per-Sender Controls */}
        <div className="platform-chat-panel">
          <div className="platform-chat-header">
            <h3 className="platform-section-title">Senders &amp; Labels</h3>
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
              <input className="platform-search-input" placeholder="Search senders..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="platform-filter-chips">
              {CATEGORIES.map((cat) => (
                <button key={cat} className={`platform-chip ${filterCat === cat ? "active gmail-chip" : ""}`} onClick={() => setFilterCat(cat)}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="platform-chat-list">
            {filtered.map((sender) => (
              <div key={sender.id} className={`platform-chat-item ${sender.muted ? "muted" : ""} ${selected.has(sender.id) ? "selected" : ""}`} onClick={bulkMode ? () => { const next = new Set(selected); next.has(sender.id) ? next.delete(sender.id) : next.add(sender.id); setSelected(next); } : undefined}>
                {bulkMode && (
                  <div className={`platform-checkbox ${selected.has(sender.id) ? "checked gmail-check" : ""}`}>
                    {selected.has(sender.id) && "✓"}
                  </div>
                )}

                <div className="platform-chat-avatar" style={{ background: sender.color, color: sender.color === "#ffffff" ? "#000" : "#fff" }}>
                  {sender.avatar}
                </div>

                <div className="platform-chat-info">
                  <div className="platform-chat-name-row">
                    <span className="platform-chat-name">{sender.name}</span>
                    <span className="platform-badge-cat">{sender.category}</span>
                    {sender.count > 0 && <span className="platform-unread-badge">{sender.count}</span>}
                  </div>
                  <p className="platform-chat-preview">{sender.email}</p>
                </div>

                <div className="platform-chat-right">
                  {!bulkMode && (
                    <button className={`platform-mute-btn ${sender.muted ? "muted-state" : ""}`} onClick={(e) => { e.stopPropagation(); toggleMute(sender.id); }}>
                      {sender.muted ? "🔕 Unmute" : "🔔 Mute"}
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

export default GmailManage;
