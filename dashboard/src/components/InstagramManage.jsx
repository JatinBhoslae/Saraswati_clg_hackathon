import React, { useState, useCallback, useEffect } from "react";
import axios from "axios";
const API_URL = "http://localhost:5001/api";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  Zap, 
  MessageSquare, 
  Heart, 
  Video, 
  BellOff, 
  Bell, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  Clock,
  ArrowLeft,
  X,
  Check
} from "lucide-react";
import clsx from "clsx";

// 📸 MANUAL INSTAGRAM ICON SVG (Avoids lucide-react deprecation issue)
const InstagramIcon = ({ size = 24 }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    stroke="currentColor" 
    strokeWidth="2" 
    fill="none" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const MOCK_ACCOUNTS = [
  { id: "ig-1", name: "dev.vibes", displayName: "Dev Vibes 💻", type: "account", avatar: "DV", followers: "124K", lastAction: "Story mention", count: 5, muted: false, color: "#E1306C" },
  { id: "ig-2", name: "design_daily", displayName: "Design Daily", type: "account", avatar: "DD", followers: "89K", lastAction: "Comment on your post", count: 2, muted: false, color: "#833AB4" },
  { id: "ig-3", name: "techcrunch", displayName: "TechCrunch", type: "account", avatar: "TC", followers: "8.2M", lastAction: "Tagged you", count: 0, muted: false, color: "#405DE6" },
  { id: "ig-4", name: "friends_squad", displayName: "Friends Squad 🎉", type: "group", avatar: "FS", followers: null, lastAction: "New collab post", count: 9, muted: false, color: "#C13584" },
  { id: "ig-5", name: "priya_creates", displayName: "Priya Creates", type: "account", avatar: "PC", followers: "34K", lastAction: "DM request", count: 1, muted: false, color: "#E1306C" },
];

const NOTIF_TYPES = [
  { id: "likes", label: "Likes", icon: <Heart size={18} />, desc: "Post & reel likes", color: "from-pink-500 to-rose-500" },
  { id: "comments", label: "Comments", icon: <MessageSquare size={18} />, desc: "Post interactions", color: "from-purple-500 to-indigo-500" },
  { id: "mentions", label: "Mentions", icon: <Zap size={18} />, desc: "Story & post tags", color: "from-amber-500 to-orange-500" },
  { id: "reels", label: "Reels", icon: <Video size={18} />, desc: "Reel recommendations", color: "from-fuchsia-500 to-purple-600" },
];

const InstagramManage = ({ setActiveTab, onMuteChange }) => {
  const [accounts, setAccounts] = useState(MOCK_ACCOUNTS);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [muteAll, setMuteAll] = useState(false);
  const [mutedTypes, setMutedTypes] = useState(new Set(["reels"])); // Reels muted by default for focus
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mutedNames, setMutedNames] = useState([]); // Currently active mutes
  const [schedulingChat, setSchedulingChat] = useState(null); // Chat name being scheduled
  const [tempSchedule, setTempSchedule] = useState({
      startTime: "09:00",
      endTime: "18:00",
      days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      type: "daily"
  });

  const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  useEffect(() => {
    const fetchRealChats = async () => {
      try {
        const [chatRes, muteRes] = await Promise.all([
            axios.get(`${API_URL}/instagram/chats`),
            axios.get(`${API_URL}/instagram/muted`)
        ]);
        
        setMutedNames(muteRes.data || []);

        if (chatRes.data.chats && chatRes.data.chats.length > 0) {
          // Merge real chats with mocks for a full demo feel
          setAccounts(prev => {
            const realIds = new Set(chatRes.data.chats.map(c => c.name)); // name is unique id for IG
            const filteredMocks = MOCK_ACCOUNTS.filter(m => !realIds.has(m.name));
            return [...chatRes.data.chats, ...filteredMocks];
          });
        }
      } catch (err) {
        console.error("IG fetch failed", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRealChats();
    const interval = setInterval(fetchRealChats, 5000); // Polling for real-time sync
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const sendToExtension = useCallback((config) => {
    window.dispatchEvent(new CustomEvent("PA_DASHBOARD_REQUEST", {
      detail: { type: "PLATFORM_MUTE_UPDATE", platform: "instagram", config }
    }));
  }, []);

  const toggleMute = async (name) => {
    try {
        if (mutedNames.includes(name)) {
            await axios.post(`${API_URL}/instagram/unmute`, { name });
            setMutedNames(prev => prev.filter(n => n !== name));
            showToast(`@${name} restored`);
        } else {
            // Open scheduling first instead of instant mute
            setSchedulingChat(name);
        }
    } catch (err) {
        console.error("Mute toggle failed", err);
    }
  };

  const confirmScheduleMute = async () => {
    try {
        const name = schedulingChat;
        await axios.post(`${API_URL}/instagram/mute`, { 
            name,
            muteStartTime: tempSchedule.startTime,
            muteEndTime: tempSchedule.endTime,
            muteDays: tempSchedule.days,
            muteType: tempSchedule.type
        });
        
        // Refresh active mutes
        const muteRes = await axios.get(`${API_URL}/instagram/muted`);
        setMutedNames(muteRes.data || []);
        
        setSchedulingChat(null);
        showToast(`Precision Guard active for @${name}`);
        
        // 🤖 Automation event
        window.dispatchEvent(new CustomEvent("__pa_automate_mute__", {
            detail: { name, platform: "instagram" }
        }));
    } catch (err) {
        console.error("Scheduling failed", err);
    }
  };

  const toggleMuteDay = (day) => {
    setTempSchedule(prev => ({
        ...prev,
        days: prev.days.includes(day) 
            ? prev.days.filter(d => d !== day) 
            : [...prev.days, day]
    }));
  };

  const toggleNotifType = (typeId) => {
    setMutedTypes(prev => {
      const next = new Set(prev);
      const isMuting = !next.has(typeId);
      isMuting ? next.add(typeId) : next.delete(typeId);
      sendToExtension({ muteNotifType: typeId, muted: isMuting });
      showToast(`${typeId} ${isMuting ? "blocked" : "restored"}`);
      return next;
    });
  };

  const filtered = accounts.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.displayName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-8 pb-12"
    >
      {/* 🚀 GLOWING HEADER */}
      <div className="relative p-10 rounded-[40px] overflow-hidden bg-slate-900/40 border border-white/5 shadow-2xl">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-br from-pink-500/20 to-purple-500/10 blur-[100px] -z-10" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] p-[2px] shadow-lg shadow-pink-500/20">
               <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center text-white">
                  <InstagramIcon size={40} />
               </div>
            </div>
            <div>
               <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-black text-white tracking-tighter">Instagram Guard</h1>
                  <span className="px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-[10px] font-bold text-pink-400 uppercase tracking-widest">Active Shield</span>
               </div>
               <p className="text-slate-400 mt-2 font-medium">Precision distraction management for your Instagram workspace.</p>
            </div>
          </div>
          
          <button 
            onClick={() => setActiveTab("manage")}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all w-fit"
          >
            <ArrowLeft size={18} /> Back to Hub
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: INSIGHTS & CONTROLS */}
        <div className="space-y-8">
          
          {/* 📊 REAL-TIME SHIELD STATS */}
          <div className="p-8 rounded-[40px] bg-slate-900/60 border border-white/10 shadow-xl relative overflow-hidden group">
            <div className="absolute bottom-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <Shield size={120} className="text-pink-500" />
            </div>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <BarChart3 size={14} className="text-pink-400" /> Shield Metrics
            </h3>
            <div className="grid grid-cols-2 gap-6">
               <div>
                  <p className="text-3xl font-black text-white">42</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Reels Blocked</p>
               </div>
               <div>
                  <p className="text-3xl font-black text-pink-500">12m</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Attention Saved</p>
               </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
               <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-300">Reel Addiction Filter</span>
                  <div className="w-12 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                     <span className="text-[8px] font-black text-emerald-400">OPTIMIZED</span>
                  </div>
               </div>
            </div>
          </div>

          {/* 🔔 NOTIFICATION TYPE CARDS */}
          <div className="space-y-3">
             <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] pl-2 mb-4">Granular Silencing</h3>
             <div className="grid grid-cols-1 gap-3">
                {NOTIF_TYPES.map(type => (
                  <button 
                    key={type.id}
                    onClick={() => toggleNotifType(type.id)}
                    className={`flex items-center justify-between p-5 rounded-3xl transition-all border group ${
                      mutedTypes.has(type.id) 
                      ? 'bg-slate-800/40 border-white/5 grayscale-[0.8]' 
                      : 'bg-slate-900/60 border-white/10 hover:border-pink-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                       <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${type.color} flex items-center justify-center text-white shadow-lg`}>
                          {type.icon}
                       </div>
                       <div className="text-left">
                          <p className="text-sm font-bold text-white">{type.label}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{type.desc}</p>
                       </div>
                    </div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      mutedTypes.has(type.id) ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                       {mutedTypes.has(type.id) ? <BellOff size={16} /> : <Bell size={16} />}
                    </div>
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ACCOUNT MANAGEMENT */}
        <div className="lg:col-span-2 space-y-8">
           
           <div className="p-10 rounded-[40px] bg-slate-900/40 border border-white/10 shadow-xl min-h-[600px] flex flex-col">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                 <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">Accounts & Threads</h3>
                    <p className="text-slate-500 text-sm mt-1">Manage individual message bypass rules.</p>
                 </div>
                 <div className="relative w-full md:w-72">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search followers..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-pink-500/50 transition-all"
                    />
                 </div>
              </div>

              <div className="space-y-4 flex-1">
                 <AnimatePresence>
                    {filtered.map((acc, idx) => {
                      const isActiveMute = mutedNames.includes(acc.name);
                      const isRuleSet = acc.isMuted;
                      
                      return (
                      <motion.div 
                        key={acc.id || acc.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`group p-6 rounded-3xl border transition-all flex items-center justify-between ${
                          isActiveMute 
                          ? 'bg-rose-500/5 border-rose-500/10 grayscale-[0.8] opacity-60' 
                          : 'bg-white/5 border-white/10 hover:bg-white/[0.08]'
                        }`}
                      >
                         <div className="flex items-center gap-5">
                            <div className="relative">
                               <div className={clsx(
                                 "w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg border",
                                 isActiveMute ? "bg-slate-800 border-white/5" : "bg-gradient-to-tr from-pink-500 to-purple-500 border-white/10"
                               )}>
                                  {acc.avatar || (acc.name ? acc.name[0].toUpperCase() : "?")}
                               </div>
                               {acc.unreadCount > 0 && !isActiveMute && (
                                 <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-slate-900">
                                    {acc.unreadCount}
                                 </span>
                               )}
                            </div>
                            <div>
                               <div className="flex items-center gap-2">
                                  <h4 className="text-base font-bold text-white">{acc.displayName || acc.name}</h4>
                                  {acc.followers && <span className="text-[9px] font-black text-slate-500 bg-white/5 px-2 py-1 rounded-md uppercase tracking-wider">{acc.followers}</span>}
                                  {isActiveMute && <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest italic ml-2">(Blocked)</span>}
                                  {!isActiveMute && isRuleSet && <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest italic ml-2 flex items-center gap-1"><Clock size={10} /> (Scheduled)</span>}
                               </div>
                               <p className="text-xs text-slate-500 font-medium">@{acc.name} · <span className="text-slate-400">{acc.lastAction || acc.snippet}</span></p>
                            </div>
                         </div>

                         <button 
                           onClick={() => toggleMute(acc.name)}
                           className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                             isRuleSet || isActiveMute
                             ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 shadow-lg shadow-emerald-500/10' 
                             : 'bg-white/5 text-slate-300 border border-white/10 hover:border-white/20'
                           }`}
                         >
                           {isActiveMute || isRuleSet ? <BellOff size={14} /> : <Bell size={14} />}
                           {isActiveMute || isRuleSet ? "Protected" : "Active"}
                         </button>
                      </motion.div>
                      );
                    })}
                  </AnimatePresence>
              </div>

              {/* 🧩 BULK ACTIONS FOOTER */}
              <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-between text-slate-500">
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                       <span className="text-[10px] font-bold uppercase tracking-widest italic">Live Guard Active</span>
                    </div>
                 </div>
                 <p className="text-[10px] font-medium italic">Changes sync instantly to your browser extension.</p>
              </div>
           </div>

        </div>

      </div>

      {/* 🏮 TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 rounded-[25px] flex items-center gap-4 shadow-2xl z-50 border ${
              toast.type === 'success' ? 'bg-slate-900 border-pink-500/30 text-white' : 'bg-rose-900/90 border-rose-500/30 text-white'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${toast.type === 'success' ? 'bg-pink-500 text-white' : 'bg-rose-500 text-white'}`}>
               <CheckCircle2 size={16} />
            </div>
            <span className="text-sm font-bold tracking-tight">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default InstagramManage;
