import React from 'react';
import { History, Calendar, CheckCircle2, AlertTriangle, HardDrive, FileSpreadsheet, Users } from 'lucide-react';
import { SyncReport } from '../types';

interface SyncHistoryTabProps {
  history: SyncReport[];
  onSelectReport: (report: SyncReport) => void;
}

export const SyncHistoryTab: React.FC<SyncHistoryTabProps> = ({
  history,
  onSelectReport,
}) => {
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Synchronization Run History</h3>
            <p className="text-xs text-slate-400">
              Detailed audit trail of past Drive scans and Sheet reconciliation jobs
            </p>
          </div>
        </div>

        <span className="text-xs text-slate-400">
          {history.length} run(s) recorded
        </span>
      </div>

      <div className="space-y-3">
        {history.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-xs text-slate-500">
            No synchronization history recorded yet. Click "SYNC NOW" to execute your first sync.
          </div>
        ) : (
          history.map((report) => (
            <div
              key={report.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Success
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    {new Date(report.timestamp).toLocaleString([], {
                      dateStyle: 'medium',
                      timeStyle: 'medium',
                    })}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    ({report.durationMs}ms)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Drive Scanned</span>
                    <span className="font-semibold text-slate-200">{report.driveFilesScanned} files</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Class Matched</span>
                    <span className="font-semibold text-emerald-400">{report.matchedCertificates} certs</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Sheet Matched</span>
                    <span className="font-semibold text-sky-400">{report.spreadsheetMatches} rows</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Outside Ignored</span>
                    <span className="font-semibold text-slate-400">{report.outsideClassIgnored}</span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center justify-end">
                <button
                  onClick={() => onSelectReport(report)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-xl transition cursor-pointer"
                >
                  View Full Report
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
