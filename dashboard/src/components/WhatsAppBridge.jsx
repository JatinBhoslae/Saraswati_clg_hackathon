import React, { useState, useEffect } from "react";
import axios from "axios";
import { MessageSquare, Clock, User, ExternalLink, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = "http://localhost:5001/api";

const WhatsAppBridge = () => {
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchChats = async () => {
            try {
                const res = await axios.get(`${API_URL}/whatsapp/chats`);
                setChats(res.data);
            } catch (err) {
                console.error("Failed to fetch WhatsApp bridge data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchChats();
        const interval = setInterval(fetchChats, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-emerald-500/5">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400">
                        <MessageSquare size={18} />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm tracking-tight">WhatsApp Bridge</h3>
                        <p className="text-[10px] text-emerald-500 uppercase font-black tracking-widest animate-pulse">Live Sync</p>
                    </div>
                </div>
                <button 
                    onClick={() => window.open('https://web.whatsapp.com', '_blank')}
                    className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors"
                    title="Open WhatsApp Web"
                >
                    <ExternalLink size={14} />
                </button>
            </div>

            <div className="p-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="py-12 flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Bridging Tabs...</p>
                    </div>
                ) : chats.length === 0 ? (
                    <div className="py-12 text-center px-4">
                        <div className="text-2xl mb-2 opacity-50">📱</div>
                        <p className="text-slate-400 text-xs font-medium">No connection detected.</p>
                        <p className="text-slate-600 text-[10px] mt-1 italic">Open WhatsApp Web to sync chats.</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        <AnimatePresence>
                            {chats.slice(0, 5).map((chat, idx) => (
                                <motion.div 
                                    key={chat.id || idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className={`p-3 rounded-2xl flex items-center gap-3 transition-all hover:bg-white/[0.03] group ${chat.unread ? 'bg-emerald-500/[0.03] border border-emerald-500/10' : 'border border-transparent'}`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 shadow-inner ${
                                        chat.unread ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                                    }`}>
                                        {chat.name ? chat.name[0] : '?'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`text-xs font-bold truncate ${chat.unread ? 'text-white' : 'text-slate-400'}`}>
                                                {chat.name}
                                            </span>
                                            <span className="text-[9px] text-slate-600 font-medium shrink-0">{chat.time}</span>
                                        </div>
                                        <p className={`text-[11px] truncate mt-0.5 ${chat.unread ? 'text-slate-300' : 'text-slate-500'}`}>
                                            {chat.snippet || "Checking messages..."}
                                        </p>
                                    </div>
                                    {chat.unread && !chat.isUrgent && (
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    )}
                                    {chat.isUrgent && (
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded-md animate-pulse">
                                            <AlertCircle size={8} />
                                            URGENT
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
            
            <div className="p-3 bg-white/[0.02] border-t border-white/5 text-center">
                <button 
                  onClick={() => window.location.href = '/manage/whatsapp'}
                  className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-emerald-400 transition-colors"
                >
                    View All Active Chats
                </button>
            </div>
        </div>
    );
};

export default WhatsAppBridge;
