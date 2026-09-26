import React, { useState } from 'react';
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
  Award,
  Layers,
  FileText,
  SlidersHorizontal,
  Link,
  Check,
  Mail,
  History,
  AlertTriangle,
  MessageCircle,
} from 'lucide-react';
import { StudentStatusRecord, DriveCertificateFile } from '../types';
import { CertificateThumbnail } from './ManualReviewQueue';
import { getStudentActivityEvents } from '../utils/dateFilterUtils';
import { DiscrepancyProofCard } from './DiscrepancyProofCard';

interface StudentDetailModalProps {
  student: StudentStatusRecord | null;
  onClose: () => void;
  onToggleSubmitted: (rollNo: string, current: boolean) => void;
  onToggleDriveUploaded?: (rollNo: string, current: boolean) => void;
  onToggleSheetUpdated?: (rollNo: string, current: boolean) => void;
  onOpenEmailReminder?: (student: StudentStatusRecord) => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  onClose,
  onToggleSubmitted,
  onToggleDriveUploaded,
  onToggleSheetUpdated,
  onOpenEmailReminder,
}) => {
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopyLink = async (file: DriveCertificateFile) => {
    let link = '';
    if (file.webViewLink && file.webViewLink.startsWith('http')) {
      link = file.webViewLink;
    } else if (file.id) {
      link = `https://drive.google.com/file/d/${file.id}/view?usp=sharing`;
    }

    if (!link) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = link;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedFileId(file.id);
      setTimeout(() => setCopiedFileId(null), 2200);
    } catch (err) {
      console.error('Copy link failed:', err);
    }
  };

  if (!student) return null;

  const totalCerts = student.certificates.length || student.driveFiles.length;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-bold text-blue-400 bg-blue-950/80 border border-blue-800/80 px-2.5 py-0.5 rounded-lg">
                {student.rollNo}
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-800/60 flex items-center gap-1">
                <Layers className="w-3 h-3" />
                {totalCerts} Certificate{totalCerts === 1 ? '' : 's'} Tracked
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

          <div className="flex items-center gap-2">
            {onOpenEmailReminder && (student.overallStatus === 'NOT STARTED' || student.overallStatus === 'PENDING') && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEmailReminder(student);
                }}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition cursor-pointer"
                title="Send personalized email reminder to this student"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Send Reminder</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {/* Status Triad Summary Card with Manual Admin Overrides */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-blue-400" /> Admin Manual Status Controls (Click to Toggle)
              </span>
              <span className="text-slate-500 text-[11px]">Instant audit-logged update</span>
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Drive Uploaded Toggle */}
              <button
                type="button"
                onClick={() => onToggleDriveUploaded && onToggleDriveUploaded(student.rollNo, student.driveUploaded)}
                className={`flex items-center gap-3 p-3 rounded-xl transition text-left cursor-pointer border ${
                  student.driveUploaded
                    ? 'bg-emerald-950/40 border-emerald-800/70 hover:bg-emerald-950/60'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
                title="Click to manually toggle Drive Uploaded status"
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    student.driveUploaded
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  <HardDrive className="w-5 h-5" />
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">
                    1. Drive Uploaded
                  </div>
                  <div
                    className={`text-xs font-bold flex items-center gap-1 ${
                      student.driveUploaded ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {student.driveUploaded ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    {student.driveUploaded ? 'TRUE (Verified)' : 'FALSE (Pending)'}
                  </div>
                </div>
              </button>

              {/* Sheet Updated Toggle */}
              <button
                type="button"
                onClick={() => onToggleSheetUpdated && onToggleSheetUpdated(student.rollNo, student.sheetUpdated)}
                className={`flex items-center gap-3 p-3 rounded-xl transition text-left cursor-pointer border ${
                  student.sheetUpdated
                    ? 'bg-emerald-950/40 border-emerald-800/70 hover:bg-emerald-950/60'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
                title="Click to manually toggle Sheet Updated status"
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    student.sheetUpdated
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">
                    2. Sheet Updated
                  </div>
                  <div
                    className={`text-xs font-bold flex items-center gap-1 ${
                      student.sheetUpdated ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {student.sheetUpdated ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    {student.sheetUpdated ? 'TRUE (Matched)' : 'FALSE (Pending)'}
                  </div>
                </div>
              </button>

              {/* Submitted Toggle */}
              <button
                type="button"
                onClick={() => onToggleSubmitted(student.rollNo, student.submitted)}
                className={`flex items-center gap-3 p-3 rounded-xl transition text-left cursor-pointer border ${
                  student.submitted
                    ? 'bg-purple-950/40 border-purple-800/70 hover:bg-purple-950/60'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
                title="Click to manually toggle Submitted status"
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    student.submitted
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {student.submitted ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">
                    3. Submitted (Admin)
                  </div>
                  <div
                    className={`text-xs font-bold ${
                      student.submitted ? 'text-purple-400' : 'text-slate-400'
                    }`}
                  >
                    {student.submitted ? 'TRUE (Confirmed)' : 'FALSE (Pending)'}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Real Discrepancy & Proof Evidence Section */}
          <DiscrepancyProofCard student={student} onOpenEmailReminder={onOpenEmailReminder} />

          {/* Unified Certificate Tracker Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-400" />
                All Certificates Uploaded by this Student ({totalCerts})
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                Unified Student Portfolio
              </span>
            </div>

            {/* Individual Certificates List */}
            {student.driveFiles.length === 0 && student.sheetRecords.length === 0 ? (
              <div className="p-6 bg-slate-950/60 border border-slate-800 rounded-2xl text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  No certificate files or spreadsheet entries recorded yet for this student.
                </div>
                <div className="text-[11px] text-slate-600">
                  Ensure the student uploads files with their roll number ({student.rollNo}) into the Google Drive folder.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Drive Certificates */}
                {student.driveFiles.map((file, idx) => (
                  <div
                    key={file.id || idx}
                    className="p-4 bg-slate-950 border border-slate-800/90 rounded-2xl hover:border-slate-700 transition shadow-md flex flex-col sm:flex-row items-start sm:items-center gap-4"
                  >
                    <CertificateThumbnail file={file} size="md" />

                    <div className="flex-1 space-y-2 min-w-0 w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-950 text-blue-300 border border-blue-800 flex items-center gap-1.5">
                            <FileCheck className="w-3.5 h-3.5 text-blue-400" />
                            #{idx + 1}: {file.detectedCertTitle || file.detectedCertType || 'Certificate'}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-900/60 text-blue-200 border border-blue-700">
                            {file.detectedCertType || 'Certificate'}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                            Drive Verified
                          </span>
                          {file.matchMethod && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                              {file.matchMethod === 'CUSTOM_REGEX'
                                ? '⚡ Custom Regex'
                                : file.matchMethod === 'STUDENT_NAME'
                                ? '👤 Name Match'
                                : file.matchMethod === 'PARENT_FOLDER'
                                ? '📁 Folder Inherited'
                                : file.matchMethod === 'SHEET_URL_LINK'
                                ? '🔗 Sheet Link'
                                : 'Regex Match'}
                            </span>
                          )}
                          {file.parentFolderName && file.parentFolderName !== 'Root Folder' && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                              📁 {file.parentFolderName}
                            </span>
                          )}
                          {file.isDuplicate && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                              Duplicate
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {file && (file.webViewLink || file.id) && (
                            <button
                              type="button"
                              onClick={() => handleCopyLink(file)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 border text-xs font-semibold rounded-xl transition cursor-pointer ${
                                copiedFileId === file.id
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700 shadow-sm'
                                  : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700'
                              }`}
                              title="Copy direct shareable Google Drive link to clipboard"
                            >
                              {copiedFileId === file.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Copied Link!</span>
                                </>
                              ) : (
                                <>
                                  <Link className="w-3.5 h-3.5 text-blue-400" />
                                  <span>Copy Public Link</span>
                                </>
                              )}
                            </button>
                          )}

                          {file.webViewLink && file.webViewLink !== '#' && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/25 text-blue-400 border border-blue-500/30 text-xs font-medium rounded-xl transition shrink-0"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open in Drive</span>
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-slate-300 font-mono break-all bg-slate-900/60 p-2 rounded-lg border border-slate-800/50 flex items-center justify-between gap-2">
                        <span>{file.name}</span>
                        {file.mimeType && (
                          <span className="text-[10px] text-slate-500 uppercase shrink-0 font-sans">
                            {file.mimeType.split('/').pop()}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                        <div className="flex items-center gap-3">
                          {file.createdTime && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Uploaded: {new Date(file.createdTime).toLocaleDateString()}
                            </span>
                          )}
                          <span>File ID: {file.id.slice(0, 12)}...</span>
                        </div>
                        <span className="text-emerald-400 font-medium">Class Roster Match</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Additional Spreadsheet Records */}
                {student.sheetRecords.map((rec, idx) => (
                  <div
                    key={`sheet_${idx}`}
                    className="p-4 bg-slate-950 border border-slate-800/90 rounded-2xl space-y-2.5 shadow-md"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1.5">
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          Sheet Record (Row #{rec.rowIndex})
                        </span>
                        {rec.certificateType && (
                          <span className="text-slate-300 font-medium">
                            {rec.certificateType}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-emerald-400 font-mono">
                        Noted in Google Sheet
                      </span>
                    </div>

                    {/* Raw columns details */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                      {Object.entries(rec.rawValues).map(([key, val]) => (
                        <div key={key} className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/40">
                          <span className="text-[10px] text-slate-500 block uppercase truncate">
                            {key}
                          </span>
                          <span className="text-slate-200 font-mono text-[11px] truncate block mt-0.5">
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

          {/* Chronological Submission & Verification Activity Timeline */}
          {(() => {
            const events = getStudentActivityEvents(student);
            if (events.length === 0) return null;
            return (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <History className="w-4 h-4 text-cyan-400" />
                  <span>Submission &amp; Activity Timeline ({events.length} events recorded)</span>
                </h3>
                <div className="space-y-2 bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                  {events.map((ev, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 text-xs pb-2.5 last:pb-0 border-b border-slate-800/60 last:border-b-0"
                    >
                      <span
                        className={`mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${
                          ev.source === 'SHEET'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : ev.source === 'DRIVE'
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                            : 'bg-purple-950 text-purple-300 border border-purple-800'
                        }`}
                      >
                        {ev.source === 'SHEET' ? 'Sheet' : ev.source === 'DRIVE' ? 'Drive' : 'Status'}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-200">{ev.title}</p>
                        <p className="text-[11px] text-slate-400">{ev.detail}</p>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 shrink-0">
                        {ev.date.toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Roll No: <span className="text-slate-300 font-mono">{student.rollNo}</span> • Verified for 67-Student Class Roster
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
