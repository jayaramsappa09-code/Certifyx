import React from 'react';
import { AlertTriangle, ArrowRight, Database, HardDrive, ShieldCheck } from 'lucide-react';
import { DriveCertificateFile, ReconciliationAnalysis, SheetRowRecord, StudentStatusRecord } from '../types';

interface DataMismatchSectionProps {
  students: StudentStatusRecord[];
  sheetRows?: SheetRowRecord[];
  driveFiles?: DriveCertificateFile[];
  initialAnalysis?: ReconciliationAnalysis | null;
  onFilterTableByMismatch?: (filterKey: string) => void;
  onOpenStudentDetails?: (student: StudentStatusRecord) => void;
  onOpenEmailReminder?: (student: StudentStatusRecord) => void;
  onOpenDataHealthReport?: () => void;
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const DataMismatchSection: React.FC<DataMismatchSectionProps> = ({
  students,
  sheetRows = [],
  driveFiles = [],
  initialAnalysis,
  onFilterTableByMismatch,
  onOpenDataHealthReport,
}) => {
  const totalStudents = students.length;
  const pendingStudents = students.filter((student) => student.overallStatus !== 'COMPLETED').length;
  const driveCount = driveFiles.length;
  const sheetCount = sheetRows.length;
  const mismatchCount = students.filter(
    (student) =>
      student.countMismatch?.hasMismatch ||
      student.driveUploaded !== student.sheetUpdated ||
      (student.driveFiles?.length || 0) !== (student.sheetRecords?.length || 0)
  ).length;

  const summary = initialAnalysis?.summary ?? {
    matchedRosterCount: 0,
    rosterMissingSheetCount: 0,
    sheetOutsideRosterCount: 0,
    outsideClassQuarantinedCount: 0,
    strictRosterEnforced: true,
    driveMissingSheetCount: 0,
    sheetMissingDriveCount: 0,
    quantityMismatchCount: 0,
    totalGapsCount: 0,
    integrityScore: 0,
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Data Mismatch & Reconciliation</h3>
            <p className="text-[11px] text-slate-400">Drive, sheet, and roster integrity check</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onFilterTableByMismatch?.('COUNT_MISMATCH')}
            className="px-2.5 py-1.5 rounded-lg border border-orange-700 bg-orange-950/60 text-orange-200 text-[11px] font-semibold hover:bg-orange-900/70 transition cursor-pointer"
          >
            Mismatches: {mismatchCount}
          </button>
          <button
            type="button"
            onClick={() => onOpenDataHealthReport?.()}
            className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 text-[11px] font-semibold hover:bg-slate-700 transition cursor-pointer"
          >
            Open Data Health
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400">
            <span>Integrity</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{summary.integrityScore}%</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400">
            <span>Pending</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{pendingStudents}</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400">
            <span>Drive Files</span>
            <HardDrive className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{driveCount}</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400">
            <span>Sheet Rows</span>
            <Database className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{sheetCount}</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
        <span className="px-2 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
          {totalStudents} roster students
        </span>
        <span className="px-2 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
          {summary.totalGapsCount} total gaps
        </span>
        <span className="px-2 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
          {summary.quantityMismatchCount} quantity mismatches
        </span>
      </div>
    </div>
  );
};
