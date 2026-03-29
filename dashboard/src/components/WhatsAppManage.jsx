import React, { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://localhost:5001/api";
import { MessageSquare, ExternalLink, ShieldCheck, Activity, Search, RefreshCw, AlertCircle, Clock, Calendar, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";

const WhatsAppManage = () => {
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState([]);
    const [mutedIds, setMutedIds] = useState([]); // Persistent in local storage for now
    const [filter, setFilter] = useState("all"); 
    const [schedulingChat, setSchedulingChat] = useState(null); // Chat name being scheduled
    const [tempSchedule, setTempSchedule] = useState({
        startTime: "09:00",
        endTime: "18:00",
        days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        type: "daily"
    });

    const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    // Load muted names from Backend on mount
    useEffect(() => {
        const fetchMuted = async () => {
            try {
                const res = await axios.get(`${API_URL}/whatsapp/muted`);
                setMutedIds(res.data); // Actually mutedNames now, but name variable for backward compatibility
            } catch (err) {
                console.error("Failed to fetch muted list", err);
            }
        };
        fetchMuted();
    }, []);


    useEffect(() => {
        const fetchChats = async () => {
            try {
                const res = await axios.get(`${API_URL}/whatsapp/chats`);
                setChats(res.data);
            } catch (err) {
                console.error("Failed to fetch WhatsApp chats", err);
            } finally {
                setLoading(false);
            }
        };

        fetchChats();
        const interval = setInterval(fetchChats, 5000);
        return () => clearInterval(interval);
    }, []);

    const toggleSelection = (id) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        const filtered = getFilteredChats();
        if (selectedIds.length === filtered.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filtered.map(c => c.id));
        }
    };

    const toggleMute = async (name) => {
        try {
            if (mutedIds.includes(name)) {
                await axios.post(`${API_URL}/whatsapp/unmute`, { name });
                setMutedIds(prev => prev.filter(n => n !== name));
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
            await axios.post(`${API_URL}/whatsapp/mute`, { 
                name,
                muteStartTime: tempSchedule.startTime,
                muteEndTime: tempSchedule.endTime,
                muteDays: tempSchedule.days,
                muteType: tempSchedule.type
            });
            
            // 🔥 RECOVERY: Fetch latest active mutes from backend to ensure time-logic is considered
            const res = await axios.get(`${API_URL}/whatsapp/muted`);
            setMutedIds(res.data);
            
            setSchedulingChat(null);
            
            // 🤖 Automation event
            window.dispatchEvent(new CustomEvent("__pa_automate_mute__", {
                detail: { name }
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


    const bulkMute = async () => {
        const namesToMute = selectedIds.map(id => {
            const chat = chats.find(c => c.id === id);
            return chat?.name;
        }).filter(Boolean);

        for (const name of namesToMute) {
            if (!mutedIds.includes(name)) {
                await axios.post(`${API_URL}/whatsapp/mute`, { name });
                
                // 🤖 Fire automation event for the Chrome extension
                window.dispatchEvent(new CustomEvent("__pa_automate_mute__", {
                    detail: { name }
                }));
            }
        }
        setMutedIds(prev => [...new Set([...prev, ...namesToMute])]);
        setSelectedIds([]);
    };


    const getFilteredChats = () => {
        return chats.filter(chat => {
            if (filter === "all") return true;
            const isGroup = chat.isGroup || chat.name?.toLowerCase().includes("group") || chat.name?.includes("..."); // Simple group detection fallback
            if (filter === "groups") return isGroup;
            if (filter === "family") return chat.name?.toLowerCase().includes("family") || chat.name?.toLowerCase().includes("home") || chat.name?.toLowerCase().includes("mom") || chat.name?.toLowerCase().includes("dad");
            if (filter === "personal") return !isGroup;
            return true;
        });
    };

    const filteredChats = getFilteredChats();

    return (
        <div className="p-8 space-y-8 max-w-6xl mx-auto">
            {/* Header section */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 animate-fade-in">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-[#25D366]/20 rounded-2xl flex items-center justify-center text-white text-4xl shadow-glow shadow-emerald-500/10 border border-emerald-500/20 relative group">
                        <MessageSquare className="w-10 h-10 text-[#25D366]" />
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse"></div>
                    </div>
                    <div>
                        <h2 className="text-4xl font-black text-white tracking-tighter">Communication Hub</h2>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">WhatsApp Shadow Bridge</span>
                            <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                            <span className="text-emerald-500/80 font-bold uppercase tracking-[0.1em] text-[10px] flex items-center gap-1.5">
                                <Activity size={12} className="animate-pulse" />
                                Real-time Context active
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-slate-800/50 p-1.5 rounded-2xl border border-white/5">
                    {['all', 'personal', 'groups', 'family'].map((f) => (
                        <button
                            key={f}
                            onClick={() => {
                                setFilter(f);
                                setSelectedIds([]);
                            }}
                            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                filter === f 
                                    ? 'bg-emerald-500 text-slate-900 shadow-glow shadow-emerald-500/20' 
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </header>

            {/* Main Content Area */}
            <div className="w-full space-y-8">
                <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-[32px] overflow-hidden shadow-3xl">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3">
                                <input 
                                    type="checkbox" 
                                    checked={filteredChats.length > 0 && selectedIds.length === filteredChats.length}
                                    onChange={toggleSelectAll}
                                    className="w-5 h-5 rounded-lg bg-slate-800 border-white/10 text-emerald-500 focus:ring-emerald-500/20 cursor-pointer transition-all"
                                />
                                <h3 className="font-bold text-slate-300 uppercase text-xs tracking-[0.2em]">Select All</h3>
                            </div>
                            <div className="flex items-center gap-3">
                                <h3 className="font-bold text-slate-300 uppercase text-xs tracking-[0.2em]">Live Threads</h3>
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-black rounded-md border border-emerald-500/20">
                                    {filteredChats.length}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {selectedIds.length > 0 && (
                                <button 
                                    onClick={bulkMute}
                                    className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest rounded-xl border border-rose-500/20 transition-all flex items-center gap-2"
                                >
                                    Mute Selected ({selectedIds.length})
                                </button>
                            )}
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                                <RefreshCw size={10} className="animate-spin" />
                                Polling Extension
                            </span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-32 flex flex-col items-center gap-5">
                            <div className="w-12 h-12 border-3 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin"></div>
                            <p className="text-slate-500 text-sm font-black uppercase tracking-widest opacity-50">Syncing communication state...</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {filteredChats.length === 0 ? (
                                <div className="py-32 text-center px-10">
                                    <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center text-5xl mx-auto mb-8 opacity-50 backdrop-blur-xl border border-white/5 grayscale">📱</div>
                                    <h4 className="text-2xl font-black text-white mb-3 tracking-tight">No Threads Found</h4>
                                    <p className="text-slate-400 max-w-sm mx-auto mb-10 text-sm leading-relaxed font-medium">
                                        No active chats match your current filter selection.
                                    </p>
                                </div>
                            ) : (
                                <AnimatePresence mode="popLayout">
                                    {filteredChats.map((chat, i) => {
                                        const isActiveMute = mutedIds.includes(chat.name);
                                        const isRuleSet = chat.isMuted;
                                        
                                        return (
                                        <motion.div 
                                            key={chat.id || i}
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className={`p-6 hover:bg-white/[0.03] transition-all flex items-center gap-6 group cursor-default ${isActiveMute ? 'opacity-40 grayscale-[0.8]' : ''}`}
                                        >
                                            <input 
                                                type="checkbox" 
                                                checked={selectedIds.includes(chat.id)}
                                                onChange={() => toggleSelection(chat.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-5 h-5 rounded-lg bg-slate-800 border-white/10 text-emerald-500 focus:ring-emerald-500/20 cursor-pointer transition-all"
                                            />
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shrink-0 transition-all shadow-inner border ${
                                                chat.unread && !isActiveMute
                                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 ring-4 ring-emerald-500/10' 
                                                    : 'bg-slate-800/80 text-slate-500 border-white/5'
                                            }`}>
                                                {chat.name ? chat.name[0] : '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`font-black text-base tracking-tight ${chat.unread && !isActiveMute ? 'text-white' : 'text-slate-300'}`}>
                                                            {chat.name}
                                                            {isActiveMute && <span className="ml-2 text-rose-500 text-[10px] italic font-black uppercase tracking-widest">(Active Block)</span>}
                                                            {!isActiveMute && isRuleSet && <span className="ml-2 text-emerald-500 text-[10px] italic font-black uppercase tracking-widest leading-none flex items-center gap-1"><Clock size={10} /> (Scheduled)</span>}
                                                        </span>
                                                        {chat.unread && !chat.isUrgent && !mutedIds.includes(chat.name) && (
                                                            <span className="px-2 py-0.5 bg-emerald-500 text-slate-900 text-[10px] font-black rounded-full shadow-lg shadow-emerald-500/30">
                                                                NEW
                                                            </span>
                                                        )}
                                                        {chat.isUrgent && !isActiveMute && (
                                                            <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full shadow-lg shadow-rose-500/30 flex items-center gap-1.5 animate-pulse">
                                                                <AlertCircle size={10} />
                                                                URGENT
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[11px] font-black text-slate-500 tracking-tighter tabular-nums uppercase">{chat.time}</span>
                                                </div>
                                                <p className={`text-sm line-clamp-1 leading-relaxed italic pr-4 ${chat.unread && !isActiveMute ? 'text-slate-300' : 'text-slate-500'}`}>
                                                    {chat.snippet}
                                                </p>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-3 translate-x-4 group-hover:translate-x-0">
                                                <button 
                                                    onClick={() => toggleMute(chat.name)}
                                                    className={`p-3 rounded-xl transition-all border ${
                                                        isRuleSet || isActiveMute
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                            : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-white/5'
                                                    }`}
                                                    title={isRuleSet || isActiveMute ? "Unmute" : "Mute"}
                                                >
                                                    <ShieldCheck size={16} />
                                                </button>
                                                <button className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 transition-colors border border-white/5" title="Copy Info">
                                                    <Activity size={16} />
                                                </button>
                                            </div>
                                        </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 🕒 MODAL: MUTE SCHEDULE */}
            <AnimatePresence>
                {schedulingChat && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-slate-900 border border-white/5 w-full max-w-lg rounded-[40px] shadow-3xl relative isolate overflow-hidden flex flex-col"
                        >
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 z-10" />
                            
                            <div className="p-10 pb-6 flex justify-between items-center">
                                <div>
                                    <h2 className="text-3xl font-black text-white tracking-tighter">Precision Guard</h2>
                                    <p className="text-emerald-500/80 text-[10px] font-black uppercase tracking-widest mt-1">Configure silence window for {schedulingChat}</p>
                                </div>
                                <button onClick={() => setSchedulingChat(null)} className="p-3 text-slate-500 hover:text-white transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-10 pt-4 space-y-8">
                                {/* Time Range */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Mute Start</label>
                                        <input 
                                            type="time" 
                                            value={tempSchedule.startTime}
                                            onChange={e => setTempSchedule({...tempSchedule, startTime: e.target.value})}
                                            className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-6 py-4 text-white focus:border-emerald-500/50 transition-all [color-scheme:dark]"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Mute End</label>
                                        <input 
                                            type="time" 
                                            value={tempSchedule.endTime}
                                            onChange={e => setTempSchedule({...tempSchedule, endTime: e.target.value})}
                                            className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-6 py-4 text-white focus:border-emerald-500/50 transition-all [color-scheme:dark]"
                                        />
                                    </div>
                                </div>

                                {/* Recurring Days */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4">Active Days</label>
                                    <div className="flex flex-wrap gap-2">
                                        {dayOrder.map(day => (
                                            <button
                                                key={day}
                                                onClick={() => toggleMuteDay(day)}
                                                className={clsx(
                                                    "px-4 py-2 rounded-xl text-[11px] font-black transition-all border",
                                                    tempSchedule.days.includes(day)
                                                        ? "bg-emerald-500 border-emerald-400 text-slate-900 shadow-lg shadow-emerald-500/20"
                                                        : "bg-slate-800 border-white/5 text-slate-500 hover:text-slate-300"
                                                )}
                                            >
                                                {day.substring(0, 3)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Type Selection */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-4">Guard Mode</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['daily', 'weekly', 'once'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setTempSchedule({...tempSchedule, type})}
                                                className={clsx(
                                                    "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                                    tempSchedule.type === type
                                                        ? "bg-slate-700 text-white border-white/20"
                                                        : "bg-slate-800/50 text-slate-500 border-white/5 hover:bg-slate-800"
                                                )}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 pt-4 border-t border-white/5 bg-white/[0.02]">
                                <button 
                                    onClick={confirmScheduleMute}
                                    className="w-full py-5 rounded-3xl bg-emerald-500 text-slate-900 font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    Activate Precision Guard
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WhatsAppManage;
