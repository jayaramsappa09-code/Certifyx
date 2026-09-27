import React from 'react';
import {
  FileCheck2,
  RefreshCw,
  FolderSync,
  AlertTriangle,
  FileSpreadsheet,
  History,
  ShieldCheck,
  FileText,
  LogOut,
  Clock,
  Sparkles,
  ChevronRight,
  Sun,
  Moon,
  Activity,
} from 'lucide-react';
import { AuthUser } from '../types';
import { ConnectivityStatusIndicator } from './ConnectivityStatusIndicator';
import { ThemeToggleSwitch } from './ThemeToggleSwitch';

interface HeaderProps {
  user: AuthUser | null;
  activeTab: 'dashboard' | 'review' | 'integration' | 'history' | 'audit' | 'docs';
  setActiveTab: (tab: 'dashboard' | 'review' | 'integration' | 'history' | 'audit' | 'docs') => void;
  onSyncNow: () => void;
  onOpenSheetProof?: () => void;
  isSyncing: boolean;
  lastSynced: string | null;
  reviewCount: number;
  autoSyncIntervalMinutes: number;
  onLogin: () => void;
  onLogout: () => void;
  isGoogleConnected: boolean;
  isOnline?: boolean;
  pendingUpdatesCount?: number;
  isSyncingPending?: boolean;
  onOpenPendingModal?: () => void;
  onQuickSyncPending?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onOpenDataHealthReport?: () => void;
  rosterCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  activeTab,
  setActiveTab,
  onSyncNow,
  onOpenSheetProof,
  isSyncing,
  lastSynced,
  reviewCount,
  autoSyncIntervalMinutes,
  onLogin,
  onLogout,
  isGoogleConnected,
  isOnline = true,
  pendingUpdatesCount = 0,
  isSyncingPending = false,
  onOpenPendingModal,
  onQuickSyncPending,
  theme = 'dark',
  onToggleTheme,
  onOpenDataHealthReport,
  rosterCount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white">
      {/* Top Banner Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                Class Certificate Automation Manager
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-400 border border-blue-800">
                {rosterCount ? `${rosterCount} Roster` : '67 Roster'}
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Direct Drive & Sheets Automated Reconciliation Engine
            </p>
          </div>
        </div>

        {/* Sync Controls & User Profile */}
        <div className="flex items-center gap-2.5">
          {/* Offline / Pending Updates Connectivity Indicator */}
          <ConnectivityStatusIndicator
            isOnline={isOnline}
            pendingUpdatesCount={pendingUpdatesCount}
            isSyncingPending={isSyncingPending}
            onOpenPendingModal={onOpenPendingModal || (() => {})}
            onQuickSyncPending={onQuickSyncPending || (() => {})}
          />

          {/* Last sync & Auto-sync badge */}
          {lastSynced && (
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Synced {new Date(lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              {autoSyncIntervalMinutes > 0 && (
                <span className="ml-1 text-emerald-400 font-medium">
                  • Auto {autoSyncIntervalMinutes}m
                </span>
              )}
            </div>
          )}

          {/* Sync Now Button */}
          <button
            onClick={onSyncNow}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-70 text-white text-xs sm:text-sm font-semibold rounded-xl transition shadow-md shadow-blue-600/20 cursor-pointer"
            title="Scan Google Drive folder and match against Google Sheet"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'SYNC NOW'}</span>
          </button>

          {/* Sheet Proof Inspector Button */}
          {onOpenSheetProof && (
            <button
              onClick={onOpenSheetProof}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer"
              title="Inspect Google Sheet live proof, raw rows & verification evidence"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sheet Proof</span>
            </button>
          )}

          {/* Data Health Report Button */}
          {onOpenDataHealthReport && (
            <button
              type="button"
              onClick={onOpenDataHealthReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600/10 hover:bg-teal-600/20 text-teal-400 border border-teal-500/30 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer"
              title="Run automated Data Health Report scan on Google Sheet & Drive records"
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Data Health</span>
            </button>
          )}

          {/* CSS-Based Sliding Theme Toggle Switch */}
          {onToggleTheme && (
            <ThemeToggleSwitch
              theme={theme}
              onToggle={onToggleTheme}
              showLabels={true}
            />
          )}

          {/* Google Auth Status / Profile */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 px-2.5 py-1 rounded-xl">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Admin'}
                    className="w-6 h-6 rounded-full border border-slate-700"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-blue-400">
                    {(user.email?.[0] || 'A').toUpperCase()}
                  </div>
                )}
                <div className="hidden md:block text-left text-xs leading-tight">
                  <div className="font-semibold text-slate-200 truncate max-w-[120px]">
                    {user.displayName || 'Administrator'}
                  </div>
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Authorized Admin
                  </div>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-lg transition cursor-pointer"
                title="Sign out of Google"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-slate-900 hover:bg-slate-100 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer shadow"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Connect Google</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Dropdown (Visible on small screens) */}
      <div className="md:hidden px-4 py-2 border-t border-slate-800/80 bg-slate-950/70">
        <label htmlFor="mobile-tab-select" className="sr-only">
          Select View Tab
        </label>
        <select
          id="mobile-tab-select"
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as any)}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-slate-100 focus:outline-none focus:border-blue-500"
        >
          <option value="dashboard">📊 Dashboard &amp; Class Roster ({rosterCount || 67})</option>
          <option value="review">⚠️ Needs Review ({reviewCount})</option>
          <option value="integration">📂 Google Integration (Drive &amp; Sheets)</option>
          <option value="history">⏱️ Sync History</option>
          <option value="audit">🛡️ Audit Log</option>
          <option value="docs">📖 Setup &amp; Verification</option>
        </select>
      </div>

      {/* Navigation Tabs Bar (Desktop & Horizontal Scrollable) */}
      <nav aria-label="Main Navigation" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-1.5 scrollbar-none border-t border-slate-800/60">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl transition whitespace-nowrap cursor-pointer touch-manipulation ${
            activeTab === 'dashboard'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
          }`}
        >
          <FolderSync className="w-4 h-4" />
          <span>Dashboard &amp; Class Roster {rosterCount ? `(${rosterCount})` : ''}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('review')}
          className={`shrink-0 relative flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl transition whitespace-nowrap cursor-pointer touch-manipulation ${
            activeTab === 'review'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Needs Review</span>
          {reviewCount > 0 && (
            <span className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              activeTab === 'review' ? 'bg-white text-amber-900' : 'bg-amber-500 text-slate-950'
            }`}>
              {reviewCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('integration')}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl transition whitespace-nowrap cursor-pointer touch-manipulation ${
            activeTab === 'integration'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Google Integration</span>
          {!isGoogleConnected && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Setup needed"></span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl transition whitespace-nowrap cursor-pointer touch-manipulation ${
            activeTab === 'history'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Sync History</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl transition whitespace-nowrap cursor-pointer touch-manipulation ${
            activeTab === 'audit'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Audit Log</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('docs')}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-xl transition whitespace-nowrap cursor-pointer touch-manipulation ${
            activeTab === 'docs'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Setup &amp; Verification</span>
        </button>
      </nav>
    </header>
  );
};
