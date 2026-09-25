import React from 'react';
import { Sparkles, Users, HardDrive, FileSpreadsheet, CheckCircle2, UserX, HelpCircle, X } from 'lucide-react';
import { SyncReport } from '../types';

interface FirstSyncPreviewModalProps {
  report: SyncReport | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const FirstSyncPreviewModal: React.FC<FirstSyncPreviewModalProps> = ({
  report,
  onConfirm,
  onCancel,
}) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  if (!report) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="bg-slate-900 border border-blue-500/40 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400 bg-blue-950/60 border border-blue-800 px-2 py-0.5 rounded-full">
                Step 5 of Setup Wizard
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight mt-1">
                First Sync Preview
              </h2>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Before applying the synchronization results to your dashboard, please review the detection preview from your connected Google Drive folder and Google Sheet:
        </p>

        {/* Preview Card List */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 divide-y divide-slate-800/80 text-xs">
          <div className="flex items-center justify-between py-2.5">
            <span className="flex items-center gap-2 text-slate-400">
              <Users className="w-4 h-4 text-blue-400" />
              Students in Class:
            </span>
            <span className="font-mono font-bold text-white text-sm">
              67 (Strict Roster)
            </span>
          </div>

          <div className="flex items-center justify-between py-2.5">
            <span className="flex items-center gap-2 text-slate-400">
              <HardDrive className="w-4 h-4 text-amber-400" />
              Drive files found:
            </span>
            <span className="font-mono font-bold text-white text-sm">
              {report.driveFilesScanned}
            </span>
          </div>

          <div className="flex items-center justify-between py-2.5">
            <span className="flex items-center gap-2 text-slate-400">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Spreadsheet records found:
            </span>
            <span className="font-mono font-bold text-white text-sm">
              {report.spreadsheetRecordsChecked}
            </span>
          </div>

          <div className="flex items-center justify-between py-2.5">
            <span className="flex items-center gap-2 text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Potential class matches:
            </span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              {report.matchedCertificates}
            </span>
          </div>

          <div className="flex items-center justify-between py-2.5">
            <span className="flex items-center gap-2 text-slate-400">
              <UserX className="w-4 h-4 text-slate-400" />
              Outside-class records (ignored):
            </span>
            <span className="font-mono font-bold text-slate-400 text-sm">
              {report.outsideClassIgnored}
            </span>
          </div>

          <div className="flex items-center justify-between py-2.5">
            <span className="flex items-center gap-2 text-slate-400">
              <HelpCircle className="w-4 h-4 text-rose-400" />
              Unidentified files:
            </span>
            <span className="font-mono font-bold text-rose-400 text-sm">
              {report.unidentifiedFiles}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-lg shadow-blue-600/30 cursor-pointer"
          >
            Confirm First Sync
          </button>
        </div>
      </div>
    </div>
  );
};
