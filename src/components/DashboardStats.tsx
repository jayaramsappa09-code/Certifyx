import React from 'react';
import {
  Users,
  Award,
  HardDriveUpload,
  FileCheck,
  CheckSquare,
  CheckCircle2,
  Clock,
  HelpCircle,
  UserX,
  Sparkles,
  Mail,
  Zap,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';

interface DashboardStatsProps {
  totalStudents: number; // 67
  certificatesFound: number;
  driveUploadedCount: number;
  sheetUpdatedCount: number;
  submittedCount: number;
  completedCount: number;
  pendingCount: number;
  unidentifiedCount: number;
  outsideClassCount: number;
  activeFilter: string;
  onSelectFilter: (filter: string) => void;
  onOpenEmailReminder?: () => void;
  onOpenAutoScheduler?: () => void;
  notStartedCount?: number;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  totalStudents,
  certificatesFound,
  driveUploadedCount,
  sheetUpdatedCount,
  submittedCount,
  completedCount,
  pendingCount,
  unidentifiedCount,
  outsideClassCount,
  activeFilter,
  onSelectFilter,
  onOpenEmailReminder,
  onOpenAutoScheduler,
  notStartedCount,
}) => {
  const safeTotal = totalStudents > 0 ? totalStudents : 67;
  const completedPct = Math.round((completedCount / safeTotal) * 1000) / 10;
  const drivePct = Math.round((driveUploadedCount / safeTotal) * 100);
  const sheetPct = Math.round((sheetUpdatedCount / safeTotal) * 100);
  const submittedPct = Math.round((submittedCount / safeTotal) * 100);
  const remainingDefaulters = safeTotal - completedCount;

  // Calculate high-fidelity precise percentages for concentric progress rings
  const resolvedNotStartedCount = typeof notStartedCount === 'number'
    ? notStartedCount
    : Math.max(0, safeTotal - completedCount - pendingCount);

  const completedPctPrecise = (completedCount / safeTotal) * 100;
  const pendingPctPrecise = (pendingCount / safeTotal) * 100;
  const notStartedPctPrecise = (resolvedNotStartedCount / safeTotal) * 100;

  const cards = [
    {
      id: 'ALL',
      label: 'Total Students',
      value: totalStudents,
      subtext: 'Fixed class roster',
      icon: Users,
      color: 'blue',
      border: 'border-blue-500/20',
      activeBorder: 'border-blue-500 ring-2 ring-blue-500/40',
      bg: 'bg-blue-950/20',
      iconColor: 'text-blue-400',
    },
    {
      id: 'CERT_FOUND',
      label: 'Certificates Found',
      value: certificatesFound,
      subtext: 'Total valid matches',
      icon: Award,
      color: 'indigo',
      border: 'border-indigo-500/20',
      activeBorder: 'border-indigo-500 ring-2 ring-indigo-500/40',
      bg: 'bg-indigo-950/20',
      iconColor: 'text-indigo-400',
    },
    {
      id: 'DRIVE_UPLOADED',
      label: 'Drive Uploaded',
      value: driveUploadedCount,
      subtext: `${drivePct}% of class`,
      icon: HardDriveUpload,
      color: 'cyan',
      border: 'border-cyan-500/20',
      activeBorder: 'border-cyan-500 ring-2 ring-cyan-500/40',
      bg: 'bg-cyan-950/20',
      iconColor: 'text-cyan-400',
    },
    {
      id: 'SHEET_UPDATED',
      label: 'Spreadsheet Updated',
      value: sheetUpdatedCount,
      subtext: `${sheetPct}% of class`,
      icon: FileCheck,
      color: 'sky',
      border: 'border-sky-500/20',
      activeBorder: 'border-sky-500 ring-2 ring-sky-500/40',
      bg: 'bg-sky-950/20',
      iconColor: 'text-sky-400',
    },
    {
      id: 'SUBMITTED',
      label: 'Submitted',
      value: submittedCount,
      subtext: 'Admin confirmed',
      icon: CheckSquare,
      color: 'purple',
      border: 'border-purple-500/20',
      activeBorder: 'border-purple-500 ring-2 ring-purple-500/40',
      bg: 'bg-purple-950/20',
      iconColor: 'text-purple-400',
    },
    {
      id: 'COMPLETED',
      label: 'Verified',
      value: completedCount,
      subtext: 'All 3 ticked',
      icon: CheckCircle2,
      color: 'emerald',
      border: 'border-emerald-500/30',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/40',
      bg: 'bg-emerald-950/25',
      iconColor: 'text-emerald-400',
    },
    {
      id: 'PENDING',
      label: 'Pending',
      value: pendingCount,
      subtext: 'Incomplete statuses',
      icon: Clock,
      color: 'amber',
      border: 'border-amber-500/20',
      activeBorder: 'border-amber-500 ring-2 ring-amber-500/40',
      bg: 'bg-amber-950/20',
      iconColor: 'text-amber-400',
    },
    {
      id: 'UNIDENTIFIED',
      label: 'Unidentified Files',
      value: unidentifiedCount,
      subtext: 'Missing roll number',
      icon: HelpCircle,
      color: 'rose',
      border: 'border-rose-500/20',
      activeBorder: 'border-rose-500 ring-2 ring-rose-500/40',
      bg: 'bg-rose-950/20',
      iconColor: 'text-rose-400',
    },
    {
      id: 'OUTSIDE_CLASS',
      label: 'Outside Class',
      value: outsideClassCount,
      subtext: 'Ignored from roster',
      icon: UserX,
      color: 'slate',
      border: 'border-slate-700/50',
      activeBorder: 'border-slate-400 ring-2 ring-slate-400/40',
      bg: 'bg-slate-900/60',
      iconColor: 'text-slate-400',
    },
  ].filter((c) => {
    if (c.id === 'UNIDENTIFIED') return unidentifiedCount > 0;
    if (c.id === 'OUTSIDE_CLASS') return outsideClassCount > 0;
    return true;
  });

  const gridColsClass =
    cards.length === 7
      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 xl:grid-cols-7'
      : cards.length === 8
      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8'
      : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9';

  return (
    <div className="space-y-3.5">
      {/* 1. HERO 3-WAY REQUIREMENT COMPLETION SUMMARY CARD */}
      <div className="relative overflow-hidden p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/70 border border-emerald-500/30 shadow-2xl">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left Column: Big Percentage & Title */}
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono uppercase bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                3-Way Requirement Milestone
              </span>
              <span className="text-xs text-slate-400">
                (Drive Uploaded + Sheet Updated + Submitted)
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center gap-2">
                <span>{completedPct}%</span>
                <span className="text-lg sm:text-xl font-bold text-emerald-400 font-sans">
                  Completed
                </span>
              </h2>
              <span className="text-sm font-semibold text-slate-400 font-mono">
                ({completedCount} of {safeTotal} Students)
              </span>
            </div>

            <p className="text-xs text-slate-300/90 leading-relaxed">
              {completedCount === safeTotal ? (
                <span className="text-emerald-300 font-semibold">
                  🎉 100% Class Completion achieved! All {safeTotal} students have fulfilled Drive uploads, Sheet records, and Administrator verification.
                </span>
              ) : (
                <span>
                  <strong>{remainingDefaulters}</strong> student{remainingDefaulters > 1 ? 's' : ''} currently have pending requirement{remainingDefaulters > 1 ? 's' : ''}. Complete all 3 channels to achieve 100% compliance.
                </span>
              )}
            </p>
          </div>

          {/* Right Column: Visual Progress Indicator & Quick Actions */}
          <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-5 shrink-0">
            {/* Compliance Progress Rings Component */}
            <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl flex items-center gap-4.5 shadow-inner max-w-sm sm:max-w-md w-full">
              <div className="relative shrink-0 flex items-center justify-center">
                <svg className="w-24 h-24 sm:w-26 sm:h-26 transform -rotate-90" viewBox="0 0 100 100">
                  {/* Outer Ring: Completed */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-slate-850"
                    strokeWidth="6"
                    strokeOpacity="0.3"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-emerald-500 transition-all duration-1000 ease-out"
                    strokeWidth="6"
                    strokeDasharray="251.3"
                    strokeDashoffset={251.3 - (completedPctPrecise / 100) * 251.3}
                    strokeLinecap="round"
                    fill="none"
                  />

                  {/* Middle Ring: Pending */}
                  <circle
                    cx="50"
                    cy="50"
                    r="30"
                    className="stroke-slate-850"
                    strokeWidth="6"
                    strokeOpacity="0.3"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="30"
                    className="stroke-amber-500 transition-all duration-1000 ease-out"
                    strokeWidth="6"
                    strokeDasharray="188.5"
                    strokeDashoffset={188.5 - (pendingPctPrecise / 100) * 188.5}
                    strokeLinecap="round"
                    fill="none"
                  />

                  {/* Inner Ring: Not Started */}
                  <circle
                    cx="50"
                    cy="50"
                    r="20"
                    className="stroke-slate-850"
                    strokeWidth="6"
                    strokeOpacity="0.3"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="20"
                    className="stroke-rose-500 transition-all duration-1000 ease-out"
                    strokeWidth="6"
                    strokeDasharray="125.7"
                    strokeDashoffset={125.7 - (notStartedPctPrecise / 100) * 125.7}
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                {/* Overall Class Target Centered percentage */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[13px] font-mono font-bold text-white leading-none">
                    {Math.round(completedPctPrecise)}%
                  </span>
                  <span className="text-[8px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">Verified</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 py-1">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Compliance Rings
                </div>
                
                {/* Completed Legend */}
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <div className="text-xs flex items-center gap-1.5">
                    <span className="text-slate-300 font-medium">Verified:</span>
                    <span className="font-mono font-bold text-white">{completedCount}</span>
                    <span className="text-slate-500 font-mono text-[10px]">({completedPctPrecise.toFixed(1)}%)</span>
                  </div>
                </div>

                {/* Pending Legend */}
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <div className="text-xs flex items-center gap-1.5">
                    <span className="text-slate-300 font-medium">Pending:</span>
                    <span className="font-mono font-bold text-white">{pendingCount}</span>
                    <span className="text-slate-500 font-mono text-[10px]">({pendingPctPrecise.toFixed(1)}%)</span>
                  </div>
                </div>

                {/* Not Started Legend */}
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <div className="text-xs flex items-center gap-1.5">
                    <span className="text-slate-300 font-medium">Not Started:</span>
                    <span className="font-mono font-bold text-white">{resolvedNotStartedCount}</span>
                    <span className="text-slate-500 font-mono text-[10px]">({notStartedPctPrecise.toFixed(1)}%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-col gap-2">
              {onOpenEmailReminder && remainingDefaulters > 0 && (
                <button
                  type="button"
                  onClick={onOpenEmailReminder}
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Remind {remainingDefaulters} Defaulters</span>
                </button>
              )}

              {onOpenAutoScheduler && (
                <button
                  type="button"
                  onClick={onOpenAutoScheduler}
                  className="px-3.5 py-2 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/70 text-indigo-200 text-xs font-semibold rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Auto-Remind Scheduler</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Multi-Segmented Visual Progress Bar */}
        <div className="mt-5 space-y-2 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Progress Breakdown:</span>
            <span>{completedCount} of {safeTotal} fully complete ({completedPct}%)</span>
          </div>

          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800 flex gap-0.5">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700 ease-out shadow-sm"
              style={{ width: `${Math.min(100, completedPct)}%` }}
              title={`Fully Completed: ${completedPct}%`}
            />
            {completedPct < 100 && (
              <div
                className="h-full bg-slate-800/80 rounded-full transition-all duration-700"
                style={{ width: `${100 - completedPct}%` }}
                title={`Pending: ${100 - completedPct}%`}
              />
            )}
          </div>

          {/* 3-Way Requirement Milestone Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
            {/* 1. Drive */}
            <button
              type="button"
              onClick={() => onSelectFilter('DRIVE_UPLOADED')}
              className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 text-left transition cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-1.5">
                <HardDriveUpload className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-slate-300 font-medium">1. Drive Files</span>
              </div>
              <span className="font-mono font-bold text-cyan-300">
                {driveUploadedCount}/{safeTotal} ({drivePct}%)
              </span>
            </button>

            {/* 2. Sheet */}
            <button
              type="button"
              onClick={() => onSelectFilter('SHEET_UPDATED')}
              className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-sky-500/40 text-left transition cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-slate-300 font-medium">2. Sheet Rows</span>
              </div>
              <span className="font-mono font-bold text-sky-300">
                {sheetUpdatedCount}/{safeTotal} ({sheetPct}%)
              </span>
            </button>

            {/* 3. Submitted */}
            <button
              type="button"
              onClick={() => onSelectFilter('SUBMITTED')}
              className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-purple-500/40 text-left transition cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-slate-300 font-medium">3. Submitted</span>
              </div>
              <span className="font-mono font-bold text-purple-300">
                {submittedCount}/{safeTotal} ({submittedPct}%)
              </span>
            </button>

            {/* 4. Full 3-Way Completed */}
            <button
              type="button"
              onClick={() => onSelectFilter('COMPLETED')}
              className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-700/60 hover:border-emerald-500 text-left transition cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-200 font-bold">3-Way Verified</span>
              </div>
              <span className="font-mono font-bold text-emerald-300">
                {completedCount}/{safeTotal} ({completedPct}%)
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. dynamic columns METRIC GRID */}
      <div className={`grid ${gridColsClass} gap-3`}>
        {cards.map((c) => {
          const Icon = c.icon;
          const isActive = activeFilter === c.id;
          return (
            <button
              type="button"
              key={c.id}
              onClick={() => onSelectFilter(c.id)}
              className={`p-3.5 rounded-xl border text-left transition relative cursor-pointer group flex flex-col justify-between touch-manipulation ${
                c.bg
              } ${isActive ? c.activeBorder : c.border} hover:border-slate-600`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate pr-1">
                  {c.label}
                </span>
                <Icon className={`w-4 h-4 ${c.iconColor} shrink-0`} />
              </div>

              <div>
                <div className="text-2xl font-bold tracking-tight text-white">
                  {c.value}
                </div>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">
                  {c.subtext}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};


