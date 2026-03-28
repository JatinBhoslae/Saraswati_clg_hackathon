import React from "react";
import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Settings, 
  Zap, 
  BarChart3, 
  Shield, 
  Target,
  Trophy
} from 'lucide-react';
import { motion } from 'framer-motion';

const Sidebar = ({ gamification = { xp: 240, level: 3, dailyStreak: 5, nextLevelXp: 900 } }) => {
  const navItems = [
    { title: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={20} /> },
    { title: "Analytics", path: "/analytics", icon: <BarChart3 size={20} /> },
    { title: "Action Center", path: "/action-center", icon: <Zap size={20} /> },
    { title: "Manage", path: "/manage", icon: <Shield size={20} /> },
    { title: "Settings", path: "/settings", icon: <Settings size={20} /> },
  ];

  const levelProgress = (gamification.xp / gamification.nextLevelXp) * 100;

  return (
    <aside className="w-64 h-screen bg-background border-r border-border fixed left-0 top-0 z-50 flex flex-col p-6 isolate">
      {/* Brand */}
      <div className="flex items-center gap-3 mb-10 group cursor-pointer">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
          <Zap className="text-white fill-white" size={20} />
        </div>
        <h1 className="text-xl font-extrabold text-white tracking-tighter">Saraswati</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? "bg-white/5 text-white border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.03)]" 
                  : "text-slate-500 hover:text-slate-200 hover:bg-white/5"
              }`
            }
          >
            <span className="group-hover:scale-110 transition-transform">{item.icon}</span>
            <span className="font-semibold text-sm">{item.title}</span>
          </NavLink>
        ))}
      </nav>

      {/* Gamification Sidebar Footer */}
      <div className="mt-auto pt-6 border-t border-border space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Trophy className="text-yellow-500" size={16} />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Level {gamification.level}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-orange-500">🔥</span>
            <span className="text-xs font-bold text-white">{gamification.dailyStreak}</span>
          </div>
        </div>
        
        <div className="px-2 space-y-2">
          <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
            <span>XP Progress</span>
            <span>{gamification.xp} / {gamification.nextLevelXp}</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${levelProgress}%` }}
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
            />
          </div>
        </div>

        <button className="w-full flex items-center justify-center gap-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 py-3 rounded-xl transition-colors group">
          <Target size={16} className="group-hover:animate-spin-slow" />
          <span className="text-xs font-bold uppercase tracking-widest">Focus Mode</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
