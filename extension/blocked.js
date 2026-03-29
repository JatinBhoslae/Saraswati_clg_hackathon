/**
 * 🧘 ZEN SHIELD LOGIC
 * Transitions the user from distraction to deep-work recovery.
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Contextual Localization
    const params = new URLSearchParams(window.location.search);
    const url = params.get('url');
    
    if (url) {
      try {
        const hostname = new URL(url).hostname.replace('www.', '');
        document.getElementById('blockedUrl').textContent = `${hostname} is paused for your focus.`;
      } catch(e) {
        document.getElementById('blockedUrl').textContent = "Distraction intercepted.";
      }
    }

    // 2. High-Fidelity Wisdom Rotation
    const quotes = [
      "The secret of focus is to say no to distractions.",
      "One hour of deep work > six hours of scattered activity.",
      "Stay focused. Your future self is thanking you right now.",
      "Elite performance requires elite focus.",
      "Don't trade your long-term goals for short-term dopamine.",
      "Starve your distractions, feed your focus.",
      "Focus is the master key to productivity.",
      "You were created for more than just scrolling."
    ];
    
    document.getElementById('motivation').textContent = `"${quotes[Math.floor(Math.random() * quotes.length)]}"`;

    // 3. Subtle Entrance Effect
    document.querySelector('.shield-card').style.opacity = "0";
    setTimeout(() => {
        document.querySelector('.shield-card').style.transition = "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)";
        document.querySelector('.shield-card').style.opacity = "1";
        document.querySelector('.shield-card').style.transform = "translateY(0)";
    }, 50);
});
