// ============================================================
// 🧠 AI CLASSIFIER MODULE
// Context-Aware Productivity Assistant
// ============================================================
// Contains all AI/ML logic for:
// 1. classifySite(url) — Categorize websites
// 2. shouldBlock(type, focusMode) — Decision engine
// 3. generateSummary(logs) — Smart notification summary
// 4. calculateProductivityScore(logs) — Scoring algorithm
// 5. generateSmartSuggestions(stats) — AI-powered tips
// ============================================================

// -----------------------------------------------------------
// 📋 SITE CLASSIFICATION RULES
// Extensible rule set for categorizing domains
// -----------------------------------------------------------
const SITE_RULES = {
  productive: [
    "github.com",
    "gitlab.com",
    "stackoverflow.com",
    "leetcode.com",
    "hackerrank.com",
    "codepen.io",
    "developer.mozilla.org",
    "docs.google.com",
    "notion.so",
    "figma.com",
    "linkedin.com",
    "medium.com",
    "dev.to",
    "coursera.org",
    "udemy.com",
    "khanacademy.org",
    "w3schools.com",
    "freecodecamp.org",
    "geeksforgeeks.org",
    "replit.com",
    "codeforces.com",
    "codechef.com",
    "atcoder.jp",
    "visualstudio.com",
    "npmjs.com",
    "pypi.org",
    "docs.python.org",
    "rust-lang.org",
    "golang.org",
    "trello.com",
    "jira.atlassian.com",
    "slack.com",
    "google.com/docs",
    "google.com/sheets",
    "google.com/slides",
    "overleaf.com",
    "arxiv.org",
    "scholar.google.com",
    "researchgate.net",
  ],
  distraction: [
    "youtube.com",
    "instagram.com",
    "facebook.com",
    "twitter.com",
    "x.com",
    "tiktok.com",
    "reddit.com",
    "netflix.com",
    "twitch.tv",
    "9gag.com",
    "buzzfeed.com",
    "tumblr.com",
    "pinterest.com",
    "snapchat.com",
    "discord.com",
    "disneyplus.com",
    "hulu.com",
    "primevideo.com",
    "hotstar.com",
    "crunchyroll.com",
    "bilibili.com",
    "dailymotion.com",
    "vimeo.com",
    "imgur.com",
    "funnyjunk.com",
  ],
};

// -----------------------------------------------------------
// 1️⃣ classifySite(url)
// Takes a URL → returns: "productive" / "distraction" / "neutral"
// Uses rule-based matching with keyword fallback
// -----------------------------------------------------------
function classifySite(url) {
  if (!url) return "neutral";

  try {
    const hostname = new URL(url).hostname.replace("www.", "").toLowerCase();
    const fullPath = new URL(url).pathname.toLowerCase();

    // Check productive sites
    for (const domain of SITE_RULES.productive) {
      if (hostname.includes(domain) || domain.includes(hostname)) {
        return "productive";
      }
    }

    // Check distraction sites
    for (const domain of SITE_RULES.distraction) {
      if (hostname.includes(domain) || domain.includes(hostname)) {
        return "distraction";
      }
    }

    // --- AI-like keyword heuristic fallback ---
    // Check URL path for productivity keywords
    const productiveKeywords = [
      "docs",
      "api",
      "tutorial",
      "learn",
      "course",
      "education",
      "code",
      "develop",
      "research",
      "documentation",
      "reference",
      "wiki",
      "guide",
      "handbook",
    ];
    const distractionKeywords = [
      "game",
      "play",
      "watch",
      "stream",
      "meme",
      "funny",
      "gossip",
      "celebrity",
      "entertainment",
      "viral",
    ];

    const urlText = hostname + fullPath;

    for (const kw of distractionKeywords) {
      if (urlText.includes(kw)) return "distraction";
    }

    for (const kw of productiveKeywords) {
      if (urlText.includes(kw)) return "productive";
    }

    // Everything else is neutral
    return "neutral";
  } catch (e) {
    return "neutral";
  }
}

// -----------------------------------------------------------
// 2️⃣ shouldBlock(type, focusMode)
// Decision engine: decides whether to block a site
// Block only distractions when focus mode is active
// -----------------------------------------------------------
function shouldBlock(type, focusMode) {
  return focusMode === true && type === "distraction";
}

// -----------------------------------------------------------
// 3️⃣ generateSummary(logs)
// Creates a smart notification summary from activity logs
// Example: "You had 12 activities: 7 productive, 3 distractions (blocked), 2 neutral"
// -----------------------------------------------------------
function generateSummary(logs) {
  if (!logs || logs.length === 0) {
    return {
      text: "No activity recorded yet. Start browsing to see insights!",
      productive: 0,
      distraction: 0,
      neutral: 0,
      blocked: 0,
      total: 0,
    };
  }

  const total = logs.length;
  const productive = logs.filter((l) => l.type === "productive").length;
  const distraction = logs.filter((l) => l.type === "distraction").length;
  const neutral = logs.filter((l) => l.type === "neutral").length;
  const blocked = logs.filter((l) => l.action === "blocked").length;

  // Build smart summary text
  let text = `You had ${total} activit${total === 1 ? "y" : "ies"}: `;
  const parts = [];

  if (productive > 0)
    parts.push(
      `${productive} productive ✅`
    );
  if (distraction > 0)
    parts.push(
      `${distraction} distraction${distraction > 1 ? "s" : ""} ⚠️`
    );
  if (neutral > 0)
    parts.push(`${neutral} neutral`);

  text += parts.join(", ");

  if (blocked > 0) {
    text += ` (${blocked} blocked 🛡️)`;
  }

  // Add motivational message
  const score = calculateProductivityScore(logs);
  if (score >= 80) {
    text += " — Outstanding focus! Keep it up! 🏆";
  } else if (score >= 60) {
    text += " — Good progress! Stay on track. 💪";
  } else if (score >= 40) {
    text += " — Room for improvement. Try enabling Focus Mode! 🎯";
  } else {
    text += " — High distraction detected. Time to refocus! 🔴";
  }

  return {
    text,
    productive,
    distraction,
    neutral,
    blocked,
    total,
    score,
  };
}

// -----------------------------------------------------------
// 4️⃣ calculateProductivityScore(logs)
// Returns a 0-100 productivity score
// Formula: (productive * 1.0 + neutral * 0.3) / total * 100
// Penalizes distractions more heavily
// -----------------------------------------------------------
function calculateProductivityScore(logs) {
  if (!logs || logs.length === 0) return 0;

  const total = logs.length;
  const productive = logs.filter((l) => l.type === "productive").length;
  const neutral = logs.filter((l) => l.type === "neutral").length;
  const blocked = logs.filter((l) => l.action === "blocked").length;

  // Weighted scoring:
  // - Productive actions: full credit (1.0)
  // - Neutral actions: partial credit (0.3)
  // - Blocked distractions: small bonus (0.1) — rewarding that the system saved you
  const weightedScore = productive * 1.0 + neutral * 0.3 + blocked * 0.1;
  const maxScore = total;

  const score = Math.round((weightedScore / maxScore) * 100);
  return Math.min(100, Math.max(0, score)); // Clamp 0-100
}

// -----------------------------------------------------------
// 5️⃣ generateSmartSuggestions(stats)
// Returns an array of AI-powered suggestion objects
// Each: { icon, title, desc, type, priority }
// -----------------------------------------------------------
function generateSmartSuggestions(stats) {
  const suggestions = [];

  if (!stats || stats.total === 0) {
    suggestions.push({
      icon: "🚀",
      title: "Get Started",
      desc: "Start browsing to see your productivity insights!",
      type: "info",
      priority: 1,
    });
    return suggestions;
  }

  const score = stats.productivityScore || 0;

  // --- Score-based suggestions ---
  if (score >= 80) {
    suggestions.push({
      icon: "🏆",
      title: "Amazing Focus!",
      desc: `Your productivity score is ${score}%. You're in the zone!`,
      type: "success",
      priority: 1,
    });
  } else if (score >= 60) {
    suggestions.push({
      icon: "💪",
      title: "Good Progress",
      desc: `Score: ${score}%. Enable Focus Mode to reach 80%+!`,
      type: "info",
      priority: 2,
    });
  } else if (score >= 40) {
    suggestions.push({
      icon: "⚠️",
      title: "Needs Improvement",
      desc: `Score: ${score}%. You're getting distracted. Try a focused session!`,
      type: "warning",
      priority: 3,
    });
  } else {
    suggestions.push({
      icon: "🔴",
      title: "High Distraction Alert",
      desc: `Score: ${score}%. Enable Focus Mode immediately to get back on track!`,
      type: "warning",
      priority: 4,
    });
  }

  // --- Break suggestion ---
  if (stats.productive >= 15) {
    suggestions.push({
      icon: "🧘",
      title: "Take a Break",
      desc: "You've been productive for a long while. A 5-min break boosts focus!",
      type: "info",
      priority: 2,
    });
  } else if (stats.productive >= 8) {
    suggestions.push({
      icon: "☕",
      title: "Quick Stretch",
      desc: "Good productive streak! Consider a quick stretch or water break.",
      type: "info",
      priority: 1,
    });
  }

  // --- Distraction alert ---
  if (stats.distraction > stats.productive && stats.distraction > 3) {
    suggestions.push({
      icon: "📵",
      title: "Distraction Overload",
      desc: "Distracting sites exceed productive ones. Block them with Focus Mode!",
      type: "warning",
      priority: 4,
    });
  }

  // --- Focus mode suggestion ---
  if (!stats.focusMode && stats.distraction > 2) {
    suggestions.push({
      icon: "🎯",
      title: "Enable Focus Mode",
      desc: `You've visited ${stats.distraction} distracting sites. Enable Focus Mode to block them.`,
      type: "info",
      priority: 3,
    });
  }

  // --- Focus mode active ---
  if (stats.focusMode) {
    suggestions.push({
      icon: "🔥",
      title: "Focus Mode Active",
      desc: `${stats.blocked || 0} distractions blocked so far. Great discipline!`,
      type: "success",
      priority: 1,
    });
  }

  // --- Top distraction alert ---
  if (stats.topSites && stats.topSites.length > 0) {
    const topDistraction = stats.topSites.find(
      (s) => s.type === "distraction"
    );
    if (topDistraction && topDistraction.count > 3) {
      suggestions.push({
        icon: "🔍",
        title: `Frequent: ${topDistraction.hostname}`,
        desc: `You visited ${topDistraction.hostname} ${topDistraction.count} times. Consider blocking it.`,
        type: "warning",
        priority: 3,
      });
    }
  }

  // Sort by priority (higher priority first) and limit to top 4
  return suggestions.sort((a, b) => b.priority - a.priority).slice(0, 4);
}

// -----------------------------------------------------------
// 6️⃣ analyzeUrgency(text)
// Simple heuristic for urgency detection in snippets
// -----------------------------------------------------------
function analyzeUrgency(text) {
  if (!text) return false;
  const urgentKeywords = [
    "urgent", "immediately", "asap", "call me", "emergency", 
    "quick question", "help", "important", "deadline", "fast"
  ];
  const lowerText = text.toLowerCase();
  return urgentKeywords.some(kw => lowerText.includes(kw));
}

// -----------------------------------------------------------
// 📤 EXPORTS
// -----------------------------------------------------------
module.exports = {
  classifySite,
  shouldBlock,
  generateSummary,
  calculateProductivityScore,
  generateSmartSuggestions,
  analyzeUrgency,
  SITE_RULES,
};
