import React from 'react';
import { Wifi, WifiOff, RefreshCw, Layers, Clock } from 'lucide-react';
import { PendingUpdateRecord } from '../types';

interface ConnectivityStatusIndicatorProps {
  isOnline: boolean;
  pendingUpdatesCount: number;
  isSyncingPending: boolean;
  onOpenPendingModal: () => void;
  onQuickSyncPending: () => void;
}

export const ConnectivityStatusIndicator: React.FC<ConnectivityStatusIndicatorProps> = ({
  isOnline,
  pendingUpdatesCount,
  isSyncingPending,
  onOpenPendingModal,
  onQuickSyncPending,
}) => {
  return (
    <div className="flex items-center gap-2">
      {/* Offline Alert Indicator */}
      {!isOnline && (
        <div
          onClick={onOpenPendingModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-950/80 border border-rose-800 text-rose-300 shadow-md cursor-pointer hover:bg-rose-900 transition"
          title="App is working offline. All modifications are safely preserved in local storage."
        >
          <WifiOff className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
          <span>Offline Mode</span>
        </div>
      )}

      {/* Pending Changes Badge Pill */}
      {pendingUpdatesCount > 0 && (
        <div
          onClick={onOpenPendingModal}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-950/80 hover:bg-amber-900/90 border border-amber-500/50 text-amber-200 shadow-md cursor-pointer transition animate-in fade-in group"
          title="Click to inspect offline pending updates queue"
        >
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span className="flex items-center gap-1 font-mono">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>{pendingUpdatesCount} Pending Change{pendingUpdatesCount > 1 ? 's' : ''}</span>
          </span>

          {isOnline && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickSyncPending();
              }}
              disabled={isSyncingPending}
              className="ml-1 p-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition disabled:opacity-50"
              title="Sync pending changes now"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncingPending ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
