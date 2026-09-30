import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { Wifi, WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  return (
    <div className="fixed bottom-3 right-3 z-50 flex items-center gap-2.5 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 shadow-2xl transition-all duration-300">
      <div className="flex items-center gap-2">
        {isOnline ? (
          <>
            <div className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
            <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-slate-300">Online &bull; Connected to Cloud</span>
          </>
        ) : (
          <>
            <div className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </div>
            <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-amber-300 font-semibold">Offline Mode &bull; Using Local Database Cache</span>
          </>
        )}
      </div>
    </div>
  );
};

