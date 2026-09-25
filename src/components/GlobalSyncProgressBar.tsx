import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, HardDrive, FileSpreadsheet, Sparkles, Check } from 'lucide-react';

export interface SyncProgressState {
  step: number;
  totalSteps: number;
  title: string;
  detail?: string;
  progressPercent: number;
}

interface GlobalSyncProgressBarProps {
  isSyncing: boolean;
  syncProgress: SyncProgressState | null;
}

export const GlobalSyncProgressBar: React.FC<GlobalSyncProgressBarProps> = ({
  isSyncing,
  syncProgress,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);

  useEffect(() => {
    if (isSyncing) {
      setIsVisible(true);
      setIsCompleted(false);
      if (syncProgress) {
        setCurrentProgress(syncProgress.progressPercent);
      } else {
        setCurrentProgress(15);
      }
    } else if (isVisible && !isCompleted) {
      // Completed transition
      setCurrentProgress(100);
      setIsCompleted(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsCompleted(false);
        setCurrentProgress(0);
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [isSyncing, syncProgress, isVisible, isCompleted]);

  useEffect(() => {
    if (syncProgress && isSyncing) {
      setCurrentProgress(syncProgress.progressPercent);
    }
  }, [syncProgress, isSyncing]);

  if (!isVisible && !isSyncing) return null;

  const currentStep = syncProgress?.step || 1;
  const totalSteps = syncProgress?.totalSteps || 4;
  const stepTitle = syncProgress?.title || 'Synchronizing Google Workspace data...';
  const stepDetail = syncProgress?.detail || '';

  const getStepIcon = () => {
    if (isCompleted) {
      return <Check className="w-3.5 h-3.5 text-emerald-300" />;
    }
    if (currentStep === 1) {
      return <HardDrive className="w-3.5 h-3.5 text-blue-300 animate-pulse" />;
    }
    if (currentStep === 2) {
      return <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />;
    }
    if (currentStep >= 3) {
      return <Sparkles className="w-3.5 h-3.5 text-purple-300 animate-spin" />;
    }
    return <RefreshCw className="w-3.5 h-3.5 text-blue-300 animate-spin" />;
  };

  return (
    <aside
      aria-label="Synchronization progress"
      className="fixed top-0 left-0 right-0 z-50 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-2"
    >
      {/* Slim Multi-Color Gradient Progress Line */}
      <div className="h-1.5 w-full bg-slate-900/90 overflow-hidden shadow-lg backdrop-blur-md">
        <div
          className={`h-full transition-all duration-500 ease-out relative ${
            isCompleted
              ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.8)]'
              : 'bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 shadow-[0_0_12px_rgba(99,102,241,0.8)]'
          }`}
          style={{ width: `${Math.max(5, Math.min(100, currentProgress))}%` }}
        >
          {/* Shimmer Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_1.8s_infinite]" />
        </div>
      </div>

      {/* Floating Status Pill Center Badge */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center pt-2">
        <div
          className={`pointer-events-auto inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border text-xs font-semibold shadow-2xl backdrop-blur-xl transition-all duration-300 transform ${
            isCompleted
              ? 'bg-emerald-950/95 border-emerald-500 text-emerald-200 scale-100 shadow-emerald-950/60'
              : 'bg-slate-900/95 border-indigo-500/50 text-slate-100 shadow-indigo-950/60'
          }`}
        >
          {/* Icon Badge */}
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
              isCompleted
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-indigo-500/20 text-indigo-400'
            }`}
          >
            {getStepIcon()}
          </div>

          {/* Text Feedback */}
          <div className="flex items-center gap-2">
            {!isCompleted && (
              <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-slate-800 text-indigo-300 font-bold border border-slate-700">
                {currentStep}/{totalSteps}
              </span>
            )}
            <span className="font-medium truncate max-w-xs sm:max-w-md">
              {isCompleted ? 'Synchronization Complete!' : stepTitle}
            </span>
            {stepDetail && !isCompleted && (
              <span className="hidden sm:inline text-[11px] text-slate-400 font-mono">
                ({stepDetail})
              </span>
            )}
          </div>

          {/* Percentage */}
          <div className="pl-1 border-l border-slate-700/80 font-mono text-[11px] text-indigo-300 font-bold shrink-0">
            {Math.round(currentProgress)}%
          </div>
        </div>
      </div>
    </aside>
  );
};
