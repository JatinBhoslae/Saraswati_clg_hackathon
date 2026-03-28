import React, { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "http://localhost:5001/api";

const WhatsAppManage = () => {
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);

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

    return (
        <div className="p-6 space-y-6">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#25D366] rounded-2xl flex items-center justify-center text-white text-3xl shadow-lg shadow-emerald-500/20">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                            <path d="M12.004 2C6.476 2 2 6.478 2 12.008c0 1.76.459 3.466 1.333 4.972L2.05 22l5.168-1.354A9.933 9.933 0 0012.004 22C17.532 22 22 17.522 22 12.008 22 6.476 17.532 2 12.004 2zm0 18.146c-1.619 0-3.2-.436-4.582-1.261l-.328-.196-3.068.804.819-2.993-.214-.34a8.115 8.115 0 01-1.246-4.152c0-4.489 3.659-8.146 8.147-8.146 2.176 0 4.222.849 5.759 2.39a8.097 8.097 0 012.385 5.76c-.002 4.49-3.66 8.134-8.672 8.134z"/>
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">WhatsApp</h2>
                        <p className="text-slate-400 font-medium">Real-time sync via extension bridge</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="px-4 py-2 bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 rounded-full flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                        BRIDGE ACTIVE
                    </span>
                    <button 
                        onClick={() => window.open('https://web.whatsapp.com', '_blank')}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-full transition-all border border-slate-700"
                    >
                        OPEN WEB
                    </button>
                </div>
            </div>

            {/* Chat List */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <h3 className="font-bold text-slate-300 uppercase text-xs tracking-widest">Active Conversations</h3>
                    <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest animate-pulse">Syncing Tabs</span>
                </div>

                {loading ? (
                    <div className="py-24 flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                        <p className="text-slate-500 text-sm font-medium">Listening for browser signals...</p>
                    </div>
                ) : chats.length === 0 ? (
                    <div className="py-24 text-center px-6">
                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 opacity-50 grayscale">📱</div>
                        <h4 className="text-xl font-bold text-white mb-2">No Active Context</h4>
                        <p className="text-slate-400 max-w-sm mx-auto mb-8">
                            Make sure you have <b>web.whatsapp.com</b> open in a separate tab so we can securely bridge your chat updates.
                        </p>
                        <button 
                            onClick={() => window.open('https://web.whatsapp.com', '_blank')}
                            className="bg-[#25D366] hover:bg-[#128C7E] text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-500/20"
                        >
                            Connect Bridge
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {chats.map((chat) => (
                            <div key={chat.id} className="p-5 hover:bg-white/[0.03] transition-all flex items-start gap-5 group cursor-pointer">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black shrink-0 shadow-inner ${
                                    chat.unread ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700'
                                }`}>
                                    {chat.name[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`font-bold text-sm tracking-wide ${chat.unread ? 'text-white' : 'text-slate-400'}`}>
                                                {chat.name}
                                            </span>
                                            {chat.unread && <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>}
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500">{chat.time}</span>
                                    </div>
                                    <p className={`text-xs line-clamp-1 leading-relaxed italic ${chat.unread ? 'text-slate-300' : 'text-slate-500'}`}>
                                        {chat.snippet}
                                    </p>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                    <button className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors" title="Mute Contact">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Privacy Card */}
            <div className="p-5 bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/10 rounded-3xl flex gap-4 items-center">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-xl">🛡️</div>
                <div>
                    <h4 className="text-sm font-bold text-emerald-400">Local-Only Sync</h4>
                    <p className="text-[11px] text-emerald-400/60 leading-tight max-w-md">
                        Your WhatsApp data never leaves your browser. The extension bridges current chat metadata directly to your local dashboard instance for productivity scoring.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WhatsAppManage;
