import React from "react";
import { motion } from "framer-motion";
import GlassCard from "./GlassCard";

const StatsCard = ({ title, value, icon, gradient, pulse = false, delay = 0 }) => {
  return (
    <GlassCard className={`relative overflow-hidden group`}>
      {/* Background Accent Glow */}
      <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 bg-gradient-to-br ${gradient} blur-3xl`} />
      
      <div className="flex items-center justify-between relative z-10">
        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{title}</p>
          <h3 className="text-3xl font-extrabold text-white tracking-tighter tabular-nums flex items-baseline gap-1">
            {value}
            {title.includes("Mins") && <span className="text-xs font-bold text-slate-500 uppercase">min</span>}
          </h3>
        </div>
        
        <motion.div 
          animate={pulse ? { scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] } : {}}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-500`}
        >
          {icon}
        </motion.div>
      </div>

      {/* Progress Line (Fake but aesthetic) */}
      <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: "65%" }} // Static for now, can be dynamic
          transition={{ duration: 1, delay: delay + 0.3 }}
          className={`h-full bg-gradient-to-r ${gradient}`}
        />
      </div>
    </GlassCard>
  );
};

export default StatsCard;
