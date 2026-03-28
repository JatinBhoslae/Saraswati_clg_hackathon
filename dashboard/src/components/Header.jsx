import React from "react";

const Header = ({ title, focusMode, onToggleFocus }) => {
  return (
    <header className="flex justify-between items-center bg-slate-900 border-b border-slate-800 p-6 sticky top-0 z-10 backdrop-blur-lg bg-opacity-80">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
        <p className="text-sm text-slate-400 mt-1">
          {focusMode ? (
            <span className="text-indigo-400 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              Active Focus Session
            </span>
          ) : (
            <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Monitoring Activity...
            </span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-6">
        {/* Toggle UI */}
        <div className="flex items-center gap-3 bg-slate-800/50 p-2 pr-4 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition">
          <span className="text-2xl">{focusMode ? "🔥" : "😴"}</span>
          <div className="flex flex-col mr-3">
            <strong className="text-sm text-white">Focus Mode</strong>
            <span className="text-xs text-slate-400">
              {focusMode ? "Blocking distractions" : "Allowing all"}
            </span>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={focusMode}
              onChange={onToggleFocus}
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-purple-500 shadow-inner"></div>
          </label>
        </div>
      </div>
    </header>
  );
};

export default Header;
