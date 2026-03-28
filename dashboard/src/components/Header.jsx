import React from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, Shield, ShieldOff, Search, Bell } from "lucide-react";

const Header = ({ focusMode, onToggleFocus }) => {
  const location = useLocation();
  
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === "/dashboard") return "Dashboard Overview";
    if (path === "/analytics") return "Productivity Analytics";
    if (path === "/manage") return "Platform Management";
    if (path.startsWith("/manage/whatsapp")) return "WhatsApp Control";
    if (path.startsWith("/manage/gmail")) return "Gmail Inbox";
    if (path === "/settings") return "Preferences & Settings";
    return "Focus Assistant";
  };

  const title = getPageTitle();

  return (
    <header className="flex justify-between items-center bg-background/80 border-b border-border p-6 sticky top-0 z-40 backdrop-blur-xl isolate">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-extrabold text-white tracking-tighter">{title}</h2>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${focusMode ? 'bg-indigo-500 shadow-[0_0_10px_#6366f1]' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'}`} />
          <span className={`text-[10px] uppercase font-bold tracking-widest ${focusMode ? 'text-indigo-400' : 'text-emerald-400'}`}>
            {focusMode ? "Focus Mode Active" : "Currently Monitoring"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Search Bar (Static but aesthetic) */}
        <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-slate-500 focus-within:text-slate-300 focus-within:border-white/20 transition-all border-dashed">
          <Search size={16} />
          <span className="text-xs font-bold uppercase tracking-widest">Search Command (⌘K)</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pr-4 border-r border-border">
          <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all relative">
            <Bell size={18} />
            <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-background" />
          </button>
        </div>

        {/* Focus Mode Switch */}
        <div 
          onClick={onToggleFocus}
          className={`flex items-center gap-3 bg-white/5 p-2 pr-4 rounded-xl border transition-all cursor-pointer group ${
            focusMode ? "border-indigo-500/50 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.1)]" : "border-white/10 hover:bg-white/10"
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-active:scale-95 ${
            focusMode ? "bg-indigo-500 text-white" : "bg-white/10 text-slate-400"
          }`}>
            {focusMode ? <Shield size={16} /> : <ShieldOff size={16} />}
          </div>
          
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white uppercase tracking-tighter">Focus Mode</span>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${focusMode ? 'text-indigo-400' : 'text-slate-500'}`}>
              {focusMode ? "ON" : "OFF"}
            </span>
          </div>

          <div className={`ml-2 w-10 h-5 rounded-full relative transition-colors ${focusMode ? 'bg-indigo-600' : 'bg-white/10'}`}>
            <motion.div 
              animate={{ x: focusMode ? 20 : 2 }}
              className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-lg"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
