import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-2xl bg-amber-600/90 backdrop-blur-md border border-amber-500/30 px-4 py-2.5 text-xs font-semibold text-white shadow-2xl animate-fade-in-up">
      <div className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
      </div>
      <WifiOff className="w-4 h-4 shrink-0 text-amber-200" />
      <span>Offline Mode — Running on local database cache.</span>
    </div>
  );
};
