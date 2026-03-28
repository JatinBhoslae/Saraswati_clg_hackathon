import React from 'react';
import { motion } from 'framer-motion';

const ScoreRing = ({ score, size = 200, strokeWidth = 15 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Background Glow */}
      <div 
        className="absolute inset-0 rounded-full blur-2xl opacity-20 transition-all duration-1000"
        style={{ 
          background: score > 70 ? 'rgb(34, 197, 94)' : score > 40 ? 'rgb(245, 158, 11)' : 'rgb(239, 68, 68)'
        }}
      />
      
      <svg width={size} height={size} className="transform -rotate-90 relative z-10">
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress Circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={score > 70 ? '#22c55e' : score > 40 ? '#f59e0b' : '#ef4444'}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
          fill="transparent"
          style={{ filter: `drop-shadow(0 0 8px ${score > 70 ? '#22c55e' : score > 40 ? '#f59e0b' : '#ef4444'}44)` }}
        />
      </svg>

      {/* Score Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        <motion.span 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-extrabold text-white tracking-tighter"
        >
          {score}
        </motion.span>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Productivity</span>
      </div>
    </div>
  );
};

export default ScoreRing;
