import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

// Components
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import StatsCard from "./components/StatsCard";
import ChartSection from "./components/ChartSection";
import LogsTable from "./components/LogsTable";
import NotificationPanel from "./components/NotificationPanel";
import SettingsPanel from "./components/SettingsPanel";

const API_URL = "http://localhost:5001/api";

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);

  // Stats State
  const [stats, setStats] = useState({
    total: 0,
    productive: 0,
    distraction: 0,
    blocked: 0,
    focusTimeMinutes: 0,
    productivityScore: 0,
    focusMode: false,
    activityByHour: [],
    pieData: [],
  });

  // Logs State
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  // Mock Notification data (since we only count blocks right now)
  const [blockedNotifs, setBlockedNotifs] = useState(0);

  // Custom Blocked Sites
  const [customBlockedSites, setCustomBlockedSites] = useState([]);

  // -----------------------------------------------------------
  // 📥 FETCH DATA
  // -----------------------------------------------------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch stats
        const [
          statsRes,
          logsRes,
          summaryRes,
          suggRes,
          sitesRes
        ] = await Promise.all([
          axios.get(`${API_URL}/stats`),
          axios.get(`${API_URL}/logs?limit=25`),
          axios.get(`${API_URL}/summary`),
          axios.get(`${API_URL}/suggestions`),
          axios.get(`${API_URL}/custom-sites`)
        ]);

        setStats(statsRes.data);
        setBlockedNotifs(statsRes.data.blocked || 0);
        setLogs(logsRes.data.logs);
        setSummary(summaryRes.data.summary);
        setSuggestions(suggRes.data.suggestions);
        setCustomBlockedSites(sitesRes.data.sites || []);

      } catch (err) {
        console.error("Error fetching data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Auto-refresh stats every 10s
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // -----------------------------------------------------------
  // 🎛️ FOCUS MODE TOGGLE
  // -----------------------------------------------------------
  const toggleFocusMode = async () => {
    try {
      const newMode = !stats.focusMode;
      // Optimistic update
      setStats((prev) => ({ ...prev, focusMode: newMode }));

      await axios.post(`${API_URL}/focus`, { focusMode: newMode });
    } catch (err) {
      console.error("Failed to toggle focus mode", err);
      // Revert on fail
      setStats((prev) => ({ ...prev, focusMode: !prev.focusMode }));
    }
  };

  // -----------------------------------------------------------
  // 🛑 CUSTOM SITE MANAGEMENT
  // -----------------------------------------------------------
  const handleAddSite = async (site) => {
    try {
      const res = await axios.post(`${API_URL}/custom-sites`, { site });
      setCustomBlockedSites(res.data.sites);
    } catch (err) {
      console.error("Error adding site", err);
    }
  };

  const handleRemoveSite = async (site) => {
    try {
      const res = await axios.delete(`${API_URL}/custom-sites`, { data: { site } });
      setCustomBlockedSites(res.data.sites);
    } catch (err) {
      console.error("Error removing site", err);
    }
  };

  // -----------------------------------------------------------
  // 🎨 RENDER CONTENT BASED ON TAB
  // -----------------------------------------------------------
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex-1 flex justify-center items-center">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>
      );
    }

    if (activeTab === "settings") {
      return (
        <SettingsPanel
          focusMode={stats.focusMode}
          toggleFocusMode={toggleFocusMode}
          customBlockedSites={customBlockedSites}
          onAddSite={handleAddSite}
          onRemoveSite={handleRemoveSite}
        />
      );
    }

    if (activeTab === "analytics") {
      return (
        <div className="space-y-6">
          <ChartSection barData={stats.activityByHour} pieData={stats.pieData} />
          
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mt-6 relative overflow-hidden isolate">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />
            <h3 className="text-xl font-semibold text-emerald-400 mb-4 flex items-center gap-2">
              <span>💡</span> AI Insights & Summary
            </h3>
            <p className="text-slate-300 font-medium leading-relaxed mb-6">
              {summary || "Analyzing recent activity..."}
            </p>
            
            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Smart Suggestions
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {suggestions.map((sugg, i) => (
                <div key={i} className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl flex flex-col gap-2 group hover:bg-slate-800/80 transition-colors">
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <span className="text-xl group-hover:scale-110 transition-transform">{sugg.icon}</span> 
                    {sugg.title}
                  </div>
                  <div className="text-sm text-slate-400 leading-relaxed">
                    {sugg.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Default "dashboard" View
    return (
      <div className="space-y-6">
        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Activities"
            value={stats.total}
            icon="🌐"
            gradient="from-blue-500 to-cyan-500"
          />
          <StatsCard
            title="Productive Mins"
            // Converting productive logs to rough minutes (2m per log proxy)
            value={Math.round(stats.productive * 2)}
            icon="⏱️"
            gradient="from-emerald-500 to-teal-500"
          />
          <StatsCard
            title="Distractions Blocked"
            value={stats.blocked}
            icon="🛡️"
            gradient="from-rose-500 to-orange-500"
          />
          <StatsCard
            title="Productivity Score"
            value={stats.productivityScore}
            icon={stats.productivityScore > 70 ? "🚀" : "📈"}
            gradient="from-indigo-500 to-purple-500"
            pulse={stats.productivityScore > 85}
          />
        </div>

        {/* NOTIFICATIONS & ACTIVITY LOGS ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          <div className="lg:col-span-1">
            <NotificationPanel blockedNotifications={blockedNotifs} />
          </div>
          <div className="lg:col-span-3">
            <LogsTable logs={logs} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#0f0f1a] text-slate-200">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen relative isolate">
        <Header 
          title={
            activeTab === "dashboard" ? "Dashboard Overview" :
            activeTab === "analytics" ? "Productivity Analytics" : 
            "Preferences & Settings"
          }
          focusMode={stats.focusMode} 
          onToggleFocus={toggleFocusMode} 
        />
        
        {/* Main padding wrapper */}
        <div className="p-8 pb-12 flex-1">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;
