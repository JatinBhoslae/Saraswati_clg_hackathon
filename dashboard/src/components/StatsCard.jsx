import React from "react";

const StatsCard = ({ title, value, icon, gradient, pulse }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-slate-700 transition duration-300 transform hover:-translate-y-1">
      {/* Background glow effect */}
      <div
        className={`absolute -right-6 -top-6 w-32 h-32 rounded-full blur-3xl opacity-20 bg-gradient-to-r ${gradient} group-hover:opacity-40 transition-opacity duration-500`}
      />

      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-400 tracking-wide uppercase">
            {title}
          </span>
          <span className="text-4xl font-extrabold text-white tracking-tight flex items-baseline gap-1">
            {value}
            {title === "Productivity Score" && (
              <span className="text-xl text-slate-500">%</span>
            )}
          </span>
        </div>
        <div
          className={`text-3xl p-3 bg-slate-800/80 rounded-xl shadow-inner border border-slate-700/50 ${
            pulse ? "animate-pulse" : ""
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
