import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Clock, Zap, MessageSquare, ArrowRight, X } from 'lucide-react';

const FocusRecoveryModal = ({ digest, isOpen, onClose }) => {
  if (!digest) return null;

  const durationMin = Math.round(digest.durationMs / 60000);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-2xl bg-slate-900/90 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden relative"
          >
            {/* 💎 PREMIUM GLOW EFFECT */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[100px] bg-indigo-500/20 blur-[100px] rounded-full" />

            {/* Header */}
            <div className="p-10 pb-6 flex items-start justify-between relative z-10">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Shield size={32} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white font-heading tracking-tight">Focus Recovered</h2>
                  <p className="text-slate-400 text-sm mt-1">We guarded your attention for <span className="text-indigo-400 font-bold">{durationMin} minutes</span>.</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Scroll */}
            <div className="p-10 pt-0 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
              
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-6 bg-white/5 border border-white/5 rounded-3xl">
                    <div className="flex items-center gap-2 text-indigo-400 mb-2">
                        <MessageSquare size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Intercepted</span>
                    </div>
                    <p className="text-2xl font-black text-white">{digest.totalBlocked}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Missed Distractions</p>
                 </div>
                 <div className="p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl">
                    <div className="flex items-center gap-2 text-amber-400 mb-2">
                        <Zap size={16} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Urgent</span>
                    </div>
                    <p className="text-2xl font-black text-white">{digest.urgentBlocked.length}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Priority Contacts</p>
                 </div>
              </div>

              {/* ⚠️ URGENT SUMMARY */}
              {digest.urgentBlocked.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest pl-1">Urgent Catch-up</h3>
                  <div className="space-y-3">
                    {digest.urgentBlocked.map((msg, i) => (
                      <div key={i} className="group p-5 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 transition-all">
                        <div className="flex items-center justify-between mb-2">
                           <span className="text-xs font-bold text-indigo-400">{msg.sender}</span>
                           <span className="text-[10px] text-slate-500">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-sm text-slate-300 line-clamp-2 italic">"{msg.content}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* General Summary */}
              {digest.summary.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest pl-1">Auto-Reply Log</h3>
                  <div className="space-y-3 opacity-60">
                    {digest.summary.map((msg, i) => (
                      <div key={i} className="flex items-center gap-4 py-2 px-1">
                        <div className="text-[10px] text-slate-500 min-w-[50px]">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="flex-1 text-xs text-slate-300">Responded to <span className="font-bold text-white">{msg.sender}</span> on WhatsApp</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Affirmation */}
              <div className="p-10 bg-indigo-600 rounded-[35px] text-white flex items-center justify-between shadow-2xl shadow-indigo-500/20">
                 <div>
                    <h4 className="text-xl font-black italic">Excellent Deep Work.</h4>
                    <p className="text-white/70 text-xs mt-1">You maintained focus for {durationMin} minutes without interruption.</p>
                 </div>
                 <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                    <Shield size={24} />
                 </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-10 bg-black/20 border-t border-white/5 flex gap-4">
               <button 
                 onClick={onClose}
                 className="flex-1 py-4 bg-white/10 rounded-2xl text-white font-bold hover:bg-white/20 transition-all border border-white/5"
               >
                 Dismiss
               </button>
               <button 
                 onClick={onClose}
                 className="flex-1 py-4 bg-white text-slate-900 rounded-2xl font-black hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
               >
                 Check Missed Items <ArrowRight size={18} />
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default FocusRecoveryModal;
