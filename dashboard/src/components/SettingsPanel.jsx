import React, { useState } from "react";

const SettingsPanel = ({
  focusMode,
  toggleFocusMode,
  customBlockedSites = [],
  onAddSite,
  onRemoveSite,
  priorityKeywords = [],
  onAddKeyword,
  onRemoveKeyword,
}) => {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [newSite, setNewSite] = useState("");
  const [newKeyword, setNewKeyword] = useState("");

  const handleAddSite = (e) => {
    e.preventDefault();
    const cleanedSite = newSite.trim().toLowerCase();
    
    if (cleanedSite && !customBlockedSites.some(s => s.toLowerCase() === cleanedSite)) {
      onAddSite(cleanedSite);
      setNewSite("");
    } else if (cleanedSite) {
      setNewSite("");
    }
  };

  const handleAddKeyword = (e) => {
    e.preventDefault();
    const cleanedKW = newKeyword.trim();
    if (cleanedKW && !priorityKeywords.some(kw => kw.toLowerCase() === cleanedKW.toLowerCase())) {
      onAddKeyword(cleanedKW);
      setNewKeyword("");
    } else if (cleanedKW) {
      setNewKeyword("");
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-8 mt-6 max-w-2xl mx-auto backdrop-blur-3xl">
      <h3 className="text-3xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-500 bg-clip-text text-transparent mb-10 flex items-center gap-3">
        <span>⚙️</span> Assistant Engine
      </h3>

      <div className="space-y-10">
        {/* Toggle 1: Focus Mode */}
        <div className="flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-all duration-300 group">
          <div>
            <h4 className="text-xl font-black text-white tracking-tight">Focus Protocol</h4>
            <p className="text-sm text-slate-400 mt-1 font-medium">
              Filter all notifications and block distractions instantly.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={focusMode}
              onChange={toggleFocusMode}
            />
            <div className="w-12 h-7 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-purple-500 shadow-xl"></div>
          </label>
        </div>

        {/* Priority Keywords (Seniors Spec: Step 3) */}
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-all duration-300">
          <h4 className="text-xl font-black text-white tracking-tight mb-2 flex items-center gap-2">
            Priority Personas <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-md border border-indigo-500/30 uppercase font-black">AI Trigger</span>
          </h4>
          <p className="text-sm text-slate-400 mb-6 font-medium">Notifications containing these keywords will ALWAYS be allowed.</p>
          
          <form className="flex gap-2 mb-6" onSubmit={handleAddKeyword}>
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="e.g. Mom, Boss, Client, Urgent"
              className="flex-1 bg-slate-950/50 border border-white/10 text-white text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none block w-full p-4 shadow-inner placeholder:text-slate-600 font-bold"
            />
            <button
              type="submit"
              className="text-white bg-indigo-600 hover:bg-indigo-500 font-black rounded-xl text-sm px-6 py-4 transition-all shadow-lg shadow-indigo-600/25 active:scale-95"
            >
              Add Tag
            </button>
          </form>

          <div className="flex flex-wrap gap-2.5">
            {priorityKeywords.length === 0 && <p className="text-xs text-slate-600 italic">No priority filters defined yet.</p>}
            {priorityKeywords.map((kw) => (
              <div
                key={kw}
                className="flex items-center gap-2 bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-4 py-2 rounded-xl text-xs font-black group/tag hover:border-indigo-500/60 transition-colors"
              >
                <span>{kw}</span>
                <button
                  onClick={() => onRemoveKeyword(kw)}
                  className="text-indigo-500 group-hover/tag:text-indigo-200 transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Sites Management */}
        <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.08] transition-all duration-300">
          <h4 className="text-xl font-black text-white tracking-tight mb-2 flex items-center gap-2">
            Custom Distractions <span className="text-xs bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-md border border-rose-500/30 uppercase font-black">Silent</span>
          </h4>
          <p className="text-sm text-slate-400 mb-6 font-medium">Manually override classification for these platforms.</p>
          
          <form className="flex gap-2 mb-6" onSubmit={handleAddSite}>
            <input
              type="text"
              value={newSite}
              onChange={(e) => setNewSite(e.target.value)}
              placeholder="e.g. reddit.com"
              className="flex-1 bg-slate-950/50 border border-white/10 text-white text-sm rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none block w-full p-4 shadow-inner placeholder:text-slate-600 font-bold"
            />
            <button
              type="submit"
              className="text-white bg-rose-600 hover:bg-rose-500 font-black rounded-xl text-sm px-6 py-4 transition-all shadow-lg shadow-rose-600/25 active:scale-95"
            >
              Add Rule
            </button>
          </form>

          <div className="flex flex-wrap gap-2.5">
            {customBlockedSites.map((site) => (
              <div
                key={site}
                className="flex items-center gap-2 bg-rose-500/10 text-rose-300 border border-rose-500/30 px-4 py-2 rounded-xl text-xs font-black group/tag hover:border-rose-500/60 transition-colors"
              >
                <span>{site}</span>
                <button
                  onClick={() => onRemoveSite(site)}
                  className="text-rose-500 group-hover/tag:text-rose-200 transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
