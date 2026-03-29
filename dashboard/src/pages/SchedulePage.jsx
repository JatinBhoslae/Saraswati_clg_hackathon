import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, Clock, Trash2, Plus, Zap, Check, X, 
  RefreshCw, Lock, Unlock, Moon, Sun, AlertTriangle, Settings,
  Mic, MicOff, MessageSquare
} from "lucide-react";
import clsx from "clsx";
import { startVoiceRecognition, parseScheduleCommand } from "../utils/voiceSchedule";

const SchedulePage = ({ googleInfo: globalGoogleInfo }) => {
  const [schedules, setSchedules] = useState([]);
  const [activeMode, setActiveMode] = useState("Normal");
  const [manualOverrideActive, setManualOverrideActive] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [schedulerEnabled, setSchedulerEnabled] = useState(true);
  const [googleInfo, setGoogleInfo] = useState({ linked: false, email: null });

  // Form State
  const [newSch, setNewSch] = useState({
    startTime: "09:00",
    endTime: "18:00",
    days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    type: "weekly",
    label: "Work Hours",
    lunchStartTime: "",
    lunchEndTime: "",
    priorityKeywords: []
  });

  // 🎙️ Voice Logic State
  const [voiceStatus, setVoiceStatus] = useState("idle"); // idle, listening, processing, success
  const [voiceTranscript, setVoiceTranscript] = useState("");

  const fetchStatus = async () => {
    try {
      const res = await fetch("http://localhost:5001/api/schedule/status");
      if (!res.ok) return;
      const data = await res.json();
      setSchedules(data.schedules || []);
      setActiveMode(data.activeMode);
      setManualOverrideActive(data.manualOverride);
      setCalendarEvents(data.calendarEvents || []);
      setSchedulerEnabled(data.schedulerEnabled);
      setGoogleInfo({ linked: data.googleLinked, email: data.googleEmail });
      setLoading(false);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // Prop-driven sync (Overwrites local state for global consistency)
  useEffect(() => {
    if (globalGoogleInfo) {
      setGoogleInfo(globalGoogleInfo);
    }
  }, [globalGoogleInfo]);

  const isScheduleRunning = (sch) => {
    if (!activeMode.includes("Office Mode")) return false;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const today = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][now.getDay()];
    
    if (!sch.days.includes(today)) return false;
    
    const minutes = (t) => {
      const [h, m] = t.split(":");
      return parseInt(h) * 60 + parseInt(m);
    };
    
    return currentMins >= minutes(sch.startTime) && currentMins <= minutes(sch.endTime);
  };

  const isOfficeMode = activeMode.includes("Office Mode");

  const handleSaveSchedule = async (overriddenSch = null) => {
    try {
      const url = editingSchedule 
        ? `http://localhost:5001/api/schedule/${editingSchedule._id}`
        : "http://localhost:5001/api/schedule";
      
      const res = await fetch(url, {
        method: editingSchedule ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(overriddenSch && !(overriddenSch instanceof Event) ? overriddenSch : newSch)
      });
      if (res.ok) {
        setShowAddModal(false);
        setEditingSchedule(null);
        fetchStatus();
        
        // ⚡ Force Extension to re-check mode instantly (Bypass 1-min delay)
        window.dispatchEvent(new CustomEvent("__pa_force_sync__"));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleVoiceInput = () => {
    setVoiceStatus("listening");
    setVoiceTranscript("Listening...");
    
    startVoiceRecognition(
        (transcript) => {
            setVoiceTranscript(transcript);
            setVoiceStatus("processing");
            
            // 🧠 NLP Parse
            setTimeout(() => {
                const parsed = parseScheduleCommand(transcript);
                
                // If it's a voice input, we only want parameters extracted via voice
                // We clear defaults first so "placeholders" don't haunt the UI
                const freshSch = {
                    startTime: "",
                    endTime: "",
                    days: [],
                    type: "weekly",
                    label: "Voice: " + (transcript.length > 20 ? transcript.substring(0, 17) + "..." : transcript),
                    priorityKeywords: []
                };

                setNewSch({ ...freshSch, ...parsed });
                setVoiceStatus("success");
                
                // Show modal to confirm
                setShowAddModal(true);
                setEditingSchedule(null);
                
                // Auto-reset voice status
                setTimeout(() => setVoiceStatus("idle"), 3000);
            }, 800);
        },
        (error) => {
            console.error("Voice error:", error);
            setVoiceStatus("idle");
            alert("Voice recognition failed. Check microphone permissions.");
        }
    );
  };

  const openEdit = (sch) => {
    if (isOfficeMode) return;
    setEditingSchedule(sch);
    setNewSch({
      startTime: sch.startTime,
      endTime: sch.endTime,
      days: sch.days,
      type: sch.type,
      label: sch.label,
      lunchStartTime: sch.lunchStartTime || "",
      lunchEndTime: sch.lunchEndTime || "",
      priorityKeywords: sch.priorityKeywords || []
    });
    setShowAddModal(true);
  };

  const deleteSchedule = async (id) => {
    try {
      await fetch(`http://localhost:5001/api/schedule/${id}`, { method: "DELETE" });
      setSchedules(schedules.filter(s => s._id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleDay = (day) => {
    setNewSch(prev => ({
      ...prev,
      days: prev.days.includes(day) 
        ? prev.days.filter(d => d !== day) 
        : [...prev.days, day]
    }));
  };

  const syncCalendar = async () => {
    try {
      setLoading(true);
      await fetch("http://localhost:5001/api/calendar/sync");
      fetchStatus();
    } catch (e) { console.error(e); }
  };

  const toggleScheduler = async () => {
    const newState = !schedulerEnabled;
    setSchedulerEnabled(newState);
    await fetch("http://localhost:5001/api/schedule/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: newState })
    });
  };

  const clearOverride = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5001/api/schedule/clear-override", { method: "POST" });
      if (res.ok) {
        fetchStatus();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      
      {/* 🚀 Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tighter flex items-center gap-3">
            Smart Scheduling <span className="text-indigo-500"><Clock size={32} /></span>
          </h1>
          <p className="text-slate-400 mt-2 text-lg">Define your work hours and let AI handle the distractions.</p>
        </div>

        <div className="flex items-center gap-3">
           {manualOverrideActive && (
             <motion.button 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               onClick={clearOverride}
               className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/20 transition-all shadow-glow shadow-amber-500/10"
             >
               <RefreshCw size={18} />
               Reset to Schedule
             </motion.button>
           )}
        </div>
      </div>

      {/* 📊 Status Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Mode Status Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border border-white/10 p-8 rounded-[32px] relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full -mr-20 -mt-20 group-hover:bg-indigo-500/20 transition-all duration-700" />
          
          <div className="relative flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="flex-1">
              <span className="text-indigo-400 font-bold uppercase tracking-[0.2em] text-[10px]">Current Intelligence State</span>
              <h2 className="text-5xl font-black text-white mt-4 tracking-tighter italic">
                {activeMode}
              </h2>
              <div className="flex items-center gap-4 mt-8">
                <div className="px-4 py-2 bg-white/5 rounded-full border border-white/10 text-xs font-bold text-slate-300">
                  Adaptive Logic: ON
                </div>
                <div className="px-4 py-2 bg-white/5 rounded-full border border-white/10 text-xs font-bold text-slate-300">
                  Priority Bypass: Active
                </div>
              </div>
            </div>

            <div className="w-48 h-48 rounded-full border-4 border-white/5 flex items-center justify-center relative">
               <motion.div 
                 animate={{ rotate: 360 }}
                 transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                 className="absolute inset-0 border-t-4 border-indigo-500 rounded-full"
               />
               <Zap className="text-indigo-400" size={64} />
            </div>
          </div>
        </motion.div>

        {/* Google Calendar Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 border border-white/10 p-8 rounded-[32px] backdrop-blur-xl flex flex-col"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-white flex items-center gap-2 uppercase tracking-widest text-xs">
              <Calendar size={16} className="text-indigo-400" /> Google Calendar
            </h3>
            <button onClick={syncCalendar} className="text-slate-500 hover:text-white transition-all p-2">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[170px] pr-2 custom-scrollbar">
            {calendarEvents.length > 0 ? calendarEvents.map((evt, i) => (
              <div key={i} className={clsx(
                "p-4 rounded-2xl border text-[11px] font-bold transition-all flex flex-col gap-1",
                evt.type === "holiday" 
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-400" 
                  : evt.type === "work"
                  ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                  : "bg-white/5 border-white/5 text-slate-400"
              )}>
                <div className="flex justify-between items-center">
                  <span className="truncate max-w-[120px]">{evt.title}</span>
                  {evt.type !== "event" && (
                    <span className={clsx(
                      "px-2 py-0.5 rounded-full text-[8px] uppercase tracking-tighter",
                      evt.type === "holiday" ? "bg-rose-500 text-white" : "bg-indigo-500 text-white"
                    )}>
                      {evt.type === "holiday" ? "Focus Off" : "Focus On"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[9px] opacity-60">
                   <Clock size={10} />
                   {new Date(evt.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )) : (
              <div className="h-24 flex items-center justify-center text-slate-600 border border-dashed border-white/10 rounded-3xl text-[10px] font-bold uppercase tracking-widest text-center px-4">
                No active focus events found for today
              </div>
            )}
          </div>
          
          {googleInfo.linked ? (
            <div className="mt-6 flex items-center justify-between p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
              <div className="flex flex-col">
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mb-1">Authenticated</span>
                <span className="text-xs text-white font-medium truncate max-w-[140px]">{googleInfo.email}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <Check size={16} />
              </div>
            </div>
          ) : (
            <button 
               onClick={() => window.location.href = "http://localhost:5001/api/calendar/auth"}
               className="w-full mt-6 py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/10 transition-all uppercase tracking-widest"
            >
              Connect Account
            </button>
          )}
        </motion.div>
      </div>

      {/* 📅 Schedules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* ADD NEW CARD */}
        <div 
          onClick={() => {
            setEditingSchedule(null);
            setNewSch({
              startTime: "09:00",
              endTime: "18:00",
              days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
              type: "weekly",
              label: "Work Hours",
              priorityKeywords: []
            });
            setShowAddModal(true);
          }}
          className="h-64 border-2 border-dashed border-white/10 rounded-[32px] flex flex-col items-center justify-center p-8 group cursor-pointer hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all duration-500"
        >
          <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white transition-all text-slate-500">
            <Plus size={24} />
          </div>
          <span className="mt-4 font-bold text-slate-500 group-hover:text-slate-300 uppercase tracking-[0.2em] text-[9px]">Manual Schedule</span>
        </div>

        {/* 🎙️ VOICE ASSISTANT CARD */}
        <div 
          onClick={handleVoiceInput}
          className={clsx(
            "h-64 rounded-[32px] flex flex-col items-center justify-center p-8 group cursor-pointer transition-all duration-500 border-2 border-dashed",
            voiceStatus === "listening" ? "bg-rose-500/20 border-rose-500 border-solid animate-pulse" : 
            voiceStatus === "processing" ? "bg-amber-500/20 border-amber-500 border-solid" :
            voiceStatus === "success" ? "bg-emerald-500/20 border-emerald-500 border-solid" :
            "border-white/10 hover:border-indigo-500/40 hover:bg-indigo-501/5"
          )}
        >
          <div className={clsx(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500",
              voiceStatus === "listening" ? "bg-rose-500 text-white" :
              voiceStatus === "processing" ? "bg-amber-500 text-white" :
              voiceStatus === "success" ? "bg-emerald-500 text-white" :
              "bg-white/5 border border-white/10 text-slate-500 group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white"
          )}>
            {voiceStatus === "listening" ? <Mic size={24} /> : 
             voiceStatus === "success" ? <Check size={24} /> : 
             <MessageSquare size={24} />}
          </div>
          
          <div className="text-center mt-4">
            <span className={clsx(
                "font-bold uppercase tracking-[0.2em] text-[9px]",
                voiceStatus === "listening" ? "text-rose-400" :
                voiceStatus === "success" ? "text-emerald-400" :
                "text-slate-500 group-hover:text-slate-300"
            )}>
              {voiceStatus === "listening" ? "Listening..." : 
               voiceStatus === "processing" ? "Thinking..." :
               voiceStatus === "success" ? "Parsed!" :
               "Voice Schedule"}
            </span>
            {voiceStatus !== "idle" && (
                <p className="text-[10px] text-white/40 mt-1 italic truncate max-w-[150px] mx-auto px-4">
                    "{voiceTranscript}"
                </p>
            )}

            {voiceStatus === "idle" && (
              <div className="mt-4 flex flex-col gap-1 items-center opacity-40 group-hover:opacity-100 transition-opacity">
                 <span className="text-[8px] text-indigo-400 font-bold uppercase tracking-widest">Try saying:</span>
                 <p className="text-[9px] text-slate-500 italic">"Work 9 to 6 Monday to Friday"</p>
                 <p className="text-[9px] text-slate-500 italic">"Focus on weekends"</p>
              </div>
            )}
          </div>
        </div>

        {/* SAVED SCHEDULE CARDS */}
        {schedules.map((sch) => (
          <motion.div 
            key={sch._id}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/5 border border-white/10 p-8 rounded-[32px] hover:border-white/20 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                   <Clock size={24} />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
                    onClick={() => openEdit(sch)}
                    disabled={isScheduleRunning(sch)}
                    className={clsx(
                      "p-2 rounded-lg transition-all",
                      isScheduleRunning(sch) ? "text-slate-700 cursor-not-allowed" : "text-slate-500 hover:text-indigo-400"
                    )}
                  >
                    <Settings size={16} />
                  </button>
                  <button 
                    onClick={() => deleteSchedule(sch._id)}
                    className="p-2 text-slate-500 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <h4 className="text-xl font-bold text-white tracking-tighter mb-2">{sch.label}</h4>
              <p className="text-slate-500 font-bold tracking-widest text-[10px] uppercase mb-6">
                {sch.type} Focus Interval
              </p>

              <div className="flex gap-1 mb-8">
                {dayOrder.map(day => (
                  <div key={day} className={clsx(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold border transition-all",
                    sch.days.includes(day) 
                      ? "bg-indigo-500 border-indigo-500 text-white" 
                      : "bg-white/5 border-white/10 text-slate-600"
                  )}>
                    {day[0]}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-6 border-t border-white/10">
               <div className="flex items-center gap-2">
                 <span className="text-white font-black tracking-tight text-lg">{sch.startTime}</span>
                 <span className="text-slate-600 font-bold text-xs uppercase">to</span>
                 <span className="text-white font-black tracking-tight text-lg">{sch.endTime}</span>
               </div>
               <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
            </div>

            {sch.lunchStartTime && (
              <div className="mt-4 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2">
                <Moon size={12} className="text-amber-500" />
                <span className="text-[10px] font-bold text-amber-500 uppercase">Lunch: {sch.lunchStartTime} - {sch.lunchEndTime}</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>


      {/* 🚀 MODAL: ADD SCHEDULE */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} zoom={2}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-xl"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-background border border-border w-full max-w-xl rounded-[40px] shadow-2xl relative isolate overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-600 z-10" />
              
              <div className="p-10 pb-4 shrink-0 flex justify-between items-center">
                <h2 className="text-3xl font-black text-white tracking-tighter">New Schedule</h2>
                <div className="flex gap-2">
                   <button 
                      onClick={handleVoiceInput}
                      className={clsx(
                        "p-3 rounded-2xl transition-all duration-500",
                        voiceStatus === "listening" ? "bg-rose-500 text-white animate-pulse" : 
                        voiceStatus === "success" ? "bg-emerald-500 text-white" :
                        "bg-white/5 border border-white/10 text-indigo-400 hover:bg-white/10"
                      )}
                   >
                     {voiceStatus === "listening" ? <Mic size={20} /> : 
                      voiceStatus === "success" ? <Check size={20} /> : 
                      <Mic size={20} />}
                   </button>
                   <button onClick={() => setShowAddModal(false)} className="p-3 text-slate-500 hover:text-white">
                      <X size={20} />
                   </button>
                </div>
              </div>
              
              {voiceStatus !== "idle" && (
                <div className="px-10 py-3 bg-white/5 border-b border-white/5 flex items-center gap-3">
                   <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                   <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest italic">
                      Voice Engine: "{voiceTranscript}"
                   </p>
                </div>
              )}
              
              <div className="overflow-y-auto p-10 pt-4 space-y-8 flex-1">
                {/* Mode Label */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-3">Label</label>
                  <input 
                    type="text" 
                    value={newSch.label}
                    onChange={e => setNewSch({...newSch, label: e.target.value})}
                    placeholder="e.g. Work Hours"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>

                {/* Time Pickers */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-3">Start Time</label>
                    <input 
                      type="time" 
                      value={newSch.startTime}
                      onChange={e => setNewSch({...newSch, startTime: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-indigo-500 transition-all [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-3">End Time</label>
                    <input 
                      type="time" 
                      value={newSch.endTime}
                      onChange={e => setNewSch({...newSch, endTime: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:border-indigo-500 transition-all [color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* Lunch Break selection */}
                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Moon size={16} className="text-amber-500" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest">Lunch Break (Auto Normal)</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Break Start</label>
                      <input 
                        type="time" 
                        value={newSch.lunchStartTime}
                        onChange={e => setNewSch({...newSch, lunchStartTime: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 [color-scheme:dark]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Break End</label>
                      <input 
                        type="time" 
                        value={newSch.lunchEndTime}
                        onChange={e => setNewSch({...newSch, lunchEndTime: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 [color-scheme:dark]"
                      />
                    </div>
                  </div>
                </div>

                {/* Priority Bypass (Names) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap size={16} className="text-indigo-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest font-heading">Priority Bypass (Active during focus)</h3>
                  </div>
                  <div className="flex flex-wrap gap-2 p-5 bg-white/5 border border-white/10 rounded-2xl min-h-[80px]">
                    {(newSch.priorityKeywords || []).map((kw, i) => (
                      <span key={i} className="px-3 py-1.5 bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center gap-2 shadow-lg shadow-indigo-500/30">
                        {kw}
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            setNewSch(prev => ({ ...prev, priorityKeywords: (prev.priorityKeywords || []).filter((_, idx) => idx !== i) }));
                          }}
                          className="hover:text-white/70"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                    <input 
                      type="text"
                      placeholder="Add Boss, Mom, Urgent..."
                      className="bg-transparent border-none outline-none text-xs text-white flex-1 min-w-[150px]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = e.target.value.trim();
                          if (val && !(newSch.priorityKeywords || []).includes(val)) {
                            setNewSch(prev => ({ 
                              ...prev, 
                              priorityKeywords: [...(prev.priorityKeywords || []), val] 
                            }));
                            e.target.value = '';
                          }
                        }
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight pl-1 italic">
                    Press Enter to add. High-priority names will skip the block.
                  </p>
                </div>

                {/* Day Selection */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-3">Repeats On</label>
                  <div className="flex flex-wrap gap-2">
                    {dayOrder.map(day => (
                      <button
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={clsx(
                          "px-5 py-3 rounded-xl font-bold text-sm transition-all border",
                          newSch.days.includes(day) 
                            ? "bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                            : "bg-white/5 border-white/10 text-slate-500 hover:text-slate-300"
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                </div>

              <div className="p-10 pt-4 shrink-0 bg-background/50 backdrop-blur-md border-t border-white/5">
                <div className="flex gap-4">
                  <button 
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleSaveSchedule()}
                    className="flex-[2] py-4 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black shadow-xl shadow-indigo-500/20 hover:scale-[1.02] transition-all"
                  >
                    {editingSchedule ? "Update" : "Create Schedule"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SchedulePage;
