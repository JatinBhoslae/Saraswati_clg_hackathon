import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:5001/api";

const ALL_APPS = [
  { id: "whatsapp", name: "WhatsApp", color: "#25D366", icon: "💬", manageRoute: "/manage/whatsapp" },
  { id: "gmail",    name: "Gmail",    color: "#EA4335", icon: "📧", manageRoute: "/manage/gmail" },
  { id: "instagram",name: "Instagram",color: "#E1306C", icon: "📸", manageRoute: null },
  { id: "outlook",  name: "Outlook",  color: "#0078D4", icon: "📨", manageRoute: null },
];

const batchLabel = (mins) => {
  if (!mins || mins === 0) return "Instant";
  if (mins >= 999) return "Silenced (∞)";
  if (mins >= 60) return `${mins/60}h batches`;
  return `${mins}min batches`;
};

const PresetDetailPage = () => {
  const { presetId } = useParams();
  const navigate = useNavigate();

  const [preset, setPreset] = useState(null);
  const [mutedUsers, setMutedUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [activating, setActivating] = useState(false);

  const [newMutedUser, setNewMutedUser] = useState({ whatsapp: "", gmail: "", instagram: "", outlook: "" });
  const [localBlockedSites, setLocalBlockedSites] = useState([]);
  const [newSite, setNewSite] = useState("");
  const [localMutedApps, setLocalMutedApps] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [presetRes, mutedRes, activeRes] = await Promise.all([
          axios.get(`${API_URL}/presets/${presetId}`),
          axios.get(`${API_URL}/presets/${presetId}/muted-users`),
          axios.get(`${API_URL}/presets/active`),
        ]);
        setPreset(presetRes.data);
        setLocalBlockedSites(presetRes.data.blockedSites || []);
        setLocalMutedApps(presetRes.data.mutedApps || []);
        setMutedUsers(mutedRes.data.mutedUsers || {});
        setIsActive(activeRes.data.preset?.id === presetId);
      } catch (err) {
        console.error("Failed to load preset detail", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [presetId]);

  const handleMuteUser = async (app) => {
    const identifier = newMutedUser[app].trim();
    if (!identifier) return;
    try {
      const res = await axios.post(`${API_URL}/presets/${presetId}/mute-user`, { app, identifier });
      setMutedUsers(res.data.mutedUsers);
      setNewMutedUser(prev => ({ ...prev, [app]: "" }));
    } catch (err) {
      console.error("Failed to mute user", err);
    }
  };

  const handleUnmuteUser = async (app, identifier) => {
    try {
      const res = await axios.post(`${API_URL}/presets/${presetId}/unmute-user`, { app, identifier });
      setMutedUsers(res.data.mutedUsers);
    } catch (err) {
      console.error("Failed to unmute user", err);
    }
  };

  const handleActivate = async () => {
    setActivating(true);
    try {
      await axios.post(`${API_URL}/presets/activate`, { presetId });
      setIsActive(true);
    } catch (err) {
      console.error("Failed to activate", err);
    } finally {
      setActivating(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      await axios.post(`${API_URL}/presets/deactivate`);
      setIsActive(false);
    } catch (err) {
      console.error("Failed to deactivate", err);
    }
  };

  const handleAddSite = () => {
    if (newSite.trim()) {
      setLocalBlockedSites(prev => [...prev, newSite.trim()]);
      setNewSite("");
    }
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "40vh" }}>
      <div style={{ width: 40, height: 40, border: "3px solid rgba(255,255,255,0.1)",
                    borderTopColor: "#3B82F6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  if (!preset) return (
    <div style={{ textAlign: "center", padding: "4rem", color: "#64748b" }}>
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</div>
      <h3 style={{ color: "#fff", marginBottom: "0.5rem" }}>Preset not found</h3>
      <button onClick={() => navigate("/presets")}>← Back to Presets</button>
    </div>
  );

  return (
    <div className="manage-hub-wrapper" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* SECTION 1: HEADER */}
      <div>
        <button 
          onClick={() => navigate("/presets")} 
          style={{ 
            background: "none", border: "none", color: "#64748b", 
            cursor: "pointer", display: "flex", alignItems: "center", 
            gap: "0.5rem", fontWeight: 700, marginBottom: "1.5rem" 
          }}
        >
          ← Back to Presets
        </button>

        <div className="glass" style={{ 
          padding: "2rem", borderRadius: "2rem", display: "flex", 
          alignItems: "center", gap: "2rem", border: `1px solid ${preset.color}33`,
          background: `linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, ${preset.color}11 100%)`
        }}>
          <div style={{ fontSize: 64 }}>{preset.icon || "⚡"}</div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: "2.5rem", fontWeight: 800, color: "#fff", marginBottom: "0.5rem" }}>{preset.label}</h1>
            <p style={{ color: "#94a3b8", fontSize: "1.1rem", maxWidth: "600px", marginBottom: "1rem" }}>
              {preset.description || "Customized attention profile for specific contexts."}
            </p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
                <span className="manage-badge api">{preset.focusMode ? "Focus Mode ON" : "Normal Mode"}</span>
                <span className="manage-badge api">{localBlockedSites.length} Sites Blocked</span>
                <span className="manage-badge api">{localMutedApps.length} Apps Muted</span>
            </div>
          </div>
          <button 
            onClick={isActive ? handleDeactivate : handleActivate}
            style={{
              background: isActive ? "rgba(239,68,68,0.15)" : preset.color || "#3B82F6",
              color: isActive ? "#f87171" : "#fff",
              border: isActive ? "1px solid rgba(239,68,68,0.3)" : "none",
              borderRadius: "1rem", padding: "1rem 2rem",
              fontWeight: 800, fontSize: "1rem", cursor: "pointer",
              boxShadow: isActive ? "none" : `0 10px 20px ${preset.color}33`
            }}
          >
            {activating ? "Applying..." : isActive ? "✓ Active — Deactivate" : `Activate ${preset.label}`}
          </button>
        </div>
      </div>

      {/* SECTION 2: STAT CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
        <div className="glass" style={{ padding: "1.5rem", textAlign: "center", borderRadius: "1.5rem" }}>
          <div style={{ fontSize: "2.5rem", fontWeight: 800, color: preset.color }}>{localBlockedSites.length}</div>
          <div style={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Sites Blocked</div>
        </div>
        <div className="glass" style={{ padding: "1.5rem", textAlign: "center", borderRadius: "1.5rem" }}>
          <div style={{ fontSize: "2.5rem", fontWeight: 800, color: preset.color }}>{localMutedApps.length}</div>
          <div style={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Apps Muted</div>
        </div>
        <div className="glass" style={{ padding: "1.5rem", textAlign: "center", borderRadius: "1.5rem" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color: preset.color, height: "3.75rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {batchLabel(preset.notificationBatchMinutes)}
          </div>
          <div style={{ color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Notifications</div>
        </div>
      </div>

      {/* SECTION 3: BLOCKED SITES */}
      <div className="glass" style={{ padding: "2rem", borderRadius: "2rem" }}>
        <h3 style={{ color: "#fff", fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>🚫 Blocked Sites</h3>
        <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>These websites will be blocked by the extension when this preset is active.</p>
        
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <input
            value={newSite}
            onChange={e => setNewSite(e.target.value)}
            placeholder="e.g. distractingsite.com"
            onKeyDown={e => e.key === "Enter" && handleAddSite()}
            style={{ 
              flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "0.875rem", padding: "0.75rem 1.25rem", color: "#e2e8f0", outline: "none" 
            }}
          />
          <button 
            onClick={handleAddSite} 
            style={{ 
                background: preset.color, color: "#fff", border: "none", 
                borderRadius: "0.875rem", padding: "0 1.5rem", fontWeight: 700, cursor: "pointer" 
            }}
          >
            Add
          </button>
        </div>
        
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem" }}>
          {localBlockedSites.map(site => (
            <div key={site} style={{ 
              display: "flex", alignItems: "center", gap: "0.625rem",
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "9999px", padding: "0.375rem 1rem" 
            }}>
              <span style={{ color: "#f87171", fontSize: "0.9rem", fontWeight: 600 }}>{site}</span>
              <button 
                onClick={() => setLocalBlockedSites(s => s.filter(x => x !== site))}
                style={{ color: "#f87171", background: "none", border: "none", cursor: "pointer", fontSize: "1.25rem", lineHeight: 1 }}
              >
                ×
              </button>
            </div>
          ))}
          {localBlockedSites.length === 0 && (
            <p style={{ color: "#334155", fontStyle: "italic", fontSize: "0.9rem" }}>No sites blocked in this preset.</p>
          )}
        </div>
      </div>

      {/* SECTION 4: APP MUTING */}
      <div className="glass" style={{ padding: "2rem", borderRadius: "2rem" }}>
        <h3 style={{ color: "#fff", fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>🔕 App Muting</h3>
        <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>Muted apps will have all notifications silenced when this preset is active.</p>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.25rem" }}>
          {ALL_APPS.map(app => {
            const isMuted = localMutedApps.includes(app.id);
            return (
              <div key={app.id} style={{ 
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "rgba(255,255,255,0.03)", border: isMuted ? `1px solid ${app.color}44` : "1px solid rgba(255,255,255,0.08)",
                borderRadius: "1.25rem", padding: "1.25rem" 
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span style={{ fontSize: 32 }}>{app.icon}</span>
                  <div>
                    <div style={{ color: "#fff", fontWeight: 700, fontSize: "1rem" }}>{app.name}</div>
                    <div style={{ color: isMuted ? app.color : "#64748b", fontSize: "0.8rem", fontWeight: 600 }}>
                      {isMuted ? "Silenced" : "Allowed"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  {app.manageRoute && (
                    <button 
                      onClick={() => navigate(app.manageRoute)}
                      style={{ 
                        color: app.color, fontSize: "0.75rem", fontWeight: 800, background: `${app.color}11`,
                        border: `1px solid ${app.color}33`, borderRadius: "0.5rem",
                        padding: "0.375rem 0.75rem", cursor: "pointer", textTransform: "uppercase"
                      }}
                    >
                      Manage
                    </button>
                  )}
                  {/* Toggle switch */}
                  <label style={{ position: "relative", display: "inline-block", width: 50, height: 26, cursor: "pointer" }}>
                    <input type="checkbox" checked={isMuted}
                           onChange={() => setLocalMutedApps(prev =>
                             isMuted ? prev.filter(x => x !== app.id) : [...prev, app.id]
                           )}
                           style={{ opacity: 0, width: 0, height: 0 }} />
                    <span style={{
                      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                      background: isMuted ? app.color : "rgba(255,255,255,0.1)",
                      borderRadius: 13, transition: "background 0.2s",
                    }} />
                    <span style={{
                      position: "absolute", top: 3, left: isMuted ? 27 : 3,
                      width: 20, height: 20, background: "#fff", borderRadius: "50%", transition: "left 0.2s",
                      boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                    }} />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 5: MUTED CONTACTS */}
      <div className="glass" style={{ padding: "2rem", borderRadius: "2rem" }}>
        <h3 style={{ color: "#fff", fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>🧑🤝🧑 Muted Contacts</h3>
        <p style={{ color: "#64748b", marginBottom: "2rem" }}>
          Silence specific people across apps during this preset — even if the app itself is allowed.
        </p>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "2rem" }}>
          {ALL_APPS.map(app => (
            <div key={app.id}>
              {/* App sub-header */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
                <span style={{ fontSize: 20 }}>{app.icon}</span>
                <span style={{ color: app.color, fontWeight: 800, fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {app.name}
                </span>
                <span style={{ color: "#475569", fontSize: "0.8rem", fontWeight: 600 }}>
                  ({(mutedUsers[app.id] || []).length} muted)
                </span>
              </div>
              
              {/* Muted user list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
                {(mutedUsers[app.id] || []).length === 0 ? (
                  <div style={{ 
                    padding: "1rem", borderRadius: "1rem", background: "rgba(255,255,255,0.02)", 
                    border: "1px dashed rgba(255,255,255,0.05)", textAlign: "center" 
                  }}>
                    <p style={{ color: "#334155", fontSize: "0.85rem", fontStyle: "italic" }}>
                      No contacts muted for {app.name}.
                    </p>
                  </div>
                ) : (
                  (mutedUsers[app.id] || []).map(identifier => (
                    <div key={identifier} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: "1rem", padding: "0.75rem 1rem"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: "50%",
                          background: `${app.color}22`, border: `1px solid ${app.color}44`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: app.color, fontWeight: 800, fontSize: "1rem"
                        }}>
                          {identifier[0].toUpperCase()}
                        </div>
                        <span style={{ color: "#e2e8f0", fontSize: "0.95rem", fontWeight: 600 }}>{identifier}</span>
                      </div>
                      <button
                        onClick={() => handleUnmuteUser(app.id, identifier)}
                        style={{ 
                          color: "#f87171", background: "rgba(239,68,68,0.1)",
                          border: "1px solid rgba(239,68,68,0.2)", borderRadius: "0.625rem",
                          padding: "0.4rem 0.875rem", fontSize: "0.75rem", fontWeight: 800, cursor: "pointer" 
                        }}
                      >
                        Unmute
                      </button>
                    </div>
                  ))
                )}
              </div>
              
              {/* Add contact input */}
              <div style={{ display: "flex", gap: "0.625rem" }}>
                <input
                  value={newMutedUser[app.id]}
                  onChange={e => setNewMutedUser(prev => ({ ...prev, [app.id]: e.target.value }))}
                  placeholder={app.id === "gmail" ? "boss@company.com" : "Contact name"}
                  onKeyDown={e => e.key === "Enter" && handleMuteUser(app.id)}
                  style={{ 
                    flex: 1, background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${app.color}30`, borderRadius: "0.75rem",
                    padding: "0.625rem 1rem", color: "#e2e8f0", fontSize: "0.9rem", outline: "none" 
                  }}
                />
                <button
                  onClick={() => handleMuteUser(app.id)}
                  style={{ 
                    background: `${app.color}22`, color: app.color,
                    border: `1px solid ${app.color}44`, borderRadius: "0.75rem",
                    padding: "0 1.25rem", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer" 
                  }}
                >
                  Mute
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 6: BOTTOM ACTIONS */}
      <div style={{ 
        display: "flex", gap: "1rem", justifyContent: "flex-end", 
        paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.05)" 
      }}>
        <button 
          onClick={() => navigate("/presets")}
          style={{ 
            background: "rgba(255,255,255,0.05)", color: "#94a3b8",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: "1rem",
            padding: "0.875rem 2rem", fontWeight: 800, cursor: "pointer",
            fontSize: "1rem"
          }}
        >
          Cancel
        </button>
        <button
          onClick={isActive ? handleDeactivate : handleActivate}
          disabled={activating}
          style={{
            background: isActive ? "rgba(239,68,68,0.15)" : preset.color || "#3B82F6",
            color: isActive ? "#f87171" : "#fff",
            border: isActive ? "1px solid rgba(239,68,68,0.3)" : "none",
            borderRadius: "1rem", padding: "0.875rem 2.5rem",
            fontWeight: 800, fontSize: "1rem", cursor: "pointer",
            opacity: activating ? 0.6 : 1,
            boxShadow: isActive ? "none" : `0 10px 25px ${preset.color}44`
          }}
        >
          {activating ? "Applying..." : isActive ? "Deactivate Preset" : `Activate ${preset.label}`}
        </button>
      </div>
    </div>
  );
};

export default PresetDetailPage;
