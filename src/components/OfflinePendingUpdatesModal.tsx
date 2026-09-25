import React from 'react';
import {
  X,
  WifiOff,
  Wifi,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HardDrive,
  FileSpreadsheet,
  CheckSquare,
  Sparkles,
} from 'lucide-react';
import { PendingUpdateRecord } from '../types';

interface OfflinePendingUpdatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingUpdates: PendingUpdateRecord[];
  isOnline: boolean;
  isSyncingPending: boolean;
  onSyncPendingNow: () => void;
  onClearPending: () => void;
  onRemoveItem: (id: string) => void;
}

export const OfflinePendingUpdatesModal: React.FC<OfflinePendingUpdatesModalProps> = ({
  isOpen,
  onClose,
  pendingUpdates,
  isOnline,
  isSyncingPending,
  onSyncPendingNow,
  onClearPending,
  onRemoveItem,
}) => {
  if (!isOpen) return null;

  const getFieldBadge = (field: PendingUpdateRecord['field'], val: boolean) => {
    switch (field) {
      case 'submitted':
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              val
                ? 'bg-purple-950 text-purple-300 border border-purple-800'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Submitted = {val ? 'TRUE' : 'FALSE'}
          </span>
        );
      case 'driveUploaded':
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              val
                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            Drive Uploaded = {val ? 'TRUE' : 'FALSE'}
          </span>
        );
      case 'sheetUpdated':
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              val
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Sheet Updated = {val ? 'TRUE' : 'FALSE'}
          </span>
        );
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                isOnline
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              {isOnline ? <Clock className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Offline Pending Updates Buffer
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                  {pendingUpdates.length} queued
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isOnline
                  ? 'Connectivity is active. You can synchronize these changes to the cloud anytime.'
                  : 'You are currently offline. Changes are saved locally and will auto-sync upon reconnection.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Connectivity Status Banner */}
        <div
          className={`px-5 py-3 border-b text-xs flex items-center justify-between gap-2 ${
            isOnline
              ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-300'
              : 'bg-rose-950/40 border-rose-900/50 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {isOnline ? (
              <>
                <Wifi className="w-4 h-4 text-emerald-400" />
                <span>Internet Connected • Auto-Sync Ready</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-rose-400" />
                <span>Offline Mode • Changes Buffered in Local Storage</span>
              </>
            )}
          </div>

          <span className="text-[11px] font-mono text-slate-400">
            {pendingUpdates.length} update(s) awaiting cloud write
          </span>
        </div>

        {/* List of Pending Updates */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 divide-y divide-slate-800/60">
          {pendingUpdates.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <div className="text-sm font-semibold text-slate-200">
                All Local Changes are Synchronized
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No manual toggles or overrides are pending. Any new status modifications made while offline will queue up here.
              </p>
            </div>
          ) : (
            pendingUpdates.map((item, idx) => (
              <div
                key={item.id || idx}
                className="pt-3 first:pt-0 flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
                      {item.rollNo}
                    </span>
                    {item.studentName && (
                      <span className="text-slate-300 font-medium truncate max-w-xs">
                        {item.studentName}
                      </span>
                    )}
                    {getFieldBadge(item.field, item.newValue)}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                    {item.status === 'FAILED' && (
                      <span className="text-rose-400 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Sync Failed • Will retry
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition cursor-pointer shrink-0"
                  title="Discard this pending update"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClearPending}
            disabled={pendingUpdates.length === 0}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 border border-transparent hover:border-rose-900 transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            Clear Entire Buffer
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={onSyncPendingNow}
              disabled={pendingUpdates.length === 0 || !isOnline || isSyncingPending}
              className="w-full sm:w-auto px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-blue-600/30 cursor-pointer flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingPending ? 'animate-spin' : ''}`} />
              <span>{isSyncingPending ? 'Syncing to Cloud...' : 'Sync Pending to Cloud'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
