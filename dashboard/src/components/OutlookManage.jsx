import React, { useState, useCallback } from "react";

// ============================================================
// Outlook Notification Manager
// Microsoft Graph API concepts + extension muting bridge
// ============================================================

const MOCK_CONTACTS = [
  { id: "ol-1", name: "Sandeep Kumar", email: "sandeep@company.com", avatar: "SK", dept: "Engineering", type: "person", count: 5, muted: false },
  { id: "ol-2", name: "Project Updates", email: "project-updates@company.com", avatar: "PU", dept: "Automated", type: "list", count: 18, muted: false },
  { id: "ol-3", name: "HR Announcements", email: "hr@company.com", avatar: "HR", dept: "HR", type: "list", count: 3, muted: false },
  { id: "ol-4", name: "Anjali Singh", email: "anjali@company.com", avatar: "AS", dept: "Design", type: "person", count: 2, muted: false },
  { id: "ol-5", name: "DevOps Alerts", email: "devops-alerts@company.com", avatar: "DA", dept: "Automated", type: "list", count: 31, muted: false },
  { id: "ol-6", name: "Vikram Mehta", email: "vikram@company.com", avatar: "VM", dept: "Management", type: "person", count: 7, muted: false },
  { id: "ol-7", name: "Weekly Digest", email: "weekly@newsletter.com", avatar: "WD", dept: "Newsletter", type: "list", count: 1, muted: false },
  { id: "ol-8", name: "Sonia Das", email: "sonia@company.com", avatar: "SD", dept: "Marketing", type: "person", count: 4, muted: false },
];

const MUTE_DURATIONS = [
  { label: "30 Min", value: 1800000 },
  { label: "2 Hours", value: 7200000 },
  { label: "End of Day", value: -2 },
  { label: "Permanently", value: -1 },
];

const OutlookManage = ({ setActiveTab, onMuteChange }) => {
  const [contacts, setContacts] = useState(MOCK_CONTACTS);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [muteDuration, setMuteDuration] = useState(-1);
  const [muteAll, setMuteAll] = useState(false);
  const [muteCalendar, setMuteCalendar] = useState(false);
  const [muteTeamsMix, setMuteTeamsMix] = useState(false);
  const [quietHours, setQuietHours] = useState(false);
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
      detail: { type, requestId, platform: "outlook", config }
    }));

    fetch("http://localhost:5001/api/mute-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "outlook", config }),
    }).catch(() => {});
  }, []);

  const toggleMute = (id) => {
    setContacts((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const newMuted = !c.muted;
        sendToExtension({ contactId: id, email: c.email, muted: newMuted, duration: muteDuration });
        showToast(`${c.name} ${newMuted ? "muted 🔕" : "unmuted 🔔"}`);
        return { ...c, muted: newMuted };
      })
    );
  };

  const applyBulkMute = (mute) => {
    setContacts((prev) => prev.map((c) => selected.has(c.id) ? { ...c, muted: mute } : c));
    sendToExtension({ bulk: true, contactIds: Array.from(selected), muted: mute });
    showToast(`${selected.size} contacts ${mute ? "muted 🔕" : "unmuted 🔔"}`);
    setSelected(new Set());
    setBulkMode(false);
  };

  const filtered = contacts.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase());
    if (filter === "person") return matchSearch && c.type === "person";
    if (filter === "list") return matchSearch && c.type === "list";
    if (filter === "muted") return matchSearch && c.muted;
    return matchSearch;
  });

  const mutedCount = contacts.filter((c) => c.muted).length;

  const DEPT_COLORS = {
    Engineering: "#0078D4", Design: "#F7630C", HR: "#00B4D8",
    Management: "#8764B8", Automated: "#C50F1F", Marketing: "#107C10",
    Newsletter: "#F4B400",
  };

  return (
    <div className="platform-manage-wrapper">
      {toast && <div className={`platform-toast ${toast.type}`}>{toast.msg}</div>}

      {/* Header */}
      <div className="platform-header outlook-grad">
        <button className="platform-back-btn" onClick={() => setActiveTab("manage")}>← Back</button>
        <div className="platform-header-left">
          <div className="platform-header-icon outlook-icon">
            <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
              <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.32.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.01V2.62q0-.46.33-.8.33-.32.8-.32h13.67q.46 0 .8.33.32.33.32.8V12zm-7.27-5.86q-.12-.41-.39-.74-.27-.32-.67-.52-.4-.19-.91-.19h-1.34q-.52 0-.91.19-.4.2-.66.52-.27.33-.39.74-.12.41-.12.86t.12.86q.12.41.39.74.26.32.66.52.39.19.91.19h1.34q.51 0 .91-.19.4-.2.67-.52.27-.33.39-.74.12-.41.12-.86t-.12-.86zM16.73 18v-2.78q0-.46-.33-.8-.33-.32-.8-.32H7.4v3.9h9.33z"/>
            </svg>
          </div>
          <div>
            <h2 className="platform-header-title">Outlook Notifications</h2>
            <p className="platform-header-sub">{mutedCount} of {contacts.length} contacts muted</p>
          </div>
        </div>
      </div>

      <div className="platform-body">
        {/* Global Controls */}
        <div className="platform-control-panel">
          <h3 className="platform-section-title">Global Controls</h3>
          <div className="platform-controls-grid">
            <div className="platform-control-item">
              <div className="platform-control-info">
                <span className="platform-control-icon">🔕</span>
                <div>
                  <p className="platform-control-name">Mute All Email</p>
                  <p className="platform-control-desc">Silence all Outlook notifications</p>
                </div>
              </div>
              <button className={`platform-toggle ${muteAll ? "active outlook-toggle" : ""}`} onClick={() => { const v = !muteAll; setMuteAll(v); setContacts(p => p.map(c => ({...c, muted: v}))); onMuteChange?.("outlook", v); sendToExtension({ muteAll: v }); showToast(v ? "All Outlook muted 🔕" : "Outlook restored 🔔"); }}>
                <span className="platform-toggle-knob" />
              </button>
            </div>

            <div className="platform-control-item">
              <div className="platform-control-info">
                <span className="platform-control-icon">📅</span>
                <div>
                  <p className="platform-control-name">Mute Calendar Reminders</p>
                  <p className="platform-control-desc">Block meeting &amp; event popups</p>
                </div>
              </div>
              <button className={`platform-toggle ${muteCalendar ? "active outlook-toggle" : ""}`} onClick={() => { setMuteCalendar(!muteCalendar); sendToExtension({ muteCalendar: !muteCalendar }); }}>
                <span className="platform-toggle-knob" />
              </button>
            </div>

            <div className="platform-control-item">
              <div className="platform-control-info">
                <span className="platform-control-icon">🌙</span>
                <div>
                  <p className="platform-control-name">Quiet Hours (10pm–8am)</p>
                  <p className="platform-control-desc">Auto-mute outside work hours</p>
                </div>
              </div>
              <button className={`platform-toggle ${quietHours ? "active outlook-toggle" : ""}`} onClick={() => { setQuietHours(!quietHours); sendToExtension({ quietHours: !quietHours }); }}>
                <span className="platform-toggle-knob" />
              </button>
            </div>

            <div className="platform-control-item">
              <div className="platform-control-info">
                <span className="platform-control-icon">💬</span>
                <div>
                  <p className="platform-control-name">Suppress Teams Crossover</p>
                  <p className="platform-control-desc">Don't echo Teams msgs in Outlook</p>
                </div>
              </div>
              <button className={`platform-toggle ${muteTeamsMix ? "active outlook-toggle" : ""}`} onClick={() => { setMuteTeamsMix(!muteTeamsMix); sendToExtension({ suppressTeamsCrossover: !muteTeamsMix }); }}>
                <span className="platform-toggle-knob" />
              </button>
            </div>
          </div>

          <div className="platform-duration-row">
            <span className="platform-duration-label">⏱️ Mute Duration:</span>
            <div className="platform-duration-chips">
              {MUTE_DURATIONS.map((d) => (
                <button key={d.value} className={`platform-chip ${muteDuration === d.value ? "active outlook-chip" : ""}`} onClick={() => setMuteDuration(d.value)}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Per-Contact Controls */}
        <div className="platform-chat-panel">
          <div className="platform-chat-header">
            <h3 className="platform-section-title">Contacts &amp; Lists</h3>
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
              <input className="platform-search-input" placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="platform-filter-chips">
              {["all", "person", "list", "muted"].map((f) => (
                <button key={f} className={`platform-chip ${filter === f ? "active outlook-chip" : ""}`} onClick={() => setFilter(f)}>
                  {f === "all" ? "All" : f === "person" ? "👤 People" : f === "list" ? "📧 Lists" : "🔕 Muted"}
                </button>
              ))}
            </div>
          </div>

          <div className="platform-chat-list">
            {filtered.map((contact) => (
              <div key={contact.id} className={`platform-chat-item ${contact.muted ? "muted" : ""} ${selected.has(contact.id) ? "selected" : ""}`} onClick={bulkMode ? () => { const next = new Set(selected); next.has(contact.id) ? next.delete(contact.id) : next.add(contact.id); setSelected(next); } : undefined}>
                {bulkMode && (
                  <div className={`platform-checkbox ${selected.has(contact.id) ? "checked outlook-check" : ""}`}>
                    {selected.has(contact.id) && "✓"}
                  </div>
                )}

                <div className="platform-chat-avatar" style={{ background: DEPT_COLORS[contact.dept] || "#0078D4" }}>
                  {contact.avatar}
                </div>

                <div className="platform-chat-info">
                  <div className="platform-chat-name-row">
                    <span className="platform-chat-name">{contact.name}</span>
                    <span className="platform-badge-cat">{contact.dept}</span>
                    {contact.count > 0 && <span className="platform-unread-badge">{contact.count}</span>}
                  </div>
                  <p className="platform-chat-preview">{contact.email}</p>
                </div>

                <div className="platform-chat-right">
                  {!bulkMode && (
                    <button className={`platform-mute-btn ${contact.muted ? "muted-state" : ""}`} onClick={(e) => { e.stopPropagation(); toggleMute(contact.id); }}>
                      {contact.muted ? "🔕 Unmute" : "🔔 Mute"}
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

export default OutlookManage;
