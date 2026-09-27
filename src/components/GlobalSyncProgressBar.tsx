import React, { useEffect, useState, useMemo } from 'react';
import {
  ShieldCheck,
  HardDrive,
  FileSpreadsheet,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Clock,
  X,
  Check,
} from 'lucide-react';

export type SyncStepId = 'AUTH' | 'DRIVE' | 'SHEET' | 'ENGINE';
export type SyncStepStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ERROR' | 'SKIPPED';

export interface SyncStepInfo {
  id: SyncStepId;
  label: string;
  shortName: string;
  status: SyncStepStatus;
  progressPercent: number; // 0-100 for this step
  itemsProcessed?: number;
  totalItems?: number;
  detail?: string;
  error?: string;
  startTime?: number;
  endTime?: number;
}

export interface DetailedSyncProgress {
  overallPercent: number; // 0-100 overall
  currentStepId: SyncStepId;
  steps: Record<SyncStepId, SyncStepInfo>;
  isBatchOperation?: boolean;
  batchInfo?: {
    currentBatch: number;
    totalBatches: number;
    batchPercent: number;
    description: string;
  };
  startTime: number;
  isComplete: boolean;
  hasErrors?: boolean;
}

export interface SyncProgressState {
  step: number;
  totalSteps: number;
  title: string;
  detail?: string;
  progressPercent: number;
  detailedProgress?: DetailedSyncProgress;
}

interface GlobalSyncProgressBarProps {
  isSyncing: boolean;
  syncProgress: SyncProgressState | null;
  onCancelSync?: () => void;
}

export const GlobalSyncProgressBar: React.FC<GlobalSyncProgressBarProps> = ({
  isSyncing,
  syncProgress,
  onCancelSync,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer for elapsed sync duration
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isSyncing) {
      setIsVisible(true);
      setIsCompleted(false);
      setElapsedSeconds(0);
      interval = setInterval(() => {
        setElapsedSeconds((prev) => +(prev + 0.1).toFixed(1));
      }, 100);
    } else if (isVisible && !isCompleted) {
      setIsCompleted(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsCompleted(false);
        setElapsedSeconds(0);
      }, 1200);
      return () => clearTimeout(timer);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSyncing, isVisible, isCompleted]);

  // Derive detailed step information
  const detailed: DetailedSyncProgress = useMemo(() => {
    if (syncProgress?.detailedProgress) {
      return syncProgress.detailedProgress;
    }

    // Default synthesis if simple syncProgress is supplied
    const currentStepNum = syncProgress?.step || 1;
    const pct = syncProgress?.progressPercent || (isSyncing ? 15 : 0);

    const getStatusForStep = (stepNum: number): SyncStepStatus => {
      if (isCompleted || pct >= 100) return 'COMPLETED';
      if (currentStepNum > stepNum) return 'COMPLETED';
      if (currentStepNum === stepNum) return isSyncing ? 'RUNNING' : 'PENDING';
      return 'PENDING';
    };

    return {
      overallPercent: isCompleted ? 100 : Math.max(5, Math.min(100, pct)),
      currentStepId:
        currentStepNum === 1
          ? 'AUTH'
          : currentStepNum === 2
          ? 'DRIVE'
          : currentStepNum === 3
          ? 'SHEET'
          : 'ENGINE',
      steps: {
        AUTH: {
          id: 'AUTH',
          label: 'Auth & Credentials',
          shortName: 'Auth',
          status: getStatusForStep(1),
          progressPercent: currentStepNum > 1 ? 100 : currentStepNum === 1 ? pct * 2 : 0,
          detail: currentStepNum >= 1 ? 'Google OAuth tokens & permissions verified' : 'Pending authentication',
        },
        DRIVE: {
          id: 'DRIVE',
          label: 'Google Drive Scan',
          shortName: 'Drive',
          status: getStatusForStep(2),
          progressPercent: currentStepNum > 2 ? 100 : currentStepNum === 2 ? Math.min(100, pct * 1.5) : 0,
          detail: syncProgress?.detail || (currentStepNum === 2 ? 'Scanning certificate files...' : 'Folder sync pending'),
        },
        SHEET: {
          id: 'SHEET',
          label: 'Google Sheets Read',
          shortName: 'Sheet',
          status: getStatusForStep(3),
          progressPercent: currentStepNum > 3 ? 100 : currentStepNum === 3 ? Math.min(100, pct) : 0,
          detail: currentStepNum === 3 ? 'Reading form responses & column mappings...' : 'Spreadsheet audit pending',
        },
        ENGINE: {
          id: 'ENGINE',
          label: 'Reconciliation Engine',
          shortName: 'Engine',
          status: getStatusForStep(4),
          progressPercent: isCompleted ? 100 : currentStepNum === 4 ? pct : 0,
          detail: currentStepNum === 4 ? 'Auditing roster discrepancies & statuses...' : 'Awaiting file and sheet scans',
        },
      },
      startTime: Date.now(),
      isComplete: isCompleted,
    };
  }, [syncProgress, isSyncing, isCompleted]);

  if (!isVisible && !isSyncing) return null;

  const stepsList: Array<{
    id: SyncStepId;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    stepIndex: number;
  }> = [
    { id: 'AUTH', icon: ShieldCheck, title: '1. Auth Verification', stepIndex: 1 },
    { id: 'DRIVE', icon: HardDrive, title: '2. Google Drive', stepIndex: 2 },
    { id: 'SHEET', icon: FileSpreadsheet, title: '3. Google Sheets', stepIndex: 3 },
    { id: 'ENGINE', icon: Cpu, title: '4. Reconciliation', stepIndex: 4 },
  ];

  return (
    <aside
      aria-label="Synchronization Progress Pipeline"
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 pointer-events-none select-none"
    >
      {/* 1. Global Multi-Gradient Top Border Progress Indicator */}
      <div className="h-1.5 w-full bg-slate-950/90 overflow-hidden shadow-lg backdrop-blur-md">
        <div
          className={`h-full transition-all duration-300 ease-out relative ${
            isCompleted
              ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.9)]'
              : 'bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 shadow-[0_0_16px_rgba(99,102,241,0.9)]'
          }`}
          style={{ width: `${Math.max(4, Math.min(100, detailed.overallPercent))}%` }}
        >
          {/* Active Shimmer Glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_1.6s_infinite]" />
        </div>
      </div>

      {/* 2. Floating Stepper Card / Banner Container */}
      <div className="max-w-4xl mx-auto px-3 sm:px-6 pt-2">
        <div className="pointer-events-auto bg-slate-900/95 border border-indigo-500/40 rounded-3xl shadow-2xl backdrop-blur-xl p-3.5 sm:p-4 text-slate-100 transition-all duration-300 animate-in fade-in slide-in-from-top-3">
          {/* Header Row: Status, Elapsed Time, Overall Percentage & Expand Toggle */}
          <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                  isCompleted
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 text-emerald-300" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-indigo-300 animate-spin" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-bold tracking-tight text-white">
                    {isCompleted ? 'Synchronization Complete' : 'Synchronizing Google Workspace'}
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                      isCompleted
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                    }`}
                  >
                    {isCompleted ? 'Synced' : detailed.currentStepId}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 truncate max-w-xs sm:max-w-md">
                  {syncProgress?.title || 'Auditing certificates, Drive files & Sheets submissions...'}
                </p>
              </div>
            </div>

            {/* Right: Elapsed timer, percentage badge & collapse button */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 font-mono bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>{elapsedSeconds}s</span>
              </div>

              <div className="font-mono text-sm sm:text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
                {Math.round(detailed.overallPercent)}%
              </div>

              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                title={isExpanded ? 'Collapse progress view' : 'Expand full 4-step pipeline'}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {onCancelSync && !isCompleted && (
                <button
                  type="button"
                  onClick={onCancelSync}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                  title="Cancel synchronization"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Expanded 4-Step Pipeline Body */}
          {isExpanded && (
            <div className="pt-3 space-y-3">
              {/* Stepper Grid (4 Columns) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 relative">
                {stepsList.map((stepItem, index) => {
                  const step = detailed.steps[stepItem.id];
                  const Icon = stepItem.icon;
                  const isRunning = step.status === 'RUNNING';
                  const isDone = step.status === 'COMPLETED';
                  const isError = step.status === 'ERROR';

                  return (
                    <div
                      key={stepItem.id}
                      className={`relative p-2.5 rounded-2xl border transition-all ${
                        isRunning
                          ? 'bg-indigo-950/40 border-indigo-500/70 shadow-lg shadow-indigo-950/50'
                          : isDone
                          ? 'bg-emerald-950/20 border-emerald-500/30'
                          : isError
                          ? 'bg-rose-950/30 border-rose-500/40'
                          : 'bg-slate-950/50 border-slate-800 text-slate-500'
                      }`}
                    >
                      {/* Step Header */}
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div
                            className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                              isRunning
                                ? 'bg-indigo-600 text-white'
                                : isDone
                                ? 'bg-emerald-600 text-white'
                                : isError
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : isRunning ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <span>{stepItem.stepIndex}</span>
                            )}
                          </div>
                          <span
                            className={`text-xs font-bold truncate ${
                              isRunning ? 'text-white' : isDone ? 'text-emerald-300' : 'text-slate-400'
                            }`}
                          >
                            {step.shortName}
                          </span>
                        </div>

                        {/* Step Percent Badge */}
                        <span className="font-mono text-[10px] text-slate-400">
                          {isDone ? '100%' : isRunning ? `${Math.round(step.progressPercent)}%` : '0%'}
                        </span>
                      </div>

                      {/* Step Detail Text */}
                      <p className="text-[10px] text-slate-400 leading-snug line-clamp-2 min-h-[24px]">
                        {step.detail || (isRunning ? 'Processing...' : isDone ? 'Completed' : 'Pending')}
                      </p>

                      {/* Micro Progress Line for active step */}
                      <div className="mt-2 h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isDone
                              ? 'bg-emerald-500'
                              : isRunning
                              ? 'bg-indigo-500'
                              : isError
                              ? 'bg-rose-500'
                              : 'bg-transparent'
                          }`}
                          style={{
                            width: `${isDone ? 100 : isRunning ? Math.max(10, step.progressPercent) : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Long-Running Batch Operation Indicator */}
              {detailed.isBatchOperation && detailed.batchInfo && (
                <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400 shrink-0">
                      <Layers className="w-3.5 h-3.5 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">
                          Batch Operation {detailed.batchInfo.currentBatch} of {detailed.batchInfo.totalBatches}
                        </span>
                        <span className="font-mono text-[10px] text-indigo-400 font-bold px-1.5 py-0.2 bg-indigo-950 rounded border border-indigo-800">
                          {Math.round(detailed.batchInfo.batchPercent)}%
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate max-w-sm sm:max-w-lg">
                        {detailed.batchInfo.description}
                      </p>
                    </div>
                  </div>

                  {/* Batch Micro Progress Bar */}
                  <div className="w-full sm:w-36 h-2 bg-slate-900 border border-slate-800 rounded-full overflow-hidden shrink-0">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                      style={{ width: `${Math.max(5, Math.min(100, detailed.batchInfo.batchPercent))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
