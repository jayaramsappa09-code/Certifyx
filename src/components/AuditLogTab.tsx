import React, { useState } from 'react';
import { ShieldCheck, Search, Filter, Clock, User, Info, RefreshCw } from 'lucide-react';
import { AuditLogEntry } from '../types';

interface AuditLogTabProps {
  logs: AuditLogEntry[];
  onRefresh: () => void;
}

export const AuditLogTab: React.FC<AuditLogTabProps> = ({ logs, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.user.toLowerCase().includes(search.toLowerCase());

    const matchesCat = categoryFilter === 'ALL' || l.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  const categoryBadge = (cat: AuditLogEntry['category']) => {
    switch (cat) {
      case 'AUTH':
        return 'bg-blue-950 text-blue-300 border-blue-800';
      case 'SYNC':
        return 'bg-emerald-950 text-emerald-300 border-emerald-800';
      case 'DRIVE':
        return 'bg-amber-950 text-amber-300 border-amber-800';
      case 'SHEETS':
        return 'bg-sky-950 text-sky-300 border-sky-800';
      case 'STATUS':
        return 'bg-purple-950 text-purple-300 border-purple-800';
      case 'REVIEW':
        return 'bg-rose-950 text-rose-300 border-rose-800';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header card with search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">System Audit Log</h3>
            <p className="text-xs text-slate-400">
              Immutable chronological record of administrator actions and reconciliation events
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit records..."
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          <button
            onClick={onRefresh}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
        {['ALL', 'SYNC', 'AUTH', 'STATUS', 'DRIVE', 'SHEETS', 'REVIEW', 'SETTINGS'].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1 rounded-full font-medium transition cursor-pointer ${
              categoryFilter === cat
                ? 'bg-blue-600 text-white'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Log Entries List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="divide-y divide-slate-800/60">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              No audit logs found for the current search or filter.
            </div>
          ) : (
            filteredLogs.map((log, idx) => (
              <div
                key={log.id ? `${log.id}_${idx}` : `log_${idx}`}
                className="p-4 hover:bg-slate-800/40 transition flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${categoryBadge(
                        log.category
                      )}`}
                    >
                      {log.category}
                    </span>
                    <span className="font-semibold text-white">{log.action}</span>
                  </div>
                  <p className="text-slate-300 font-mono text-[11px] break-words">
                    {log.details}
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 shrink-0 text-slate-400">
                  <span className="flex items-center gap-1 text-[11px] text-slate-300">
                    <User className="w-3 h-3 text-blue-400" />
                    {log.user}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                    <Clock className="w-3 h-3 text-slate-600" />
                    {new Date(log.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
