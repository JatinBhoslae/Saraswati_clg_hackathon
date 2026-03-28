import React, { useState } from "react";

const SettingsPanel = ({
  focusMode,
  toggleFocusMode,
  customBlockedSites = [],
  onAddSite,
  onRemoveSite,
}) => {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [newSite, setNewSite] = useState("");

  const handleAddSite = (e) => {
    e.preventDefault();
    if (newSite && !customBlockedSites.includes(newSite)) {
      onAddSite(newSite);
      setNewSite("");
    }
  };

  const handleRemoveSite = (siteToRemove) => {
    onRemoveSite(siteToRemove);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-6 mt-6 max-w-2xl mx-auto">
      <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-8 flex items-center gap-2">
        <span>⚙️</span> Assistant Preferences
      </h3>

      <div className="space-y-8">
        {/* Toggle 1: Focus Mode */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/60 transition">
          <div>
            <h4 className="text-lg font-semibold text-white">Focus Mode</h4>
            <p className="text-sm text-slate-400 mt-1">
              Block distractions and all web push notifications instantly.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={focusMode}
              onChange={toggleFocusMode}
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-purple-500 shadow-inner"></div>
          </label>
        </div>

        {/* Toggle 2: AI Summaries */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/60 transition">
          <div>
            <h4 className="text-lg font-semibold text-white">AI Suggestions</h4>
            <p className="text-sm text-slate-400 mt-1">
              Get intelligent summaries and productivity scoring.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={aiEnabled}
              onChange={() => setAiEnabled(!aiEnabled)}
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-teal-500 shadow-inner"></div>
          </label>
        </div>

        {/* Blocked Sites Management */}
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50">
          <h4 className="text-lg font-semibold text-white mb-4">
            Custom Distraction Rules
          </h4>
          <form className="flex gap-2 mb-6" onSubmit={handleAddSite}>
            <input
              type="text"
              value={newSite}
              onChange={(e) => setNewSite(e.target.value)}
              placeholder="e.g. reddit.com"
              className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-3 shadow-inner"
            />
            <button
              type="submit"
              className="text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:outline-none focus:ring-indigo-800 font-medium rounded-lg text-sm px-5 py-3 text-center transition shadow-lg shadow-indigo-500/30"
            >
              Add Site
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {customBlockedSites.map((site) => (
              <div
                key={site}
                className="flex items-center gap-2 bg-rose-500/10 text-rose-300 border border-rose-500/30 px-3 py-1.5 rounded-full text-sm font-medium"
              >
                <span>{site}</span>
                <button
                  onClick={() => handleRemoveSite(site)}
                  className="hover:text-rose-100 hover:bg-rose-500/30 rounded-full w-5 h-5 flex items-center justify-center transition"
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
