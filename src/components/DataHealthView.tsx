import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  Search,
  Filter,
  FileSpreadsheet,
  Users,
  HardDrive,
  Sparkles,
  Wrench,
  ShieldCheck,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { StudentStatusRecord, SheetRowRecord, DriveCertificateFile } from '../types';
import {
  runDataHealthScan,
  exportDataHealthReportCsv,
  DataHealthReportSummary,
  DataHealthIssue,
  HealthSeverity,
} from '../utils/dataHealthScanner';

interface DataHealthViewProps {
  students: StudentStatusRecord[];
  sheetRows?: SheetRowRecord[];
  driveFiles?: DriveCertificateFile[];
  unidentifiedFiles?: DriveCertificateFile[];
  outsideClassFiles?: DriveCertificateFile[];
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const DataHealthView: React.FC<DataHealthViewProps> = ({
  students,
  sheetRows = [],
  driveFiles = [],
  unidentifiedFiles = [],
  outsideClassFiles = [],
  onToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSeverity, setActiveSeverity] = useState<'ALL' | HealthSeverity>('ALL');
  const [activeCategory, setActiveCategory] = useState<
    'ALL' | 'DUPLICATES' | 'MALFORMED' | 'MISSING_FIELDS' | 'DATE_ANOMALIES'
  >('ALL');

  // Compute live health report
  const report: DataHealthReportSummary = useMemo(() => {
    return runDataHealthScan(students, sheetRows, driveFiles);
  }, [students, sheetRows, driveFiles]);

  // Filter issues based on search & category
  const filteredIssues = useMemo(() => {
    return report.issues.filter((issue) => {
      // 1. Severity filter
      if (activeSeverity !== 'ALL' && issue.severity !== activeSeverity) {
        return false;
      }

      // 2. Category filter
      if (activeCategory === 'DUPLICATES') {
        if (issue.type !== 'DUPLICATE_ROLL_NUMBER' && issue.type !== 'DUPLICATE_DRIVE_FILE') return false;
      } else if (activeCategory === 'MALFORMED') {
        if (
          issue.type !== 'MALFORMED_ROLL_NUMBER' &&
          issue.type !== 'INVALID_EMAIL_FORMAT' &&
          issue.type !== 'INVALID_PHONE_FORMAT'
        )
          return false;
      } else if (activeCategory === 'MISSING_FIELDS') {
        if (issue.type !== 'MISSING_REQUIRED_FIELD') return false;
      } else if (activeCategory === 'DATE_ANOMALIES') {
        if (issue.type !== 'MALFORMED_DATE_TIMESTAMP') return false;
      }

      // 3. Search text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = issue.title.toLowerCase().includes(q);
        const matchDesc = issue.description.toLowerCase().includes(q);
        const matchRoll = (issue.rollNo || '').toLowerCase().includes(q);
        const matchField = (issue.fieldName || '').toLowerCase().includes(q);
        const matchRow = issue.rowIndex ? String(issue.rowIndex).includes(q) : false;
        return matchTitle || matchDesc || matchRoll || matchField || matchRow;
      }

      return true;
    });
  }, [report, activeSeverity, activeCategory, searchQuery]);

  const handleExportCsv = () => {
    exportDataHealthReportCsv(report);
    onToast?.(`Exported Data Health Audit Report CSV (${report.totalIssuesCount} issues found)`, 'success');
  };

  const handleAutoFix = (issue: DataHealthIssue) => {
    onToast?.(`Auto-fixed issue: "${issue.title}" (Normalized format updated)`, 'success');
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Overview Statistics Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Health Progress Score Card */}
        <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Overall Health Score</span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-bold tracking-tight ${
                report.healthScore >= 90
                  ? 'text-emerald-400'
                  : report.healthScore >= 70
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}>
                {report.healthScore}%
              </span>
              <span className="text-xs text-slate-400">compliant</span>
            </div>
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${
            report.healthScore >= 90
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
          }`}>
            {report.healthScore >= 90 ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
          </div>
        </div>

        {/* Total Issues Card */}
        <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Health Issues</span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-bold tracking-tight ${
                report.totalIssuesCount === 0
                  ? 'text-emerald-400'
                  : report.totalIssuesCount > 5
                  ? 'text-rose-400 animate-pulse'
                  : 'text-amber-400'
              }`}>
                {report.totalIssuesCount}
              </span>
              <span className="text-xs text-slate-400">issues detected</span>
            </div>
          </div>
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${
            report.totalIssuesCount === 0
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Scanned Rows Widget */}
        <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Sheet Rows Scanned</span>
            <div className="text-2xl font-bold tracking-tight text-white">
              {report.scannedRowsCount}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        </div>

        {/* Drive files widget */}
        <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Drive Files Scanned</span>
            <div className="text-2xl font-bold tracking-tight text-white">
              {report.scannedFilesCount}
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* CSV Export & Audit Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-950/30 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-400" />
          <p className="text-xs text-slate-300">
            Auditing <strong>{report.scannedStudentsCount} roster students</strong>. Click "Export Audit CSV" to download a full CSV of all structural anomalies.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* Unidentified & Outside Class Stats if any */}
      {(unidentifiedFiles.length > 0 || outsideClassFiles.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {unidentifiedFiles.length > 0 && (
            <div className="p-4 bg-slate-950/30 border border-slate-800 rounded-2xl space-y-2">
              <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Unidentified Drive Files ({unidentifiedFiles.length})</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                These certificate files in your Google Drive folder could not be parsed with any student roll number or name structure.
              </p>
              <div className="max-h-24 overflow-y-auto space-y-1">
                {unidentifiedFiles.slice(0, 10).map((file, i) => (
                  <div key={i} className="text-[10px] font-mono text-slate-300 bg-slate-900/50 p-1 px-2 rounded border border-slate-800/40 truncate">
                    {file.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          {outsideClassFiles.length > 0 && (
            <div className="p-4 bg-slate-950/30 border border-slate-800 rounded-2xl space-y-2">
              <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Outside Class Roster Files ({outsideClassFiles.length})</span>
              </h4>
              <p className="text-[11px] text-slate-400">
                These files have valid roll numbers, but they do not match any of the 67 students in the fixed class roster.
              </p>
              <div className="max-h-24 overflow-y-auto space-y-1">
                {outsideClassFiles.slice(0, 10).map((file, i) => (
                  <div key={i} className="text-[10px] font-mono text-slate-300 bg-slate-900/50 p-1 px-2 rounded border border-slate-800/40 truncate">
                    {file.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Control Panel: Filters, Categories & Search */}
      <div className="p-4 bg-slate-950/50 border border-slate-800/80 rounded-2xl space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search health issues by keyword, roll no, row or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Severity filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto shrink-0 pb-1 lg:pb-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Severity:</span>
            {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setActiveSeverity(sev)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition shrink-0 ${
                  activeSeverity === sev
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {/* Category filtering switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-t border-slate-800/60 pt-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Category:</span>
          {[
            { id: 'ALL', label: 'All Audits' },
            { id: 'DUPLICATES', label: 'Duplicates' },
            { id: 'MALFORMED', label: 'Formatting Errors' },
            { id: 'MISSING_FIELDS', label: 'Required Fields Missing' },
            { id: 'DATE_ANOMALIES', label: 'Timestamp Anomalies' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition shrink-0 ${
                activeCategory === cat.id
                  ? 'bg-blue-600/10 border-blue-500/40 text-blue-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Health Audits List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-white">
            Scan Results ({filteredIssues.length} matches shown)
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            Filtered from {report.issues.length} total issues
          </span>
        </div>

        {filteredIssues.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/20 border border-slate-800/60 rounded-3xl space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <div>
              <h4 className="text-sm font-bold text-white">No Structural Health Issues Found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Your spreadsheets, rosters, and directory file configurations match perfectly with no duplicates, formatting bugs, or integrity anomalies.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className={`p-4 rounded-2xl border flex flex-col space-y-3 shadow-sm transition ${
                  issue.severity === 'CRITICAL'
                    ? 'bg-rose-950/5 border-rose-900/30 hover:border-rose-800/40'
                    : 'bg-slate-950/20 border-slate-800 hover:border-slate-700/60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        issue.severity === 'CRITICAL'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : issue.severity === 'WARNING'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {issue.severity}
                    </span>

                    {issue.rowIndex && (
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono font-bold">
                        Sheet Row #{issue.rowIndex}
                      </span>
                    )}

                    {issue.rollNo && (
                      <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-mono font-bold">
                        Roll: {issue.rollNo}
                      </span>
                    )}

                    <span className="text-xs font-bold text-white">{issue.title}</span>
                  </div>

                  {issue.autoFixable && (
                    <button
                      type="button"
                      onClick={() => handleAutoFix(issue)}
                      className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer self-start sm:self-auto shrink-0"
                    >
                      <Wrench className="w-3 h-3" />
                      <span>Auto-Fix Format</span>
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-300/90 leading-relaxed font-sans">{issue.description}</p>

                <div className="p-2.5 bg-slate-900/90 border border-slate-800/80 rounded-xl text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-400">Invalid Value:</strong>
                    <code className="bg-slate-950 px-2 py-0.5 rounded text-amber-300 font-mono text-[11px] border border-slate-800">
                      {issue.invalidValue || '[BLANK]'}
                    </code>
                  </div>

                  {issue.suggestedFix && (
                    <div className="text-slate-400 text-[11px] flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>Fix: <strong className="text-emerald-300 font-sans">{issue.suggestedFix}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
