import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Globe, 
  Clock, 
  ShieldAlert, 
  Rocket, 
  TrendingUp,
  Zap,
  Activity,
  Award,
  Sparkles
} from 'lucide-react';
// Styles are now centralized in index.css for Tailwind v4 compliance

// Components
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import StatsCard from "./components/StatsCard";
import ChartSection from "./components/ChartSection";
import LogsTable from "./components/LogsTable";
import NotificationPanel from "./components/NotificationPanel";
import SettingsPanel from "./components/SettingsPanel";
import ActionCenter from "./components/ActionCenter";
import ManagePage from "./components/ManagePage";
import WhatsAppManage from "./components/WhatsAppManage";
import InstagramManage from "./components/InstagramManage";
import GmailManage from "./components/GmailManage";
import OutlookManage from "./components/OutlookManage";
import ScoreRing from "./components/ScoreRing";
import GlassCard from "./components/GlassCard";

// Premium Sound Engine
const playSound = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'level_up') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.5);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'focus_on') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.3);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'achievement') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (e) { console.error("Audio error", e); }
};

const API_URL = "http://localhost:5001/api";

function App() {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

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
    gamification: {
      xp: 0,
      level: 1,
      dailyStreak: 0,
      nextLevelXp: 1000,
      achievements: []
    }
  });

  // Logs State
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [customBlockedSites, setCustomBlockedSites] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, logsRes, summaryRes, suggRes, sitesRes] = await Promise.all([
          axios.get(`${API_URL}/stats`),
          axios.get(`${API_URL}/logs?limit=25`),
          axios.get(`${API_URL}/summary`),
          axios.get(`${API_URL}/suggestions`),
          axios.get(`${API_URL}/custom-sites`)
        ]);

        setStats(statsRes.data);
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
    const interval = setInterval(fetchData, 5000); // Faster polling for real-time feel
    return () => clearInterval(interval);
  }, []);

  const toggleFocusMode = async () => {
    try {
      const newMode = !stats.focusMode;
      setStats((prev) => ({ ...prev, focusMode: newMode }));
      playSound(newMode ? 'focus_on' : 'achievement'); // Use achievement sound for 'off' as a reward
      await axios.post(`${API_URL}/focus`, { focusMode: newMode });
    } catch (err) {
      console.error("Failed to toggle focus mode", err);
      setStats((prev) => ({ ...prev, focusMode: !prev.focusMode }));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background justify-center items-center">
        <motion.div 
          animate={{ rotate: 360, scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.3)]"
        />
      </div>
    );
  }
  const pageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  };

  return (
    <div className="flex min-h-screen bg-background text-slate-200 selection:bg-indigo-500/30">
      <Sidebar gamification={stats.gamification} />
      
      <main className="flex-1 ml-64 flex flex-col min-h-screen relative isolate overflow-x-hidden">
        {/* Background Gradients */}
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full -z-10 pointer-events-none" />
        <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/5 blur-[100px] rounded-full -z-10 pointer-events-none" />

        <Header focusMode={stats.focusMode} onToggleFocus={toggleFocusMode} />
        
        <div className="p-8 pb-12 flex-1">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              <Route path="/dashboard" element={
                <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-8">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 className="text-3xl font-extrabold text-white tracking-tighter">Your Workspace</h2>
                      <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Real-time performance monitoring</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Main Productivity Ring */}
                    <div className="lg:col-span-1">
                      <ScoreRing score={stats.productivityScore} />
                    </div>

                    {/* Stats Grid */}
                    <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <StatsCard 
                        title="Total Activities" 
                        value={stats.total} 
                        icon={<Globe className="text-blue-400" size={24} />} 
                        gradient="from-blue-500 to-cyan-500" 
                        delay={0.1}
                      />
                      <StatsCard 
                        title="Productive Mins" 
                        value={Math.round(stats.productive * 2)} 
                        icon={<Clock className="text-emerald-400" size={24} />} 
                        gradient="from-emerald-500 to-teal-500" 
                        delay={0.2}
                      />
                      <StatsCard 
                        title="Distractions Blocked" 
                        value={stats.blocked} 
                        icon={<ShieldAlert className="text-rose-400" size={24} />} 
                        gradient="from-rose-500 to-orange-500" 
                        delay={0.3}
                      />
                      <StatsCard 
                        title="Productivity Score" 
                        value={stats.productivityScore} 
                        icon={stats.productivityScore > 70 ? <Rocket className="text-purple-400" size={24} /> : <TrendingUp className="text-indigo-400" size={24} />} 
                        gradient="from-indigo-500 to-purple-500" 
                        pulse={stats.productivityScore > 85} 
                        delay={0.4}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                    <div className="xl:col-span-1"><NotificationPanel blockedNotifications={stats.blocked} /></div>
                    <div className="xl:col-span-3"><LogsTable logs={logs} /></div>
                  </div>
                </motion.div>
              } />

              <Route path="/analytics" element={
                <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="space-y-8">
                  <ChartSection barData={stats.activityByHour} pieData={stats.pieData} />
                  
                  <GlassCard className="p-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-glow shadow-emerald-500/10">
                        <Sparkles size={20} />
                      </div>
                      <h3 className="text-xl font-extrabold text-white tracking-tight italic">AI Insights Engine</h3>
                    </div>
                    
                    <p className="text-slate-300 font-bold leading-relaxed mb-10 text-lg border-l-2 border-emerald-500/30 pl-6 animate-fade-in">
                      {summary || "Our AI is currently synthesizing your behavioral patterns from the last 24 hours..."}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {suggestions.map((sugg, i) => (
                        <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex flex-col gap-3 group hover:bg-white/10 transition-all duration-300 cursor-default">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl group-hover:scale-125 transition-transform duration-500 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
                              {sugg.icon}
                            </span> 
                            <span className="font-bold text-white tracking-tight">{sugg.title}</span>
                          </div>
                          <p className="text-sm text-slate-500 font-medium leading-relaxed">{sugg.desc}</p>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                </motion.div>
              } />

              <Route path="/manage/*" element={
                <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                  <Routes>
                    <Route index element={<ManagePage setActiveTab={(id) => navigate(`/manage/${id.replace('manage-', '')}`)} />} />
                    <Route path="whatsapp" element={<WhatsAppManage />} />
                    <Route path="instagram" element={<InstagramManage />} />
                    <Route path="gmail" element={<GmailManage />} />
                    <Route path="outlook" element={<OutlookManage />} />
                  </Routes>
                </motion.div>
              } />

              <Route path="/action-center" element={
                <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                  <ActionCenter />
                </motion.div>
              } />
              
              <Route path="/analyze" element={<Navigate to="/analytics" replace />} />
              <Route path="/dasboard" element={<Navigate to="/dashboard" replace />} />
              
              <Route path="/settings" element={
                <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
                  <SettingsPanel 
                    focusMode={stats.focusMode} 
                    toggleFocusMode={toggleFocusMode} 
                    customBlockedSites={customBlockedSites} 
                    onAddSite={async (site) => {
                      const res = await axios.post(`${API_URL}/custom-sites`, { site });
                      setCustomBlockedSites(res.data.sites);
                    }} 
                    onRemoveSite={async (site) => {
                      const res = await axios.delete(`${API_URL}/custom-sites`, { data: { site } });
                      setCustomBlockedSites(res.data.sites);
                    }} 
                  />
                </motion.div>
              } />
            </Routes>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default App;
