import React from "react";

const platforms = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    description: "Mute chats, groups & calls. Block notification sounds per contact.",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="manage-hub-icon">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12.004 2C6.476 2 2 6.478 2 12.008c0 1.76.459 3.466 1.333 4.972L2.05 22l5.168-1.354A9.933 9.933 0 0012.004 22C17.532 22 22 17.522 22 12.008 22 6.476 17.532 2 12.004 2zm0 18.146c-1.619 0-3.2-.436-4.582-1.261l-.328-.196-3.068.804.819-2.993-.214-.34a8.115 8.115 0 01-1.246-4.152c0-4.489 3.659-8.146 8.147-8.146 2.176 0 4.222.849 5.759 2.39a8.097 8.097 0 012.385 5.76c-.002 4.49-3.66 8.134-8.672 8.134z"/>
      </svg>
    ),
    color: "#25D366",
    bgGradient: "linear-gradient(135deg, #075E54 0%, #128C7E 50%, #25D366 100%)",
    glowColor: "rgba(37, 211, 102, 0.3)",
    borderColor: "rgba(37, 211, 102, 0.25)",
    stats: { muted: 0, total: 0 },
    badge: "Web API",
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Control DM alerts, story mentions & comment notifications.",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="manage-hub-icon">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    ),
    color: "#E1306C",
    bgGradient: "linear-gradient(135deg, #405DE6 0%, #833AB4 35%, #C13584 65%, #E1306C 100%)",
    glowColor: "rgba(225, 48, 108, 0.3)",
    borderColor: "rgba(225, 48, 108, 0.25)",
    stats: { muted: 0, total: 0 },
    badge: "Content API",
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Filter senders, labels & digest notifications. Smart inbox control.",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="manage-hub-icon">
        <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
      </svg>
    ),
    color: "#EA4335",
    bgGradient: "linear-gradient(135deg, #4285F4 0%, #34A853 33%, #FBBC04 66%, #EA4335 100%)",
    glowColor: "rgba(234, 67, 53, 0.3)",
    borderColor: "rgba(234, 67, 53, 0.25)",
    stats: { muted: 0, total: 0 },
    badge: "Gmail API",
  },
  {
    id: "outlook",
    name: "Outlook",
    description: "Manage email & calendar alerts. Configure per-sender muting rules.",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="manage-hub-icon">
        <path d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.32.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.01V2.62q0-.46.33-.8.33-.32.8-.32h13.67q.46 0 .8.33.32.33.32.8V12zm-7.27-5.86q-.12-.41-.39-.74-.27-.32-.67-.52-.4-.19-.91-.19h-1.34q-.52 0-.91.19-.4.2-.66.52-.27.33-.39.74-.12.41-.12.86t.12.86q.12.41.39.74.26.32.66.52.39.19.91.19h1.34q.51 0 .91-.19.4-.2.67-.52.27-.33.39-.74.12-.41.12-.86t-.12-.86zM16.73 18v-2.78q0-.46-.33-.8-.33-.32-.8-.32H7.4v3.9h9.33z"/>
      </svg>
    ),
    color: "#0078D4",
    bgGradient: "linear-gradient(135deg, #0078D4 0%, #005A9E 50%, #003B6F 100%)",
    glowColor: "rgba(0, 120, 212, 0.3)",
    borderColor: "rgba(0, 120, 212, 0.25)",
    stats: { muted: 0, total: 0 },
    badge: "Graph API",
  },
];

const ManagePage = ({ setActiveTab, muteSettings }) => {
  return (
    <div className="manage-hub-wrapper">
      {/* Header */}
      <div className="manage-hub-header">
        <div className="manage-hub-title-row">
          <div className="manage-hub-title-icon">🔕</div>
          <div>
            <h2 className="manage-hub-title">Notification Manager</h2>
            <p className="manage-hub-subtitle">
              Control, mute &amp; block notifications from your connected platforms — all in one place
            </p>
          </div>
        </div>

        <div className="manage-hub-status-bar">
          <div className="manage-hub-status-item">
            <span className="manage-hub-status-dot active"></span>
            <span>Extension Connected</span>
          </div>
          <div className="manage-hub-status-item">
            <span className="manage-hub-status-dot"></span>
            <span>4 Platforms</span>
          </div>
          <div className="manage-hub-status-item">
            <span className="manage-hub-status-dot warn"></span>
            <span>
              {Object.values(muteSettings || {}).filter(Boolean).length} Active Mutes
            </span>
          </div>
        </div>
      </div>

      {/* Platform Grid */}
      <div className="manage-hub-grid">
        {platforms.map((platform) => {
          const isMuted = muteSettings?.[platform.id];
          return (
            <button
              key={platform.id}
              className="manage-platform-card"
              onClick={() => setActiveTab(`manage-${platform.id}`)}
              style={{
                "--platform-glow": platform.glowColor,
                "--platform-border": platform.borderColor,
                "--platform-color": platform.color,
              }}
            >
              {/* Glow layer */}
              <div className="manage-card-glow" style={{ background: platform.glowColor }} />

              {/* Top row */}
              <div className="manage-card-top">
                <div
                  className="manage-card-icon-wrap"
                  style={{ background: platform.bgGradient }}
                >
                  <div style={{ color: "#fff", width: 32, height: 32 }}>{platform.icon}</div>
                </div>
                <div className="manage-card-badges">
                  <span className="manage-badge api">{platform.badge}</span>
                  {isMuted && <span className="manage-badge muted">🔕 Muted</span>}
                </div>
              </div>

              {/* Content */}
              <div className="manage-card-content">
                <h3 className="manage-card-name">{platform.name}</h3>
                <p className="manage-card-desc">{platform.description}</p>
              </div>

              {/* Footer */}
              <div className="manage-card-footer">
                <span className="manage-card-cta">
                  Configure →
                </span>
                <div className="manage-card-indicator" style={{ background: platform.color }} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Info Banner */}
      <div className="manage-hub-info-banner">
        <span className="manage-hub-info-icon">🔌</span>
        <div>
          <p className="manage-hub-info-title">Real-time Extension Sync</p>
          <p className="manage-hub-info-desc">
            Mute rules are synced live with the browser extension. Changes take effect instantly —
            no refresh needed. Tab audio is muted, web push notifications are blocked at source.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ManagePage;
export { platforms };
