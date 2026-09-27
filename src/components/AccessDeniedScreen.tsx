import React from 'react';
import { ShieldAlert, LogOut, RefreshCw, KeyRound, Sparkles, ArrowRight } from 'lucide-react';
import { logout } from '../services/firebaseAuth';

interface AccessDeniedScreenProps {
  userEmail: string | null;
  onRetryLogin: () => void;
}

export const AccessDeniedScreen: React.FC<AccessDeniedScreenProps> = ({
  userEmail,
  onRetryLogin,
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-red-500/40 rounded-2xl p-8 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto text-red-400">
          <ShieldAlert className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <div className="inline-block px-3 py-1 bg-red-950/60 border border-red-600/40 rounded-full text-xs font-semibold text-red-300 uppercase tracking-wider">
            Access Denied
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Unauthorized Account
          </h1>
          <p className="text-slate-400 text-sm">
            This is a private administrator portal. Your Google account does not have administrative privileges.
          </p>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-left space-y-1">
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">
            Signed in as
          </div>
          <div className="text-sm font-mono text-slate-200 truncate">
            {userEmail || 'Unknown user'}
          </div>
          <div className="text-xs text-amber-400/90 pt-1 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" />
            Not found on administrator allowlist
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={async () => {
              await logout();
              onRetryLogin();
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Switch Google Account
          </button>

          <button
            type="button"
            onClick={async () => {
              await logout();
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-medium rounded-xl transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Contact your system administrator if you believe this is an error.
        </p>
      </div>
    </div>
  );
};
