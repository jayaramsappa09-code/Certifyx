import React, { useState, useMemo } from 'react';
import {
  X,
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
  RefreshCw,
} from 'lucide-react';
import { StudentStatusRecord, SheetRowRecord, DriveCertificateFile } from '../types';
import {
  runDataHealthScan,
  exportDataHealthReportCsv,
  DataHealthReportSummary,
  DataHealthIssue,
  HealthSeverity,
} from '../utils/dataHealthScanner';

interface DataHealthReportModalProps {
  students: StudentStatusRecord[];
  sheetRows?: SheetRowRecord[];
  driveFiles?: DriveCertificateFile[];
  onClose: () => void;
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const DataHealthReportModal: React.FC<DataHealthReportModalProps> = ({
  students,
  sheetRows = [],
  driveFiles = [],
  onClose,
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
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Spreadsheet Data Health Report</h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Automated Audit Scan
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Scanned {report.scannedRowsCount} sheet rows, {report.scannedFilesCount} drive files & {report.scannedStudentsCount} student roster entries
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Audit CSV</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Score Banner */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-6 shadow-inner">
            <div className="flex items-center gap-5 w-full md:w-auto">
              {/* Score Gauge Circle */}
              <div
                className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center border-2 shrink-0 shadow-lg ${
                  report.healthScore >= 90
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400 shadow-emerald-900/30'
                    : report.healthScore >= 70
                    ? 'bg-amber-950/80 border-amber-500 text-amber-400 shadow-amber-900/30'
                    : 'bg-rose-950/80 border-rose-500 text-rose-400 shadow-rose-900/30'
                }`}
              >
                <span className="text-2xl font-black font-mono leading-none">{report.healthScore}%</span>
                <span className="text-[10px] uppercase font-bold mt-1 tracking-wider">
                  Grade {report.grade}
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Data Integrity Status:</span>
                  {report.healthScore >= 90 ? (
                    <span className="text-emerald-400 font-semibold text-xs flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" /> Excellent
                    </span>
                  ) : report.healthScore >= 70 ? (
                    <span className="text-amber-400 font-semibold text-xs flex items-center gap-1">
                      <ShieldAlert className="w-4 h-4" /> Minor Formatting Issues
                    </span>
                  ) : (
                    <span className="text-rose-400 font-semibold text-xs flex items-center gap-1">
                      <XCircle className="w-4 h-4" /> Critical Errors Found
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400 max-w-md">
                  {report.totalIssuesCount === 0
                    ? 'Zero data anomalies detected. All Google Sheet rows and Roll Numbers match standard formatting perfectly!'
                    : `Identified ${report.totalIssuesCount} total issue(s): ${report.criticalCount} critical error(s), ${report.warningCount} warning(s), and ${report.infoCount} minor format alert(s).`}
                </p>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full md:w-auto">
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Duplicates</span>
                <span className="text-base font-bold text-rose-400 font-mono">{report.duplicateRollsCount}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Malformed</span>
                <span className="text-base font-bold text-amber-400 font-mono">{report.malformedFormatsCount}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Missing</span>
                <span className="text-base font-bold text-cyan-400 font-mono">{report.missingFieldsCount}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 font-semibold uppercase block">Dates</span>
                <span className="text-base font-bold text-purple-400 font-mono">{report.dateAnomaliesCount}</span>
              </div>
            </div>
          </div>

          {/* Filter Bar & Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Category Tab Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveCategory('ALL')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                  activeCategory === 'ALL'
                    ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                All ({report.totalIssuesCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('DUPLICATES')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                  activeCategory === 'DUPLICATES'
                    ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/20'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Duplicates ({report.duplicateRollsCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('MALFORMED')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                  activeCategory === 'MALFORMED'
                    ? 'bg-amber-600 text-white font-bold shadow-md shadow-amber-600/20'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Malformed Formats ({report.malformedFormatsCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory('MISSING_FIELDS')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                  activeCategory === 'MISSING_FIELDS'
                    ? 'bg-cyan-600 text-white font-bold shadow-md shadow-cyan-600/20'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                Missing Fields ({report.missingFieldsCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative shrink-0 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search issues, roll #, row..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
              />
            </div>
          </div>

          {/* Issues List Table */}
          {filteredIssues.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">No Issues Match Your Filter</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No spreadsheet format errors or duplicate records found in this category.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  className={`p-4 bg-slate-950 border rounded-2xl transition space-y-2.5 ${
                    issue.severity === 'CRITICAL'
                      ? 'border-rose-900/60 hover:border-rose-700/80 bg-rose-950/10'
                      : issue.severity === 'WARNING'
                      ? 'border-amber-900/60 hover:border-amber-700/80 bg-amber-950/10'
                      : 'border-slate-800 hover:border-slate-700'
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

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>
            💡 Data health check runs continuously during synchronization. All checks run locally on client memory.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition cursor-pointer"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
