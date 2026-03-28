import React, { useState, useEffect } from "react";
import axios from "axios";

const GMAIL_API_BASE = "http://localhost:5001/api/gmail";

const GmailManage = () => {
    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [error, setError] = useState(null);

    const [lastSynced, setLastSynced] = useState(null);

    // Initial check for Auth Status
    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const res = await axios.get(`${GMAIL_API_BASE}/status`);
            setIsAuthenticated(res.data.authenticated);
            if (res.data.authenticated) {
                fetchEmails();
            } else {
                setLoading(false);
            }
        } catch (err) {
            console.error("Failed to check auth status", err);
            setLoading(false);
        }
    };

    const fetchEmails = async () => {
        try {
            setError(null);
            setLoading(true);
            const res = await axios.get(`${GMAIL_API_BASE}/emails`);
            setEmails(res.data);
            setLastSynced(new Date().toLocaleTimeString());
            setIsAuthenticated(true);
        } catch (err) {
            console.error("Failed to fetch Gmail emails", err);
            if (err.response?.status === 401) {
                setIsAuthenticated(false);
            } else {
                setError("Failed to sync emails. Check browser console or backend logs.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        try {
            const res = await axios.get(`${GMAIL_API_BASE}/auth`);
            if (res.data.url) {
                // Open auth URL in a popup
                const width = 600, height = 700;
                const left = window.innerWidth / 2 - width / 2;
                const top = window.innerHeight / 2 - height / 2;
                window.open(res.data.url, 'Gmail Auth', `width=${width},height=${height},left=${left},top=${top}`);
                
                // Poll for status change (wait for callback to hit backend)
                const pollInterval = setInterval(async () => {
                    try {
                        const statusRes = await axios.get(`${GMAIL_API_BASE}/status`);
                        if (statusRes.data.authenticated) {
                            clearInterval(pollInterval);
                            setIsAuthenticated(true);
                            fetchEmails();
                        }
                    } catch (e) {
                        console.error("Polling error", e);
                    }
                }, 2000);
            }
        } catch (err) {
            alert("Could not start Google Authentication flow.");
        }
    };

    const handleDisconnect = async () => {
        if (!confirm("Disconnect Gmail account?")) return;
        try {
            await axios.post(`${GMAIL_API_BASE}/disconnect`);
            setIsAuthenticated(false);
            setEmails([]);
        } catch (err) {
            console.error("Failed to disconnect", err);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-rose-500 rounded-2xl flex items-center justify-center text-white text-3xl shadow-lg shadow-rose-500/20">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                            <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Gmail</h2>
                        <p className="text-slate-400 font-medium">Manage your focus and priority emails</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {isAuthenticated ? (
                        <div className="flex items-center gap-3">
                            <span className="px-4 py-2 bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 rounded-full flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                API CONNECTED
                            </span>
                            <button 
                                onClick={handleDisconnect}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-full transition-all border border-slate-700"
                            >
                                DISCONNECT
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={handleConnect}
                            className="bg-white hover:bg-slate-100 text-slate-900 px-6 py-2.5 rounded-full font-bold text-sm transition-all shadow-xl shadow-white/10 flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.11c-.22-.66-.35-1.36-.35-2.11s.13-1.45.35-2.11V7.05H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.95l3.66-2.84z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51z" />
                            </svg>
                            Connect with Google
                        </button>
                    )}
                </div>
            </div>

            {/* Email List or Prompt */}
            <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <h3 className="font-bold text-slate-300 uppercase text-xs tracking-widest">Priority Unread</h3>
                        {lastSynced && <span className="text-[10px] text-slate-500 font-bold tracking-tight bg-white/5 px-2 py-1 rounded">Sync: {lastSynced}</span>}
                    </div>
                    {isAuthenticated && (
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest animate-pulse flex items-center gap-1.5">
                                <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                                Live Syncing
                            </span>
                            <button 
                                onClick={fetchEmails}
                                disabled={loading}
                                className="p-1 px-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-[10px] text-slate-300 font-bold rounded-lg transition-colors border border-slate-700 uppercase"
                            >
                                {loading ? "Syncing..." : "Refresh"}
                            </button>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="py-24 flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-3 border-rose-500/20 border-t-rose-500 rounded-full animate-spin"></div>
                        <p className="text-slate-500 text-sm font-medium">Establishing secure bridge...</p>
                    </div>
                ) : !isAuthenticated ? (
                    <div className="py-24 text-center px-6">
                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 opacity-50 grayscale">📧</div>
                        <h4 className="text-xl font-bold text-white mb-2">Connect your Gmail</h4>
                        <p className="text-slate-400 max-w-sm mx-auto mb-8">
                            Enable the official Gmail API to securely fetch your priority emails directly without needing the extension to be open.
                        </p>
                        <button 
                            onClick={handleConnect}
                            className="bg-rose-500 hover:bg-rose-600 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-rose-500/20"
                        >
                            Authorize Access
                        </button>
                    </div>
                ) : error ? (
                    <div className="py-20 text-center text-rose-400">
                        <p>{error}</p>
                        <button onClick={fetchEmails} className="mt-4 text-xs font-bold underline">Retry Sync</button>
                    </div>
                ) : emails.length === 0 ? (
                    <div className="py-24 text-center">
                        <div className="text-5xl mb-4">✨</div>
                        <p className="text-slate-300 font-bold text-lg">Inbox Zero!</p>
                        <p className="text-slate-500 text-sm">You've cleared all priority unread emails.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {emails.map((email) => (
                            <div key={email.id} className="p-5 hover:bg-white/[0.03] transition-all flex items-start gap-5 group cursor-pointer">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black shrink-0 shadow-inner ${
                                    email.isUnread ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700'
                                }`}>
                                    {email.sender[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`font-bold text-sm tracking-wide ${email.isUnread ? 'text-white' : 'text-slate-400'}`}>
                                            {email.sender}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-500">{email.time}</span>
                                    </div>
                                    <h4 className={`text-sm mb-1 truncate ${email.isUnread ? 'text-slate-200 font-semibold' : 'text-slate-500 font-normal'}`}>
                                        {email.subject}
                                    </h4>
                                    <p className="text-xs text-slate-500 line-clamp-1 leading-relaxed italic">
                                        {email.snippet}
                                    </p>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                    <button className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Privacy Card */}
            <div className="p-5 bg-gradient-to-r from-rose-500/10 to-transparent border border-rose-500/10 rounded-3xl flex gap-4 items-center">
                <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center text-xl">🛡️</div>
                <div>
                    <h4 className="text-sm font-bold text-rose-400">Restricted API Access</h4>
                    <p className="text-[11px] text-rose-400/60 leading-tight max-w-md">
                        We only use <b>ReadOnly</b> permissions. Your email content is processed locally and never stored on our servers permanently. We only track email counts for productivity analytics.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default GmailManage;
