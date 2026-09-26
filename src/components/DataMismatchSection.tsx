import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  FileSpreadsheet,
  HardDrive,
  Users,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  Mail,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Scale,
  FileText,
} from 'lucide-react';
import {
  StudentStatusRecord,
  SheetRowRecord,
  DriveCertificateFile,
  ReconciliationAnalysis,
} from '../types';
import {
  generateReconciliationAnalysis,
  exportDataMismatchCsv,
} from '../utils/reconciliationAnalyzer';

interface DataMismatchSectionProps {
  students: StudentStatusRecord[];
  sheetRows?: SheetRowRecord[];
  driveFiles?: DriveCertificateFile[];
  initialAnalysis?: ReconciliationAnalysis;
  onFilterTableByMismatch?: (filterId: string) => void;
  onOpenStudentDetails?: (student: StudentStatusRecord) => void;
  onOpenEmailReminder?: (student?: StudentStatusRecord) => void;
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const DataMismatchSection: React.FC<DataMismatchSectionProps> = ({
  students,
  sheetRows = [],
  driveFiles = [],
  initialAnalysis,
  onFilterTableByMismatch,
  onOpenStudentDetails,
  onOpenEmailReminder,
  onToast,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [strictRosterEnforced, setStrictRosterEnforced] = useState(true);
  const [outsideRowsSearch, setOutsideRowsSearch] = useState('');
  const [activeTab, setActiveTab] = useState<
    'ALL' | 'ROSTER_MISSING_SHEET' | 'SHEET_OUTSIDE_ROSTER' | 'DRIVE_MISSING_SHEET' | 'SHEET_MISSING_DRIVE' | 'QUANTITY_MISMATCH'
  >('ALL');

  // Compute live analysis if not supplied, respecting strict roster boundary
  const analysis: ReconciliationAnalysis = useMemo(() => {
    return generateReconciliationAnalysis(students, sheetRows, driveFiles, strictRosterEnforced);
  }, [students, sheetRows, driveFiles, strictRosterEnforced]);

  const handleExportCsv = () => {
    exportDataMismatchCsv(analysis);
    onToast?.(
      `Exported Data Mismatch Audit CSV (${analysis.summary.totalGapsCount} class gaps, ${analysis.summary.outsideClassQuarantinedCount} outside rows quarantined)`,
      'success'
    );
  };

  const handleExportOutsideRowsOnly = () => {
    const lines: string[] = [];
    lines.push(`"OUTSIDE CLASS SPREADSHEET SUBMISSIONS QUARANTINE REPORT"`);
    lines.push(`"Total Outside Rows Filtered",${analysis.sheetMissingInRoster.length}`);
    lines.push(`"Generated At","${new Date().toLocaleString()}"`);
    lines.push('');
    lines.push(`"Row #","Recorded Roll No","Recorded Name","Recorded Email","Certificate Type","Reason","Suggested Match"`);
    analysis.sheetMissingInRoster.forEach((r) => {
      const sug = r.suggestedRosterMatch ? `${r.suggestedRosterMatch.rollNo} (${r.suggestedRosterMatch.confidence}%)` : 'None';
      lines.push(`"${r.rowIndex}","${r.rawRoll}","${r.rawName || ''}","${r.rawEmail || ''}","${r.certificateType || ''}","${r.reason}","${sug}"`);
    });

    const csvContent = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Outside_Class_Quarantine_Submissions_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    onToast?.(`Exported ${analysis.sheetMissingInRoster.length} outside-class submissions to CSV.`, 'success');
  };

  const handleApplyFilter = (filterKey: string) => {
    onFilterTableByMismatch?.(filterKey);
    onToast?.(`Filtered Student Table to match selected discrepancy category.`, 'info');
  };

  const totalGaps = analysis.summary.totalGapsCount;
  const outsideCount = analysis.summary.outsideClassQuarantinedCount || analysis.summary.sheetOutsideRosterCount;

  // Filter outside rows by search if user wants to inspect them
  const filteredOutsideRows = useMemo(() => {
    if (!outsideRowsSearch.trim()) return analysis.sheetMissingInRoster.slice(0, 50);
    const q = outsideRowsSearch.toLowerCase().trim();
    return analysis.sheetMissingInRoster.filter(
      (r) =>
        r.rawRoll.toLowerCase().includes(q) ||
        (r.rawName && r.rawName.toLowerCase().includes(q)) ||
        (r.rawEmail && r.rawEmail.toLowerCase().includes(q))
    ).slice(0, 50);
  }, [analysis.sheetMissingInRoster, outsideRowsSearch]);

  return (
    <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl shadow-xl overflow-hidden transition-all duration-200">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/30 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Data Mismatch &amp; Reconciliation Analyzer</span>
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold uppercase ${
                  totalGaps === 0
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : 'bg-amber-950 text-amber-300 border border-amber-500/50 animate-pulse'
                }`}
              >
                {totalGaps === 0
                  ? outsideCount > 0
                    ? `✓ 0 Class Gaps (${outsideCount} outside rows filtered)`
                    : '✓ Zero Gaps'
                  : `${totalGaps} Class Discrepancies`}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-blue-950 text-blue-300 border border-blue-800">
                Class Integrity: {analysis.summary.integrityScore}%
              </span>
              {outsideCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-amber-400" />
                  {outsideCount} Outside Rows Quarantined
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Cross-source audit strictly protecting the <strong>67-Student Fixed Roster</strong> against{' '}
              <strong>Google Sheets Form Responses</strong> and <strong>Google Drive Files</strong>.
            </p>
          </div>
        </div>

        {/* Quick Action Controls */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
          {/* Strict Roster Boundary Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !strictRosterEnforced;
              setStrictRosterEnforced(next);
              onToast?.(
                next
                  ? '🛡️ Strict 67-Student Roster Mode enabled: Outside-class submissions are safely quarantined.'
                  : '⚠️ Strict Roster Mode disabled: Outside rows are counted as class gaps.',
                next ? 'success' : 'info'
              );
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border flex items-center gap-1.5 shadow-sm ${
              strictRosterEnforced
                ? 'bg-emerald-950/80 text-emerald-200 border-emerald-600/70 hover:bg-emerald-900/80'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
            title="Toggle whether non-roster Google Sheet rows are safely quarantined or counted as gaps"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{strictRosterEnforced ? 'Strict Roster Filter: ON' : 'Strict Filter: OFF'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer border border-slate-700 flex items-center gap-1.5 shadow-sm"
            title="Download full reconciliation audit breakdown as CSV"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Export Audit CSV</span>
          </button>

          {onOpenEmailReminder && totalGaps > 0 && (
            <button
              type="button"
              onClick={() => onOpenEmailReminder()}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-md shadow-amber-600/20 flex items-center gap-1.5"
              title="Open email outreach modal with targeted discrepancy templates"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Remind Defaulters</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition cursor-pointer border border-slate-700"
            title={isExpanded ? 'Collapse Data Mismatch Section' : 'Expand Data Mismatch Section'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Reconciliation Dashboard */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {/* 1. Roster Missing in Sheet */}
            <button
              type="button"
              onClick={() => setActiveTab('ROSTER_MISSING_SHEET')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                activeTab === 'ROSTER_MISSING_SHEET'
                  ? 'bg-purple-950/60 border-purple-500 ring-2 ring-purple-500/30'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase">
                <span>Roster ➜ Missing Sheet</span>
                <Users className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-white">
                  {analysis.summary.rosterMissingSheetCount}
                </span>
                <span className="text-[10px] text-purple-300 font-mono">Students</span>
              </div>
            </button>

            {/* 2. Sheet Outside Roster */}
            <button
              type="button"
              onClick={() => setActiveTab('SHEET_OUTSIDE_ROSTER')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                activeTab === 'SHEET_OUTSIDE_ROSTER'
                  ? 'bg-rose-950/60 border-rose-500 ring-2 ring-rose-500/30'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase">
                <span>Sheet ➜ Outside Roster</span>
                <FileSpreadsheet className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-white">
                  {analysis.summary.sheetOutsideRosterCount}
                </span>
                <span className="text-[10px] text-rose-300 font-mono">Row entries</span>
              </div>
            </button>

            {/* 3. Drive Missing in Sheet */}
            <button
              type="button"
              onClick={() => setActiveTab('DRIVE_MISSING_SHEET')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                activeTab === 'DRIVE_MISSING_SHEET'
                  ? 'bg-amber-950/60 border-amber-500 ring-2 ring-amber-500/30'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase">
                <span>Drive ➜ Missing Sheet</span>
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-white">
                  {analysis.summary.driveMissingSheetCount}
                </span>
                <span className="text-[10px] text-amber-300 font-mono">Has files, no row</span>
              </div>
            </button>

            {/* 4. Sheet Missing in Drive */}
            <button
              type="button"
              onClick={() => setActiveTab('SHEET_MISSING_DRIVE')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                activeTab === 'SHEET_MISSING_DRIVE'
                  ? 'bg-cyan-950/60 border-cyan-500 ring-2 ring-cyan-500/30'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase">
                <span>Sheet ➜ Missing Drive</span>
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-white">
                  {analysis.summary.sheetMissingDriveCount}
                </span>
                <span className="text-[10px] text-cyan-300 font-mono">Has row, no PDF</span>
              </div>
            </button>

            {/* 5. Quantity Discrepancies */}
            <button
              type="button"
              onClick={() => setActiveTab('QUANTITY_MISMATCH')}
              className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between col-span-2 sm:col-span-1 ${
                activeTab === 'QUANTITY_MISMATCH'
                  ? 'bg-orange-950/60 border-orange-500 ring-2 ring-orange-500/30'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase">
                <span>Count Mismatch (3 vs 2)</span>
                <Scale className="w-3.5 h-3.5 text-orange-400" />
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold text-white">
                  {analysis.summary.quantityMismatchCount}
                </span>
                <span className="text-[10px] text-orange-300 font-mono">Count diffs</span>
              </div>
            </button>
          </div>

          {/* Tab Filter Navigation */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] mr-1">
                View Gap Detail:
              </span>
              {[
                { id: 'ALL', label: 'All Discrepancies', count: totalGaps },
                {
                  id: 'ROSTER_MISSING_SHEET',
                  label: 'Roster Missing Sheet',
                  count: analysis.rosterMissingInSheet.length,
                },
                {
                  id: 'SHEET_OUTSIDE_ROSTER',
                  label: 'Sheet Outside Roster',
                  count: analysis.sheetMissingInRoster.length,
                },
                {
                  id: 'DRIVE_MISSING_SHEET',
                  label: 'Drive Missing Sheet',
                  count: analysis.driveMissingInSheet.length,
                },
                {
                  id: 'SHEET_MISSING_DRIVE',
                  label: 'Sheet Missing Drive',
                  count: analysis.sheetMissingInDrive.length,
                },
                {
                  id: 'QUANTITY_MISMATCH',
                  label: 'Quantity Mismatch (3 vs 2)',
                  count: analysis.quantityMismatches.length,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 border ${
                    activeTab === tab.id
                      ? 'bg-blue-950 text-blue-300 border-blue-500/50 shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      tab.count > 0 ? 'bg-amber-950 text-amber-300' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Quick table filter button for currently selected view */}
            {activeTab === 'ROSTER_MISSING_SHEET' && (
              <button
                type="button"
                onClick={() => handleApplyFilter('MISSING_SHEET')}
                className="px-2.5 py-1 bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <Filter className="w-3 h-3 text-purple-400" />
                <span>Filter Table (Missing Sheet)</span>
              </button>
            )}
            {activeTab === 'SHEET_MISSING_DRIVE' && (
              <button
                type="button"
                onClick={() => handleApplyFilter('MISSING_DRIVE')}
                className="px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-200 border border-cyan-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <Filter className="w-3 h-3 text-cyan-400" />
                <span>Filter Table (Missing Drive)</span>
              </button>
            )}
            {activeTab === 'QUANTITY_MISMATCH' && (
              <button
                type="button"
                onClick={() => handleApplyFilter('COUNT_MISMATCH')}
                className="px-2.5 py-1 bg-orange-950/80 hover:bg-orange-900 text-orange-200 border border-orange-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <Filter className="w-3 h-3 text-orange-400" />
                <span>Filter Table (Count Mismatch)</span>
              </button>
            )}
          </div>

          {/* Section Content Display */}
          <div className="space-y-3">
            {/* 1. ROSTER STUDENTS MISSING IN SHEET */}
            {(activeTab === 'ALL' || activeTab === 'ROSTER_MISSING_SHEET') &&
              analysis.rosterMissingInSheet.length > 0 && (
                <div className="space-y-2 bg-slate-950/70 border border-purple-900/40 rounded-2xl p-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-purple-400" />
                      <span>
                        In 67-Student Roster, but Missing from Google Sheet (
                        {analysis.rosterMissingInSheet.length} students)
                      </span>
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Action: Student must submit registration form
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {analysis.rosterMissingInSheet.map((item) => {
                      const studentObj = students.find((s) => s.rollNo === item.rollNo);
                      return (
                        <div
                          key={item.rollNo}
                          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-bold">
                              <span className="font-mono text-purple-300">{item.rollNo}</span>
                              <span className="text-white truncate">{item.name}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                              {item.hasDriveFiles ? (
                                <span className="text-emerald-400 font-semibold">
                                  ✓ {item.driveFilesCount} file(s) in Drive
                                </span>
                              ) : (
                                <span className="text-slate-500">0 Drive files</span>
                              )}
                              <span>•</span>
                              <span className="text-amber-400 font-mono">{item.overallStatus}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {studentObj && onOpenStudentDetails && (
                              <button
                                type="button"
                                onClick={() => onOpenStudentDetails(studentObj)}
                                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
                                title="View student record"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {studentObj && onOpenEmailReminder && (
                              <button
                                type="button"
                                onClick={() => onOpenEmailReminder(studentObj)}
                                className="p-1 text-amber-400 hover:text-amber-300 hover:bg-amber-950/60 rounded transition cursor-pointer"
                                title="Draft reminder email"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* 2. SPREADSHEET ROWS OUTSIDE ROSTER (QUARANTINED) */}
            {(activeTab === 'ALL' || activeTab === 'SHEET_OUTSIDE_ROSTER') &&
              analysis.sheetMissingInRoster.length > 0 && (
                <div className="space-y-3 bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-400" />
                        <span>
                          Quarantined Submissions ({analysis.sheetMissingInRoster.length} Outside-Class Rows)
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        These entries from Google Sheet do not match any student in the 67-person roster. They are safely excluded to protect your class records.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleExportOutsideRowsOnly}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                        title="Download these non-roster entries as a standalone CSV file"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-400" />
                        <span>Export {analysis.sheetMissingInRoster.length} Outside Rows</span>
                      </button>
                    </div>
                  </div>

                  {/* Search filter for outside rows */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={outsideRowsSearch}
                      onChange={(e) => setOutsideRowsSearch(e.target.value)}
                      placeholder="Search outside rows by roll number or name..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                    {outsideRowsSearch && (
                      <button
                        type="button"
                        onClick={() => setOutsideRowsSearch('')}
                        className="px-2 py-1 text-xs text-slate-400 hover:text-white"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
                    {filteredOutsideRows.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono font-bold border border-slate-700">
                              Row #{item.rowIndex}
                            </span>
                            <span className="font-mono font-bold text-white">{item.rawRoll}</span>
                          </div>
                          {item.certificateType && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 truncate max-w-[140px]">
                              {item.certificateType}
                            </span>
                          )}
                        </div>

                        {item.rawName && (
                          <div className="text-[11px] text-slate-300 flex items-center gap-1">
                            <span className="text-slate-500">Name:</span>
                            <span className="font-semibold">{item.rawName}</span>
                          </div>
                        )}

                        <p className="text-[10px] text-slate-400">{item.reason}</p>

                        {item.suggestedRosterMatch && (
                          <div className="p-2 rounded-lg bg-indigo-950/60 border border-indigo-800/60 flex items-center justify-between text-[11px] text-indigo-200">
                            <div>
                              <span>Possible Roster Candidate: </span>
                              <strong className="text-white font-mono">
                                {item.suggestedRosterMatch.rollNo}
                              </strong>{' '}
                              ({item.suggestedRosterMatch.name})
                            </div>
                            <span className="px-1.5 py-0.2 rounded bg-indigo-900 text-indigo-300 text-[9px] font-mono font-bold">
                              {item.suggestedRosterMatch.confidence}% match
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {analysis.sheetMissingInRoster.length > 50 && !outsideRowsSearch && (
                    <div className="text-[11px] text-slate-500 text-center font-mono pt-1">
                      Showing first 50 of {analysis.sheetMissingInRoster.length} outside rows. Use search above or click &quot;Export Outside Rows&quot; to inspect all.
                    </div>
                  )}
                </div>
              )}

            {/* 3. QUANTITY / COUNT MISMATCHES */}
            {(activeTab === 'ALL' || activeTab === 'QUANTITY_MISMATCH') &&
              analysis.quantityMismatches.length > 0 && (
                <div className="space-y-2 bg-slate-950/70 border border-orange-900/40 rounded-2xl p-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-orange-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-orange-400" />
                      <span>
                        Certificate Quantity Discrepancies (
                        {analysis.quantityMismatches.length} students with unequal Sheet vs Drive counts)
                      </span>
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      e.g., 3 in Sheet vs 2 in Drive
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {analysis.quantityMismatches.map((item) => {
                      const studentObj = students.find((s) => s.rollNo === item.rollNo);
                      return (
                        <div
                          key={item.rollNo}
                          className="p-3 rounded-xl bg-slate-900 border border-orange-900/50 space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-orange-300">
                                {item.rollNo}
                              </span>
                              <span className="font-semibold text-white truncate max-w-[140px]">
                                {item.name}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-orange-950 text-orange-300 border border-orange-800">
                              {item.sheetCount} Sheet vs {item.driveCount} Drive
                            </span>
                          </div>

                          <p className="text-[11px] text-orange-300/90 leading-snug">
                            {item.description}
                          </p>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                            <span className="text-[10px] text-slate-400">
                              Difference: <strong>{item.difference} certificate(s)</strong>
                            </span>
                            <div className="flex items-center gap-1">
                              {studentObj && onOpenStudentDetails && (
                                <button
                                  type="button"
                                  onClick={() => onOpenStudentDetails(studentObj)}
                                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold transition cursor-pointer"
                                >
                                  View Discrepancy
                                </button>
                              )}
                              {studentObj && onOpenEmailReminder && (
                                <button
                                  type="button"
                                  onClick={() => onOpenEmailReminder(studentObj)}
                                  className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold transition cursor-pointer"
                                >
                                  Email Notice
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Empty State when zero discrepancies found */}
            {totalGaps === 0 && (
              <div className="p-8 text-center bg-slate-950/60 border border-emerald-900/40 rounded-2xl space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">Perfect Data Reconciliation</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Every 67-student roster record matches its Google Sheet row and Google Drive certificate file perfectly with 0 unmapped entries.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
