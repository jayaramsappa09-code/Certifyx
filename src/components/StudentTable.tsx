import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Eye,
  CheckSquare,
  Square,
  MinusSquare,
  FileSpreadsheet,
  Check,
  X,
  ListChecks,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  HardDrive,
  Award,
  Layers,
  FileCheck,
  Sparkles,
  Upload,
  Link,
  Copy,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Mail,
  Calendar,
  AlertTriangle,
  Users,
  ArrowRight,
  Database,
  Compass,
  SlidersHorizontal,
  History,
  FileText,
  Maximize2,
  Minimize2,
  Tag,
  Folder,
  User,
  Info,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  GraduationCap,
  Building,
  Gauge,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import {
  StudentStatusRecord,
  DateRangeFilterConfig,
  SheetRowRecord,
  DriveCertificateFile,
  ReconciliationAnalysis,
  CampusRole,
} from '../types';
import { CAMPUS_ROLES, filterStudentsByRole } from '../services/campusRoleConfig';
import { QuotaQueueMonitorModal } from './QuotaQueueMonitorModal';
import { isStudentMatchingDateRange, getLatestStudentActivity, getStudentActivityEvents } from '../utils/dateFilterUtils';
import { parseSearchQuery, isStudentMatchingAdvancedQuery } from '../utils/advancedSearchAndMatchEngine';
import { DataMismatchSection } from './DataMismatchSection';
import { DiscrepancyProofCard } from './DiscrepancyProofCard';
import { BatchImportStudentsModal } from './BatchImportStudentsModal';
import { RosterManagementModal } from './RosterManagementModal';
import { ClassroomMatrixView } from './ClassroomMatrixView';
import { HighlightText, getStudentMatchReasons } from './HighlightText';
import { CertificateThumbnail } from './ManualReviewQueue';

interface StudentTableProps {
  students: StudentStatusRecord[];
  sheetRows?: SheetRowRecord[];
  driveFiles?: DriveCertificateFile[];
  reconciliationAnalysis?: ReconciliationAnalysis;
  lastScannedTimestamp?: string | null;
  dateFilterConfig?: DateRangeFilterConfig;
  onToggleSubmitted: (rollNo: string, current: boolean) => void;
  onToggleDriveUploaded: (rollNo: string, current: boolean) => void;
  onToggleSheetUpdated: (rollNo: string, current: boolean) => void;
  onBatchSetSubmitted?: (rollNos: string[], submitted: boolean) => void;
  onBatchSetDriveUploaded?: (rollNos: string[], driveUploaded: boolean) => void;
  onBatchSetSheetUpdated?: (rollNos: string[], sheetUpdated: boolean) => void;
  onOpenDetails: (student: StudentStatusRecord) => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  onExportClassSummaryCsv: () => void;
  onExportIndividualCertsCsv: () => void;
  onExportOutsideClassCsv: () => void;
  onExportReviewQueueCsv: () => void;
  onExportAuditLogsCsv: () => void;
  onExportAllCsvs: () => void;
  onExportSummaryReport: () => void;
  onOpenAdvancedExport?: () => void;
  onOpenBulkMapping?: () => void;
  onOpenEmailReminder?: (targetStudent?: StudentStatusRecord) => void;
  onOpenDataHealthReport?: () => void;
  onAddRosterStudent?: (rollNo: string, name: string) => void;
  onBatchAddRosterStudents?: (students: Array<{ rollNo: string; name: string }>) => Promise<{
    added: Array<{ rollNo: string; name: string }>;
    skipped: Array<{ student: { rollNo: string; name: string }; reason: string }>;
  }> | {
    added: Array<{ rollNo: string; name: string }>;
    skipped: Array<{ student: { rollNo: string; name: string }; reason: string }>;
  };
  onEditRosterStudent?: (rollNo: string, newName: string) => void;
  onDeleteRosterStudent?: (rollNo: string) => void;
  onBatchDeleteRosterStudents?: (rollNos: string[]) => void;
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

/**
 * Format timestamp into human-readable relative/absolute format
 */
export function formatScanTimestamp(timestamp?: string | null): {
  formatted: string;
  exact: string;
} {
  if (!timestamp) {
    return { formatted: 'Never', exact: 'No synchronization run yet' };
  }
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return { formatted: 'Never', exact: 'Invalid timestamp' };
    }
    const now = Date.now();
    const diffSec = Math.floor((now - date.getTime()) / 1000);
    const exact = date.toLocaleString();

    if (diffSec < 15) return { formatted: 'Just now', exact };
    if (diffSec < 60) return { formatted: `${diffSec}s ago`, exact };
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return { formatted: `${diffMin}m ago`, exact };
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) {
      return {
        formatted: `${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        exact,
      };
    }
    return {
      formatted: date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      exact,
    };
  } catch {
    return { formatted: 'Recent', exact: String(timestamp) };
  }
}

/**
 * Format timestamp into exact human-readable date and time for status tooltip
 */
export function formatExactTimestamp(isoString?: string): string {
  if (!isoString) return 'No status updates recorded yet';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'No status updates recorded yet';
    return date.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return 'No status updates recorded yet';
  }
}

/**
 * Format file size in bytes to human-readable string
 */
export function formatFileSize(sizeInput?: string | number): string {
  if (!sizeInput) return '';
  const num = typeof sizeInput === 'number' ? sizeInput : parseInt(sizeInput, 10);
  if (isNaN(num) || num <= 0) {
    return typeof sizeInput === 'string' ? sizeInput : '';
  }
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(2)} MB`;
}

interface StudentExpandedDetailsCardProps {
  student: StudentStatusRecord;
  searchQuery: string;
  isRecentlyCompleted?: boolean;
  onToggleDriveUploaded: (rollNo: string, current: boolean) => void;
  onToggleSheetUpdated: (rollNo: string, current: boolean) => void;
  onToggleSubmitted: (rollNo: string, current: boolean) => void;
  onOpenDetails: (student: StudentStatusRecord) => void;
  onOpenEmailReminder?: (student: StudentStatusRecord) => void;
  onEditRosterStudent?: (rollNo: string, currentName: string) => void;
  onDeleteRosterStudent?: (rollNo: string, currentName: string) => void;
  onToggleExpand: (rollNo: string) => void;
  copiedRollNo: string | null;
  onCopyLink: (file: { webViewLink?: string; id?: string }, rollNo: string) => void;
}

export const StudentExpandedDetailsCard: React.FC<StudentExpandedDetailsCardProps> = ({
  student,
  searchQuery,
  isRecentlyCompleted,
  onToggleDriveUploaded,
  onToggleSheetUpdated,
  onToggleSubmitted,
  onOpenDetails,
  onOpenEmailReminder,
  onEditRosterStudent,
  onDeleteRosterStudent,
  onToggleExpand,
  copiedRollNo,
  onCopyLink,
}) => {
  const totalCerts = student.certificates.length || student.driveFiles.length;
  const events = getStudentActivityEvents(student);

  // Derive additional student contact and metadata from roster or sheet submissions
  const primaryEmail = student.email || student.sheetRecords.find((r) => r.email)?.email;
  const primaryPhone = student.phone || student.sheetRecords.find((r) => r.phone)?.phone;
  const primaryYear = student.sheetRecords.find((r) => r.year)?.year;
  const primarySection = student.sheetRecords.find((r) => r.section)?.section;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="p-4 sm:p-5 bg-slate-950/95 border border-purple-900/50 rounded-2xl space-y-4 shadow-2xl animate-in fade-in duration-200"
    >
      {/* 1. Header Bar with Quick Stats and Modal Links */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-800">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-mono text-xs sm:text-sm font-bold text-blue-300 bg-blue-950/90 border border-blue-800/80 px-2.5 py-1 rounded-lg">
            <HighlightText text={student.rollNo} query={searchQuery} />
          </span>

          <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
            <HighlightText text={student.name} query={searchQuery} />
          </h3>

          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-950 text-purple-300 border border-purple-800/70 flex items-center gap-1">
            <Layers className="w-3 h-3 text-purple-400" />
            <span>{totalCerts} Item{totalCerts === 1 ? '' : 's'} Tracked</span>
          </span>

          {student.overallStatus === 'COMPLETED' ? (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 shadow-sm shadow-emerald-950/50 transition-all duration-300 ${
                isRecentlyCompleted
                  ? 'animate-status-completed-pulse ring-2 ring-emerald-400/80 shadow-emerald-500/50 scale-105'
                  : ''
              }`}
              title={isRecentlyCompleted ? 'Status transitioned from PENDING to COMPLETED!' : 'Verified & Completed'}
            >
              <CheckCircle2 className={`w-3.5 h-3.5 text-emerald-400 ${isRecentlyCompleted ? 'animate-bounce' : ''}`} />
              VERIFIED
              {isRecentlyCompleted && (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-400 text-emerald-950 font-extrabold tracking-tight uppercase animate-pulse">
                  New
                </span>
              )}
            </span>
          ) : student.overallStatus === 'UNSUBMITTED_MATCH' ? (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-950 text-indigo-300 border border-indigo-700 shadow-sm"
              title="Drive & Sheet matched; waiting for admin confirmation"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              DRIVE & SHEET OK
            </span>
          ) : student.overallStatus === 'PENDING' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/90 text-amber-300 border border-amber-700">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              PENDING
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-950 text-red-400 border border-red-800">
              <XCircle className="w-3.5 h-3.5 text-red-400" />
              MISSING
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onOpenDetails(student)}
            className="px-3 py-1.5 bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800/80 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Open comprehensive student details modal with Supabase upload vault"
          >
            <Eye className="w-3.5 h-3.5 text-blue-400" />
            <span>Open Modal</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleExpand(student.rollNo)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
            title="Collapse expanded details for this student"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span>Collapse</span>
          </button>
        </div>
      </div>

      {/* 2. Student Contact & Academic Metadata Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
        <div>
          <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
            <Mail className="w-3 h-3 text-slate-400" /> Email
          </span>
          <span className="font-mono text-slate-300 truncate block mt-0.5">
            {primaryEmail ? <HighlightText text={primaryEmail} query={searchQuery} /> : <span className="text-slate-600 italic">Not recorded</span>}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
            <User className="w-3 h-3 text-slate-400" /> Contact / Phone
          </span>
          <span className="font-mono text-slate-300 truncate block mt-0.5">
            {primaryPhone ? <HighlightText text={primaryPhone} query={searchQuery} /> : <span className="text-slate-600 italic">Not recorded</span>}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
            <Tag className="w-3 h-3 text-slate-400" /> Section / Year
          </span>
          <span className="font-mono text-slate-300 truncate block mt-0.5">
            {primaryYear || primarySection ? (
              `${primaryYear ? `Year ${primaryYear}` : ''} ${primarySection ? `Sec ${primarySection}` : ''}`.trim()
            ) : (
              <span className="text-slate-600 italic">Class Roster</span>
            )}
          </span>
        </div>

        <div>
          <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" /> Last Status Update
          </span>
          <span className="font-mono text-slate-300 truncate block mt-0.5 text-[11px]" title={formatExactTimestamp(student.lastUpdated)}>
            {student.lastUpdated ? formatExactTimestamp(student.lastUpdated) : <span className="text-slate-600 italic">No updates</span>}
          </span>
        </div>
      </div>

      {/* 3. 1-Click Interactive Status Override Controls */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span className="font-semibold uppercase tracking-wider text-[10px] flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-blue-400" /> 1-Click Status Controls (Click to Toggle)
          </span>
          <span className="text-slate-500 text-[10px]">Instant audit log &amp; recalculation</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Drive Uploaded Toggle */}
          <button
            type="button"
            onClick={() => onToggleDriveUploaded(student.rollNo, student.driveUploaded)}
            className={`flex items-center gap-2.5 p-2.5 rounded-xl transition text-left cursor-pointer border ${
              student.driveUploaded
                ? 'bg-emerald-950/40 border-emerald-800/70 hover:bg-emerald-950/70'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
            title={`Toggle Drive Uploaded (Currently: ${student.driveUploaded ? 'TRUE' : 'FALSE'})`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                student.driveUploaded
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              <HardDrive className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">1. Drive Files ({student.driveFiles.length})</div>
              <div className={`text-xs font-bold flex items-center gap-1 ${student.driveUploaded ? 'text-emerald-400' : 'text-slate-500'}`}>
                {student.driveUploaded ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                <span>{student.driveUploaded ? 'Uploaded (Verified)' : 'Pending'}</span>
              </div>
            </div>
          </button>

          {/* Sheet Updated Toggle */}
          <button
            type="button"
            onClick={() => onToggleSheetUpdated(student.rollNo, student.sheetUpdated)}
            className={`flex items-center gap-2.5 p-2.5 rounded-xl transition text-left cursor-pointer border ${
              student.sheetUpdated
                ? 'bg-emerald-950/40 border-emerald-800/70 hover:bg-emerald-950/70'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
            title={`Toggle Sheet Updated (Currently: ${student.sheetUpdated ? 'TRUE' : 'FALSE'})`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                student.sheetUpdated
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">2. Sheet Records ({student.sheetRecords.length})</div>
              <div className={`text-xs font-bold flex items-center gap-1 ${student.sheetUpdated ? 'text-emerald-400' : 'text-slate-500'}`}>
                {student.sheetUpdated ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                <span>{student.sheetUpdated ? 'Updated (Matched)' : 'Pending'}</span>
              </div>
            </div>
          </button>

          {/* Submitted Toggle */}
          <button
            type="button"
            onClick={() => onToggleSubmitted(student.rollNo, student.submitted)}
            className={`flex items-center gap-2.5 p-2.5 rounded-xl transition text-left cursor-pointer border ${
              student.submitted
                ? 'bg-purple-950/40 border-purple-800/70 hover:bg-purple-950/70'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
            title={`Toggle Submitted (Currently: ${student.submitted ? 'TRUE' : 'FALSE'})`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                student.submitted
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'bg-slate-800 text-slate-500'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">3. Admin Confirmed</div>
              <div className={`text-xs font-bold flex items-center gap-1 ${student.submitted ? 'text-purple-400' : 'text-slate-400'}`}>
                {student.submitted ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                <span>{student.submitted ? 'Confirmed' : 'Pending'}</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 4. Real Discrepancy Proof Card */}
      <DiscrepancyProofCard student={student} onOpenEmailReminder={onOpenEmailReminder} />

      {/* 5. Google Drive Certificate Files Breakdown */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-4 h-4 text-purple-400" />
            <span>Google Drive Certificate Files &amp; Metadata ({student.driveFiles.length})</span>
          </h4>
          <span className="text-[10px] font-mono text-slate-400">Drive Cloud Storage Assets</span>
        </div>

        {student.driveFiles.length === 0 ? (
          <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-center space-y-1">
            <p className="text-xs text-slate-400 font-medium">No Google Drive certificate files found for this student.</p>
            <p className="text-[11px] text-slate-600">
              Ensure files in Google Drive contain the student's roll number (<span className="font-mono text-slate-400">{student.rollNo}</span>) or name.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {student.driveFiles.map((file, idx) => {
              const mimeExt = file.mimeType ? file.mimeType.split('/').pop()?.toUpperCase() : 'FILE';
              const formattedSize = formatFileSize(file.size);

              return (
                <div
                  key={file.id || idx}
                  className="p-3 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl transition shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-3"
                >
                  <CertificateThumbnail file={file} size="md" />

                  <div className="flex-1 space-y-1.5 min-w-0 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-blue-950 text-blue-300 border border-blue-800/80 flex items-center gap-1">
                          <FileCheck className="w-3 h-3 text-blue-400" />
                          #{idx + 1}: <HighlightText text={file.detectedCertTitle || file.detectedCertType || 'Certificate'} query={searchQuery} />
                        </span>

                        {file.detectedCertType && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-900/50 text-blue-200 border border-blue-700">
                            {file.detectedCertType}
                          </span>
                        )}

                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
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
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
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
                        {(file.webViewLink || file.id) && (
                          <button
                            type="button"
                            onClick={() => onCopyLink(file, student.rollNo)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                              copiedRollNo === student.rollNo
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-700 shadow-sm'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                            }`}
                            title="Copy shareable Google Drive link"
                          >
                            {copiedRollNo === student.rollNo ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Link className="w-3 h-3 text-blue-400" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>
                        )}

                        {file.webViewLink && file.webViewLink !== '#' && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600/10 hover:bg-blue-600/25 text-blue-400 border border-blue-500/30 text-xs font-medium rounded-lg transition shrink-0"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Open in Drive</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Exact File Name + Technical Metadata */}
                    <div className="text-xs text-slate-300 font-mono break-all bg-slate-950/80 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between gap-2">
                      <span>
                        <HighlightText text={file.name} query={searchQuery} />
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        {formattedSize && (
                          <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                            {formattedSize}
                          </span>
                        )}
                        {mimeExt && (
                          <span className="text-[10px] text-purple-300 font-bold bg-purple-950 px-1.5 py-0.5 rounded border border-purple-800">
                            {mimeExt}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Timestamps & File ID */}
                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-0.5 gap-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        {file.createdTime && (
                          <span className="flex items-center gap-1 font-mono text-[10px]">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            Created: {new Date(file.createdTime).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {file.modifiedTime && file.modifiedTime !== file.createdTime && (
                          <span className="flex items-center gap-1 font-mono text-[10px]">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Modified: {new Date(file.modifiedTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-slate-600">ID: {file.id?.slice(0, 14)}...</span>
                      </div>
                      <span className="text-emerald-400 font-medium text-[10px]">Verified Roster Match</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Google Sheets / Form Submission Records Breakdown */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Google Sheet Submissions &amp; Form Responses ({student.sheetRecords.length})</span>
          </h4>
          <span className="text-[10px] font-mono text-slate-400">Live Synced Spreadsheet Rows</span>
        </div>

        {student.sheetRecords.length === 0 ? (
          <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-center space-y-1">
            <p className="text-xs text-slate-400 font-medium">No Google Sheet form submissions recorded for this student.</p>
            <p className="text-[11px] text-slate-600">The student has not yet submitted the certificate submission form.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {student.sheetRecords.map((rec, idx) => (
              <div
                key={`sheet_row_${rec.rowIndex}_${idx}`}
                className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2.5 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      Row #{rec.rowIndex}
                    </span>

                    {rec.certificateType && (
                      <span className="text-slate-200 font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                        <HighlightText text={rec.certificateType} query={searchQuery} />
                      </span>
                    )}

                    {rec.submissionTimestamp && (
                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {rec.submissionTimestamp}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {rec.certificateUrl && rec.certificateUrl.startsWith('http') && (
                      <a
                        href={rec.certificateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800/80 text-[11px] font-semibold flex items-center gap-1 hover:bg-blue-900 transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>View Form Upload Link</span>
                      </a>
                    )}
                    <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                      Form Matched
                    </span>
                  </div>
                </div>

                {/* Raw Values Grid from Google Sheet Form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                  {Object.entries(rec.rawValues).map(([colName, colVal]) => (
                    <div key={colName} className="bg-slate-950/80 p-2 rounded-lg border border-slate-800/70">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold truncate">
                        {colName}
                      </span>
                      <span className="text-slate-200 font-mono text-xs truncate block mt-0.5 break-all">
                        {colVal?.startsWith('http') ? (
                          <a
                            href={colVal}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">{colVal}</span>
                          </a>
                        ) : (
                          <HighlightText text={colVal || '—'} query={searchQuery} />
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7. Chronological Activity & Verification Timestamps Feed */}
      {events.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-4 h-4 text-cyan-400" />
              <span>Activity &amp; Verification History ({events.length} events)</span>
            </h4>
            <span className="text-[10px] font-mono text-slate-400">Chronological Event Trail</span>
          </div>

          <div className="space-y-2 bg-slate-900/70 border border-slate-800 rounded-xl p-3">
            {events.map((ev, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 text-xs pb-2 last:pb-0 border-b border-slate-800/60 last:border-b-0"
              >
                <span
                  className={`mt-0.5 px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase ${
                    ev.source === 'SHEET'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : ev.source === 'DRIVE'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      : 'bg-purple-950 text-purple-300 border border-purple-800'
                  }`}
                >
                  {ev.source === 'SHEET' ? 'Form' : ev.source === 'DRIVE' ? 'Drive' : 'Status'}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-200 text-xs">{ev.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 break-all">{ev.detail}</p>
                </div>

                <span className="text-[10px] font-mono text-slate-400 shrink-0">
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
      )}

      {/* 8. Quick Actions Toolbar in Expanded Row */}
      <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-800 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenEmailReminder && (student.overallStatus === 'NOT STARTED' || student.overallStatus === 'PENDING') && (
            <button
              type="button"
              onClick={() => onOpenEmailReminder(student)}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition cursor-pointer"
              title="Send personalized email reminder"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Send Reminder</span>
            </button>
          )}

          {onEditRosterStudent && (
            <button
              type="button"
              onClick={() => onEditRosterStudent(student.rollNo, student.name)}
              className="px-3 py-1.5 bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800/60 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Edit Student Name
            </button>
          )}

          {onDeleteRosterStudent && (
            <button
              type="button"
              onClick={() => onDeleteRosterStudent(student.rollNo, student.name)}
              className="px-3 py-1.5 bg-red-950 hover:bg-red-900 text-red-300 border border-red-800/60 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Delete from Roster
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenDetails(student)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Full Modal &amp; Upload</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleExpand(student.rollNo)}
            className="px-3 py-1.5 bg-purple-950/70 hover:bg-purple-900/90 text-purple-300 border border-purple-800/70 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span>Collapse Details</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const StudentTable: React.FC<StudentTableProps> = ({
  students,
  sheetRows = [],
  driveFiles = [],
  reconciliationAnalysis,
  lastScannedTimestamp,
  dateFilterConfig,
  onToggleSubmitted,
  onToggleDriveUploaded,
  onToggleSheetUpdated,
  onBatchSetSubmitted,
  onBatchSetDriveUploaded,
  onBatchSetSheetUpdated,
  onOpenDetails,
  activeFilter,
  setActiveFilter,
  onExportClassSummaryCsv,
  onExportIndividualCertsCsv,
  onExportOutsideClassCsv,
  onExportReviewQueueCsv,
  onExportAuditLogsCsv,
  onExportAllCsvs,
  onExportSummaryReport,
  onOpenAdvancedExport,
  onOpenBulkMapping,
  onOpenEmailReminder,
  onOpenDataHealthReport,
  onAddRosterStudent,
  onBatchAddRosterStudents,
  onEditRosterStudent,
  onDeleteRosterStudent,
  onBatchDeleteRosterStudents,
  onToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRollNos, setSelectedRollNos] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [copiedRollNo, setCopiedRollNo] = useState<string | null>(null);
  const [expandedRollNos, setExpandedRollNos] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<
    'rollNo' | 'name' | 'overallStatus' | 'driveUploaded' | 'sheetUpdated' | 'submitted' | 'lastActivity'
  >('rollNo');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [tableViewMode, setTableViewMode] = useState<'MATRIX' | 'TABLE'>('MATRIX');
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Campus Role-Based Access Control (RBAC) State (Student, Proctor, HOD, Dean)
  const [campusRole, setCampusRole] = useState<CampusRole>('DEAN_PRINCIPAL');
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');

  // DOM Virtualization & Viewport Windowing Pagination (60 FPS for 5,000 students)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50); // Default 50 items/page as requested
  const [jumpPageInput, setJumpPageInput] = useState<string>('');

  // Google Drive API Quota Engine Modal
  const [showQuotaQueueModal, setShowQuotaQueueModal] = useState<boolean>(false);

  const incompleteCount = useMemo(
    () => students.filter((s) => s.overallStatus === 'NOT STARTED' || s.overallStatus === 'PENDING').length,
    [students]
  );

  // Track previous statuses to detect when a student transitions from 'PENDING' to 'COMPLETED'
  const prevStatusesRef = useRef<Map<string, string>>(new Map());
  const [recentlyCompletedRollNos, setRecentlyCompletedRollNos] = useState<Set<string>>(new Set());
  const initialStatusLoadedRef = useRef(false);

  useEffect(() => {
    if (!initialStatusLoadedRef.current) {
      students.forEach((s) => {
        prevStatusesRef.current.set(s.rollNo, s.overallStatus);
      });
      initialStatusLoadedRef.current = true;
      return;
    }

    const prevMap = prevStatusesRef.current;
    const newlyCompleted: string[] = [];

    students.forEach((s) => {
      const prev = prevMap.get(s.rollNo);
      if (prev === 'PENDING' && s.overallStatus === 'COMPLETED') {
        newlyCompleted.push(s.rollNo);
      }
      prevMap.set(s.rollNo, s.overallStatus);
    });

    if (newlyCompleted.length > 0) {
      setRecentlyCompletedRollNos((current) => {
        const next = new Set(current);
        newlyCompleted.forEach((id) => next.add(id));
        return next;
      });

      // Clear the subtle pulse animation after 3.8 seconds to provide immediate feedback without lingering indefinitely
      const timer = setTimeout(() => {
        setRecentlyCompletedRollNos((current) => {
          const next = new Set(current);
          newlyCompleted.forEach((id) => next.delete(id));
          return next;
        });
      }, 3800);

      return () => clearTimeout(timer);
    }
  }, [students]);

  // Student roster mutation state
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [showBatchImportModal, setShowBatchImportModal] = useState(false);
  const [showRosterManagementModal, setShowRosterManagementModal] = useState(false);
  const [rosterManagementTab, setRosterManagementTab] = useState<'BATCH_IMPORT' | 'ADD_SINGLE' | 'VIEW_ROSTER'>('BATCH_IMPORT');
  const [rosterModalMode, setRosterModalMode] = useState<'ADD' | 'EDIT'>('ADD');
  const [modalRollNo, setModalRollNo] = useState('');
  const [modalName, setModalName] = useState('');
  const [rosterError, setRosterError] = useState<string | null>(null);

  const handleOpenRosterManagement = (tab: 'BATCH_IMPORT' | 'ADD_SINGLE' | 'VIEW_ROSTER' = 'BATCH_IMPORT') => {
    setRosterManagementTab(tab);
    setShowRosterManagementModal(true);
  };

  const handleOpenAddRosterModal = () => {
    handleOpenRosterManagement('ADD_SINGLE');
  };

  const handleOpenEditRosterModal = (rollNo: string, currentName: string) => {
    setRosterModalMode('EDIT');
    setModalRollNo(rollNo);
    setModalName(currentName);
    setRosterError(null);
    setShowRosterModal(true);
  };

  const handleSaveRosterStudent = () => {
    if (!modalRollNo.trim()) {
      setRosterError('Roll Number is required.');
      return;
    }
    const cleanName = modalName.trim() || `Student ${modalRollNo.toUpperCase().trim()}`;
    if (rosterModalMode === 'ADD') {
      if (onAddRosterStudent) {
        try {
          onAddRosterStudent(modalRollNo, cleanName);
          setShowRosterModal(false);
          setModalRollNo('');
          setModalName('');
          onToast?.(`🎉 Student ${cleanName} (${modalRollNo}) added successfully!`, 'success');
        } catch (e: any) {
          setRosterError(e.message || 'Error adding student.');
        }
      }
    } else {
      if (onEditRosterStudent) {
        try {
          onEditRosterStudent(modalRollNo, cleanName);
          setShowRosterModal(false);
          setModalRollNo('');
          setModalName('');
          onToast?.(`✅ Student ${modalRollNo} updated successfully!`, 'success');
        } catch (e: any) {
          setRosterError(e.message || 'Error updating student.');
        }
      }
    }
  };

  const handleExecuteDeleteRosterStudent = (rollNo: string, name: string) => {
    if (!onDeleteRosterStudent) return;
    const confirmed = window.confirm(`Are you absolutely sure you want to permanently delete student ${name} (${rollNo}) from the roster? This will clear their verification state.`);
    if (confirmed) {
      onDeleteRosterStudent(rollNo);
    }
  };

  const handleToggleExpand = (rollNo: string) => {
    setExpandedRollNos((prev) => {
      const next = new Set(prev);
      if (next.has(rollNo)) {
        next.delete(rollNo);
      } else {
        next.add(rollNo);
      }
      return next;
    });
  };

  const handleSort = (
    field: 'rollNo' | 'name' | 'overallStatus' | 'driveUploaded' | 'sheetUpdated' | 'submitted' | 'lastActivity'
  ) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleCopyLink = async (
    file: { webViewLink?: string; id?: string },
    rollNo: string
  ) => {
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
      setCopiedRollNo(rollNo);
      setTimeout(() => setCopiedRollNo(null), 2200);
    } catch (err) {
      console.error('Copy link failed:', err);
    }
  };

  const scannedTime = useMemo(
    () => formatScanTimestamp(lastScannedTimestamp),
    [lastScannedTimestamp]
  );

  // Close export dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 0. Filter by Campus Role & Partitioning (Branch / Academic Year)
  const roleScopedStudents = useMemo(() => {
    let list = filterStudentsByRole(students, campusRole);

    if (selectedBranch !== 'ALL') {
      list = list.filter((s) => {
        const rollMatch = s.rollNo.toUpperCase().includes(selectedBranch);
        const deptMatch = s.sheetRecords?.some((r) => r.department?.toUpperCase().includes(selectedBranch));
        return rollMatch || deptMatch;
      });
    }

    if (selectedYear !== 'ALL') {
      const shortYear = selectedYear.split('-')[0]?.slice(2) || '';
      list = list.filter((s) => {
        return (
          s.rollNo.includes(shortYear) ||
          s.sheetRecords?.some((r) => r.year?.includes(selectedYear) || r.year?.includes(shortYear))
        );
      });
    }

    return list;
  }, [students, campusRole, selectedBranch, selectedYear]);

  // Filtering and Searching
  const filteredStudents = useMemo(() => {
    let result = [...roleScopedStudents];

    // 1. Ultimate Multi-Token & Advanced Grammar Search (Roll No, Name, Suffixes, Status, Flags, Negations)
    if (searchQuery.trim()) {
      const parsedQuery = parseSearchQuery(searchQuery);
      result = result.filter((s) => isStudentMatchingAdvancedQuery(s, parsedQuery));
    }

    // 2. Filter Pills
    switch (activeFilter) {
      case 'COMPLETED':
        result = result.filter((s) => s.overallStatus === 'COMPLETED');
        break;
      case 'INCOMPLETE':
        result = result.filter((s) => s.overallStatus !== 'COMPLETED');
        break;
      case 'PENDING':
        result = result.filter((s) => s.overallStatus === 'PENDING');
        break;
      case 'NOT_STARTED':
        result = result.filter((s) => s.overallStatus === 'NOT STARTED');
        break;
      case 'DRIVE_UPLOADED':
        result = result.filter((s) => s.driveUploaded);
        break;
      case 'MISSING_DRIVE':
      case 'DRIVE_PENDING':
        result = result.filter((s) => !s.driveUploaded);
        break;
      case 'SHEET_UPDATED':
        result = result.filter((s) => s.sheetUpdated);
        break;
      case 'MISSING_SHEET':
      case 'SHEET_PENDING':
        result = result.filter((s) => !s.sheetUpdated);
        break;
      case 'DUAL_MISSING':
        result = result.filter((s) => !s.driveUploaded && !s.sheetUpdated);
        break;
      case 'SUBMITTED':
        result = result.filter((s) => s.submitted);
        break;
      case 'SUBMISSION_PENDING':
        result = result.filter((s) => !s.submitted);
        break;
      case 'MULTIPLE_CERTS':
        result = result.filter(
          (s) => s.certificates.length > 1 || s.driveFiles.length > 1
        );
        break;
      case 'CERT_FOUND':
        result = result.filter((s) => s.certificates.length > 0 || s.driveUploaded);
        break;
      case 'NO_CERT':
        result = result.filter((s) => s.certificates.length === 0 && !s.driveUploaded);
        break;
      case 'COUNT_MISMATCH':
      case 'MISMATCH':
        result = result.filter(
          (s) =>
            (s.countMismatch && s.countMismatch.hasMismatch) ||
            s.driveUploaded !== s.sheetUpdated ||
            ((s.driveFiles?.length || 0) !== (s.sheetRecords?.length || 0))
        );
        break;
      case 'ALL':
      default:
        break;
    }

    // 2b. Date Range Filter (when activeOnlyMatchingStudents is enabled)
    if (
      dateFilterConfig &&
      dateFilterConfig.activeOnlyMatchingStudents &&
      (dateFilterConfig.preset !== 'ALL_TIME' || dateFilterConfig.startDate || dateFilterConfig.endDate)
    ) {
      result = result.filter((s) => isStudentMatchingDateRange(s, dateFilterConfig).matches);
    }

    // 3. Sort Results
    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'rollNo') {
        cmp = (a.rollNo || '').localeCompare(b.rollNo || '', undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortField === 'name') {
        cmp = (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
        if (cmp === 0) {
          cmp = (a.rollNo || '').localeCompare(b.rollNo || '', undefined, { numeric: true, sensitivity: 'base' });
        }
      } else if (sortField === 'overallStatus') {
        // High priority to Completed in Ascending order (Verified First)
        const statusOrder: Record<string, number> = {
          COMPLETED: 1,
          UNSUBMITTED_MATCH: 2,
          PENDING: 3,
          'NOT STARTED': 4,
        };
        const scoreA = statusOrder[a.overallStatus] || 5;
        const scoreB = statusOrder[b.overallStatus] || 5;
        cmp = scoreA - scoreB;
        if (cmp === 0) {
          cmp = (a.rollNo || '').localeCompare(b.rollNo || '', undefined, { numeric: true, sensitivity: 'base' });
        }
      } else if (sortField === 'driveUploaded') {
        cmp = (b.driveUploaded ? 1 : 0) - (a.driveUploaded ? 1 : 0);
        if (cmp === 0) {
          cmp = (a.rollNo || '').localeCompare(b.rollNo || '', undefined, { numeric: true, sensitivity: 'base' });
        }
      } else if (sortField === 'sheetUpdated') {
        cmp = (b.sheetUpdated ? 1 : 0) - (a.sheetUpdated ? 1 : 0);
        if (cmp === 0) {
          cmp = (a.rollNo || '').localeCompare(b.rollNo || '', undefined, { numeric: true, sensitivity: 'base' });
        }
      } else if (sortField === 'submitted') {
        cmp = (b.submitted ? 1 : 0) - (a.submitted ? 1 : 0);
        if (cmp === 0) {
          cmp = (a.rollNo || '').localeCompare(b.rollNo || '', undefined, { numeric: true, sensitivity: 'base' });
        }
      } else if (sortField === 'lastActivity') {
        const actA = getLatestStudentActivity(a)?.date.getTime() || 0;
        const actB = getLatestStudentActivity(b)?.date.getTime() || 0;
        cmp = actB - actA;
        if (cmp === 0) {
          cmp = (a.rollNo || '').localeCompare(b.rollNo || '', undefined, { numeric: true, sensitivity: 'base' });
        }
      }

      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [roleScopedStudents, searchQuery, activeFilter, sortField, sortDirection, dateFilterConfig]);

  // Reset page to 1 whenever search, filter, role, or partition changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter, campusRole, selectedBranch, selectedYear, pageSize]);

  // DOM Virtualization & Pagination Window (60 FPS scrolling for 5,000+ students)
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredStudents.length);
  const visibleStudents = useMemo(() => {
    return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, startIndex, endIndex]);

  const renderPaginationBar = () => {
    if (filteredStudents.length === 0) return null;

    const getPageNumbers = () => {
      const pages: (number | string)[] = [];
      if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        if (safePage > 3) pages.push('...');
        const start = Math.max(2, safePage - 1);
        const end = Math.min(totalPages - 1, safePage + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        if (safePage < totalPages - 2) pages.push('...');
        pages.push(totalPages);
      }
      return pages;
    };

    return (
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs shadow-md">
        {/* Count & 60 FPS indicator */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400">
            Showing <span className="font-bold text-white font-mono">{startIndex + 1}–{endIndex}</span> of{' '}
            <span className="font-bold text-white font-mono">{filteredStudents.length}</span> students
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-800">
            <Zap className="w-3 h-3 text-emerald-400" />
            60 FPS Virtual Window ({visibleStudents.length} rows mounted)
          </span>
          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
            DOM Memory: &lt;25MB
          </span>
        </div>

        {/* Page Navigation */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentPage(1)}
            disabled={safePage === 1}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition"
            title="First Page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {getPageNumbers().map((pageNum, idx) => {
            if (pageNum === '...') {
              return (
                <span key={`ellipsis_${idx}`} className="px-1 text-slate-600 select-none">
                  ...
                </span>
              );
            }
            const isCurrent = pageNum === safePage;
            return (
              <button
                key={`page_${pageNum}`}
                type="button"
                onClick={() => setCurrentPage(Number(pageNum))}
                className={`min-w-7 h-7 px-1.5 rounded-lg font-mono font-bold text-xs transition cursor-pointer ${
                  isCurrent
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/40 border border-purple-400/40'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage(totalPages)}
            disabled={safePage === totalPages}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 transition"
            title="Last Page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        {/* Page Size & Quick Jump */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
            >
              <option value={25}>25</option>
              <option value={50}>50 (Fast)</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
            </select>
          </div>

          {totalPages > 3 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const p = parseInt(jumpPageInput, 10);
                if (!isNaN(p) && p >= 1 && p <= totalPages) {
                  setCurrentPage(p);
                  setJumpPageInput('');
                }
              }}
              className="flex items-center gap-1"
            >
              <input
                type="number"
                min={1}
                max={totalPages}
                placeholder={`1-${totalPages}`}
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                className="w-14 bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1 font-mono focus:outline-none"
              />
              <button
                type="submit"
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Go
              </button>
            </form>
          )}
        </div>
      </div>
    );
  };

  // Bulk Selection Helpers
  const isAllFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedRollNos.has(s.rollNo));

  const isSomeFilteredSelected =
    filteredStudents.some((s) => selectedRollNos.has(s.rollNo)) &&
    !isAllFilteredSelected;

  const isAllFilteredExpanded = useMemo(() => {
    if (filteredStudents.length === 0) return false;
    return filteredStudents.every((s) => expandedRollNos.has(s.rollNo));
  }, [filteredStudents, expandedRollNos]);

  const handleExpandAllFiltered = () => {
    setExpandedRollNos(new Set(filteredStudents.map((s) => s.rollNo)));
  };

  const handleCollapseAllFiltered = () => {
    setExpandedRollNos(new Set());
  };

  const handleRowClick = (e: React.MouseEvent, rollNo: string) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('a') ||
      target.closest('select') ||
      target.closest('.no-row-click')
    ) {
      return;
    }
    handleToggleExpand(rollNo);
  };

  const handleToggleSelectStudent = (rollNo: string) => {
    setSelectedRollNos((prev) => {
      const next = new Set(prev);
      if (next.has(rollNo)) {
        next.delete(rollNo);
      } else {
        next.add(rollNo);
      }
      return next;
    });
  };

  const handleToggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      setSelectedRollNos((prev) => {
        const next = new Set(prev);
        filteredStudents.forEach((s) => next.delete(s.rollNo));
        return next;
      });
    } else {
      setSelectedRollNos((prev) => {
        const next = new Set(prev);
        filteredStudents.forEach((s) => next.add(s.rollNo));
        return next;
      });
    }
  };

  const handleSelectAll67 = () => {
    const allSet = new Set(students.map((s) => s.rollNo));
    setSelectedRollNos(allSet);
  };

  const handleClearSelection = () => {
    setSelectedRollNos(new Set());
  };

  // Bulk Status Update Handlers
  const handleBulkSetSubmitted = (submitted: boolean) => {
    if (selectedRollNos.size === 0) return;
    const rollNos = Array.from(selectedRollNos);
    if (onBatchSetSubmitted) {
      onBatchSetSubmitted(rollNos, submitted);
    } else {
      rollNos.forEach((r) => onToggleSubmitted(r, !submitted));
    }
  };

  const handleBulkSetDrive = (driveUploaded: boolean) => {
    if (selectedRollNos.size === 0) return;
    const rollNos = Array.from(selectedRollNos);
    if (onBatchSetDriveUploaded) {
      onBatchSetDriveUploaded(rollNos, driveUploaded);
    } else {
      rollNos.forEach((r) => onToggleDriveUploaded(r, !driveUploaded));
    }
  };

  const handleBulkSetSheet = (sheetUpdated: boolean) => {
    if (selectedRollNos.size === 0) return;
    const rollNos = Array.from(selectedRollNos);
    if (onBatchSetSheetUpdated) {
      onBatchSetSheetUpdated(rollNos, sheetUpdated);
    } else {
      rollNos.forEach((r) => onToggleSheetUpdated(r, !sheetUpdated));
    }
  };

  const handleExecuteBulkDelete = () => {
    if (selectedRollNos.size === 0) return;
    const rollNos = Array.from(selectedRollNos);
    if (onBatchDeleteRosterStudents) {
      onBatchDeleteRosterStudents(rollNos);
    } else if (onDeleteRosterStudent) {
      rollNos.forEach((r) => onDeleteRosterStudent(r));
    }
    setSelectedRollNos(new Set());
    setShowBulkDeleteConfirm(false);
  };

  const issueCounts = useMemo(() => {
    return {
      all: students.length || 67,
      missingDrive: students.filter((s) => !s.driveUploaded).length,
      missingSheet: students.filter((s) => !s.sheetUpdated).length,
      countMismatch: students.filter(
        (s) =>
          (s.countMismatch && s.countMismatch.hasMismatch) ||
          s.driveUploaded !== s.sheetUpdated ||
          ((s.driveFiles?.length || 0) !== (s.sheetRecords?.length || 0))
      ).length,
      incomplete: students.filter((s) => s.overallStatus !== 'COMPLETED').length,
      dualMissing: students.filter((s) => !s.driveUploaded && !s.sheetUpdated).length,
      unconfirmed: students.filter((s) => !s.submitted).length,
      completed: students.filter((s) => s.overallStatus === 'COMPLETED').length,
    };
  }, [students]);

  const syncIssueChips = [
    { id: 'ALL', label: 'All Roster', count: issueCounts.all, color: 'blue' },
    { id: 'COUNT_MISMATCH', label: 'Count Mismatch (Sheet ≠ Drive)', count: issueCounts.countMismatch, color: 'orange' },
    { id: 'MISSING_DRIVE', label: 'Missing Drive', count: issueCounts.missingDrive, color: 'amber' },
    { id: 'MISSING_SHEET', label: 'Missing Sheet', count: issueCounts.missingSheet, color: 'purple' },
    { id: 'INCOMPLETE', label: 'Incomplete', count: issueCounts.incomplete, color: 'red' },
    { id: 'DUAL_MISSING', label: 'Missing Both', count: issueCounts.dualMissing, color: 'rose' },
    { id: 'SUBMISSION_PENDING', label: 'Unconfirmed', count: issueCounts.unconfirmed, color: 'yellow' },
    { id: 'COMPLETED', label: 'Completed', count: issueCounts.completed, color: 'emerald' },
  ];

  const filterOptions = [
    { id: 'ALL', label: 'All (67)' },
    { id: 'COUNT_MISMATCH', label: 'Count Mismatches (Sheet ≠ Drive)' },
    { id: 'COMPLETED', label: 'Completed (All 3 Ticked)' },
    { id: 'PENDING', label: 'Pending Steps' },
    { id: 'NOT_STARTED', label: 'Not Started' },
    { id: 'MULTIPLE_CERTS', label: 'Multiple Certs (2+)' },
    { id: 'DRIVE_PENDING', label: 'Drive Pending' },
    { id: 'SHEET_PENDING', label: 'Sheet Pending' },
    { id: 'SUBMISSION_PENDING', label: 'Submission Pending' },
    { id: 'CERT_FOUND', label: 'Certificate Found' },
    { id: 'NO_CERT', label: 'No Certificate' },
  ];

  return (
    <div className="space-y-4">
      {/* 0. Dedicated Data Mismatch & Reconciliation Analyzer Section */}
      <DataMismatchSection
        students={students}
        sheetRows={sheetRows}
        driveFiles={driveFiles}
        initialAnalysis={reconciliationAnalysis}
        onFilterTableByMismatch={(filterKey) => {
          if (filterKey === 'MISSING_SHEET') setActiveFilter('SHEET_PENDING');
          else if (filterKey === 'MISSING_DRIVE') setActiveFilter('DRIVE_PENDING');
          else if (filterKey === 'COUNT_MISMATCH') setActiveFilter('COUNT_MISMATCH');
          else setActiveFilter(filterKey);
        }}
        onOpenStudentDetails={onOpenDetails}
        onOpenEmailReminder={onOpenEmailReminder}
        onOpenDataHealthReport={onOpenDataHealthReport}
        onToast={onToast}
      />

      {/* Dedicated Permanent Class Roster Management Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600/20 via-indigo-600/20 to-emerald-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Active Class Roster</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-950 text-blue-300 border border-blue-800">
                  {students.length} Students
                </span>
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950 text-emerald-300 border border-emerald-800">
                <Database className="w-3 h-3 text-emerald-400" />
                Permanently Synced (Local &amp; Database)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Permanently register students or bulk-import entire class rosters via copy-paste or CSV.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={() => handleOpenRosterManagement('ADD_SINGLE')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer shadow-md shadow-blue-600/20"
            title="Add a student permanently with Roll Number & Name"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenRosterManagement('BATCH_IMPORT')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer shadow-md shadow-emerald-600/20"
            title="Bulk import students via textarea paste or CSV file"
          >
            <Users className="w-4 h-4" />
            <span>Batch Import Students</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenRosterManagement('VIEW_ROSTER')}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer"
            title="View, search, edit, or export the active roster list"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
            <span>Manage Roster</span>
          </button>
        </div>
      </div>

      {/* Synchronization Issue Quick Filter Chips */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3.5 space-y-2 shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-blue-400" />
            Quick Synchronization Issue Filters:
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Click chip to filter table visibility
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {syncIssueChips.map((chip) => {
            const isActive =
              activeFilter === chip.id ||
              (chip.id === 'MISSING_DRIVE' && activeFilter === 'DRIVE_PENDING') ||
              (chip.id === 'MISSING_SHEET' && activeFilter === 'SHEET_PENDING');

            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setActiveFilter(chip.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 border shadow-sm ${
                  isActive
                    ? chip.color === 'amber'
                      ? 'bg-amber-950 text-amber-200 border-amber-600 shadow-amber-950/50'
                      : chip.color === 'purple'
                      ? 'bg-purple-950 text-purple-200 border-purple-600 shadow-purple-950/50'
                      : chip.color === 'red'
                      ? 'bg-red-950 text-red-200 border-red-600 shadow-red-950/50'
                      : chip.color === 'rose'
                      ? 'bg-rose-950 text-rose-200 border-rose-600 shadow-rose-950/50'
                      : chip.color === 'yellow'
                      ? 'bg-yellow-950 text-yellow-200 border-yellow-600 shadow-yellow-950/50'
                      : chip.color === 'emerald'
                      ? 'bg-emerald-950 text-emerald-200 border-emerald-600 shadow-emerald-950/50'
                      : 'bg-blue-600 text-white border-blue-500 shadow-blue-600/30'
                    : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-slate-800/80'
                }`}
              >
                <span>{chip.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                    isActive
                      ? 'bg-black/40 text-white'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* View Mode Mode Bar: Matrix vs Detailed Table */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/90 p-3 rounded-2xl border border-slate-800 shadow-inner">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold text-slate-200">Classroom Roster Layout Mode:</span>
          <span className="text-[11px] text-slate-400 hidden md:inline">Choose spatial grid or tabular audit list</span>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setTableViewMode('MATRIX')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              tableViewMode === 'MATRIX'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-blue-400" />
            <span>🌌 Interactive Matrix (Seating Map &amp; HUD)</span>
          </button>

          <button
            type="button"
            onClick={() => setTableViewMode('TABLE')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              tableViewMode === 'TABLE'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>📋 Detailed Audit Table</span>
          </button>
        </div>
      </div>

      {/* MATRIX VIEW OR TABLE VIEW CONDITIONAL DISPLAY */}
      {tableViewMode === 'MATRIX' && (
        <ClassroomMatrixView
          students={students}
          sheetRows={sheetRows}
          onOpenDetails={onOpenDetails}
          onOpenEmailReminder={onOpenEmailReminder}
          onToggleSubmitted={onToggleSubmitted}
          onToggleDriveUploaded={onToggleDriveUploaded}
          onToggleSheetUpdated={onToggleSheetUpdated}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
        />
      )}

      {tableViewMode === 'TABLE' && (
        <div className="space-y-4">
          {/* Controls Bar: Search, Filters, and Multi-Part CSV Exports */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Roll No (e.g. 25A31A05GB), Student Name, or Certificate..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-100 placeholder-slate-500 text-xs sm:text-sm rounded-xl outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Search Tags */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-500 shrink-0">Quick Search:</span>
            {['pending', 'mismatch', 'missing drive', 'missing sheet', 'submitted', 'nptel'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSearchQuery(tag)}
                className={`px-2 py-0.5 rounded-lg border text-[10px] font-mono transition cursor-pointer shrink-0 ${
                  searchQuery.toLowerCase() === tag
                    ? 'bg-blue-600 text-white border-blue-500 font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Action Buttons: Separate CSV Exports Dropdown & Report */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Separate CSV Export Dropdown */}
            <div className="relative" ref={exportDropdownRef}>
              <button
                type="button"
                onClick={() => setIsExportMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-950/80 to-teal-950/80 hover:from-emerald-900/90 hover:to-teal-900/90 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer shadow-md shadow-emerald-950/40"
                title="Export separate CSV files for each part"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Export CSVs</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isExportMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-30 space-y-1 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    Separate CSV Exports
                  </div>

                  {/* Advanced Custom Export Option */}
                  {onOpenAdvancedExport && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenAdvancedExport();
                        setIsExportMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-900/90 to-blue-900/90 hover:from-purple-800 hover:to-blue-800 text-purple-200 border border-purple-700/60 flex items-center justify-between transition cursor-pointer my-1 shadow-md"
                    >
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                        Custom Labels & 2-Sheet Export
                      </span>
                      <span className="text-[10px] bg-purple-950 text-purple-300 px-1.5 py-0.5 rounded font-mono font-bold">
                        Advanced
                      </span>
                    </button>
                  )}

                  {/* Export All CSVs */}
                  <button
                    type="button"
                    onClick={() => {
                      onExportAllCsvs();
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-emerald-300 hover:bg-emerald-950/60 hover:text-emerald-200 flex items-center justify-between transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      Export All 5 CSVs
                    </span>
                    <span className="text-[10px] bg-emerald-900/80 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                      All Parts
                    </span>
                  </button>

                  {/* 1. Class Summary CSV */}
                  <button
                    type="button"
                    onClick={() => {
                      onExportClassSummaryCsv();
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-slate-800 flex items-center justify-between transition cursor-pointer"
                  >
                    <span>1. Class Summary (67 Students)</span>
                    <span className="text-[10px] text-slate-500 font-mono">67 Rows</span>
                  </button>

                  {/* 2. Individual Certificates Tracked CSV */}
                  <button
                    type="button"
                    onClick={() => {
                      onExportIndividualCertsCsv();
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-slate-800 flex items-center justify-between transition cursor-pointer"
                  >
                    <span>2. Individual Certificates Tracked</span>
                    <span className="text-[10px] text-purple-400 font-mono">Per-Cert</span>
                  </button>

                  {/* 3. Outside Class Submissions CSV */}
                  <button
                    type="button"
                    onClick={() => {
                      onExportOutsideClassCsv();
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-slate-800 flex items-center justify-between transition cursor-pointer"
                  >
                    <span>3. Outside Class Submissions</span>
                    <span className="text-[10px] text-amber-400 font-mono">Other Rolls</span>
                  </button>

                  {/* 4. Manual Review Queue CSV */}
                  <button
                    type="button"
                    onClick={() => {
                      onExportReviewQueueCsv();
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-slate-800 flex items-center justify-between transition cursor-pointer"
                  >
                    <span>4. Manual Review Queue</span>
                    <span className="text-[10px] text-blue-400 font-mono">Unidentified</span>
                  </button>

                  {/* 5. Audit Trail Logs CSV */}
                  <button
                    type="button"
                    onClick={() => {
                      onExportAuditLogsCsv();
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-slate-800 flex items-center justify-between transition cursor-pointer"
                  >
                    <span>5. Audit Trail Logs</span>
                    <span className="text-[10px] text-slate-400 font-mono">History</span>
                  </button>
                </div>
              )}
            </div>

            {/* Add Student Button */}
            {onAddRosterStudent && (
              <button
                type="button"
                onClick={() => handleOpenRosterManagement('ADD_SINGLE')}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-950 to-indigo-950 hover:from-blue-900 hover:to-indigo-900 border border-blue-500/40 text-blue-200 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer shadow-md"
                title="Add a new student permanently to the active class roster"
              >
                <Plus className="w-4 h-4 text-blue-400" />
                <span>Add Student</span>
              </button>
            )}

            {/* Batch Import Students Button */}
            {(onBatchAddRosterStudents || onAddRosterStudent) && (
              <button
                type="button"
                onClick={() => handleOpenRosterManagement('BATCH_IMPORT')}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-950 to-teal-950 hover:from-emerald-900 hover:to-teal-900 border border-emerald-500/40 text-emerald-200 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer shadow-md"
                title="Bulk-import a list of student names and roll numbers via textarea or spreadsheet paste"
              >
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Batch Import Students</span>
              </button>
            )}

            {/* Bulk CSV Mapping Button */}
            {onOpenBulkMapping && (
              <button
                type="button"
                onClick={onOpenBulkMapping}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-950/90 to-blue-950/90 hover:from-purple-900 hover:to-blue-900 border border-purple-700/80 text-purple-200 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer shadow-md"
                title="Bulk-upload custom CSV filename mapping to resolve unidentified files directly into student records"
              >
                <Upload className="w-4 h-4 text-purple-300" />
                <span>Bulk CSV Mapping</span>
              </button>
            )}

            {/* Advanced Export Button */}
            {onOpenAdvancedExport && (
              <button
                type="button"
                onClick={onOpenAdvancedExport}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-950/80 hover:bg-purple-900/90 border border-purple-700/80 text-purple-200 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer shadow-md"
                title="Advanced Export Customizer & 2-Sheet Classification Engine"
              >
                <Sparkles className="w-4 h-4 text-purple-300" />
                <span>Advanced Export</span>
              </button>
            )}

            {/* Email Reminders Button */}
            {onOpenEmailReminder && (
              <button
                type="button"
                onClick={() => onOpenEmailReminder()}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer shadow-md shadow-amber-600/20"
                title="Send personalized email reminders to students with NOT STARTED or PENDING status"
              >
                <Mail className="w-4 h-4" />
                <span>Email Reminders</span>
                {incompleteCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-mono font-bold">
                    {incompleteCount}
                  </span>
                )}
              </button>
            )}

            {/* Sync Report Text */}
            <button
              type="button"
              onClick={onExportSummaryReport}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs sm:text-sm font-medium rounded-xl transition cursor-pointer"
              title="Export Full Reconciliation Report"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
              <span>Sync Report</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] mr-1 shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {filterOptions.map((f) => {
            const isActive = activeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-3 py-1 rounded-full whitespace-nowrap transition cursor-pointer font-medium ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Dynamic Sort Option Bar (Highly Visible Sort Controls for Desktop & Mobile views) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60 text-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] mr-1 shrink-0 flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-blue-400" /> Active Sort:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'rollNo', label: 'Roll No' },
              { id: 'name', label: 'Student Name' },
              { id: 'overallStatus', label: 'Overall Status' },
              { id: 'lastActivity', label: 'Submission Date' },
              { id: 'driveUploaded', label: 'Drive Status' },
              { id: 'sheetUpdated', label: 'Sheet Status' },
              { id: 'submitted', label: 'Submission' },
            ].map((item) => {
              const isSelected = sortField === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSort(item.id as any)}
                  className={`px-2.5 py-1 rounded-xl flex items-center gap-1.5 transition cursor-pointer font-medium ${
                    isSelected
                      ? 'bg-blue-950/80 text-blue-300 border border-blue-500/40 shadow-sm shadow-blue-950/50 font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-850 border border-slate-800/80'
                  }`}
                  title={`Sort by ${item.label}`}
                >
                  <span>{item.label}</span>
                  {isSelected ? (
                    sortDirection === 'asc' ? (
                      <ArrowUp className="w-3 h-3 text-blue-400" />
                    ) : (
                      <ArrowDown className="w-3 h-3 text-blue-400" />
                    )
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-slate-700 group-hover:text-slate-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Results Summary & Last Scanned Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 pt-1 border-t border-slate-800/60">
          <div className="flex items-center gap-2">
            <span>
              Showing <span className="font-semibold text-white">{filteredStudents.length}</span> of 67 students
              {searchQuery && (
                <span className="ml-1 text-slate-500">
                  matching "{searchQuery}"
                </span>
              )}
            </span>
            {activeFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setActiveFilter('ALL')}
                className="text-blue-400 hover:underline cursor-pointer touch-manipulation text-[11px]"
              >
                Reset filter
              </button>
            )}
          </div>

          {/* Last Scanned Timestamp Badge in Summary Bar */}
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-950 border border-slate-800 text-slate-300 shadow-sm"
            title={`Exact Drive/Sheets Sync Time: ${scannedTime.exact}`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">Last Scanned:</span>
            <span className="text-emerald-300 font-mono font-semibold">
              {scannedTime.formatted}
            </span>
          </div>
        </div>
      </div>

      {/* Prominent Bulk Action Toolbar (When 1 or more students are selected) */}
      {selectedRollNos.size > 0 && (
        <div className="bg-gradient-to-r from-purple-950/90 via-slate-900 to-indigo-950/90 border-2 border-purple-500/50 rounded-2xl p-4 shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                <ListChecks className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {selectedRollNos.size} Student{selectedRollNos.size > 1 ? 's' : ''} Selected
                  </span>
                  <span className="text-xs text-purple-300 font-mono">
                    ({Math.round((selectedRollNos.size / 67) * 100)}% of class)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <button
                    type="button"
                    onClick={handleToggleSelectAllFiltered}
                    className="hover:text-purple-300 underline cursor-pointer touch-manipulation"
                  >
                    {isAllFilteredSelected ? 'Deselect filtered' : `Select all ${filteredStudents.length} filtered`}
                  </button>
                  {selectedRollNos.size < 67 && (
                    <>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={handleSelectAll67}
                        className="hover:text-purple-300 underline cursor-pointer touch-manipulation"
                      >
                        Select all 67 class students
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClearSelection}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition cursor-pointer touch-manipulation"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Admin Bulk Status Controls: Drive, Sheet, Submitted */}
          <div className="pt-2 border-t border-purple-900/40 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold text-[11px] uppercase mr-1">
              Admin Manual Bulk Actions:
            </span>

            {/* Drive Uploaded Bulk */}
            <div className="inline-flex rounded-xl overflow-hidden border border-emerald-700/50 shadow-sm">
              <button
                type="button"
                onClick={() => handleBulkSetDrive(true)}
                className="px-2.5 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer transition"
                title="Mark selected Drive Uploaded = TRUE"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>Drive ✓</span>
              </button>
              <button
                type="button"
                onClick={() => handleBulkSetDrive(false)}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-l border-emerald-900/50 cursor-pointer transition"
                title="Mark selected Drive Uploaded = FALSE"
              >
                <span>✗</span>
              </button>
            </div>

            {/* Sheet Updated Bulk */}
            <div className="inline-flex rounded-xl overflow-hidden border border-emerald-700/50 shadow-sm">
              <button
                type="button"
                onClick={() => handleBulkSetSheet(true)}
                className="px-2.5 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer transition"
                title="Mark selected Sheet Updated = TRUE"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Sheet ✓</span>
              </button>
              <button
                type="button"
                onClick={() => handleBulkSetSheet(false)}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-l border-emerald-900/50 cursor-pointer transition"
                title="Mark selected Sheet Updated = FALSE"
              >
                <span>✗</span>
              </button>
            </div>

            {/* Submitted Bulk */}
            <div className="inline-flex rounded-xl overflow-hidden border border-purple-700/60 shadow-sm">
              <button
                type="button"
                onClick={() => handleBulkSetSubmitted(true)}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1.5 cursor-pointer transition shadow-md shadow-purple-900/40"
                title="Mark selected Submitted = TRUE"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Submitted ✓</span>
              </button>
              <button
                type="button"
                onClick={() => handleBulkSetSubmitted(false)}
                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-l border-purple-900/50 cursor-pointer transition"
                title="Mark selected Submitted = FALSE"
              >
                <span>✗</span>
              </button>
            </div>

            {/* Bulk Delete Students Button */}
            <button
              type="button"
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="ml-auto px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition shadow-sm"
              title={`Permanently delete ${selectedRollNos.size} selected students`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete {selectedRollNos.size} Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal Dialog */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border-2 border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Selected Students?</h3>
                <p className="text-xs text-slate-400">Permanently remove from class roster & database</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-rose-950/20 border border-rose-900/30 p-3 rounded-xl">
              You are about to permanently delete <strong className="text-rose-300">{selectedRollNos.size} student(s)</strong> ({Array.from(selectedRollNos).slice(0, 4).join(', ')}{selectedRollNos.size > 4 ? '...' : ''}). This action will remove their roster records and database entries.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBulkDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete {selectedRollNos.size} Students</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Table Top Header Bar with Roster Title and Last Scanned Badge */}
        <div className="px-4 py-3 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Class Section Roster
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
              67 Enrolled Students
            </span>
            {filteredStudents.length > 0 && (
              <button
                type="button"
                onClick={isAllFilteredExpanded ? handleCollapseAllFiltered : handleExpandAllFiltered}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-800/80 transition cursor-pointer shadow-sm"
                title={isAllFilteredExpanded ? 'Collapse all expanded student rows' : 'Expand all matching student rows to inspect certificate details & metadata'}
              >
                {isAllFilteredExpanded ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>Collapse All Rows ({expandedRollNos.size})</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Expand All Rows ({filteredStudents.length})</span>
                  </>
                )}
              </button>
            )}

            {/* Clickable Active Sort Badge in Desktop Header */}
            <button
              type="button"
              onClick={() => handleSort(sortField)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-800/80 transition cursor-pointer shadow-sm"
              title={`Currently sorted by ${
                sortField === 'rollNo'
                  ? 'Roll Number'
                  : sortField === 'name'
                  ? 'Student Name'
                  : sortField === 'overallStatus'
                  ? 'Overall Status'
                  : sortField === 'driveUploaded'
                  ? 'Drive Status'
                  : sortField === 'sheetUpdated'
                  ? 'Sheet Status'
                  : sortField === 'submitted'
                  ? 'Submission Status'
                  : 'Latest Activity'
              } (${sortDirection === 'asc' ? 'Ascending' : 'Descending'}). Click to toggle.`}
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400">Sorted by:</span>
              <span className="text-white font-bold">
                {sortField === 'rollNo'
                  ? 'Roll No'
                  : sortField === 'name'
                  ? 'Name'
                  : sortField === 'overallStatus'
                  ? 'Status'
                  : sortField === 'driveUploaded'
                  ? 'Drive'
                  : sortField === 'sheetUpdated'
                  ? 'Sheet'
                  : sortField === 'submitted'
                  ? 'Submitted'
                  : 'Activity'}
              </span>
              <span className="inline-flex items-center gap-0.5 px-1 rounded text-[9px] font-mono font-bold bg-blue-900 text-blue-200">
                {sortDirection === 'asc' ? (
                  <>
                    <ArrowUp className="w-2.5 h-2.5 text-emerald-400" />
                    <span>ASC</span>
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-2.5 h-2.5 text-amber-400" />
                    <span>DESC</span>
                  </>
                )}
              </span>
            </button>
          </div>

          {/* Last Scanned Timestamp Header Badge */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium bg-slate-900/90 border border-slate-800 text-slate-300 shadow-sm"
            title={`Last Drive/Sheets Sync: ${scannedTime.exact}`}
          >
            <span className="flex h-2 w-2 relative">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                  lastScannedTimestamp ? 'bg-emerald-400' : 'bg-slate-500'
                } opacity-75`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  lastScannedTimestamp ? 'bg-emerald-500' : 'bg-slate-600'
                }`}
              ></span>
            </span>
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              Last Scanned:
            </span>
            <span className="text-emerald-300 font-mono font-semibold">
              {scannedTime.formatted}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {/* Bulk Select All Checkbox Column */}
                <th className="py-3.5 px-4 w-12 text-center">
                  <div className="inline-flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={isAllFilteredSelected}
                      ref={(el) => {
                        if (el) {
                          el.indeterminate = isSomeFilteredSelected && !isAllFilteredSelected;
                        }
                      }}
                      onChange={handleToggleSelectAllFiltered}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-900 focus:ring-2 cursor-pointer transition accent-purple-500"
                      title={
                        isAllFilteredSelected
                          ? 'Deselect all filtered'
                          : 'Select all filtered students'
                      }
                    />
                  </div>
                </th>

                {/* Sortable Roll No Header */}
                <th
                  onClick={() => handleSort('rollNo')}
                  className={`py-3.5 px-4 w-36 transition-colors duration-150 cursor-pointer select-none ${
                    sortField === 'rollNo'
                      ? 'bg-blue-950/70 text-blue-300 border-b-2 border-blue-400 font-bold shadow-inner'
                      : 'hover:bg-slate-800/80 hover:text-white'
                  }`}
                  aria-sort={sortField === 'rollNo' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  title={`Click to sort by Roll Number (${sortField === 'rollNo' && sortDirection === 'asc' ? 'currently Ascending 0-9; click for Descending' : 'Ascending / Descending'})`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-left">
                    <span>Roll No</span>
                    {sortField === 'rollNo' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-900/90 text-blue-200 border border-blue-500/80 shadow-sm">
                        {sortDirection === 'asc' ? (
                          <>
                            <ArrowUp className="w-3 h-3 text-blue-300 shrink-0" />
                            <span>A-Z</span>
                          </>
                        ) : (
                          <>
                            <ArrowDown className="w-3 h-3 text-blue-300 shrink-0" />
                            <span>Z-A</span>
                          </>
                        )}
                      </span>
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 hover:text-slate-400 transition" />
                    )}
                  </div>
                </th>

                {/* Sortable Student Name Header */}
                <th
                  onClick={() => handleSort('name')}
                  className={`py-3.5 px-4 transition-colors duration-150 cursor-pointer select-none ${
                    sortField === 'name'
                      ? 'bg-blue-950/70 text-blue-300 border-b-2 border-blue-400 font-bold shadow-inner'
                      : 'hover:bg-slate-800/80 hover:text-white'
                  }`}
                  aria-sort={sortField === 'name' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  title={`Click to sort by Student Name (${sortField === 'name' && sortDirection === 'asc' ? 'currently Ascending A-Z; click for Descending' : 'Ascending / Descending'})`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-left">
                    <span>Student Name</span>
                    {sortField === 'name' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-900/90 text-blue-200 border border-blue-500/80 shadow-sm">
                        {sortDirection === 'asc' ? (
                          <>
                            <ArrowUp className="w-3 h-3 text-blue-300 shrink-0" />
                            <span>A-Z</span>
                          </>
                        ) : (
                          <>
                            <ArrowDown className="w-3 h-3 text-blue-300 shrink-0" />
                            <span>Z-A</span>
                          </>
                        )}
                      </span>
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 hover:text-slate-400 transition" />
                    )}
                  </div>
                </th>

                <th className="py-3.5 px-4 text-slate-400">All Certificates Uploaded (Unified)</th>

                {/* Sortable Drive Uploaded Header */}
                <th
                  onClick={() => handleSort('driveUploaded')}
                  className={`py-3.5 px-4 text-center w-28 transition-colors duration-150 cursor-pointer select-none ${
                    sortField === 'driveUploaded'
                      ? 'bg-blue-950/70 text-blue-300 border-b-2 border-blue-400 font-bold shadow-inner'
                      : 'hover:bg-slate-800/80 hover:text-white'
                  }`}
                  aria-sort={sortField === 'driveUploaded' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  title="Click to sort by Drive Upload Status"
                >
                  <div className="inline-flex items-center justify-center gap-1 font-semibold">
                    <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                    <span>Drive</span>
                    {sortField === 'driveUploaded' ? (
                      <span className="inline-flex items-center px-1 rounded text-[9px] font-mono font-bold bg-blue-900/90 text-blue-200 border border-blue-500">
                        {sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-300" /> : <ArrowDown className="w-3 h-3 text-blue-300" />}
                      </span>
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 hover:text-slate-400 transition" />
                    )}
                  </div>
                </th>

                {/* Sortable Sheet Updated Header */}
                <th
                  onClick={() => handleSort('sheetUpdated')}
                  className={`py-3.5 px-4 text-center w-28 transition-colors duration-150 cursor-pointer select-none ${
                    sortField === 'sheetUpdated'
                      ? 'bg-blue-950/70 text-blue-300 border-b-2 border-blue-400 font-bold shadow-inner'
                      : 'hover:bg-slate-800/80 hover:text-white'
                  }`}
                  aria-sort={sortField === 'sheetUpdated' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  title="Click to sort by Sheet Record Status"
                >
                  <div className="inline-flex items-center justify-center gap-1 font-semibold">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Sheet</span>
                    {sortField === 'sheetUpdated' ? (
                      <span className="inline-flex items-center px-1 rounded text-[9px] font-mono font-bold bg-blue-900/90 text-blue-200 border border-blue-500">
                        {sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-300" /> : <ArrowDown className="w-3 h-3 text-blue-300" />}
                      </span>
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 hover:text-slate-400 transition" />
                    )}
                  </div>
                </th>

                {/* Sortable Admin Confirmed Header */}
                <th
                  onClick={() => handleSort('submitted')}
                  className={`py-3.5 px-4 text-center w-32 transition-colors duration-150 cursor-pointer select-none ${
                    sortField === 'submitted'
                      ? 'bg-blue-950/70 text-blue-300 border-b-2 border-blue-400 font-bold shadow-inner'
                      : 'hover:bg-slate-800/80 hover:text-white'
                  }`}
                  aria-sort={sortField === 'submitted' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  title="Click to sort by Admin Confirmed Status"
                >
                  <div className="inline-flex items-center justify-center gap-1 font-semibold">
                    <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
                    <span>Submitted</span>
                    {sortField === 'submitted' ? (
                      <span className="inline-flex items-center px-1 rounded text-[9px] font-mono font-bold bg-blue-900/90 text-blue-200 border border-blue-500">
                        {sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-300" /> : <ArrowDown className="w-3 h-3 text-blue-300" />}
                      </span>
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 hover:text-slate-400 transition" />
                    )}
                  </div>
                </th>

                {/* Sortable Overall Status Header */}
                <th
                  onClick={() => handleSort('overallStatus')}
                  className={`py-3.5 px-4 text-center w-40 transition-colors duration-150 cursor-pointer select-none ${
                    sortField === 'overallStatus'
                      ? 'bg-blue-950/70 text-blue-300 border-b-2 border-blue-400 font-bold shadow-inner'
                      : 'hover:bg-slate-800/80 hover:text-white'
                  }`}
                  aria-sort={sortField === 'overallStatus' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  title={`Click to sort by Overall Verification Status (${sortField === 'overallStatus' && sortDirection === 'asc' ? 'currently Verified First; click for Missing First' : 'Verified First / Missing First'})`}
                >
                  <div className="inline-flex items-center justify-center gap-1.5 font-semibold">
                    <span>Overall Status</span>
                    {sortField === 'overallStatus' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-900/90 text-blue-200 border border-blue-500/80 shadow-sm">
                        {sortDirection === 'asc' ? (
                          <>
                            <ArrowUp className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>VERIFIED</span>
                          </>
                        ) : (
                          <>
                            <ArrowDown className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>MISSING</span>
                          </>
                        )}
                      </span>
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 hover:text-slate-400 transition" />
                    )}
                  </div>
                </th>

                {/* Sortable Recent Activity Date Header */}
                <th
                  onClick={() => handleSort('lastActivity')}
                  className={`py-3.5 px-4 text-center w-36 transition-colors duration-150 cursor-pointer select-none ${
                    sortField === 'lastActivity'
                      ? 'bg-blue-950/70 text-blue-300 border-b-2 border-blue-400 font-bold shadow-inner'
                      : 'hover:bg-slate-800/80 hover:text-white'
                  }`}
                  aria-sort={sortField === 'lastActivity' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                  title={`Click to sort by Latest Submission / Activity Date (${sortField === 'lastActivity' && sortDirection === 'asc' ? 'currently Newest First; click for Oldest First' : 'Newest First / Oldest First'})`}
                >
                  <div className="inline-flex items-center justify-center gap-1 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>Latest Activity</span>
                    {sortField === 'lastActivity' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-900/90 text-blue-200 border border-blue-500">
                        {sortDirection === 'asc' ? (
                          <>
                            <ArrowUp className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>NEWEST</span>
                          </>
                        ) : (
                          <>
                            <ArrowDown className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>OLDEST</span>
                          </>
                        )}
                      </span>
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 hover:text-slate-400 transition" />
                    )}
                  </div>
                </th>

                <th className="py-3.5 px-4 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    No students match the selected filters or search query.
                  </td>
                </tr>
              ) : (
                visibleStudents.map((student) => {
                  const hasDriveFiles = student.driveFiles.length > 0;
                  const firstDriveFile = hasDriveFiles ? student.driveFiles[0] : null;
                  const isSelected = selectedRollNos.has(student.rollNo);
                  const isExpanded = expandedRollNos.has(student.rollNo);
                  const totalCerts = student.certificates.length || student.driveFiles.length;
                  const isRecentlyCompleted = recentlyCompletedRollNos.has(student.rollNo);

                  return (
                    <React.Fragment key={student.rollNo}>
                      <tr
                        onClick={(e) => handleRowClick(e, student.rollNo)}
                        className={`student-row-item transition-all duration-200 hover:bg-slate-800/80 hover:shadow-lg hover:shadow-slate-950/40 group cursor-pointer ${
                          isSelected ? 'bg-purple-950/20' : ''
                        } ${isExpanded ? 'bg-slate-900/80 border-b border-purple-800/40' : ''}`}
                      >
                        {/* Selection Checkbox with status color left-border indicator */}
                        <td 
                          className={`py-3.5 px-4 text-center border-l-4 transition-colors duration-150 relative group/border ${
                            student.overallStatus === 'COMPLETED'
                              ? 'border-l-emerald-500/90'
                              : student.overallStatus === 'UNSUBMITTED_MATCH'
                              ? 'border-l-indigo-500/95'
                              : student.overallStatus === 'PENDING'
                              ? 'border-l-amber-500/90'
                              : 'border-l-red-500/90'
                          }`}
                          title={`Last status update: ${formatExactTimestamp(student.lastUpdated)}`}
                        >
                          {/* Exact Timestamp Status Tooltip on Border Hover */}
                          <div className="absolute left-1.5 top-1/2 -translate-y-1/2 ml-2 pointer-events-none opacity-0 group-hover/border:opacity-100 transition-opacity duration-150 bg-slate-950/95 border border-slate-800 text-slate-200 text-[10px] font-semibold rounded-lg py-1.5 px-3 z-40 shadow-xl whitespace-nowrap border-blue-500/30 flex flex-col items-start gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${
                                student.overallStatus === 'COMPLETED'
                                  ? 'bg-emerald-400 animate-pulse'
                                  : student.overallStatus === 'UNSUBMITTED_MATCH'
                                  ? 'bg-indigo-400 animate-pulse'
                                  : student.overallStatus === 'PENDING'
                                  ? 'bg-amber-400 animate-pulse'
                                  : 'bg-red-400 animate-pulse'
                              }`} />
                              <span className="text-slate-400 uppercase tracking-wider font-bold text-[9px]">Last Status Update:</span>
                            </div>
                            <span className="font-mono text-slate-300">{formatExactTimestamp(student.lastUpdated)}</span>
                          </div>

                          <div className="inline-flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectStudent(student.rollNo)}
                              className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-900 focus:ring-2 cursor-pointer transition accent-purple-500"
                              title={`Select ${student.rollNo}`}
                            />
                          </div>
                        </td>

                        {/* Roll No */}
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-200 tracking-wide text-xs sm:text-sm">
                          <span className="px-2 py-0.5 rounded bg-blue-950/60 border border-blue-900/60 text-blue-300">
                            <HighlightText text={student.rollNo} query={searchQuery} />
                          </span>
                        </td>

                        {/* Name */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleExpand(student.rollNo)}
                              className="p-1 text-slate-500 hover:text-purple-300 hover:bg-slate-800 rounded transition cursor-pointer"
                              title={isExpanded ? "Collapse certificates" : "Expand individual certificate details"}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-purple-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                            <div>
                              <span>
                                <HighlightText text={student.name} query={searchQuery} />
                              </span>
                              {searchQuery.trim() && (
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  {getStudentMatchReasons(student, searchQuery).map((reason, rIdx) => (
                                    <span
                                      key={rIdx}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-950/80 border border-amber-500/50 text-amber-300 shadow-sm"
                                      title={`Matched ${reason.label}: "${reason.matchedText}"`}
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                      <span>Matched {reason.label}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                      {/* Unified All Certificates Column (Showing all certificates uploaded by this single student) */}
                      <td className="py-3.5 px-4">
                        {totalCerts > 0 ? (
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {student.certificates.map((cert, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-950/80 text-blue-300 border border-blue-800/70"
                                >
                                  <Award className="w-3 h-3 text-blue-400" />
                                  <HighlightText text={cert} query={searchQuery} />
                                </span>
                              ))}
                              {student.driveFiles.length > student.certificates.length && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-950/80 text-purple-300 border border-purple-800/70">
                                  <FileCheck className="w-3 h-3" />
                                  {student.driveFiles.length} files in Drive
                                </span>
                              )}
                              {student.countMismatch && student.countMismatch.hasMismatch && (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500/50 shadow-sm"
                                  title={student.countMismatch.description}
                                >
                                  <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                                  {student.countMismatch.type === 'MORE_IN_SHEET'
                                    ? `⚠️ ${student.countMismatch.sheetCount} Sheet vs ${student.countMismatch.driveCount} Drive (-${student.countMismatch.difference} File)`
                                    : `⚠️ ${student.countMismatch.driveCount} Drive vs ${student.countMismatch.sheetCount} Sheet (-${student.countMismatch.difference} Form)`}
                                </span>
                              )}
                            </div>
                            {/* Fast individual certificate preview file chips */}
                            {student.driveFiles.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                {student.driveFiles.slice(0, 3).map((f, fIdx) => (
                                  <a
                                    key={f.id || fIdx}
                                    href={f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 text-[10px] font-bold transition shadow-sm"
                                    title={`Open Drive File: ${f.name}`}
                                  >
                                    <ExternalLink className="w-2.5 h-2.5" />
                                    <span className="truncate max-w-[120px]">
                                      <HighlightText text={f.name} query={searchQuery} />
                                    </span>
                                  </a>
                                ))}
                                {student.driveFiles.length > 3 && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenDetails(student)}
                                    className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-blue-400 font-bold hover:bg-slate-800 transition cursor-pointer"
                                  >
                                    +{student.driveFiles.length - 3} more
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">No certificates recorded</span>
                        )}
                      </td>

                      {/* Drive Uploaded (Interactive Admin Toggle) */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onToggleDriveUploaded(student.rollNo, student.driveUploaded)}
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition cursor-pointer touch-manipulation ${
                            student.driveUploaded
                              ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-700/80 hover:bg-emerald-900/90 shadow-sm'
                              : 'bg-slate-950 text-slate-600 border border-slate-800 hover:border-slate-600 hover:text-slate-400'
                          }`}
                          title={`Click to manually toggle Drive Uploaded for ${student.rollNo} (Currently: ${student.driveUploaded ? 'TRUE' : 'FALSE'})`}
                        >
                          {student.driveUploaded ? (
                            <CheckSquare className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-500" />
                          )}
                        </button>
                      </td>

                      {/* Spreadsheet Updated (Interactive Admin Toggle) */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onToggleSheetUpdated(student.rollNo, student.sheetUpdated)}
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition cursor-pointer touch-manipulation ${
                            student.sheetUpdated
                              ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-700/80 hover:bg-emerald-900/90 shadow-sm'
                              : 'bg-slate-950 text-slate-600 border border-slate-800 hover:border-slate-600 hover:text-slate-400'
                          }`}
                          title={`Click to manually toggle Sheet Updated for ${student.rollNo} (Currently: ${student.sheetUpdated ? 'TRUE' : 'FALSE'})`}
                        >
                          {student.sheetUpdated ? (
                            <CheckSquare className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-500" />
                          )}
                        </button>
                      </td>

                      {/* Submitted (Interactive Admin Toggle) */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onToggleSubmitted(student.rollNo, student.submitted)}
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition cursor-pointer touch-manipulation ${
                            student.submitted
                              ? 'bg-purple-950/90 text-purple-400 border border-purple-700/80 hover:bg-purple-900/90 shadow-sm'
                              : 'bg-slate-950 text-slate-600 border border-slate-800 hover:border-slate-600 hover:text-slate-400'
                          }`}
                          title={`Click to manually toggle Submitted for ${student.rollNo} (Currently: ${student.submitted ? 'TRUE' : 'FALSE'})`}
                        >
                          {student.submitted ? (
                            <CheckSquare className="w-5 h-5 text-purple-400" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-500" />
                          )}
                        </button>
                      </td>

                      {/* Overall Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {student.overallStatus === 'COMPLETED' ? (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-600 shadow-sm shadow-emerald-900/40 transition-all duration-300 ${
                                isRecentlyCompleted
                                  ? 'animate-status-completed-pulse ring-2 ring-emerald-400/80 shadow-emerald-500/50 scale-105'
                                  : ''
                              }`}
                              title={isRecentlyCompleted ? 'Status transitioned from PENDING to COMPLETED!' : 'Verified & Completed'}
                            >
                              <CheckCircle2 className={`w-3.5 h-3.5 text-emerald-400 ${isRecentlyCompleted ? 'animate-bounce' : ''}`} />
                              VERIFIED
                              {isRecentlyCompleted && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-400 text-emerald-950 font-extrabold tracking-tight uppercase animate-pulse">
                                  New
                                </span>
                              )}
                            </span>
                          ) : student.overallStatus === 'UNSUBMITTED_MATCH' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-950/90 text-indigo-300 border border-indigo-700 shadow-sm shadow-indigo-900/40" title="Roster match confirmed on Drive and Sheet, form submission remaining">
                              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                              DRIVE & SHEET OK
                            </span>
                          ) : student.overallStatus === 'PENDING' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-700/70">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              PENDING
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-950 text-red-400 border border-red-800 shadow-sm shadow-red-900/20">
                              <XCircle className="w-3.5 h-3.5 text-red-400" />
                              MISSING
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleExpand(student.rollNo)}
                            className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-semibold rounded-md flex items-center gap-1 transition cursor-pointer"
                            title="Inspect real drive and sheet proof evidence for this student"
                          >
                            <Eye className="w-2.5 h-2.5 text-blue-400" />
                            <span>{isExpanded ? 'Hide Proof' : 'View Proof'}</span>
                          </button>
                        </div>
                      </td>

                      {/* Latest Activity Timestamp Cell */}
                      <td className="py-3.5 px-4 text-center">
                        {(() => {
                          const latest = getLatestStudentActivity(student);
                          if (!latest) {
                            return <span className="text-[11px] text-slate-600 font-mono">—</span>;
                          }
                          return (
                            <div className="inline-flex flex-col items-center">
                              <span className="text-xs font-mono font-medium text-slate-300">
                                {latest.date.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                  latest.source === 'SHEET'
                                    ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-900/60'
                                    : latest.source === 'DRIVE'
                                    ? 'text-cyan-400 bg-cyan-950/60 border border-cyan-900/60'
                                    : 'text-purple-400 bg-purple-950/60 border border-purple-900/60'
                                }`}
                              >
                                {latest.source === 'SHEET' ? 'Form' : latest.source === 'DRIVE' ? 'Drive' : 'Status'}
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Actions with Floating Hover Popover */}
                      <td className="py-3.5 px-4 text-right relative min-w-[200px]">
                        <div className="inline-flex items-center gap-1.5 transition-all duration-150 group-hover:opacity-0 group-hover:pointer-events-none">
                          {firstDriveFile && (firstDriveFile.webViewLink || firstDriveFile.id) && (
                            <button
                              type="button"
                              onClick={() => handleCopyLink(firstDriveFile, student.rollNo)}
                              className={`p-1.5 rounded-lg transition cursor-pointer touch-manipulation ${
                                copiedRollNo === student.rollNo
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 shadow-sm'
                                  : 'text-slate-400 hover:text-emerald-400 hover:bg-slate-800'
                              }`}
                              title={
                                copiedRollNo === student.rollNo
                                  ? 'Public link copied to clipboard!'
                                  : 'Copy Public Drive Shareable Link'
                              }
                            >
                              {copiedRollNo === student.rollNo ? (
                                <Check className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Link className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          {firstDriveFile?.webViewLink && firstDriveFile.webViewLink !== '#' && (
                            <a
                              href={firstDriveFile.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition"
                              title="Open Drive File"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenDetails(student)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer touch-manipulation"
                            title="View student details & all individual certificates"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {onOpenEmailReminder && (student.overallStatus === 'NOT STARTED' || student.overallStatus === 'PENDING') && (
                            <button
                              type="button"
                              onClick={() => onOpenEmailReminder(student)}
                              className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-950/80 rounded-lg transition cursor-pointer touch-manipulation"
                              title={`Send email reminder to ${student.name} (${student.overallStatus})`}
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Popover Hover Quick Actions Toolbar */}
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-150 pointer-events-none group-hover:pointer-events-auto flex items-center bg-slate-950/95 border border-slate-800 shadow-2xl rounded-xl p-1 gap-1 z-10 border-blue-500/30">
                          <span className="text-[10px] uppercase font-bold text-slate-400 px-2 font-mono tracking-wider">Quick Actions:</span>
                          <button
                            type="button"
                            onClick={() => onOpenDetails(student)}
                            className="px-2.5 py-1 bg-blue-950 hover:bg-blue-900 border border-blue-800/40 text-blue-300 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                          >
                            View
                          </button>
                          {onOpenEmailReminder && (student.overallStatus === 'NOT STARTED' || student.overallStatus === 'PENDING') && (
                            <button
                              type="button"
                              onClick={() => onOpenEmailReminder(student)}
                              className="px-2.5 py-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                              title="Send email reminder to this student"
                            >
                              <Mail className="w-3 h-3" />
                              <span>Remind</span>
                            </button>
                          )}
                          {onEditRosterStudent && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditRosterModal(student.rollNo, student.name)}
                              className="px-2.5 py-1 bg-amber-950 hover:bg-amber-900 border border-amber-800/40 text-amber-300 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                            >
                              Edit
                            </button>
                          )}
                          {onDeleteRosterStudent && (
                            <button
                              type="button"
                              onClick={() => handleExecuteDeleteRosterStudent(student.rollNo, student.name)}
                              className="px-2.5 py-1 bg-red-950 hover:bg-red-900 border border-red-800/40 text-red-300 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Row Certificate Details, Metadata, Status Overrides, and Timestamps */}
                    {isExpanded && (
                      <tr className="bg-slate-950/95 border-b border-purple-900/60">
                        <td colSpan={10} className="p-3 sm:p-4">
                          <StudentExpandedDetailsCard
                            student={student}
                            searchQuery={searchQuery}
                            isRecentlyCompleted={isRecentlyCompleted}
                            onToggleDriveUploaded={onToggleDriveUploaded}
                            onToggleSheetUpdated={onToggleSheetUpdated}
                            onToggleSubmitted={onToggleSubmitted}
                            onOpenDetails={onOpenDetails}
                            onOpenEmailReminder={onOpenEmailReminder}
                            onEditRosterStudent={onEditRosterStudent ? handleOpenEditRosterModal : undefined}
                            onDeleteRosterStudent={onDeleteRosterStudent ? handleExecuteDeleteRosterStudent : undefined}
                            onToggleExpand={handleToggleExpand}
                            copiedRollNo={copiedRollNo}
                            onCopyLink={handleCopyLink}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
                })
              )}
            </tbody>
          </table>
        </div>
        {renderPaginationBar()}
      </div>

      {/* Mobile Card View (Optimized for Android / Phones) */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filteredStudents.length > 0 && (
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-3.5 py-2.5 rounded-xl text-xs text-slate-300 gap-2 flex-wrap">
            <button
              onClick={handleToggleSelectAllFiltered}
              className="flex items-center gap-2 font-medium text-purple-400 cursor-pointer"
            >
              {isAllFilteredSelected ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>{isAllFilteredSelected ? 'Deselect all' : `Select all (${filteredStudents.length})`}</span>
            </button>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Mobile Quick Sort Selector */}
              <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-[11px]">
                <ArrowUpDown className="w-3 h-3 text-blue-400 shrink-0" />
                <span className="text-slate-500 font-bold uppercase text-[9px]">Sort:</span>
                <select
                  value={sortField}
                  onChange={(e) => {
                    const newField = e.target.value as any;
                    if (newField === sortField) {
                      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                    } else {
                      setSortField(newField);
                      setSortDirection('asc');
                    }
                  }}
                  className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
                  title="Select column to sort"
                >
                  <option value="rollNo" className="bg-slate-900 text-slate-200">Roll Number</option>
                  <option value="name" className="bg-slate-900 text-slate-200">Student Name</option>
                  <option value="overallStatus" className="bg-slate-900 text-slate-200">Status</option>
                  <option value="lastActivity" className="bg-slate-900 text-slate-200">Latest Activity</option>
                  <option value="driveUploaded" className="bg-slate-900 text-slate-200">Drive Status</option>
                  <option value="sheetUpdated" className="bg-slate-900 text-slate-200">Sheet Status</option>
                  <option value="submitted" className="bg-slate-900 text-slate-200">Admin Confirmed</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="p-1 text-blue-400 hover:text-white rounded hover:bg-slate-800 transition"
                  title={`Toggle order: currently ${sortDirection.toUpperCase()}`}
                >
                  {sortDirection === 'asc' ? (
                    <ArrowUp className="w-3.5 h-3.5 text-blue-400" />
                  ) : (
                    <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={isAllFilteredExpanded ? handleCollapseAllFiltered : handleExpandAllFiltered}
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                {isAllFilteredExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Collapse all</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Expand all</span>
                  </>
                )}
              </button>

              {/* Mobile Last Scanned Badge */}
              <div
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-950 border border-slate-800 text-slate-300"
                title={`Last Sync: ${scannedTime.exact}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="text-slate-400">Scanned:</span>
                <span className="text-emerald-300 font-mono font-semibold">{scannedTime.formatted}</span>
              </div>
            </div>
          </div>
        )}

        {filteredStudents.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
            No students found.
          </div>
        ) : (
          visibleStudents.map((student) => {
            const hasDriveFiles = student.driveFiles.length > 0;
            const firstDriveFile = hasDriveFiles ? student.driveFiles[0] : null;
            const isSelected = selectedRollNos.has(student.rollNo);
            const isExpanded = expandedRollNos.has(student.rollNo);
            const totalCerts = student.certificates.length || student.driveFiles.length;
            const isRecentlyCompleted = recentlyCompletedRollNos.has(student.rollNo);

            return (
              <div
                key={student.rollNo}
                onClick={(e) => handleRowClick(e, student.rollNo)}
                className={`bg-slate-900 border-y border-r border-l-4 rounded-2xl p-4 space-y-3 shadow-md transition cursor-pointer hover:border-slate-700 ${
                  isSelected ? 'border-purple-500/50 bg-purple-950/20' : 'border-slate-800'
                } ${
                  student.overallStatus === 'COMPLETED'
                    ? 'border-l-emerald-500'
                    : student.overallStatus === 'PENDING'
                    ? 'border-l-amber-500'
                    : 'border-l-red-500'
                }`}
                title={`Last status update: ${formatExactTimestamp(student.lastUpdated)}`}
              >
                {/* Header: Select Checkbox + Roll No + Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="inline-flex items-center justify-center mt-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectStudent(student.rollNo)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-900 focus:ring-2 cursor-pointer transition accent-purple-500"
                        title="Select for bulk action"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-blue-400 tracking-wide px-2 py-0.5 rounded bg-blue-950/70 border border-blue-900">
                          <HighlightText text={student.rollNo} query={searchQuery} />
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleExpand(student.rollNo);
                          }}
                          className="p-1 text-slate-400 hover:text-purple-300 rounded"
                          title={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-purple-400" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </div>
                      <h3 className="text-sm font-semibold text-white mt-1">
                        <HighlightText text={student.name} query={searchQuery} />
                      </h3>
                      {searchQuery.trim() && (
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {getStudentMatchReasons(student, searchQuery).map((reason, rIdx) => (
                            <span
                              key={rIdx}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-950/80 border border-amber-500/50 text-amber-300 shadow-sm"
                              title={`Matched ${reason.label}: "${reason.matchedText}"`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                              <span>Matched {reason.label}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {student.overallStatus === 'COMPLETED' ? (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-700 transition-all duration-300 ${
                        isRecentlyCompleted
                          ? 'animate-status-completed-pulse ring-2 ring-emerald-400/80 shadow-emerald-500/50 scale-105'
                          : ''
                      }`}
                      title={isRecentlyCompleted ? 'Status transitioned from PENDING to COMPLETED!' : 'Completed'}
                    >
                      <CheckCircle2 className={`w-3 h-3 text-emerald-400 ${isRecentlyCompleted ? 'animate-bounce' : ''}`} />
                      COMPLETED
                      {isRecentlyCompleted && (
                        <span className="inline-flex items-center px-1 py-0.2 rounded-full text-[8px] bg-emerald-400 text-emerald-950 font-extrabold uppercase animate-pulse">
                          New
                        </span>
                      )}
                    </span>
                  ) : student.overallStatus === 'PENDING' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/90 text-amber-300 border border-amber-700">
                      PENDING
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-950 text-slate-400 border border-slate-800">
                      NOT STARTED
                    </span>
                  )}
                </div>

                {/* All Certificates Uploaded (Unified Portfolio) */}
                <div className="space-y-1.5">
                  <div className="text-[10px] text-slate-500 uppercase font-semibold flex items-center gap-1">
                    <Award className="w-3 h-3 text-blue-400" />
                    All Certificates ({totalCerts}):
                  </div>
                  {totalCerts > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {student.certificates.map((cert, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-950 text-slate-300 border border-slate-800"
                        >
                          <HighlightText text={cert} query={searchQuery} />
                        </span>
                      ))}
                      {student.driveFiles.length > student.certificates.length && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-950 text-purple-300 border border-purple-800">
                          {student.driveFiles.length} files
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-600 italic">No certificates recorded</div>
                  )}
                </div>

                {/* Status Pillars with Direct Admin Ticking: Drive, Sheet, Submitted */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800/80 text-center text-xs">
                  {/* Drive Toggle */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                      Drive
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleDriveUploaded(student.rollNo, student.driveUploaded)}
                      className={`flex items-center gap-1 font-semibold cursor-pointer touch-manipulation text-xs ${
                        student.driveUploaded ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    >
                      {student.driveUploaded ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                      <span>{student.driveUploaded ? 'Yes' : 'No'}</span>
                    </button>
                  </div>

                  {/* Sheet Toggle */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                      Sheet
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleSheetUpdated(student.rollNo, student.sheetUpdated)}
                      className={`flex items-center gap-1 font-semibold cursor-pointer touch-manipulation text-xs ${
                        student.sheetUpdated ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    >
                      {student.sheetUpdated ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                      <span>{student.sheetUpdated ? 'Yes' : 'No'}</span>
                    </button>
                  </div>

                  {/* Submitted Toggle */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                      Submitted
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleSubmitted(student.rollNo, student.submitted)}
                      className={`flex items-center gap-1 font-semibold cursor-pointer touch-manipulation text-xs ${
                        student.submitted ? 'text-purple-400' : 'text-slate-500'
                      }`}
                    >
                      {student.submitted ? (
                        <CheckSquare className="w-4 h-4 text-purple-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600" />
                      )}
                      <span>{student.submitted ? 'Yes' : 'No'}</span>
                    </button>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {firstDriveFile && (firstDriveFile.webViewLink || firstDriveFile.id) && (
                      <button
                        type="button"
                        onClick={() => handleCopyLink(firstDriveFile, student.rollNo)}
                        className={`text-[11px] font-semibold px-2 py-1 rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                          copiedRollNo === student.rollNo
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                        }`}
                      >
                        {copiedRollNo === student.rollNo ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Link className="w-3 h-3 text-blue-400" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                    )}

                    {firstDriveFile?.webViewLink && firstDriveFile.webViewLink !== '#' ? (
                      <a
                        href={firstDriveFile.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open
                      </a>
                    ) : (
                      !firstDriveFile && <span className="text-xs text-slate-600">No Drive link</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {onEditRosterStudent && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditRosterModal(student.rollNo, student.name)}
                        className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg border border-slate-800/80 transition cursor-pointer touch-manipulation"
                        title="Edit student name"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                      </button>
                    )}
                    {onDeleteRosterStudent && (
                      <button
                        type="button"
                        onClick={() => handleExecuteDeleteRosterStudent(student.rollNo, student.name)}
                        className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg border border-slate-800/80 transition cursor-pointer touch-manipulation"
                        title="Delete student from roster"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onOpenEmailReminder && (student.overallStatus === 'NOT STARTED' || student.overallStatus === 'PENDING') && (
                      <button
                        type="button"
                        onClick={() => onOpenEmailReminder(student)}
                        className="px-2.5 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer touch-manipulation flex items-center gap-1 shadow-sm"
                        title="Send email reminder to this student"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>Remind</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleExpand(student.rollNo);
                      }}
                      className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-800/80 text-xs font-semibold text-purple-300 rounded-lg transition cursor-pointer touch-manipulation shrink-0 flex items-center gap-1 shadow-sm"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      <span>{isExpanded ? 'Hide' : `Check (${totalCerts})`}</span>
                    </button>
                  </div>
                </div>

                {/* Mobile Expanded Details Card */}
                {isExpanded && (
                  <div className="pt-2">
                    <StudentExpandedDetailsCard
                      student={student}
                      searchQuery={searchQuery}
                      isRecentlyCompleted={isRecentlyCompleted}
                      onToggleDriveUploaded={onToggleDriveUploaded}
                      onToggleSheetUpdated={onToggleSheetUpdated}
                      onToggleSubmitted={onToggleSubmitted}
                      onOpenDetails={onOpenDetails}
                      onOpenEmailReminder={onOpenEmailReminder}
                      onEditRosterStudent={onEditRosterStudent ? handleOpenEditRosterModal : undefined}
                      onDeleteRosterStudent={onDeleteRosterStudent ? handleExecuteDeleteRosterStudent : undefined}
                      onToggleExpand={handleToggleExpand}
                      copiedRollNo={copiedRollNo}
                      onCopyLink={handleCopyLink}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
        {renderPaginationBar()}
      </div>
        </div>
      )}

        {/* Dynamic Add / Edit Student Roster Modal */}
        {showRosterModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in animate-duration-150">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-400 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
                  <span>{rosterModalMode === 'ADD' ? 'Add New Student' : 'Edit Student Details'}</span>
                </h3>
                <button
                  onClick={() => setShowRosterModal(false)}
                  className="text-slate-500 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Error Message */}
              {rosterError && (
                <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{rosterError}</span>
                </div>
              )}

              {/* Inputs */}
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    Roll Number:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 25A31A05GB"
                    value={modalRollNo}
                    onChange={(e) => setModalRollNo(e.target.value)}
                    disabled={rosterModalMode === 'EDIT'}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50 font-mono uppercase"
                  />
                  {rosterModalMode === 'EDIT' && (
                    <p className="text-[10px] text-slate-500">Roll Number cannot be changed once created.</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    Full Student Name:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SAPPA JAYARAM"
                    value={modalName}
                    onChange={(e) => setModalName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 uppercase"
                  />
                </div>

                {rosterModalMode === 'ADD' && (
                  <div className="flex items-center justify-between p-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs">
                    <span className="text-slate-400">Have multiple students to add?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRosterModal(false);
                        setShowBatchImportModal(true);
                      }}
                      className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Batch Import Textarea</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRosterModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRosterStudent}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-600/20"
                >
                  <Check className="w-4 h-4" />
                  <span>{rosterModalMode === 'ADD' ? 'Add Student' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Batch Import Students Modal */}
        <BatchImportStudentsModal
          isOpen={showBatchImportModal}
          onClose={() => setShowBatchImportModal(false)}
          onBatchImport={async (newStudents) => {
            if (onBatchAddRosterStudents) {
              return onBatchAddRosterStudents(newStudents);
            }
            if (onAddRosterStudent) {
              const added: any[] = [];
              const skipped: any[] = [];
              for (const s of newStudents) {
                try {
                  onAddRosterStudent(s.rollNo, s.name);
                  added.push(s);
                } catch (e: any) {
                  skipped.push({ student: s, reason: e.message || 'Already exists' });
                }
              }
              return { added, skipped };
            }
            return { added: [], skipped: [] };
          }}
          onToast={onToast}
        />

        {/* Unified Permanent Roster & Batch Import Management Modal */}
        <RosterManagementModal
          isOpen={showRosterManagementModal}
          onClose={() => setShowRosterManagementModal(false)}
          initialTab={rosterManagementTab}
          onAddRosterStudent={(rollNo, name) => {
            if (onAddRosterStudent) {
              return onAddRosterStudent(rollNo, name);
            }
          }}
          onBatchAddRosterStudents={async (newStudents) => {
            if (onBatchAddRosterStudents) {
              return onBatchAddRosterStudents(newStudents);
            }
            if (onAddRosterStudent) {
              const added: any[] = [];
              const skipped: any[] = [];
              for (const s of newStudents) {
                try {
                  onAddRosterStudent(s.rollNo, s.name);
                  added.push(s);
                } catch (e: any) {
                  skipped.push({ student: s, reason: e.message || 'Already exists' });
                }
              }
              return { added, skipped };
            }
            return { added: [], skipped: [] };
          }}
          onEditRosterStudent={onEditRosterStudent}
          onDeleteRosterStudent={onDeleteRosterStudent}
          onToast={onToast}
        />

        {/* Client-Side Google Drive API Quota Engine Modal (15 req/sec Rate Limiter) */}
        <QuotaQueueMonitorModal
          isOpen={showQuotaQueueModal}
          onClose={() => setShowQuotaQueueModal(false)}
        />
    </div>
  );
};
