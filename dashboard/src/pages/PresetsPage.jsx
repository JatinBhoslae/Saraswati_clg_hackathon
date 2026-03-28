import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  ChevronRight, 
  Search, 
  Filter, 
  Zap, 
  Clock, 
  ShieldAlert, 
  BellOff,
  Briefcase,
  Home,
  Palmtree,
  Moon,
  Dumbbell,
  GraduationCap,
  Users,
  Target
} from "lucide-react";
import axios from "axios";
import { Link } from "react-router-dom";

const API_URL = "http://localhost:5001/api/presets";

const PresetsPage = () => {
  const [presets, setPresets] = useState([]);
  const [activePreset, setActivePreset] = useState(null);
  const [filter, setFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [listRes, activeRes] = await Promise.all([
        axios.get(`${API_URL}/list`),
        axios.get(`${API_URL}/active`)
      ]);
      setPresets(listRes.data.presets || []);
      setActivePreset(activeRes.data.preset);
    } catch (err) {
      console.error("Error fetching presets:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (id) => {
    try {
      await axios.post(`${API_URL}/activate`, { presetId: id });
      fetchData();
    } catch (err) {
      console.error("Activation failed:", err);
    }
  };

  const handleDeactivate = async () => {
    try {
      await axios.post(`${API_URL}/deactivate`);
      fetchData();
    } catch (err) {
      console.error("Deactivation failed:", err);
    }
  };

  const categories = ["All", "Focus", "Leisure", "Personal"];

  const filteredPresets = presets.filter(p => {
    const matchesSearch = p.label.toLowerCase().includes(searchTerm.toLowerCase());
    if (filter === "All") return matchesSearch;
    if (filter === "Focus") return matchesSearch && (p.id === 'work' || p.id === 'deepwork' || p.id === 'student');
    if (filter === "Leisure") return matchesSearch && (p.id === 'home' || p.id === 'vacation');
    if (filter === "Personal") return matchesSearch && (p.id === 'gym' || p.id === 'night' || p.id === 'meeting');
    return matchesSearch;
  });

  const getIcon = (id) => {
    switch(id) {
      case 'work': return <Briefcase className="text-blue-400" size={24} />;
      case 'home': return <Home className="text-emerald-400" size={24} />;
      case 'vacation': return <Palmtree className="text-orange-400" size={24} />;
      case 'deepwork': return <Target className="text-purple-400" size={24} />;
      case 'meeting': return <Users className="text-indigo-400" size={24} />;
      case 'student': return <GraduationCap className="text-cyan-400" size={24} />;
      case 'night': return <Moon className="text-slate-400" size={24} />;
      case 'gym': return <Dumbbell className="text-pink-400" size={24} />;
      default: return <Sparkles className="text-amber-400" size={24} />;
    }
  };

  const getThemeColor = (id) => {
    switch(id) {
      case 'work': return '#3B82F6';
      case 'home': return '#10B981';
      case 'vacation': return '#F59E0B';
      case 'deepwork': return '#8B5CF6';
      case 'meeting': return '#6366F1';
      case 'student': return '#06B6D4';
      case 'night': return '#64748B';
      case 'gym': return '#EC4899';
      default: return '#FBBF24';
    }
  };

  return (
    <div className="manage-hub-wrapper py-10 px-8">
      {/* Header Section */}
      <header className="manage-hub-header relative">
        <div className="manage-hub-title-row">
          <div className="manage-hub-title-icon">
            <Sparkles className="text-indigo-400" size={40} />
          </div>
          <div>
            <h1 className="manage-hub-title">Presets Marketplace</h1>
            <p className="manage-hub-subtitle">
              Activate specialized productivity profiles to sync focus modes, blocked sites, and app muting across all your devices.
            </p>
          </div>
        </div>

        {/* Global Active Preset Status */}
        <AnimatePresence>
          {activePreset && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="active-preset-banner p-4 rounded-xl flex items-center justify-between mb-8 group overflow-hidden"
              style={{ 
                '--platform-color': getThemeColor(activePreset.id),
                '--platform-color-rgb': '99, 102, 241' // Fallback for glow
              }}
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                  <Zap className="text-indigo-400 animate-pulse" size={20} />
                </div>
                <div>
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Active Focus Session</span>
                  <h3 className="text-white font-bold text-lg">{activePreset.label} is currently running</h3>
                </div>
              </div>
              <button 
                onClick={handleDeactivate}
                className="px-6 py-2 bg-white/10 hover:bg-red-500/20 text-white hover:text-red-400 border border-white/10 hover:border-red-500/30 rounded-lg transition-all font-bold text-sm"
              >
                End Session
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/[0.02] border border-white/5 p-4 rounded-2xl mb-12">
          <div className="flex gap-2 p-1 bg-black/20 rounded-xl border border-white/5">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  filter === cat 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text"
              placeholder="Search presets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/20 border border-white/5 rounded-xl py-2.5 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-600"
            />
          </div>
        </div>
      </header>

      {/* Presets Grid */}
      <div className="manage-hub-grid">
        {loading ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-slate-500 font-medium">Syncing marketplace...</p>
          </div>
        ) : filteredPresets.map((preset) => (
          <motion.div
            key={preset.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`manage-platform-card group ${activePreset?.id === preset.id ? 'preset-card-active' : ''}`}
            style={{ 
              '--platform-color': getThemeColor(preset.id),
              '--platform-glow': `${getThemeColor(preset.id)}44`
            }}
          >
            <div className="manage-card-glow" style={{ background: getThemeColor(preset.id) }} />
            
            <div className="manage-card-top">
              <div className="manage-card-icon-wrap" style={{ 
                background: `${getThemeColor(preset.id)}15`,
                border: `1px solid ${getThemeColor(preset.id)}30`
              }}>
                {getIcon(preset.id)}
              </div>
              <div className="manage-card-badges">
                {activePreset?.id === preset.id && (
                  <span className="manage-badge muted bg-green-500 animate-none">Running</span>
                )}
                {preset.focusMode && (
                  <span className="manage-badge api">Focus Mode</span>
                )}
              </div>
            </div>

            <div className="manage-card-content">
              <h3 className="manage-card-name" style={{ color: getThemeColor(preset.id) }}>{preset.label}</h3>
              <div className="flex flex-col gap-2 mt-3">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                  <Clock size={12} />
                  <span>Blocks {preset.blockedSiteCount} distractions</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                  <BellOff size={12} />
                  <span>Mutes {preset.mutedApps.length} notification sources</span>
                </div>
              </div>
            </div>

            <div className="manage-card-footer">
              <Link 
                to={`/presets/${preset.id}`}
                className="flex items-center gap-2 text-xs font-bold text-white/50 hover:text-white transition-colors"
              >
                Configure
                <ChevronRight size={14} />
              </Link>
              
              {activePreset?.id === preset.id ? (
                <button 
                  onClick={handleDeactivate}
                  className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[10px] font-bold uppercase transition-all"
                >
                  Active
                </button>
              ) : (
                <button 
                  onClick={() => handleActivate(preset.id)}
                  className="px-4 py-1.5 bg-white/5 hover:bg-[var(--platform-color)] text-white rounded-lg text-[10px] font-bold uppercase transition-all"
                >
                  Activate
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default PresetsPage;
