# 🧠 Context-Aware Productivity Assistant

A complete full-stack productivity system that tracks browsing activity, classifies websites, blocks distractions during focus mode, and provides AI-powered analytics via a stunning dashboard.

## 🏗️ Architecture

```
User Activity → Chrome Extension (Context Detection)
                     ↓
              AI Classifier + Decision Engine
                     ↓
         Block / Allow → Chrome Notification
                     ↓
           Backend API (Express.js) → Store Data
                     ↓
         React Dashboard → Analytics + Charts
```

## 📁 Project Structure

```
project/
├── extension/              # Chrome Extension (Manifest v3)
│   ├── manifest.json       # Extension configuration
│   ├── background.js       # Service worker: classification + blocking
│   ├── content.js          # Page interaction tracking
│   ├── popup.html/js/css   # Extension popup UI
│   ├── blocked.html/css    # Blocked site page
│   └── icons/              # Extension icons
│
├── backend/                # Node.js + Express API Server
│   ├── server.js           # Main server entry point
│   ├── ai/
│   │   └── classifier.js   # AI classification + scoring engine
│   ├── routes/
│   │   ├── logRoutes.js    # POST /api/log, GET /api/logs
│   │   ├── statsRoutes.js  # GET /api/stats, /summary, /suggestions
│   │   └── focusRoutes.js  # POST/GET /api/focus
│   └── models/
│       └── store.js        # In-memory data store
│
├── dashboard/              # React + Tailwind + Recharts
│   ├── src/
│   │   ├── App.jsx         # Main dashboard component
│   │   ├── App.css         # Premium dark-mode styles
│   │   ├── main.jsx        # React entry point
│   │   └── index.css       # Tailwind base import
│   ├── index.html          # HTML template
│   └── vite.config.js      # Vite configuration
│
└── README.md
```

## 🚀 How to Run

### Prerequisites
- **Node.js** v18+ and **npm** installed
- **Google Chrome** browser

### Step 1: Start the Backend

```bash
cd backend
npm install
npm start
```

The backend runs at **http://localhost:5001**.

### Step 2: Start the Dashboard

```bash
cd dashboard
npm install
npm run dev
```

The dashboard runs at **http://localhost:5173**.

### Step 3: Load the Chrome Extension

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer Mode** (top-right toggle)
3. Click **"Load unpacked"**
4. Select the `extension/` folder
5. The extension icon will appear in your toolbar

### Step 4: Start Using!

1. Browse the web normally — the extension tracks your tabs
2. Click the extension icon to toggle **Focus Mode**
3. With Focus Mode ON, distracting sites (YouTube, Instagram, etc.) are blocked
4. Open the dashboard at **http://localhost:5173** to see analytics

---

## 📡 API Endpoints

| Method | Endpoint           | Description                              |
|--------|-------------------|------------------------------------------|
| GET    | `/`               | Health check + list all endpoints         |
| POST   | `/api/log`        | Save an activity log                      |
| GET    | `/api/logs`       | Get logs (query: limit, type, action)     |
| GET    | `/api/stats`      | Get productivity statistics + chart data  |
| GET    | `/api/summary`    | Get AI-generated activity summary         |
| GET    | `/api/suggestions`| Get AI smart suggestions                  |
| POST   | `/api/focus`      | Toggle focus mode (body: {focusMode})     |
| GET    | `/api/focus`      | Get current focus mode status             |

---

## 🧠 AI Logic Functions

### 1. `classifySite(url)`
Classifies URLs into `productive`, `distraction`, or `neutral` using:
- Rule-based domain matching (40+ domains)
- Keyword heuristic fallback (URL path analysis)

### 2. `shouldBlock(type, focusMode)`
Decision engine: blocks only if `focusMode === true && type === "distraction"`

### 3. `generateSummary(logs)`
Creates human-readable summaries:
> "You had 12 activities: 7 productive ✅, 3 distractions ⚠️, 2 neutral (3 blocked 🛡️) — Good progress! Stay on track. 💪"

### 4. `calculateProductivityScore(logs)`
Weighted scoring (0-100):
- Productive: 1.0 weight
- Neutral: 0.3 weight
- Blocked distractions: 0.1 bonus

### 5. `generateSmartSuggestions(stats)`
Context-aware suggestions based on:
- Score thresholds
- Distraction ratios
- Focus mode state
- Break recommendations

---

## 📊 Dashboard Features

- **AI Summary Banner** — Real-time activity summary
- **Score Ring** — Animated circular productivity score
- **Stats Cards** — Total activities, productive, distractions, focus time
- **Bar Chart** — Activity distribution by hour
- **Pie Chart** — Productive vs Distraction split
- **Area Chart** — Activity trends over time
- **Smart Suggestions** — AI-powered productivity tips
- **Top Sites Grid** — Most visited sites by category
- **Activity Logs** — Filterable table with badges

---

## 🔌 Extension Features

- **Manifest v3** (latest Chrome standard)
- **Tab tracking** — onActivated + onUpdated listeners
- **AI classification** — every URL is classified in real-time
- **Focus Mode toggle** — via popup or dashboard
- **Site blocking** — redirects to a beautiful blocked page
- **Notifications** — Chrome notifications on block
- **Session summaries** — periodic smart notification summaries
- **Interaction tracking** — content script monitors scroll/click/typing

---

## ⚙️ Tech Stack

| Component    | Technology                          |
|-------------|-------------------------------------|
| Extension   | Chrome Manifest v3, vanilla JS      |
| Backend     | Node.js, Express.js                 |
| Dashboard   | React 19, Vite 8, Recharts          |
| Styling     | Tailwind CSS v4, custom CSS         |
| HTTP Client | Axios                               |
| AI Logic    | Custom rule-based + heuristic engine|

---

## 📝 License

MIT — feel free to use, modify, and distribute.
# Saraswati_clg_hackathon
