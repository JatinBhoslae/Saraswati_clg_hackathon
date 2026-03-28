import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  ShieldAlert, 
  Trash2, 
  Plus, 
  Mail, 
  MessageSquare, 
  Zap, 
  BellOff, 
  Info,
  CheckCircle2,
  Lock,
  Loader2
} from "lucide-react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = "http://localhost:5001/api/presets";

const PresetDetailPage = () => {
  const { presetId } = useParams();
  const navigate = useNavigate();
  const [preset, setPreset] = useState(null);
  const [mutedUsers, setMutedUsers] = useState([]);
  const [newIdentifier, setNewIdentifier] = useState("");
  const [selectedApp, setSelectedApp] = useState("whatsapp");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPresetDetails();
  }, [presetId]);

  const fetchPresetDetails = async () => {
    try {
      setLoading(true);
      const [presetRes, mutedRes] = await Promise.all([
        axios.get(`${API_URL}/${presetId}`),
        axios.get(`${API_URL}/${presetId}/muted-users`)
      ]);
      setPreset(presetRes.data);
      setMutedUsers(mutedRes.data.mutedUsers || []);
    } catch (err) {
      console.error("Error fetching preset details:", err);
      navigate("/presets");
    } finally {
      setLoading(false);
    }
  };

  const handleMuteUser = async (e) => {
    e.preventDefault();
    if (!newIdentifier.trim()) return;
    
    try {
      setSubmitting(true);
      const res = await axios.post(`${API_URL}/${presetId}/mute-user`, {
        app: selectedApp,
        identifier: newIdentifier.trim()
      });
      setMutedUsers(res.data.mutedUsers);
      setNewIdentifier("");
    } catch (err) {
      console.error("Mute user failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnmuteUser = async (app, identifier) => {
    try {
      const res = await axios.post(`${API_URL}/${presetId}/unmute-user`, {
        app,
        identifier
      });
      setMutedUsers(res.data.mutedUsers);
    } catch (err) {
      console.error("Unmute user failed:", err);
    }
  };

  const handleActivate = async () => {
    try {
      await axios.post(`${API_URL}/activate`, { presetId });
      fetchPresetDetails();
    } catch (err) {
      console.error("Activation failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
      </div>
    );
  }

  const getThemeColor = (id) => {
    switch(id) {
      case 'work': return '#3B82F6';
      case 'home': return '#10B981';
      case 'vacation': return '#F59E0B';
      default: return '#8B5CF6';
    }
  };

  const getThemeRGB = (id) => {
    switch(id) {
      case 'work': return '59, 130, 246';
      case 'home': return '16, 185, 129';
      case 'vacation': return '245, 158, 11';
      default: return '139, 92, 246';
    }
  };

  const themeColor = getThemeColor(preset.id);
  const themeRGB = getThemeRGB(preset.id);

  return (
    <div className="max-w-4xl mx-auto py-10 px-8" style={{ '--platform-color': themeColor, '--platform-color-rgb': themeRGB }}>
      {/* Back Button */}
      <Link to="/presets" className="flex items-center gap-2 text-slate-500 hover:text-white mb-8 transition-colors group">
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        <span className="font-bold text-sm tracking-widest uppercase">Back to Marketplace</span>
      </Link>

      {/* Header Info */}
      <header className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-3xl shadow-2xl">
            {preset.id === 'work' ? '💼' : preset.id === 'home' ? '🏠' : '🌴'}
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter mb-2">{preset.label}</h1>
            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${preset.focusMode ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                {preset.focusMode ? 'Focus Mode Enabled' : 'Casual Mode'}
              </span>
              <span className="text-slate-500 text-xs font-bold">•</span>
              <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">{preset.blockedSites.length} Blocked Sites</span>
            </div>
          </div>
        </div>

        {preset.isActive ? (
          <div className="flex items-center gap-3 px-6 py-3 bg-green-500/10 border border-green-500/20 text-green-500 rounded-2xl">
            <CheckCircle2 size={18} />
            <span className="font-bold text-sm uppercase tracking-widest">Active Now</span>
          </div>
        ) : (
          <button 
            onClick={handleActivate}
            className="px-8 py-3 bg-white text-black hover:bg-white/90 font-black rounded-2xl text-sm uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/5"
          >
            Activate Profile
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Preset Rules */}
        <div className="md:col-span-2 space-y-8">
          {/* Managed Mute List */}
          <section className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <BellOff size={100} />
            </div>
            
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div>
                <h2 className="text-xl font-black text-white mb-1">Strict Mute List</h2>
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Per-Contact Bypass Control</p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
                <ShieldAlert size={20} />
              </div>
            </div>

            <form onSubmit={handleMuteUser} className="flex gap-3 mb-8 relative z-10">
              <select 
                value={selectedApp}
                onChange={(e) => setSelectedApp(e.target.value)}
                className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-red-500/50 transition-all uppercase tracking-widest"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="gmail">Gmail</option>
                <option value="instagram">Instagram</option>
              </select>
              <input 
                type="text"
                placeholder={selectedApp === 'gmail' ? "Email address..." : "Contact name..."}
                value={newIdentifier}
                onChange={(e) => setNewIdentifier(e.target.value)}
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-all placeholder:text-slate-700"
              />
              <button 
                type="submit"
                disabled={submitting}
                className="p-3 bg-white text-black rounded-xl hover:bg-white/90 transition-all active:scale-95 disabled:opacity-50"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={20} />}
              </button>
            </form>

            <div className="space-y-3 relative z-10">
              {mutedUsers.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl">
                  <p className="text-slate-500 text-sm font-medium">No custom muting rules established.</p>
                </div>
              ) : (
                mutedUsers.map((user, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={`${user.app}-${user.identifier}`}
                    className="mute-list-item group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${user.app === 'whatsapp' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                        {user.app === 'whatsapp' ? <MessageSquare size={16} /> : <Mail size={16} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{user.identifier}</p>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{user.app}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleUnmuteUser(user.app, user.identifier)}
                      className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Config Details */}
        <div className="space-y-6">
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Lock size={14} className="text-indigo-500" />
              Focus Rulebook
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-white/5 rounded-lg text-white/50">
                  <Info size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white mb-1">Batching Intervals</p>
                  <p className="text-[10px] text-slate-500 font-medium">Notifications held for {preset.notificationBatchMinutes}m</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2 bg-white/5 rounded-lg text-white/50">
                  <ShieldAlert size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white mb-1">Restricted Apps</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {preset.mutedApps.map(app => (
                      <span key={app} className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded text-[10px] uppercase font-black">{app}</span>
                    ))}
                    {preset.mutedApps.length === 0 && <span className="text-[10px] text-slate-600 italic">None</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4 pt-4 border-t border-white/5">
                <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                  <Zap size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white mb-1">Allowed Apps</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {preset.allowedApps.map(app => (
                      <span key={app} className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded text-[10px] uppercase font-black">{app}</span>
                    ))}
                    {preset.allowedApps.length === 0 && <span className="text-[10px] text-slate-600 italic">None</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-indigo-600/5 border border-indigo-500/10 rounded-2xl p-6">
            <p className="text-xs font-medium text-slate-400 leading-relaxed italic">
              "When this preset is active, the Saraswati extension will automatically route all incoming noise based on these rules."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PresetDetailPage;
