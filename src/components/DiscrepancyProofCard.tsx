import React from 'react';
import { AlertTriangle, CheckCircle2, Mail } from 'lucide-react';
import { StudentStatusRecord } from '../types';

interface DiscrepancyProofCardProps {
  student: StudentStatusRecord;
  onOpenEmailReminder?: (student: StudentStatusRecord) => void;
}

export const DiscrepancyProofCard: React.FC<DiscrepancyProofCardProps> = ({
  student,
  onOpenEmailReminder,
}) => {
  const driveCount = student.driveFiles?.length || 0;
  const sheetCount = student.sheetRecords?.length || 0;
  const mismatch = student.countMismatch?.hasMismatch || driveCount !== sheetCount;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-inner">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center border ${
            mismatch ? 'bg-amber-950/60 text-amber-300 border-amber-800' : 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
          }`}>
            {mismatch ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Discrepancy proof</div>
            <div className="text-sm font-bold text-white">
              {mismatch ? 'Mismatch detected' : 'No material discrepancy'}
            </div>
            <div className="text-[11px] text-slate-400">
              Drive files: {driveCount} • Sheet entries: {sheetCount}
            </div>
          </div>
        </div>

        {onOpenEmailReminder && (student.overallStatus === 'NOT STARTED' || student.overallStatus === 'PENDING') && (
          <button
            type="button"
            onClick={() => onOpenEmailReminder(student)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-[11px] font-bold rounded-xl transition cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5" />
            Reminder
          </button>
        )}
      </div>
    </div>
  );
};
