import React, { useState, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  HardDrive,
  RefreshCw,
  Search,
  Filter,
  FileText,
  Users,
  ShieldCheck,
  Info,
  Wrench,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { StudentStatusRecord, SheetRowRecord, DriveCertificateFile, SheetSyncProof } from '../types';
import { runDataHealthScan, DataHealthIssue } from '../utils/dataHealthScanner';
import { analyzeReconciliationDiscrepancies } from '../utils/reconciliationAnalyzer';

interface DataHealthViewProps {
  students: StudentStatusRecord[];
  sheetRows?: SheetRowRecord[];
  driveFiles?: DriveCertificateFile[];
  sheetSyncProof?: SheetSyncProof | null;
  unidentifiedFiles?: DriveCertificateFile[];
  outsideClassFiles?: DriveCertificateFile[];
  onRefreshProof?: () => void;
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const DataHealthView: React.FC<DataHealthViewProps> = ({
  students,
  sheetRows = [],
  driveFiles = [],
  sheetSyncProof,
  unidentifiedFiles = [],
  outsideClassFiles = [],
  onRefreshProof,
  onToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'ISSUES' | 'MISMATCHES' | 'REVIEW' | 'PROOF'>('ISSUES');
  const [searchQuery, setSearchQuery] = useState('');

  // Centralized Data Health & Reconciliation Analyses
  const healthReport = useMemo(() => {
    return runDataHealthScan(students, sheetRows, driveFiles);
  }, [students, sheetRows, driveFiles]);

  const reconciliationReport = useMemo(() => {
    return analyzeReconciliationDiscrepancies(students, sheetRows, driveFiles);
  }, [students, sheetRows, driveFiles]);

  const filteredIssues = useMemo(() => {
    if (!searchQuery.trim()) return healthReport.issues;
    const q = searchQuery.toLowerCase().trim();
    return healthReport.issues.filter(
      (issue) =>
        issue.title.toLowerCase().includes(q) ||
        issue.description.toLowerCase().includes(q) ||
        (issue.rollNo || '').toLowerCase().includes(q)
    );
  }, [healthReport, searchQuery]);

  return (
    <div className="space-y-6 text-slate-100">
      {/* Top Section Header & KPI Badges */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Unified Data Health & Proof Inspector
              </h2>
              <p className="text-xs text-slate-400">
                Centralized audit scans, gap analysis, file resolution, and row-level evidence
              </p>
            </div>
          </div>

          {/* Quick Stats Capsule Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>{healthReport.totalIssuesCount} Health Issues</span>
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-amber-950/60 border border-amber-800/80 text-amber-300 text-xs font-semibold flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
              <span>{reconciliationReport.discrepancies.length} Mismatches</span>
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-purple-950/60 border border-purple-800/80 text-purple-300 text-xs font-semibold flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-purple-400" />
              <span>{unidentifiedFiles.length + outsideClassFiles.length} Review Items</span>
            </span>
          </div>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveSubTab('ISSUES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'ISSUES'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Health Issues ({healthReport.totalIssuesCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('MISMATCHES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'MISMATCHES'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Drive/Sheet Mismatches ({reconciliationReport.discrepancies.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('REVIEW')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'REVIEW'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Review Queue ({unidentifiedFiles.length + outsideClassFiles.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('PROOF')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'PROOF'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Live Sheet Proof ({sheetSyncProof?.rows.length || 0} rows)</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab 1: Health Issues Scanner */}
      {activeSubTab === 'ISSUES' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span>Scanned Data Integrity Findings</span>
            </h3>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search issues by roll or keyword..."
                className="pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {filteredIssues.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-sm font-semibold text-white">Zero Health Issues Detected</p>
              <p className="text-xs text-slate-400">All student roster entries, Drive files, and Sheet rows pass integrity checks.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="p-3.5 bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-start justify-between gap-3 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          issue.severity === 'CRITICAL'
                            ? 'bg-red-950 text-red-300 border border-red-800'
                            : issue.severity === 'WARNING'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-blue-950 text-blue-300 border border-blue-800'
                        }`}
                      >
                        {issue.severity}
                      </span>
                      <span className="text-xs font-bold text-white">{issue.title}</span>
                      {issue.rollNo && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                          {issue.rollNo}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{issue.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 2: Discrepancy & Gap Analysis */}
      {activeSubTab === 'MISMATCHES' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Drive vs. Sheet Discrepancy Analysis</span>
          </h3>

          {reconciliationReport.discrepancies.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-sm font-semibold text-white">Drive &amp; Sheet Data Perfectly Aligned</p>
              <p className="text-xs text-slate-400">Every student with a Google Drive PDF also has an entry in Google Sheet.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {reconciliationReport.discrepancies.map((d, i) => (
                <div
                  key={i}
                  className="p-4 bg-slate-950/80 border border-amber-900/40 rounded-2xl space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{d.studentName} ({d.rollNo})</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                      {d.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{d.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 3: Review Queue */}
      {activeSubTab === 'REVIEW' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Wrench className="w-4 h-4 text-purple-400" />
            <span>Unidentified &amp; Outside-Class Certificate Resolution</span>
          </h3>

          {unidentifiedFiles.length === 0 && outsideClassFiles.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <p className="text-sm font-semibold text-white">Review Queue Clean</p>
              <p className="text-xs text-slate-400">All certificate files in Google Drive have been identified and assigned to class students.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {unidentifiedFiles.map((file) => (
                <div key={file.id} className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-white">{file.name}</p>
                    <p className="text-[11px] text-slate-400">Folder: {file.parentFolderName || 'Drive Root'}</p>
                  </div>
                  {file.webViewLink && (
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl font-medium flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View File</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 4: Live Sheet Proof */}
      {activeSubTab === 'PROOF' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Live Google Sheet Row Evidence</span>
            </h3>
            {onRefreshProof && (
              <button
                type="button"
                onClick={onRefreshProof}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-audit Sheet</span>
              </button>
            )}
          </div>

          {!sheetSyncProof || sheetSyncProof.rows.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
              <FileSpreadsheet className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-white">No Google Sheet Proof Scanned Yet</p>
              <p className="text-xs text-slate-400">Connect Google Sheets under Google Integration and click "Sync Now" to load row proof.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 font-mono text-xs">
              {sheetSyncProof.rows.map((row) => (
                <div key={row.rowIndex} className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 mr-2">Row #{row.rowIndex}:</span>
                    <span className="text-emerald-300 font-bold mr-2">{row.rollNo}</span>
                    <span className="text-slate-200">{row.name || 'Unnamed'}</span>
                  </div>
                  {row.certificateType && (
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 text-[10px] border border-slate-800">
                      {row.certificateType}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
