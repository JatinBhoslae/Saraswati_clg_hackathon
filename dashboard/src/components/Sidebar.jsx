import React from "react";

const Sidebar = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "analytics", label: "Analytics", icon: "📈" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 text-slate-300">
      {/* Logo Area */}
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <span className="text-3xl drop-shadow-[0_0_12px_rgba(99,102,241,0.5)]">
          🧠
        </span>
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Focus Assistant
          </h1>
          <p className="text-xs text-slate-500">Context-Aware SaaS</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 flex flex-col gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
              activeTab === tab.id
                ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                : "hover:bg-slate-800/50 hover:text-white border border-transparent"
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="font-medium">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Footer User Profile */}
      <div className="p-6 border-t border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20">
          U
        </div>
        <div className="flex flex-col text-left">
          <span className="text-sm font-semibold text-white">Guest User</span>
          <span className="text-xs text-slate-500">Free Plan</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
