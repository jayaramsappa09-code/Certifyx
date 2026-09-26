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
}) => {
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
      subtext: `${totalStudents > 0 ? Math.round((driveUploadedCount / totalStudents) * 100) : 0}% of class`,
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
      subtext: `${totalStudents > 0 ? Math.round((sheetUpdatedCount / totalStudents) * 100) : 0}% of class`,
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
      label: 'Completed',
      value: completedCount,
      subtext: 'Drive + Sheet + Submitted',
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
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
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
  );
};
