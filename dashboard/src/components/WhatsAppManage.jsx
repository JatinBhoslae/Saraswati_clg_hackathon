import React, { useState, useEffect, useCallback, useRef } from "react";

/**
 * BRIDGE UTILITY
 * Sends a message via CustomEvent, which is intercepted by content.js and relayed to background.js
 */
const sendMessageToExtension = (type, payload) => {
  return new Promise((resolve, reject) => {
    const requestId = Math.random().toString(36).substring(7);
    
    const handleResponse = (event) => {
      clearTimeout(timeout);
      window.removeEventListener("PA_EXTENSION_RESPONSE_" + requestId, handleResponse);
      console.log(`🛠️ Bridge: Response for [${type}] (id: ${requestId}):`, event.detail);
      resolve(event.detail);
    };

    const timeout = setTimeout(() => {
      window.removeEventListener("PA_EXTENSION_RESPONSE_" + requestId, handleResponse);
      console.warn(`🛠️ Bridge: Timeout for [${type}] (id: ${requestId})`);
      reject(new Error("Bridge timeout"));
    }, 8000);

    window.addEventListener("PA_EXTENSION_RESPONSE_" + requestId, handleResponse);

    console.log(`🛠️ Bridge: Outgoing [${type}] (id: ${requestId})`);
    
    // Dispatch CustomEvent to be caught by content script
    window.dispatchEvent(new CustomEvent("PA_DASHBOARD_REQUEST", {
      detail: { type, requestId, ...payload }
    }));
  });
};

const MUTE_DURATIONS = [
  { label: "1h", value: 3600000 },
  { label: "8h", value: 28800000 },
  { label: "24h", value: 86400000 },
  { label: "∞", value: -1 },
];

function guessCategory(name) {
  const n = name.toLowerCase();
  const familyKeywords = ["family", "fam", "home", "mom", "mum", "dad", "bro", "sis", "papa", "mama", "parents", "wife", "husband", "bhai", "behan"];
  const workKeywords = ["work", "office", "project", "team", "alpha", "beta", "dev", "hackathon", "cto", "standup"];
  if (familyKeywords.some((k) => n.includes(k))) return "family";
  if (workKeywords.some((k) => n.includes(k))) return "work";
  return "friends";
}

const WA_COLORS = ["#25D366", "#128C7E", "#075E54", "#34B7F1", "#25D366"];
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return WA_COLORS[Math.abs(h) % WA_COLORS.length];
}
function initials(name) {
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");
}

const WhatsAppManage = ({ setActiveTab, onMuteChange }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noTab, setNoTab] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [muteAll, setMuteAll] = useState(false);
  const [muteTabAudio, setMuteTabAudio] = useState(false);
  const [blockPush, setBlockPush] = useState(false);
  const [muteDuration, setMuteDuration] = useState(-1);
  const [toast, setToast] = useState(null);
  const [extConnected, setExtConnected] = useState(false);
  const [categoryMutes, setCategoryMutes] = useState({ friends: false, family: false, work: false });
  const pollRef = useRef(null);

  useEffect(() => {
    // We assume extension is present if we are at this dashboard
    setExtConnected(true);
    fetchChats();
    pollRef.current = setInterval(fetchChats, 15000);
    return () => clearInterval(pollRef.current);
  }, []);

  const fetchChats = useCallback(async () => {
    try {
      const resp = await sendMessageToExtension("GET_WHATSAPP_CHATS");
      if (!resp) {
        console.warn("[Bridge] No response from extension bridge");
        setLoading(false);
        // We don't setNoTab(true) yet because it might just be a timeout
        return;
      }

      if (resp.noTab) {
        setNoTab(true);
      } else if (resp.error) {
        console.error("[Bridge] Extension reported error:", resp.error);
        if (resp.error === "could_not_connect_to_tab") {
          setNoTab(true); // Treat connection error as "not open/ready"
        }
      } else {
        setNoTab(false);
      }

      if (resp.chats?.length > 0) {
        populateChats(resp.chats);
      } else if (!resp.noTab) {
        console.log("[Bridge] Extension connected but no chats found in tab.");
      }
      setLoading(false);
    } catch (err) {
      console.error("[Bridge] Critical failure:", err);
      setLoading(false);
    }
  }, []);

  const populateChats = (rawChats) => {
    setContacts((prev) => {
      const existingMap = new Map(prev.map((c) => [c.name, c]));
      return rawChats.map((c, idx) => {
        const existing = existingMap.get(c.name);
        return {
          id: c.id || `wa_${idx}`,
          name: c.name,
          lastMsg: c.lastMsg || "",
          time: c.time || "",
          unread: c.unread || 0,
          isGroup: c.isGroup || false,
          initials: initials(c.name),
          color: avatarColor(c.name),
          category: guessCategory(c.name),
          muted: existing?.muted ?? false,
        };
      });
    });
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const sendMuteCmd = (config) => {
    sendMessageToExtension("PLATFORM_MUTE_UPDATE", {
      platform: "whatsapp",
      config,
    });
    fetch("http://localhost:5001/api/mute-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: "whatsapp", config }),
    }).catch(() => {});
  };

  const toggleMute = (id) => {
    setContacts((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const nm = !c.muted;
        sendMuteCmd({ contactId: id, name: c.name, muted: nm, duration: muteDuration });
        showToast(`${c.name} ${nm ? "muted 🔕" : "unmuted 🔔"}`);
        return { ...c, muted: nm };
      })
    );
  };

  const toggleBulkSelect = (id) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const applyBulkMute = (mute) => {
    setContacts((prev) => prev.map((c) => (selected.has(c.id) ? { ...c, muted: mute } : c)));
    sendMuteCmd({
      bulk: true,
      contactIds: Array.from(selected),
      muted: mute,
      duration: muteDuration,
    });
    showToast(`${selected.size} chats ${mute ? "muted 🔕" : "unmuted 🔔"}`);
    setSelected(new Set());
    setBulkMode(false);
  };

  const handleMuteAll = (val) => {
    setMuteAll(val);
    setContacts((prev) => prev.map((c) => ({ ...c, muted: val })));
    sendMuteCmd({ muteAll: val, duration: muteDuration });
    onMuteChange?.("whatsapp", val);
    showToast(val ? "All WhatsApp chats muted 🔕" : "All WhatsApp chats unmuted 🔔");
  };

  const muteCategory = (category) => {
    const nowMuted = !categoryMutes[category];
    setCategoryMutes((prev) => ({ ...prev, [category]: nowMuted }));
    const affected = [];
    setContacts((prev) =>
      prev.map((c) => {
        if (c.category !== category) return c;
        affected.push({ id: c.id, name: c.name });
        return { ...c, muted: nowMuted };
      })
    );
    sendMuteCmd({
      category,
      contactIds: affected.map((a) => a.id),
      names: affected.map((a) => a.name),
      muted: nowMuted,
      duration: muteDuration,
    });
    const emoji = { friends: "👫", family: "🏠", work: "💼" }[category];
    showToast(`${emoji} ${category} ${nowMuted ? "muted 🔕" : "unmuted 🔔"}`, nowMuted ? "danger" : "success");
  };

  const filtered = contacts.filter((c) => {
    const ms = c.name.toLowerCase().includes(search.toLowerCase());
    if (filter === "contacts") return ms && !c.isGroup;
    if (filter === "groups") return ms && c.isGroup;
    if (filter === "muted") return ms && c.muted;
    if (filter === "friends") return ms && c.category === "friends";
    if (filter === "family") return ms && c.category === "family";
    if (filter === "work") return ms && c.category === "work";
    return ms;
  });

  const mutedCount = contacts.filter((c) => c.muted).length;
  const catCount = { friends: 0, family: 0, work: 0 };
  contacts.forEach((c) => { if (catCount[c.category] !== undefined) catCount[c.category]++; });

  return (
    <div className="platform-manage-wrapper">
      {toast && <div className={`platform-toast ${toast.type}`}>{toast.msg}</div>}
      <div className="platform-header whatsapp-grad">
        <button className="platform-back-btn" onClick={() => setActiveTab("manage")}>← Back</button>
        <div className="platform-header-left">
          <div className="platform-header-icon wa-icon">
            <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12.004 2C6.476 2 2 6.478 2 12.008c0 1.76.459 3.466 1.333 4.972L2.05 22l5.168-1.354A9.933 9.933 0 0012.004 22C17.532 22 22 17.522 22 12.008 22 6.476 17.532 2 12.004 2z"/>
            </svg>
          </div>
          <div>
            <h2 className="platform-header-title">WhatsApp Notifications</h2>
            <p className="platform-header-sub">
              {loading ? "Fetching your chats…" : `${mutedCount} of ${contacts.length} chats muted`}
            </p>
          </div>
        </div>
      </div>

      <div className="platform-body">
        {noTab && (
          <div className="wa-notab-banner">
            <span className="wa-notab-icon">⚠️</span>
            <div>
              <p className="wa-notab-title">WhatsApp Web not open</p>
              <p className="wa-notab-sub">
                Open <a href="https://web.whatsapp.com" target="_blank" rel="noreferrer" className="wa-link">web.whatsapp.com</a> to load your real chats.
              </p>
            </div>
          </div>
        )}

        <div className="platform-control-panel" style={{ marginBottom: 0 }}>
          <h3 className="platform-section-title" style={{ marginBottom: "10px" }}>Smart Mute Groups</h3>
          <div className="smart-mute-row">
            <button className={`smart-mute-btn friends-btn ${categoryMutes.friends ? "active-mute" : ""}`} onClick={() => muteCategory("friends")}>
              <span className="smart-mute-icon">👫</span>
              <span className="smart-mute-label">{categoryMutes.friends ? "Unmute" : "Mute"} Friends</span>
              <span className="smart-mute-count">{catCount.friends}</span>
            </button>
            <button className={`smart-mute-btn family-btn ${categoryMutes.family ? "active-mute" : ""}`} onClick={() => muteCategory("family")}>
              <span className="smart-mute-icon">🏠</span>
              <span className="smart-mute-label">{categoryMutes.family ? "Unmute" : "Mute"} Family</span>
              <span className="smart-mute-count">{catCount.family}</span>
            </button>
            <button className={`smart-mute-btn work-btn ${categoryMutes.work ? "active-mute" : ""}`} onClick={() => muteCategory("work")}>
              <span className="smart-mute-icon">💼</span>
              <span className="smart-mute-label">{categoryMutes.work ? "Unmute" : "Mute"} Work</span>
              <span className="smart-mute-count">{catCount.work}</span>
            </button>
          </div>
        </div>

        <div className="platform-control-panel">
          <h3 className="platform-section-title">Global Controls</h3>
          <div className="platform-controls-grid">
            <div className="platform-control-item">
              <div className="platform-control-info">
                <span className="platform-control-icon">🔕</span>
                <div>
                  <p className="platform-control-name">Mute All Chats</p>
                  <p className="platform-control-desc">Silence every conversation</p>
                </div>
              </div>
              <button className={`platform-toggle ${muteAll ? "active wa-toggle" : ""}`} onClick={() => handleMuteAll(!muteAll)}>
                <span className="platform-toggle-knob" />
              </button>
            </div>
            <div className="platform-control-item">
              <div className="platform-control-info">
                <span className="platform-control-icon">🔇</span>
                <div>
                  <p className="platform-control-name">Mute Tab Audio</p>
                  <p className="platform-control-desc">Silence WhatsApp sounds</p>
                </div>
              </div>
              <button className={`platform-toggle ${muteTabAudio ? "active wa-toggle" : ""}`} onClick={() => { setMuteTabAudio(!muteTabAudio); sendMuteCmd({ muteTabAudio: !muteTabAudio }); }}>
                <span className="platform-toggle-knob" />
              </button>
            </div>
            <div className="platform-control-item">
              <div className="platform-control-info">
                <span className="platform-control-icon">🚫</span>
                <div>
                  <p className="platform-control-name">Block Push Notifications</p>
                  <p className="platform-control-desc">Prevent browser alerts</p>
                </div>
              </div>
              <button className={`platform-toggle ${blockPush ? "active wa-toggle" : ""}`} onClick={() => { setBlockPush(!blockPush); sendMuteCmd({ blockPushNotifications: !blockPush }); }}>
                <span className="platform-toggle-knob" />
              </button>
            </div>
          </div>
        </div>

        <div className="platform-chat-panel">
          <div className="platform-chat-header">
            <h3 className="platform-section-title">Chats &amp; Groups</h3>
            <div className="platform-chat-actions">
              <button className={`platform-action-btn ${bulkMode ? "active" : ""}`} onClick={() => { setBulkMode(!bulkMode); setSelected(new Set()); }}>
                {bulkMode ? "✕ Cancel" : "☑ Bulk Select"}
              </button>
              {bulkMode && selected.size > 0 && (
                <>
                  <button className="platform-action-btn danger" onClick={() => applyBulkMute(true)}>Mute {selected.size}</button>
                  <button className="platform-action-btn success" onClick={() => applyBulkMute(false)}>Unmute {selected.size}</button>
                </>
              )}
            </div>
          </div>

          <div className="platform-search-filter">
            <div className="platform-search-wrap">
              <span className="platform-search-icon">🔍</span>
              <input className="platform-search-input" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="platform-filter-chips">
              {["all", "contacts", "groups", "friends", "family", "work", "muted"].map((f) => (
                <button key={f} className={`platform-chip ${filter === f ? "active wa-chip" : ""}`} onClick={() => setFilter(f)}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="platform-chat-list">
            {loading && <div className="wa-loading-state"><div className="wa-skeleton" /><div className="wa-skeleton" /></div>}
            {filtered.map((chat) => (
              <div key={chat.id} className={`platform-chat-item ${chat.muted ? "muted" : ""} ${selected.has(chat.id) ? "selected" : ""}`} onClick={bulkMode ? () => toggleBulkSelect(chat.id) : undefined}>
                {bulkMode && <div className={`platform-checkbox ${selected.has(chat.id) ? "checked wa-check" : ""}`}>{selected.has(chat.id) && "✓"}</div>}
                <div className="platform-chat-avatar" style={{ background: chat.color }}>{chat.initials}</div>
                <div className="platform-chat-info">
                  <div className="platform-chat-name-row">
                    <span className="platform-chat-name">{chat.name}</span>
                    <span className="wa-category-pill">{chat.category === "family" ? "🏠" : chat.category === "work" ? "💼" : "👫"}</span>
                    {chat.unread > 0 && !chat.muted && <span className="platform-unread-badge">{chat.unread}</span>}
                  </div>
                  <p className="platform-chat-preview">{chat.lastMsg}</p>
                </div>
                {!bulkMode && (
                  <button className={`platform-mute-btn ${chat.muted ? "muted-state" : ""}`} onClick={(e) => { e.stopPropagation(); toggleMute(chat.id); }}>
                    {chat.muted ? "Unmute" : "Mute"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppManage;
