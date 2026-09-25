import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  CheckSquare,
  Square,
  MinusSquare,
  FileSpreadsheet,
  Check,
  X,
  ListChecks,
} from 'lucide-react';
import { StudentStatusRecord } from '../types';

interface StudentTableProps {
  students: StudentStatusRecord[];
  onToggleSubmitted: (rollNo: string, current: boolean) => void;
  onBatchSetSubmitted?: (rollNos: string[], submitted: boolean) => void;
  onOpenDetails: (student: StudentStatusRecord) => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  onExportCsv: () => void;
  onExportSummaryReport: () => void;
}

export const StudentTable: React.FC<StudentTableProps> = ({
  students,
  onToggleSubmitted,
  onBatchSetSubmitted,
  onOpenDetails,
  activeFilter,
  setActiveFilter,
  onExportCsv,
  onExportSummaryReport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRollNos, setSelectedRollNos] = useState<Set<string>>(new Set());

  // Filtering and Searching
  const filteredStudents = useMemo(() => {
    let result = [...students];

    // 1. Text Search (Roll No, Name, or Certificate Type)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((s) => {
        const matchRoll = s.rollNo.toLowerCase().includes(q);
        const matchName = s.name.toLowerCase().includes(q);
        const matchCerts = s.certificates.some((c) => c.toLowerCase().includes(q));
        return matchRoll || matchName || matchCerts;
      });
    }

    // 2. Filter Pills
    switch (activeFilter) {
      case 'COMPLETED':
        result = result.filter((s) => s.overallStatus === 'COMPLETED');
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
      case 'DRIVE_PENDING':
        result = result.filter((s) => !s.driveUploaded);
        break;
      case 'SHEET_UPDATED':
        result = result.filter((s) => s.sheetUpdated);
        break;
      case 'SHEET_PENDING':
        result = result.filter((s) => !s.sheetUpdated);
        break;
      case 'SUBMITTED':
        result = result.filter((s) => s.submitted);
        break;
      case 'SUBMISSION_PENDING':
        result = result.filter((s) => !s.submitted);
        break;
      case 'CERT_FOUND':
        result = result.filter((s) => s.certificates.length > 0 || s.driveUploaded);
        break;
      case 'NO_CERT':
        result = result.filter((s) => s.certificates.length === 0 && !s.driveUploaded);
        break;
      case 'ALL':
      default:
        break;
    }

    return result;
  }, [students, searchQuery, activeFilter]);

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
      // Deselect all currently filtered students
      setSelectedRollNos((prev) => {
        const next = new Set(prev);
        filteredStudents.forEach((s) => next.delete(s.rollNo));
        return next;
      });
    } else {
      // Select all currently filtered students
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

  // Perform Bulk Action
  const handleBulkSetSubmitted = (submitted: boolean) => {
    if (selectedRollNos.size === 0) return;
    const rollNos = Array.from(selectedRollNos);
    if (onBatchSetSubmitted) {
      onBatchSetSubmitted(rollNos, submitted);
    } else {
      // Fallback: individually toggle
      rollNos.forEach((r) => onToggleSubmitted(r, !submitted));
    }
  };

  const filterOptions = [
    { id: 'ALL', label: 'All (67)' },
    { id: 'COMPLETED', label: 'Completed' },
    { id: 'PENDING', label: 'Pending' },
    { id: 'NOT_STARTED', label: 'Not Started' },
    { id: 'DRIVE_PENDING', label: 'Drive Pending' },
    { id: 'SHEET_PENDING', label: 'Sheet Pending' },
    { id: 'SUBMISSION_PENDING', label: 'Submission Pending' },
    { id: 'CERT_FOUND', label: 'Certificate Found' },
    { id: 'NO_CERT', label: 'No Certificate' },
  ];

  return (
    <div className="space-y-4">
      {/* Controls Bar: Search, Filters, and Export */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Roll No (e.g. 25A31A05EN), Name, or Certificate..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Action Buttons: Export CSV & Report */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs sm:text-sm font-medium rounded-xl transition cursor-pointer"
              title="Download CSV for all 67 students"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export CSV</span>
            </button>
            <button
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

        {/* Active Results Summary */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
          <div>
            Showing <span className="font-semibold text-white">{filteredStudents.length}</span> of 67 students
            {searchQuery && (
              <span className="ml-1 text-slate-500">
                matching "{searchQuery}"
              </span>
            )}
          </div>
          {activeFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setActiveFilter('ALL')}
              className="text-blue-400 hover:underline cursor-pointer touch-manipulation"
            >
              Reset filter
            </button>
          )}
        </div>
      </div>

      {/* Prominent Bulk Action Toolbar (When 1 or more students are selected) */}
      {selectedRollNos.size > 0 && (
        <div className="bg-gradient-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border-2 border-purple-500/40 rounded-2xl p-3.5 shadow-2xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1">
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

          {/* Bulk Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleBulkSetSubmitted(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-lg shadow-purple-600/30 cursor-pointer touch-manipulation"
              title="Mark all selected students as Submitted (TRUE)"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Mark as Submitted</span>
            </button>

            <button
              type="button"
              onClick={() => handleBulkSetSubmitted(false)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs sm:text-sm font-medium rounded-xl transition cursor-pointer touch-manipulation"
              title="Mark all selected students as Not Submitted (FALSE)"
            >
              <Square className="w-4 h-4 text-slate-400" />
              <span>Mark as Not Submitted</span>
            </button>

            <button
              type="button"
              onClick={handleClearSelection}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition cursor-pointer touch-manipulation"
              title="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                {/* Bulk Select All Checkbox Column */}
                <th className="py-3.5 px-4 w-12 text-center">
                  <button
                    type="button"
                    onClick={handleToggleSelectAllFiltered}
                    className="inline-flex items-center justify-center w-5 h-5 rounded transition text-purple-400 hover:text-purple-300 cursor-pointer"
                    title={
                      isAllFilteredSelected
                        ? 'Deselect all filtered'
                        : 'Select all filtered students'
                    }
                  >
                    {isAllFilteredSelected ? (
                      <CheckSquare className="w-5 h-5 text-purple-400" />
                    ) : isSomeFilteredSelected ? (
                      <MinusSquare className="w-5 h-5 text-purple-400" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-500 hover:text-slate-300" />
                    )}
                  </button>
                </th>
                <th className="py-3.5 px-4 w-32">Roll No</th>
                <th className="py-3.5 px-4">Student Name</th>
                <th className="py-3.5 px-4">Certificates</th>
                <th className="py-3.5 px-4 text-center w-20">Drive</th>
                <th className="py-3.5 px-4 text-center w-20">Sheet</th>
                <th className="py-3.5 px-4 text-center w-24">Submitted</th>
                <th className="py-3.5 px-4 text-center w-32">Overall Status</th>
                <th className="py-3.5 px-4 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No students match the selected filters or search query.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const hasDriveFiles = student.driveFiles.length > 0;
                  const firstDriveFile = hasDriveFiles ? student.driveFiles[0] : null;
                  const isSelected = selectedRollNos.has(student.rollNo);

                  return (
                    <tr
                      key={student.rollNo}
                      className={`hover:bg-slate-800/40 transition group ${
                        isSelected ? 'bg-purple-950/20' : ''
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectStudent(student.rollNo)}
                          className="inline-flex items-center justify-center w-5 h-5 rounded transition text-purple-400 hover:text-purple-300 cursor-pointer"
                          title={`Select ${student.rollNo}`}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-purple-400" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-600 group-hover:text-slate-400" />
                          )}
                        </button>
                      </td>

                      {/* Roll No */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-200 tracking-wide text-xs sm:text-sm">
                        {student.rollNo}
                      </td>

                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-100">
                          {student.name}
                        </div>
                      </td>

                      {/* Certificates */}
                      <td className="py-3.5 px-4">
                        {student.certificates.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {student.certificates.map((cert, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-950/70 text-blue-300 border border-blue-800/60"
                              >
                                {cert}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">None</span>
                        )}
                      </td>

                      {/* Drive Uploaded */}
                      <td className="py-3.5 px-4 text-center">
                        {student.driveUploaded ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800/70" title="Certificate found in Google Drive">
                            <CheckCircle2 className="w-4 h-4" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-950 text-slate-600 border border-slate-800" title="Not uploaded to Google Drive">
                            <XCircle className="w-4 h-4" />
                          </span>
                        )}
                      </td>

                      {/* Spreadsheet Updated */}
                      <td className="py-3.5 px-4 text-center">
                        {student.sheetUpdated ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800/70" title="Matching record exists in Google Sheet">
                            <CheckCircle2 className="w-4 h-4" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-950 text-slate-600 border border-slate-800" title="Not updated in Google Sheet">
                            <XCircle className="w-4 h-4" />
                          </span>
                        )}
                      </td>

                      {/* Submitted (Interactive Admin Checkbox) */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => onToggleSubmitted(student.rollNo, student.submitted)}
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition cursor-pointer touch-manipulation ${
                            student.submitted
                              ? 'bg-purple-950/80 text-purple-400 border border-purple-800 hover:bg-purple-900/80'
                              : 'bg-slate-950 text-slate-500 border border-slate-800 hover:border-slate-600 hover:text-slate-300'
                          }`}
                          title={`Click to mark as ${student.submitted ? 'unsubmitted' : 'submitted'}`}
                        >
                          {student.submitted ? (
                            <CheckSquare className="w-5 h-5" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </td>

                      {/* Overall Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {student.overallStatus === 'COMPLETED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 shadow-sm shadow-emerald-900/30">
                            <CheckCircle2 className="w-3 h-3" />
                            COMPLETED
                          </span>
                        ) : student.overallStatus === 'PENDING' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-700/60">
                            <Clock className="w-3 h-3" />
                            PENDING
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-950 text-slate-400 border border-slate-800">
                            NOT STARTED
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {firstDriveFile?.webViewLink && firstDriveFile.webViewLink !== '#' && (
                            <a
                              href={firstDriveFile.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition"
                              title="Open in Google Drive"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenDetails(student)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer touch-manipulation"
                            title="View student details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View (Optimized for Android / Phones) */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {/* Mobile Select-all button bar if multiple items */}
        {filteredStudents.length > 0 && (
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl text-xs text-slate-300">
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
            {selectedRollNos.size > 0 && (
              <span className="text-slate-400 font-mono text-[11px]">
                {selectedRollNos.size} selected
              </span>
            )}
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

            return (
              <div
                key={student.rollNo}
                className={`bg-slate-900 border rounded-2xl p-4 space-y-3 shadow-md transition ${
                  isSelected ? 'border-purple-500/50 bg-purple-950/20' : 'border-slate-800'
                }`}
              >
                {/* Header: Select Checkbox + Roll No + Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleToggleSelectStudent(student.rollNo)}
                      className="mt-0.5 text-purple-400 hover:text-purple-300 transition cursor-pointer"
                      title="Select for bulk action"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-purple-400" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-600" />
                      )}
                    </button>
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

                {/* Certificates badges */}
                {student.certificates.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {student.certificates.map((cert, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-950 text-slate-300 border border-slate-800"
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                )}

                {/* Status Pillars: Drive, Sheet, Submitted */}
                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800/80 text-center text-xs">
                  {/* Drive */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                      Drive
                    </span>
                    {student.driveUploaded ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded
                      </span>
                    ) : (
                      <span className="text-slate-500 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> No file
                      </span>
                    )}
                  </div>

                  {/* Sheet */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                      Sheet
                    </span>
                    {student.sheetUpdated ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Updated
                      </span>
                    ) : (
                      <span className="text-slate-500 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Pending
                      </span>
                    )}
                  </div>

                  {/* Submitted */}
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                      Submitted
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleSubmitted(student.rollNo, student.submitted)}
                      className={`flex items-center gap-1 font-semibold cursor-pointer touch-manipulation ${
                        student.submitted ? 'text-purple-400' : 'text-slate-500'
                      }`}
                    >
                      {student.submitted ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                      <span>{student.submitted ? 'Yes' : 'No'}</span>
                    </button>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-1">
                  {firstDriveFile?.webViewLink && firstDriveFile.webViewLink !== '#' ? (
                    <a
                      href={firstDriveFile.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open in Drive
                    </a>
                  ) : (
                    <span className="text-xs text-slate-600">No Drive link</span>
                  )}

                  <button
                    type="button"
                    onClick={() => onOpenDetails(student)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg transition cursor-pointer touch-manipulation"
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
