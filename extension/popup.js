// ============================================================
// 🎛️ POPUP SCRIPT v3.0 — Multi-State Onboarding Flow
// States: landing → grant → main
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

  // ──────────────────────────────────────────────
  // STATE MANAGEMENT
  // ──────────────────────────────────────────────
  const STATES = {
    LANDING: "landing",
    GRANT:   "grant",
    MAIN:    "main",
  };

  function showState(state) {
    document.querySelectorAll(".popup-state").forEach(el => el.classList.add("hidden"));
    const target = document.getElementById(`state-${state}`);
    if (target) target.classList.remove("hidden");
  }

  // Read persisted state from storage
  chrome.storage.local.get(["onboardingState", "platformMuteRules"], (data) => {
    const persistedState = data.onboardingState || STATES.LANDING;
    jumpToState(persistedState, data);
  });

  function jumpToState(state, storageData = {}) {
    showState(state);
    if (state === STATES.MAIN) initMainPage(storageData.platformMuteRules || {});
  }

  // ──────────────────────────────────────────────
  // STATE 1: LANDING
  // ──────────────────────────────────────────────
  document.getElementById("btn-configure").addEventListener("click", () => {
    showState(STATES.GRANT);
  });

  // ──────────────────────────────────────────────
  // STATE 2: GRANT ACCESS
  // ──────────────────────────────────────────────
  document.getElementById("btn-back-grant").addEventListener("click", () => {
    showState(STATES.LANDING);
  });

  document.getElementById("btn-grant").addEventListener("click", () => {
    const btn = document.getElementById("btn-grant");
    btn.textContent = "⏳ Granting access...";
    btn.disabled = true;

    // Request permissions and save state
    chrome.permissions.request({
      permissions: ["tabs", "notifications", "storage"],
    }, (granted) => {
      if (granted || true) { // accept even if already granted
        chrome.storage.local.set({ onboardingState: STATES.MAIN, setupDone: false }, () => {
          showState(STATES.MAIN);
          initMainPage({});
        });
      } else {
        btn.textContent = "🔓 Grant Access & Continue";
        btn.disabled = false;
      }
    });
  });

  // ──────────────────────────────────────────────
  // STATE 3: MAIN PAGE
  // ──────────────────────────────────────────────
  function initMainPage(muteRules) {
    // Show date
    const now = new Date();
    // Sync focus toggle
    chrome.runtime.sendMessage({ type: "GET_FOCUS_MODE" }, (resp) => {
      if (resp) updateFocusUI(resp.focusMode);
    });

    // Load stats
    fetchStats();
    const statsInterval = setInterval(fetchStats, 5000);
    window.addEventListener("unload", () => clearInterval(statsInterval));

    // Update platform mute button states
    updatePlatformButtons(muteRules);

    // Also load live mute rules from storage
    chrome.storage.local.get("platformMuteRules", (d) => {
      updatePlatformButtons(d.platformMuteRules || {});
    });

    // Setup banner — hide if setup already done
    chrome.storage.local.get("setupDone", (d) => {
      const banner = document.getElementById("setup-banner");
      if (d.setupDone && banner) banner.style.display = "none";
    });
  }

  // Setup button → open dashboard manage page
  document.getElementById("btn-setup").addEventListener("click", () => {
    chrome.tabs.create({ url: "http://localhost:5173/#manage" });
    chrome.storage.local.set({ setupDone: true });
    document.getElementById("setup-banner").style.display = "none";
  });

  // Manage Notifs footer link
  document.getElementById("link-manage").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: "http://localhost:5173/#manage" });
  });

  // Reset → go back to landing
  document.getElementById("btn-reset").addEventListener("click", () => {
    chrome.storage.local.set({ onboardingState: STATES.LANDING, setupDone: false }, () => {
      showState(STATES.LANDING);
    });
  });

  // ──────────────────────────────────────────────
  // FOCUS MODE TOGGLE
  // ──────────────────────────────────────────────
  const focusToggle = document.getElementById("focusToggle");
  if (focusToggle) {
    focusToggle.addEventListener("change", () => {
      chrome.runtime.sendMessage({ type: "TOGGLE_FOCUS_MODE" }, (resp) => {
        if (resp) {
          updateFocusUI(resp.focusMode);
          setTimeout(fetchStats, 500);
        }
      });
    });
  }

  function updateFocusUI(isActive) {
    const toggle = document.getElementById("focusToggle");
    const icon   = document.getElementById("focusIcon");
    const title  = document.getElementById("focusTitle");
    const desc   = document.getElementById("focusDesc");
    const row    = document.getElementById("focusRow");

    if (!toggle) return;
    toggle.checked = isActive;

    if (isActive) {
      icon.textContent  = "🔥";
      title.textContent = "Focus Mode On";
      desc.textContent  = "Distractions & notifications blocked";
      row.classList.add("focus-active");
    } else {
      icon.textContent  = "😴";
      title.textContent = "Focus Mode Off";
      desc.textContent  = "Distractions are allowed";
      row.classList.remove("focus-active");
    }
  }

  // ──────────────────────────────────────────────
  // STATS
  // ──────────────────────────────────────────────
  async function fetchStats() {
    try {
      const res = await fetch("http://localhost:5001/api/stats");
      const stats = await res.json();

      setText("todayBlocked",    stats.blocked || 0);
      const m = stats.focusTimeMinutes || 0;
      setText("focusTime",       m >= 60 ? `${Math.floor(m/60)}h ${m%60}m` : `${m}m`);
      setText("productiveCount", stats.productive || 0);
      setText("scoreValue",      `${stats.productivityScore || 0}%`);
    } catch {
      setText("todayBlocked", "0");
      setText("focusTime",    "0m");
      setText("productiveCount", "0");
      setText("scoreValue",  "0%");
    }
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // ──────────────────────────────────────────────
  // PLATFORM QUICK MUTE BUTTONS
  // ──────────────────────────────────────────────
  const platforms = ["whatsapp", "instagram", "gmail", "outlook"];

  function updatePlatformButtons(muteRules) {
    platforms.forEach(p => {
      const btn   = document.getElementById(`qm-${p}`);
      const label = document.getElementById(`qms-${p}`);
      if (!btn || !label) return;

      const isMuted = muteRules[p]?.muteAll === true;
      btn.classList.toggle("muted", isMuted);
      label.textContent = isMuted ? "Muted" : "Active";
    });
  }

  document.getElementById("platformGrid")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".platform-btn");
    if (!btn) return;

    const platform = btn.dataset.platform;
    const isCurrentlyMuted = btn.classList.contains("muted");
    const newMuted = !isCurrentlyMuted;

    // Toggle UI immediately
    btn.classList.toggle("muted", newMuted);
    const label = document.getElementById(`qms-${platform}`);
    if (label) label.textContent = newMuted ? "Muted" : "Active";

    // Persist to storage
    chrome.storage.local.get("platformMuteRules", (d) => {
      const rules = d.platformMuteRules || {};
      rules[platform] = { ...(rules[platform] || {}), muteAll: newMuted, updatedAt: Date.now() };
      chrome.storage.local.set({ platformMuteRules: rules });
    });

    // Tell background to apply mute
    chrome.runtime.sendMessage({
      type: "PLATFORM_MUTE_UPDATE",
      platform,
      config: { muteAll: newMuted },
    });
  });

});
