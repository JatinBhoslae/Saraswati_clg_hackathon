// ============================================================
// 🎛️ POPUP SCRIPT (v2.0)
// Handles Focus Mode toggle and displays quick stats
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const focusToggle = document.getElementById("focusToggle");
  const focusIcon = document.getElementById("focusIcon");
  const focusTitle = document.getElementById("focusTitle");
  const focusDesc = document.getElementById("focusDesc");
  const focusSection = document.querySelector(".focus-section");
  const statusCard = document.getElementById("statusCard");
  const statusText = document.getElementById("statusText");
  const todayBlocked = document.getElementById("todayBlocked");
  const focusTimeEl = document.getElementById("focusTime");
  const todayDate = document.getElementById("todayDate");
  const productiveCount = document.getElementById("productiveCount");
  const scoreValue = document.getElementById("scoreValue");

  // Show today's date
  if (todayDate) {
    const now = new Date();
    todayDate.textContent = now.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  // -----------------------------------------------------------
  // 🔄 Update UI based on focus mode state
  // -----------------------------------------------------------
  function updateUI(isActive) {
    focusToggle.checked = isActive;

    if (isActive) {
      focusIcon.textContent = "🔥";
      focusTitle.textContent = "Focus Mode On";
      focusDesc.textContent = "Distractions & notifications blocked";
      focusSection.classList.add("active");
      statusCard.classList.add("blocking");
      statusText.textContent = "🛡️ Blocking distractions & notifications...";
    } else {
      focusIcon.textContent = "😴";
      focusTitle.textContent = "Focus Mode Off";
      focusDesc.textContent = "Distractions are allowed";
      focusSection.classList.remove("active");
      statusCard.classList.remove("blocking");
      statusText.textContent = "Monitoring your activity...";
    }
  }

  // -----------------------------------------------------------
  // 📊 Fetch stats from backend
  // -----------------------------------------------------------
  async function fetchStats() {
    try {
      const response = await fetch("http://localhost:5001/api/stats");
      const stats = await response.json();

      // Blocked count
      todayBlocked.textContent = stats.blocked || 0;

      // Focus time — uses real tracked time from backend
      const minutes = stats.focusTimeMinutes || 0;
      if (minutes >= 60) {
        focusTimeEl.textContent = `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
      } else {
        focusTimeEl.textContent = `${minutes}m`;
      }

      // Productive count
      if (productiveCount) {
        productiveCount.textContent = stats.productive || 0;
      }

      // Productivity score
      if (scoreValue) {
        scoreValue.textContent = `${stats.productivityScore || 0}%`;
      }
    } catch (error) {
      // Backend not running — show zeros instead of dashes
      todayBlocked.textContent = "0";
      focusTimeEl.textContent = "0m";
      if (productiveCount) productiveCount.textContent = "0";
      if (scoreValue) scoreValue.textContent = "0%";
    }
  }

  // -----------------------------------------------------------
  // 🎬 Initialize
  // -----------------------------------------------------------
  chrome.runtime.sendMessage({ type: "GET_FOCUS_MODE" }, (response) => {
    if (response) {
      updateUI(response.focusMode);
    }
  });

  // Fetch stats immediately
  fetchStats();

  // Auto-refresh stats every 3 seconds while popup is open
  const refreshInterval = setInterval(fetchStats, 3000);

  // Clean up on popup close
  window.addEventListener("unload", () => {
    clearInterval(refreshInterval);
  });

  // -----------------------------------------------------------
  // 👂 Toggle focus mode on click
  // -----------------------------------------------------------
  focusToggle.addEventListener("change", () => {
    chrome.runtime.sendMessage({ type: "TOGGLE_FOCUS_MODE" }, (response) => {
      if (response) {
        updateUI(response.focusMode);
        // Refresh stats after toggle
        setTimeout(fetchStats, 500);
      }
    });
  });
});
