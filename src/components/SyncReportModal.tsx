import React from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HardDrive,
  FileSpreadsheet,
  FileCheck2,
  Users,
  UserX,
  HelpCircle,
  Download,
} from 'lucide-react';
import { SyncReport } from '../types';

interface SyncReportModalProps {
  report: SyncReport | null;
  onClose: () => void;
  onExportReport?: () => void;
}

export const SyncReportModal: React.FC<SyncReportModalProps> = ({
  report,
  onClose,
  onExportReport,
}) => {
  if (!report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
                Sync Engine Complete
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight mt-1">
                Reconciliation Report
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timestamp & Timing */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            {new Date(report.timestamp).toLocaleString([], {
              dateStyle: 'medium',
              timeStyle: 'medium',
            })}
          </span>
          <span className="font-mono text-slate-500">
            {report.durationMs}ms duration
          </span>
        </div>

        {/* Detailed Metrics List */}
        <div className="space-y-2 text-xs divide-y divide-slate-800/60">
          <div className="flex items-center justify-between py-2 text-slate-300">
            <span className="flex items-center gap-2 text-slate-400">
              <Users className="w-4 h-4 text-blue-400" />
              Students checked (Fixed Roster):
            </span>
            <span className="font-mono font-bold text-white text-sm">
              {report.studentsChecked}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 text-slate-300">
            <span className="flex items-center gap-2 text-slate-400">
              <HardDrive className="w-4 h-4 text-amber-400" />
              Drive files scanned:
            </span>
            <span className="font-mono font-bold text-white text-sm">
              {report.driveFilesScanned}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 text-slate-300">
            <span className="flex items-center gap-2 text-slate-400">
              <FileCheck2 className="w-4 h-4 text-emerald-400" />
              Matched class certificates:
            </span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {report.matchedCertificates}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 text-slate-300">
            <span className="flex items-center gap-2 text-slate-400">
              <Users className="w-4 h-4 text-indigo-400" />
              Students with certificate(s):
            </span>
            <span className="font-mono font-bold text-white text-sm">
              {report.studentsWithCertificates}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 text-slate-300">
            <span className="flex items-center gap-2 text-slate-400">
              <FileSpreadsheet className="w-4 h-4 text-sky-400" />
              Spreadsheet records checked:
            </span>
            <span className="font-mono font-bold text-white text-sm">
              {report.spreadsheetRecordsChecked}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 text-slate-300">
            <span className="flex items-center gap-2 text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Spreadsheet class matches:
            </span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {report.spreadsheetMatches}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 text-slate-300">
            <span className="flex items-center gap-2 text-slate-400">
              <UserX className="w-4 h-4 text-slate-400" />
              Outside-class records ignored:
            </span>
            <span className="font-mono font-bold text-slate-400 text-sm">
              {report.outsideClassIgnored}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 text-slate-300">
            <span className="flex items-center gap-2 text-slate-400">
              <HelpCircle className="w-4 h-4 text-rose-400" />
              Unidentified files (needs review):
            </span>
            <span className="font-mono font-bold text-rose-400 text-sm">
              {report.unidentifiedFiles}
            </span>
          </div>

          <div className="flex items-center justify-between py-2 text-slate-300">
            <span className="flex items-center gap-2 text-slate-400">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Errors encountered:
            </span>
            <span className="font-mono font-bold text-slate-300 text-sm">
              {report.errors}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2">
          {onExportReport && (
            <button
              onClick={onExportReport}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Text Report</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
