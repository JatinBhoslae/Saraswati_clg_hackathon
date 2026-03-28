import React from "react";

const getBadgeStyles = (type, action) => {
  if (action === "blocked") {
    return "bg-rose-500/10 text-rose-400 border-rose-500/30";
  }
  switch (type) {
    case "productive":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    case "distraction":
      return "bg-amber-500/10 text-amber-500 border-amber-500/30";
    default:
      return "bg-slate-500/10 text-slate-400 border-slate-500/30";
  }
};

const LogsTable = ({ logs }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden mt-6">
      <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur">
        <h3 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
          <span>📋</span> Recent Activity Log
        </h3>
        <button
          onClick={() => window.location.reload()}
          className="text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 px-4 rounded-lg font-medium transition-colors"
        >
          Refresh Data
        </button>
      </div>

      <div className="overflow-x-auto h-96">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-slate-900/90 backdrop-blur z-10 border-b border-slate-800">
            <tr>
              <th className="py-4 px-6 text-xs uppercase tracking-wider text-slate-500 font-semibold w-1/4">
                Time
              </th>
              <th className="py-4 px-6 text-xs uppercase tracking-wider text-slate-500 font-semibold w-1/2">
                Website
              </th>
              <th className="py-4 px-6 text-xs uppercase tracking-wider text-slate-500 font-semibold w-1/4">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {logs.length > 0 ? (
              logs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-slate-800/30 transition-colors group cursor-default"
                >
                  <td className="py-4 px-6 text-sm text-slate-400 font-mono">
                    {log.time}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-xs opacity-70 group-hover:opacity-100 transition-opacity">
                        🔗
                      </div>
                      <a
                        href={log.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-slate-300 hover:text-indigo-400 truncate max-w-xs transition-colors"
                        title={log.url}
                      >
                        {log.hostname}
                      </a>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getBadgeStyles(
                        log.type,
                        log.action
                      )}`}
                    >
                      {log.action === "blocked" ? "🚨 Blocked" : log.type}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="py-12 text-center text-slate-500">
                  <div className="text-4xl mb-3">👻</div>
                  <p>No activity recorded yet.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LogsTable;
