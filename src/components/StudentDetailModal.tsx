import React from 'react';
import {
  X,
  ExternalLink,
  CheckCircle2,
  XCircle,
  FileCheck,
  Calendar,
  HardDrive,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { StudentStatusRecord } from '../types';

interface StudentDetailModalProps {
  student: StudentStatusRecord | null;
  onClose: () => void;
  onToggleSubmitted: (rollNo: string, current: boolean) => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  onClose,
  onToggleSubmitted,
}) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!student) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-blue-400 bg-blue-950/80 border border-blue-800/80 px-2.5 py-0.5 rounded-lg">
                {student.rollNo}
              </span>
              {student.overallStatus === 'COMPLETED' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" /> COMPLETED
                </span>
              ) : student.overallStatus === 'PENDING' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-700">
                  <Clock className="w-3.5 h-3.5" /> PENDING
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-950 text-slate-400 border border-slate-800">
                  NOT STARTED
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white mt-1.5 tracking-tight">
              {student.name}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {/* Status Triad Summary Card */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Drive Uploaded */}
            <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/50">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  student.driveUploaded
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                <HardDrive className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">
                  Drive Uploaded
                </div>
                <div
                  className={`text-xs font-bold ${
                    student.driveUploaded ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  {student.driveUploaded ? 'TRUE (Verified)' : 'FALSE (Pending)'}
                </div>
              </div>
            </div>

            {/* Sheet Updated */}
            <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/50">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  student.sheetUpdated
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">
                  Sheet Updated
                </div>
                <div
                  className={`text-xs font-bold ${
                    student.sheetUpdated ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  {student.sheetUpdated ? 'TRUE (Matched)' : 'FALSE (Pending)'}
                </div>
              </div>
            </div>

            {/* Submitted (Interactive Admin Control) */}
            <button
              onClick={() => onToggleSubmitted(student.rollNo, student.submitted)}
              className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/50 hover:bg-slate-800/80 transition text-left cursor-pointer border border-transparent hover:border-slate-700"
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  student.submitted
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {student.submitted ? (
                  <CheckSquare className="w-5 h-5" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
              </div>
              <div className="overflow-hidden">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">
                  Submitted (Admin)
                </div>
                <div
                  className={`text-xs font-bold ${
                    student.submitted ? 'text-purple-400' : 'text-slate-400'
                  }`}
                >
                  {student.submitted ? 'TRUE (Confirmed)' : 'Click to Mark'}
                </div>
              </div>
            </button>
          </div>

          {/* Section 1: Certificates in Drive */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-blue-400" />
                Certificates in Google Drive
              </h3>
              <span className="text-xs text-slate-400">
                {student.driveFiles.length} file(s) found
              </span>
            </div>

            {student.driveFiles.length === 0 ? (
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-center text-xs text-slate-500">
                No certificate files detected in Google Drive folder for this student.
              </div>
            ) : (
              <div className="space-y-2">
                {student.driveFiles.map((file, idx) => (
                  <div
                    key={file.id || idx}
                    className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-950 text-blue-300 border border-blue-800">
                          {file.detectedCertType || 'Certificate'}
                        </span>
                        {file.isDuplicate && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                            Possible Duplicate
                          </span>
                        )}
                        <span className="text-xs font-mono text-slate-300 break-all">
                          {file.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-3">
                        {file.createdTime && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(file.createdTime).toLocaleDateString()}
                          </span>
                        )}
                        {file.mimeType && (
                          <span className="uppercase text-[10px]">
                            {file.mimeType.split('/').pop()}
                          </span>
                        )}
                      </div>
                    </div>

                    {file.webViewLink && file.webViewLink !== '#' && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-medium rounded-lg transition shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in Google Drive</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Spreadsheet Records */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Spreadsheet Records
              </h3>
              <span className="text-xs text-slate-400">
                {student.sheetRecords.length} row(s) matched
              </span>
            </div>

            {student.sheetRecords.length === 0 ? (
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-center text-xs text-slate-500">
                No matching roll number found in the selected Google Sheet.
              </div>
            ) : (
              <div className="space-y-2">
                {student.sheetRecords.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">
                        Row #{rec.rowIndex}
                      </span>
                      {rec.certificateType && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-950 text-emerald-300 border border-emerald-800">
                          {rec.certificateType}
                        </span>
                      )}
                    </div>

                    {/* Raw columns dump */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-900">
                      {Object.entries(rec.rawValues).map(([key, val]) => (
                        <div key={key} className="bg-slate-900/60 p-1.5 rounded">
                          <span className="text-[10px] text-slate-500 block uppercase truncate">
                            {key}
                          </span>
                          <span className="text-slate-300 font-mono text-[11px] truncate block">
                            {val || '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Source-of-truth: Google Drive & Google Sheets
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
