import React, { useState } from 'react';
import {
  AlertTriangle,
  HardDrive,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Calendar,
  FileText,
  ShieldAlert,
  Search,
  Eye,
  ChevronDown,
  ChevronUp,
  Link,
  Check,
} from 'lucide-react';
import { StudentStatusRecord, DriveCertificateFile, SheetRowRecord } from '../types';

interface DiscrepancyProofCardProps {
  student: StudentStatusRecord;
  onOpenEmailReminder?: (student: StudentStatusRecord) => void;
  compact?: boolean;
}

export const DiscrepancyProofCard: React.FC<DiscrepancyProofCardProps> = ({
  student,
  onOpenEmailReminder,
  compact = false,
}) => {
  const [showRawJson, setShowRawJson] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  const driveCount = student.driveFiles?.length || 0;
  const sheetCount = student.sheetRecords?.length || 0;
  const hasMismatch = student.countMismatch?.hasMismatch || (driveCount !== sheetCount) || (student.driveUploaded !== student.sheetUpdated);

  const handleCopyLink = (file: DriveCertificateFile) => {
    const link = file.webViewLink || (file.id ? `https://drive.google.com/file/d/${file.id}/view` : '');
    if (link) {
      navigator.clipboard.writeText(link);
      setCopiedLinkId(file.id);
      setTimeout(() => setCopiedLinkId(null), 2000);
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-0">
      {/* Top Audit Verdict Banner */}
      <div
        className={`p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          hasMismatch ? 'bg-amber-950/40 border-l-4 border-l-amber-500' : 'bg-emerald-950/40 border-l-4 border-l-emerald-500'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
              hasMismatch
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
            }`}
          >
            {hasMismatch ? <ShieldAlert className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Real Discrepancy Proof Audit: {student.rollNo} ({student.name})
              </h4>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  hasMismatch
                    ? 'bg-amber-900/80 text-amber-200 border border-amber-700'
                    : 'bg-emerald-900/80 text-emerald-200 border border-emerald-700'
                }`}
              >
                {hasMismatch ? 'DISCREPANCY PROOF VERIFIED' : '100% MATCH VERIFIED'}
              </span>
            </div>

            <p className="text-xs text-slate-300 mt-1 font-sans leading-relaxed">
              {student.countMismatch?.description ||
                (driveCount === 0 && sheetCount === 0
                  ? 'PROOF EVIDENCE: No records in Drive or Sheet (Not Started).'
                  : !student.driveUploaded
                  ? `PROOF EVIDENCE: Sheet record exists (${sheetCount} entry), but 0 files found in Drive.`
                  : !student.sheetUpdated
                  ? `PROOF EVIDENCE: Drive file exists (${driveCount} file), but 0 entries recorded in Sheet.`
                  : 'All Drive files match Google Sheet responses.')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowRawJson(!showRawJson)}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-medium flex items-center gap-1 transition cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-blue-400" />
            <span>{showRawJson ? 'Hide Raw Audit' : 'Show Raw Audit Proof'}</span>
            {showRawJson ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {onOpenEmailReminder && hasMismatch && (
            <button
              type="button"
              onClick={() => onOpenEmailReminder(student)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition cursor-pointer"
            >
              <span>Remind Student</span>
            </button>
          )}
        </div>
      </div>

      {/* Side-by-Side Proof Evidence Grid */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950">
        {/* Left Box: Google Drive Real Proof */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-cyan-400" />
              Google Drive Files Proof ({driveCount})
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                driveCount > 0
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-red-950 text-red-300 border border-red-800'
              }`}
            >
              {driveCount > 0 ? `${driveCount} File(s) Located` : '0 Files Found'}
            </span>
          </div>

          {driveCount === 0 ? (
            <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg text-xs text-red-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>PROOF GAP: No Google Drive File Found</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Drive scanner checked shared folder for PDF files with Roll No <code className="text-amber-300 font-mono">{student.rollNo}</code> or student name <code className="text-amber-300 font-mono">{student.name}</code>. Zero files matched.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {student.driveFiles.map((file, idx) => (
                <div
                  key={file.id || idx}
                  className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-1 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-white font-semibold truncate max-w-[200px]">
                      📄 {file.name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(file)}
                        className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] cursor-pointer"
                        title="Copy Drive link"
                      >
                        {copiedLinkId === file.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Link className="w-3 h-3" />}
                      </button>
                      {file.webViewLink && file.webViewLink !== '#' && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 text-[10px] rounded font-mono flex items-center gap-1"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          <span>View</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                    <span>
                      Type: {file.detectedCertType || 'Certificate'}
                    </span>
                    {file.createdTime && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5 text-slate-500" />
                        {new Date(file.createdTime).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Box: Google Sheet Form Response Real Proof */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Google Sheet Entries Proof ({sheetCount})
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                sheetCount > 0
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-red-950 text-red-300 border border-red-800'
              }`}
            >
              {sheetCount > 0 ? `${sheetCount} Entry/Entries` : '0 Form Responses'}
            </span>
          </div>

          {sheetCount === 0 ? (
            <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg text-xs text-red-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>PROOF GAP: No Google Form Submission Found</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Sheet scanner scanned connected spreadsheet for Roll No <code className="text-amber-300 font-mono">{student.rollNo}</code>. Zero matching rows recorded in the response form sheet.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {student.sheetRecords.map((rec, idx) => (
                <div
                  key={`sheet_rec_${idx}`}
                  className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-1.5 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-emerald-300 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/80">
                      Sheet Row #{rec.rowIndex}
                    </span>
                    {rec.submissionTimestamp && (
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5 text-slate-500" />
                        {new Date(rec.submissionTimestamp).toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-300 space-y-0.5">
                    <div>
                      <strong className="text-slate-400">Cert Type:</strong>{' '}
                      <span className="text-amber-300 font-medium">{rec.certificateType || 'Logged'}</span>
                    </div>
                    {rec.email && (
                      <div>
                        <strong className="text-slate-400">Submitted Email:</strong>{' '}
                        <span className="font-mono text-slate-300">{rec.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Raw Form Response & File Audit Evidence JSON Toggle */}
      {showRawJson && (
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 space-y-2 text-xs">
          <span className="font-bold text-amber-300 font-mono text-[11px] uppercase tracking-wider block">
            🔍 Raw Audit Proof Json Data Log ({student.rollNo})
          </span>
          <pre className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[10px] text-slate-300 font-mono max-h-48 overflow-y-auto leading-relaxed">
            {JSON.stringify(
              {
                rollNo: student.rollNo,
                name: student.name,
                overallStatus: student.overallStatus,
                driveUploaded: student.driveUploaded,
                sheetUpdated: student.sheetUpdated,
                countMismatch: student.countMismatch,
                driveFilesProof: student.driveFiles.map((f) => ({
                  id: f.id,
                  name: f.name,
                  createdTime: f.createdTime,
                  detectedCertType: f.detectedCertType,
                  webViewLink: f.webViewLink,
                })),
                sheetRecordsProof: student.sheetRecords.map((r) => ({
                  rowIndex: r.rowIndex,
                  submissionTimestamp: r.submissionTimestamp,
                  certificateType: r.certificateType,
                  rawValues: r.rawValues,
                })),
              },
              null,
              2
            )}
          </pre>
        </div>
      )}
    </div>
  );
};
