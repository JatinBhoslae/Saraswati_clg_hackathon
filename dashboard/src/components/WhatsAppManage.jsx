import React, { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://localhost:5001/api";
import { MessageSquare, ExternalLink, ShieldCheck, Activity, Search, RefreshCw, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const WhatsAppManage = () => {
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState([]);
    const [mutedIds, setMutedIds] = useState([]); // Persistent in local storage for now
    const [filter, setFilter] = useState("all"); // 'all', 'personal', 'groups'

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
                await axios.post(`${API_URL}/whatsapp/mute`, { name });
                setMutedIds(prev => [...prev, name]);
                
                // 🤖 Fire automation event for the Chrome extension
                window.dispatchEvent(new CustomEvent("__pa_automate_mute__", {
                    detail: { name }
                }));
            }
        } catch (err) {
            console.error("Mute toggle failed", err);
        }
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
                                    {filteredChats.map((chat, i) => (
                                        <motion.div 
                                            key={chat.id || i}
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className={`p-6 hover:bg-white/[0.03] transition-all flex items-center gap-6 group cursor-default ${mutedIds.includes(chat.name) ? 'opacity-40 grayscale-[0.5]' : ''}`}
                                        >
                                            <input 
                                                type="checkbox" 
                                                checked={selectedIds.includes(chat.id)}
                                                onChange={() => toggleSelection(chat.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-5 h-5 rounded-lg bg-slate-800 border-white/10 text-emerald-500 focus:ring-emerald-500/20 cursor-pointer transition-all"
                                            />
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shrink-0 transition-all shadow-inner border ${
                                                chat.unread && !mutedIds.includes(chat.name)
                                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 ring-4 ring-emerald-500/10' 
                                                    : 'bg-slate-800/80 text-slate-500 border-white/5'
                                            }`}>
                                                {chat.name ? chat.name[0] : '?'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`font-black text-base tracking-tight ${chat.unread && !mutedIds.includes(chat.id) ? 'text-white' : 'text-slate-300'}`}>
                                                            {chat.name}
                                                            {mutedIds.includes(chat.name) && <span className="ml-2 text-slate-500 text-[10px] italic font-normal">(Muted)</span>}
                                                        </span>
                                                        {chat.unread && !chat.isUrgent && !mutedIds.includes(chat.name) && (
                                                            <span className="px-2 py-0.5 bg-emerald-500 text-slate-900 text-[10px] font-black rounded-full shadow-lg shadow-emerald-500/30">
                                                                NEW
                                                            </span>
                                                        )}
                                                        {chat.isUrgent && !mutedIds.includes(chat.name) && (
                                                            <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full shadow-lg shadow-rose-500/30 flex items-center gap-1.5 animate-pulse">
                                                                <AlertCircle size={10} />
                                                                URGENT
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-[11px] font-black text-slate-500 tracking-tighter tabular-nums uppercase">{chat.time}</span>
                                                </div>
                                                <p className={`text-sm line-clamp-1 leading-relaxed italic pr-4 ${chat.unread && !mutedIds.includes(chat.name) ? 'text-slate-300' : 'text-slate-500'}`}>
                                                    {chat.snippet}
                                                </p>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-3 translate-x-4 group-hover:translate-x-0">
                                                <button 
                                                    onClick={() => toggleMute(chat.name)}
                                                    className={`p-3 rounded-xl transition-all border ${
                                                        mutedIds.includes(chat.name)
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                            : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-white/5'
                                                    }`}
                                                    title={mutedIds.includes(chat.name) ? "Unmute" : "Mute"}
                                                >
                                                    <ShieldCheck size={16} />
                                                </button>
                                                <button className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 transition-colors border border-white/5" title="Copy Info">
                                                    <Activity size={16} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WhatsAppManage;
