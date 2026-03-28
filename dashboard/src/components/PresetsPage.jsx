import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:5001/api";

const PRESETS = [
  {
    id: "work",
    name: "Work Mode",
    description: "Deep focus. Blocks all social media and entertainment, batches notifications every 2 hours.",
    icon: "💼",
    color: "#3B82F6",
    bgGradient: "linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 50%, #3B82F6 100%)",
    glowColor: "rgba(59, 130, 246, 0.3)",
    borderColor: "rgba(59, 130, 246, 0.25)",
    badge: "Popular",
    category: "productivity",
    usageCount: 12840,
    blockedCount: 15,
    mutedApps: ["WhatsApp", "Instagram", "Outlook"],
  },
  {
    id: "home",
    name: "Home Mode",
    description: "Relaxed browsing with light limits. Light social allowed. Great for evenings.",
    icon: "🏠",
    color: "#22C55E",
    bgGradient: "linear-gradient(135deg, #14532d 0%, #16a34a 50%, #22C55E 100%)",
    glowColor: "rgba(34, 197, 94, 0.3)",
    borderColor: "rgba(34, 197, 94, 0.25)",
    badge: "Balanced",
    category: "wellness",
    usageCount: 9210,
    blockedCount: 3,
    mutedApps: [],
  },
  {
    id: "vacation",
    name: "Vacation Mode",
    description: "Total digital detox. Mutes all apps and removes all blocked sites. You've earned it.",
    icon: "🏖️",
    color: "#F59E0B",
    bgGradient: "linear-gradient(135deg, #78350f 0%, #d97706 50%, #F59E0B 100%)",
    glowColor: "rgba(245, 158, 11, 0.3)",
    borderColor: "rgba(245, 158, 11, 0.25)",
    badge: "Chill",
    category: "lifestyle",
    usageCount: 5430,
    blockedCount: 0,
    mutedApps: ["WhatsApp", "Instagram", "Gmail", "Outlook"],
  },
  {
    id: "deepwork",
    name: "Deep Work",
    description: "Maximum concentration. Inspired by Cal Newport's protocol. 4-hour notification batches.",
    icon: "🧠",
    color: "#A855F7",
    bgGradient: "linear-gradient(135deg, #3b0764 0%, #7e22ce 50%, #A855F7 100%)",
    glowColor: "rgba(168, 85, 247, 0.3)",
    borderColor: "rgba(168, 85, 247, 0.25)",
    badge: "Intense",
    category: "productivity",
    usageCount: 7650,
    blockedCount: 18,
    mutedApps: ["WhatsApp", "Instagram", "Outlook"],
  },
  {
    id: "meeting",
    name: "Meeting Mode",
    description: "Silences distractions during calls. Gmail and Outlook stay live. WhatsApp muted.",
    icon: "📅",
    color: "#EC4899",
    bgGradient: "linear-gradient(135deg, #500724 0%, #be185d 50%, #EC4899 100%)",
    glowColor: "rgba(236, 72, 153, 0.3)",
    borderColor: "rgba(236, 72, 153, 0.25)",
    badge: "New",
    category: "productivity",
    usageCount: 3890,
    blockedCount: 6,
    mutedApps: ["WhatsApp", "Instagram"],
  },
  {
    id: "student",
    name: "Student Mode",
    description: "Blocks entertainment and social during study sessions. Pomodoro-friendly intervals.",
    icon: "📚",
    color: "#06B6D4",
    bgGradient: "linear-gradient(135deg, #083344 0%, #0891b2 50%, #06B6D4 100%)",
    glowColor: "rgba(6, 182, 212, 0.3)",
    borderColor: "rgba(6, 182, 212, 0.25)",
    badge: "Study",
    category: "productivity",
    usageCount: 11200,
    blockedCount: 11,
    mutedApps: ["Instagram", "WhatsApp"],
  },
  {
    id: "night",
    name: "Night Mode",
    description: "Wind-down mode. Reduces work-app noise and silences email after hours.",
    icon: "🌙",
    color: "#6366F1",
    bgGradient: "linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #6366F1 100%)",
    glowColor: "rgba(99, 102, 241, 0.3)",
    borderColor: "rgba(99, 102, 241, 0.25)",
    badge: "Calm",
    category: "wellness",
    usageCount: 6780,
    blockedCount: 3,
    mutedApps: ["Gmail", "Outlook"],
  },
  {
    id: "gym",
    name: "Gym Mode",
    description: "Phone-free workout. Blocks and mutes everything. Only emergency calls get through.",
    icon: "💪",
    color: "#EF4444",
    bgGradient: "linear-gradient(135deg, #450a0a 0%, #dc2626 50%, #EF4444 100%)",
    glowColor: "rgba(239, 68, 68, 0.3)",
    borderColor: "rgba(239, 68, 68, 0.25)",
    badge: "Active",
    category: "lifestyle",
    usageCount: 4320,
    blockedCount: 12,
    mutedApps: ["WhatsApp", "Instagram", "Gmail", "Outlook"],
  },
];

const formatCount = (n) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);

const PresetsPage = () => {
  const navigate = useNavigate();
  const [activePreset, setActivePreset] = useState(null);
  const [activating, setActivating] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    axios.get(`${API_URL}/presets/active`).then(res => {
      if (res.data.preset) {
        const match = PRESETS.find(p => p.id === res.data.preset.id);
        if (match) setActivePreset(match);
      }
    }).catch(() => {});
  }, []);

  const handleDeactivate = async () => {
    try {
      await axios.post(`${API_URL}/presets/deactivate`);
      setActivePreset(null);
    } catch (err) {
      console.error("Failed to deactivate preset", err);
    }
  };

  return (
    <div className="manage-hub-wrapper">
      {/* HEADER */}
      <div className="manage-hub-header">
        <div className="manage-hub-title-row">
          <div className="manage-hub-title-icon">⚡</div>
          <div>
            <h2 className="manage-hub-title">Presets Marketplace</h2>
            <p className="manage-hub-subtitle">
              One-click attention profiles — choose your mode, activate, and stay in control.
            </p>
          </div>
        </div>
        <div className="manage-hub-status-bar">
          <div className="manage-hub-status-item">
            <span className="manage-hub-status-dot active"></span>
            <span>8 Presets Available</span>
          </div>
          <div className="manage-hub-status-item">
            <span className={`manage-hub-status-dot ${activePreset ? 'active' : 'warn'}`}></span>
            <span>{activePreset ? `${activePreset.name} Active` : 'No Preset Active'}</span>
          </div>
          <div className="manage-hub-status-item">
            <span className="manage-hub-status-dot active"></span>
            <span>Extension Synced</span>
          </div>
        </div>
      </div>

      {/* ACTIVE PRESET BANNER */}
      {activePreset && (
        <div className="preset-active-banner">
          <div className="preset-banner-info">
            <div className="preset-banner-dot"></div>
            <span style={{ fontSize: 22 }}>{activePreset.icon}</span>
            <div>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>
                {activePreset.name} is active
              </p>
              <p style={{ color: '#64748b', fontSize: '0.8rem' }}>
                {activePreset.blockedCount} sites blocked · {activePreset.mutedApps.length} apps muted
              </p>
            </div>
          </div>
          <button className="preset-deactivate-btn" onClick={handleDeactivate}>
            Deactivate
          </button>
        </div>
      )}

      {/* CATEGORY FILTER PILLS */}
      <div className="preset-filter-pills">
        {["all", "productivity", "wellness", "lifestyle"].map(cat => (
          <button
            key={cat}
            className={`preset-pill ${categoryFilter === cat ? 'active' : ''}`}
            onClick={() => setCategoryFilter(cat)}
          >
            {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* PRESET CARDS GRID */}
      <div className="manage-hub-grid">
        {PRESETS
          .filter(p => categoryFilter === "all" || p.category === categoryFilter)
          .map(preset => {
            const isActive = activePreset?.id === preset.id;
            const isLoading = activating === preset.id;
            return (
              <button
                key={preset.id}
                className={`manage-platform-card ${isActive ? 'preset-active' : ''}`}
                onClick={() => navigate(`/presets/${preset.id}`)}
                style={{
                  "--platform-glow": preset.glowColor,
                  "--platform-border": isActive ? preset.color : preset.borderColor,
                  "--platform-color": preset.color,
                }}
              >
                <div className="manage-card-glow" style={{ background: preset.glowColor }} />

                {/* TOP ROW */}
                <div className="manage-card-top">
                  <div className="manage-card-icon-wrap" style={{ background: preset.bgGradient }}>
                    <span style={{ fontSize: 28 }}>{preset.icon}</span>
                  </div>
                  <div className="manage-card-badges">
                    <span className="manage-badge api">{preset.badge}</span>
                    {isActive && (
                      <span className="manage-badge muted" style={{ background: preset.color, animation: 'none' }}>
                        ✓ Active
                      </span>
                    )}
                  </div>
                </div>

                {/* CONTENT */}
                <div className="manage-card-content">
                  <h3 className="manage-card-name">{preset.name}</h3>
                  <p className="manage-card-desc">{preset.description}</p>
                </div>

                {/* FOOTER */}
                <div className="manage-card-footer">
                  <span className="preset-usage-count">
                    {formatCount(preset.usageCount)} users
                  </span>
                  <span
                    className="manage-card-cta"
                    style={{ color: isActive ? preset.color : '#fff', opacity: isActive ? 1 : undefined }}
                  >
                    {isLoading ? '...' : isActive ? 'Active ✓' : 'Configure →'}
                  </span>
                  <div className="manage-card-indicator" style={{ background: preset.color }} />
                </div>
              </button>
            );
          })
        }
      </div>

      {/* INFO BANNER */}
      <div className="manage-hub-info-banner">
        <span className="manage-hub-info-icon">⚡</span>
        <div>
          <p className="manage-hub-info-title">Instant Sync Across All Apps</p>
          <p className="manage-hub-info-desc">
            Activating a preset instantly updates your blocked sites list, focus mode, and app mute rules.
            Changes sync to the browser extension in real time — no refresh needed.
            Open any preset to mute specific contacts or senders.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PresetsPage;
