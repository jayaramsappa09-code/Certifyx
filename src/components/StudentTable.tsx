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
} from 'lucide-react';
import {
  StudentStatusRecord,
  DateRangeFilterConfig,
  SheetRowRecord,
  DriveCertificateFile,
  ReconciliationAnalysis,
} from '../types';
import { isStudentMatchingDateRange, getLatestStudentActivity } from '../utils/dateFilterUtils';
import { DataMismatchSection } from './DataMismatchSection';
import { DiscrepancyProofCard } from './DiscrepancyProofCard';
import { BatchImportStudentsModal } from './BatchImportStudentsModal';
import { RosterManagementModal } from './RosterManagementModal';

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
  onToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRollNos, setSelectedRollNos] = useState<Set<string>>(new Set());
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [copiedRollNo, setCopiedRollNo] = useState<string | null>(null);
  const [expandedRollNos, setExpandedRollNos] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<
    'rollNo' | 'name' | 'overallStatus' | 'driveUploaded' | 'sheetUpdated' | 'submitted' | 'lastActivity'
  >('rollNo');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  const incompleteCount = useMemo(
    () => students.filter((s) => s.overallStatus === 'NOT STARTED' || s.overallStatus === 'PENDING').length,
    [students]
  );

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
    if (!modalRollNo.trim() || !modalName.trim()) {
      setRosterError('Both Roll Number and Student Name are required.');
      return;
    }
    if (rosterModalMode === 'ADD') {
      if (onAddRosterStudent) {
        try {
          onAddRosterStudent(modalRollNo, modalName);
          setShowRosterModal(false);
        } catch (e: any) {
          setRosterError(e.message || 'Error adding student.');
        }
      }
    } else {
      if (onEditRosterStudent) {
        try {
          onEditRosterStudent(modalRollNo, modalName);
          setShowRosterModal(false);
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

  // Filtering and Searching
  const filteredStudents = useMemo(() => {
    let result = [...students];

    // 1. Multi-Token Intelligent Search (Roll No, Name, Certificates, Status, Email, Phone)
    if (searchQuery.trim()) {
      const tokens = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
      result = result.filter((s) => {
        // Construct a searchable string representation of the student
        const roll = (s.rollNo || '').toLowerCase();
        const name = (s.name || '').toLowerCase();
        const status = (s.overallStatus || '').toLowerCase();
        const certs = (s.certificates || []).map((c) => (c || '').toLowerCase()).join(' ');
        const driveNames = (s.driveFiles || []).map((f) => (f.name || '').toLowerCase()).join(' ');
        const phone = (s.phone || '').toLowerCase();
        const email = (s.email || '').toLowerCase();

        const driveText = s.driveUploaded ? 'drive uploaded drive_uploaded' : 'missing drive drive_missing';
        const sheetText = s.sheetUpdated ? 'sheet updated sheet_updated' : 'missing sheet sheet_missing';
        const subText = s.submitted ? 'submitted confirmed' : 'unsubmitted pending_submission';
        const hasAnyMismatch =
          (s.countMismatch && s.countMismatch.hasMismatch) ||
          s.driveUploaded !== s.sheetUpdated ||
          ((s.driveFiles?.length || 0) !== (s.sheetRecords?.length || 0));
        const mismatchText = hasAnyMismatch ? 'mismatch count_mismatch discrepancy gap' : '';

        const fullStudentSearchText = `${roll} ${name} ${status} ${certs} ${driveNames} ${phone} ${email} ${driveText} ${sheetText} ${subText} ${mismatchText}`;

        // Every token in query must be present in the student's combined search text
        return tokens.every((token) => fullStudentSearchText.includes(token));
      });
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
        cmp = (a.name || '').localeCompare(b.name || '');
      } else if (sortField === 'overallStatus') {
        const statusOrder: Record<string, number> = {
          COMPLETED: 3,
          PENDING: 2,
          'NOT STARTED': 1,
        };
        const scoreA = statusOrder[a.overallStatus] || 0;
        const scoreB = statusOrder[b.overallStatus] || 0;
        cmp = scoreA - scoreB;
      } else if (sortField === 'driveUploaded') {
        cmp = (a.driveUploaded ? 1 : 0) - (b.driveUploaded ? 1 : 0);
      } else if (sortField === 'sheetUpdated') {
        cmp = (a.sheetUpdated ? 1 : 0) - (b.sheetUpdated ? 1 : 0);
      } else if (sortField === 'submitted') {
        cmp = (a.submitted ? 1 : 0) - (b.submitted ? 1 : 0);
      } else if (sortField === 'lastActivity') {
        const actA = getLatestStudentActivity(a)?.date.getTime() || 0;
        const actB = getLatestStudentActivity(b)?.date.getTime() || 0;
        cmp = actA - actB;
      }

      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [students, searchQuery, activeFilter, sortField, sortDirection, dateFilterConfig]);

  // Bulk Selection Helpers
  const isAllFilteredSelected =
    filteredStudents.length > 0 &&
    filteredStudents.every((s) => selectedRollNos.has(s.rollNo));

  const isSomeFilteredSelected =
    filteredStudents.some((s) => selectedRollNos.has(s.rollNo)) &&
    !isAllFilteredSelected;

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
          </div>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Table Top Header Bar with Roster Title and Last Scanned Badge */}
        <div className="px-4 py-3 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Class Section Roster
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-800">
              67 Enrolled Students
            </span>
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

                {/* Sortable Roll No */}
                <th className="py-3.5 px-4 w-32">
                  <button
                    type="button"
                    onClick={() => handleSort('rollNo')}
                    className="flex items-center gap-1.5 font-semibold hover:text-white transition cursor-pointer group text-left"
                    title="Click to sort by Roll Number"
                  >
                    <span>Roll No</span>
                    {sortField === 'rollNo' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                    )}
                  </button>
                </th>

                {/* Sortable Student Name */}
                <th className="py-3.5 px-4">
                  <button
                    type="button"
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1.5 font-semibold hover:text-white transition cursor-pointer group text-left"
                    title="Click to sort by Student Name"
                  >
                    <span>Student Name</span>
                    {sortField === 'name' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                    )}
                  </button>
                </th>

                <th className="py-3.5 px-4">All Certificates Uploaded (Unified)</th>

                {/* Sortable Drive Uploaded */}
                <th className="py-3.5 px-4 text-center w-28">
                  <button
                    type="button"
                    onClick={() => handleSort('driveUploaded')}
                    className="inline-flex items-center justify-center gap-1 font-semibold hover:text-white transition cursor-pointer group"
                    title="Click to sort by Drive Upload Status"
                  >
                    <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                    <span>Drive</span>
                    {sortField === 'driveUploaded' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                    )}
                  </button>
                </th>

                {/* Sortable Sheet Updated */}
                <th className="py-3.5 px-4 text-center w-28">
                  <button
                    type="button"
                    onClick={() => handleSort('sheetUpdated')}
                    className="inline-flex items-center justify-center gap-1 font-semibold hover:text-white transition cursor-pointer group"
                    title="Click to sort by Sheet Record Status"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Sheet</span>
                    {sortField === 'sheetUpdated' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                    )}
                  </button>
                </th>

                {/* Sortable Admin Confirmed */}
                <th className="py-3.5 px-4 text-center w-28">
                  <button
                    type="button"
                    onClick={() => handleSort('submitted')}
                    className="inline-flex items-center justify-center gap-1 font-semibold hover:text-white transition cursor-pointer group"
                    title="Click to sort by Admin Confirmed Status"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
                    <span>Submitted</span>
                    {sortField === 'submitted' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                    )}
                  </button>
                </th>

                {/* Sortable Overall Status */}
                <th className="py-3.5 px-4 text-center w-36">
                  <button
                    type="button"
                    onClick={() => handleSort('overallStatus')}
                    className="inline-flex items-center justify-center gap-1 font-semibold hover:text-white transition cursor-pointer group"
                    title="Click to sort by Overall Verification Status"
                  >
                    <span>Overall Status</span>
                    {sortField === 'overallStatus' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                    )}
                  </button>
                </th>

                {/* Sortable Recent Activity Date */}
                <th className="py-3.5 px-4 text-center w-32">
                  <button
                    type="button"
                    onClick={() => handleSort('lastActivity')}
                    className="inline-flex items-center justify-center gap-1 font-semibold hover:text-white transition cursor-pointer group"
                    title="Click to sort by Latest Submission / Activity Date"
                  >
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>Latest Activity</span>
                    {sortField === 'lastActivity' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-blue-400" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                    )}
                  </button>
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
                filteredStudents.map((student) => {
                  const hasDriveFiles = student.driveFiles.length > 0;
                  const firstDriveFile = hasDriveFiles ? student.driveFiles[0] : null;
                  const isSelected = selectedRollNos.has(student.rollNo);
                  const isExpanded = expandedRollNos.has(student.rollNo);
                  const totalCerts = student.certificates.length || student.driveFiles.length;

                  return (
                    <React.Fragment key={student.rollNo}>
                      <tr
                        className={`student-row-item transition-all duration-200 hover:bg-slate-800/80 hover:shadow-lg hover:shadow-slate-950/40 group ${
                          isSelected ? 'bg-purple-950/20' : ''
                        } ${isExpanded ? 'bg-slate-900/80 border-b border-purple-800/40' : ''}`}
                      >
                        {/* Selection Checkbox with status color left-border indicator */}
                        <td 
                          className={`py-3.5 px-4 text-center border-l-4 transition-colors duration-150 relative group/border ${
                            student.overallStatus === 'COMPLETED'
                              ? 'border-l-emerald-500/90'
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
                                  : student.overallStatus === 'PENDING'
                                  ? 'bg-amber-400 animate-pulse'
                                  : 'bg-red-400'
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
                            {student.rollNo}
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
                            <span>{student.name}</span>
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
                                  {cert}
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
                              <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-400 font-mono">
                                {student.driveFiles.slice(0, 3).map((f, fIdx) => (
                                  <a
                                    key={f.id || fIdx}
                                    href={f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-blue-400 hover:underline bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 truncate max-w-[140px] inline-block"
                                    title={`Open Drive File: ${f.name}`}
                                  >
                                    📄 {f.name}
                                  </a>
                                ))}
                                {student.driveFiles.length > 3 && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenDetails(student)}
                                    className="text-blue-400 hover:underline cursor-pointer"
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
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-600 shadow-sm shadow-emerald-900/40">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              COMPLETED
                            </span>
                          ) : student.overallStatus === 'PENDING' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-700/70">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              PENDING
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-950 text-slate-400 border border-slate-800">
                              NOT STARTED
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

                    {/* Expanded Row Certificate & Real Discrepancy Breakdown */}
                    {isExpanded && (
                      <tr className="bg-slate-950/90 border-b border-purple-900/60">
                        <td colSpan={9} className="p-4 space-y-3">
                          {/* Real Discrepancy Audit Proof Card */}
                          <DiscrepancyProofCard student={student} onOpenEmailReminder={onOpenEmailReminder} />

                          <div className="bg-slate-900/90 border border-purple-800/50 rounded-2xl p-4 space-y-3 shadow-inner">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Award className="w-4 h-4 text-purple-400" />
                                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                                  Individual Certificate Tracking Breakdown ({student.rollNo} - {student.name})
                                </h4>
                              </div>
                              <span className="text-[10px] font-mono px-2 py-0.5 bg-purple-950 text-purple-300 border border-purple-800 rounded-md">
                                {totalCerts} Total Item{totalCerts === 1 ? '' : 's'} Tracked
                              </span>
                            </div>

                            {student.certificates.length === 0 && student.driveFiles.length === 0 ? (
                              <p className="text-xs text-slate-500 italic">No certificates recorded for this student.</p>
                            ) : (
                              <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden">
                                {student.certificates.map((certTitle, cIdx) => {
                                  const matchingFile = student.driveFiles[cIdx] || student.driveFiles[0];
                                  return (
                                    <div
                                      key={cIdx}
                                      className="p-2.5 bg-slate-950/70 hover:bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition"
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 rounded-lg bg-purple-950 text-purple-300 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 border border-purple-800">
                                          #{cIdx + 1}
                                        </span>
                                        <div>
                                          <span className="font-bold text-white block">{certTitle}</span>
                                          <span className="text-[10px] text-slate-400 font-mono">
                                            Roll No: {student.rollNo} • Verified Student Certificate
                                          </span>
                                        </div>
                                      </div>

                                      {matchingFile && (
                                        <div className="flex items-center gap-2 text-[11px]">
                                          <span className="text-[10px] text-slate-400 truncate max-w-[200px]">
                                            📄 {matchingFile.name}
                                          </span>
                                          <a
                                            href={matchingFile.webViewLink || `https://drive.google.com/file/d/${matchingFile.id}/view`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-2.5 py-1 rounded-lg bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800/80 flex items-center gap-1 font-mono transition text-[10px] font-semibold"
                                          >
                                            <ExternalLink className="w-3 h-3" />
                                            <span>Open Drive File</span>
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
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
      </div>

      {/* Mobile Card View (Optimized for Android / Phones) */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filteredStudents.length > 0 && (
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-3.5 py-2.5 rounded-xl text-xs text-slate-300 gap-2">
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
        )}

        {filteredStudents.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
            No students found.
          </div>
        ) : (
          filteredStudents.map((student) => {
            const hasDriveFiles = student.driveFiles.length > 0;
            const firstDriveFile = hasDriveFiles ? student.driveFiles[0] : null;
            const isSelected = selectedRollNos.has(student.rollNo);
            const totalCerts = student.certificates.length || student.driveFiles.length;

            return (
              <div
                key={student.rollNo}
                className={`bg-slate-900 border-y border-r border-l-4 rounded-2xl p-4 space-y-3 shadow-md transition ${
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
                      <span className="font-mono text-xs font-bold text-blue-400 tracking-wide px-2 py-0.5 rounded bg-blue-950/70 border border-blue-900">
                        {student.rollNo}
                      </span>
                      <h3 className="text-sm font-semibold text-white mt-1">
                        {student.name}
                      </h3>
                    </div>
                  </div>

                  {student.overallStatus === 'COMPLETED' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-700">
                      COMPLETED
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
                          {cert}
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
                <div className="flex items-center justify-between pt-1 gap-2">
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
                      onClick={() => onOpenDetails(student)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg transition cursor-pointer touch-manipulation shrink-0"
                    >
                      View Details ({totalCerts})
                    </button>
                  </div>
                </div>
              </div>
            );
          })
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
      </div>
    </div>
  );
};
