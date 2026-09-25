import React, { useState } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Copy,
  Download,
  RefreshCw,
  Search,
  X,
  ShieldCheck,
  HelpCircle,
  Filter,
  Check,
  UserCheck,
} from 'lucide-react';
import { SheetRowRecord, SheetSyncProof } from '../types';
import { FIXED_CLASS_ROSTER } from '../data/classRoster';

interface SheetSyncProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  proof: SheetSyncProof | null;
  onRefreshLiveProof?: () => void;
  isRefreshing?: boolean;
  onManualAssignRollNo?: (rowIndex: number, assignedRollNo: string) => void;
}

export const SheetSyncProofModal: React.FC<SheetSyncProofModalProps> = ({
  isOpen,
  onClose,
  proof,
  onRefreshLiveProof,
  isRefreshing = false,
  onManualAssignRollNo,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'MATCHED' | 'OUTSIDE_CLASS' | 'UNMATCHED_ROLL'>('ALL');
  const [copied, setCopied] = useState(false);
  const [assigningRow, setAssigningRow] = useState<number | null>(null);
  const [selectedRollNo, setSelectedRollNo] = useState<string>('');
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const rows = proof?.rows || [];

  const matchedCount = rows.filter((r) => r.matchStatus === 'MATCHED').length;
  const outsideCount = rows.filter((r) => r.matchStatus === 'OUTSIDE_CLASS').length;
  const unmatchedCount = rows.filter((r) => r.matchStatus === 'UNMATCHED_ROLL' || !r.matchStatus).length;

  const filteredRows = rows.filter((row) => {
    // Status filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'MATCHED' && row.matchStatus !== 'MATCHED') return false;
      if (statusFilter === 'OUTSIDE_CLASS' && row.matchStatus !== 'OUTSIDE_CLASS') return false;
      if (statusFilter === 'UNMATCHED_ROLL' && row.matchStatus === 'MATCHED') return false;
    }

    // Search filter
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (row.rollNo && row.rollNo.toLowerCase().includes(term)) ||
      (row.matchedRollNo && row.matchedRollNo.toLowerCase().includes(term)) ||
      (row.name && row.name.toLowerCase().includes(term)) ||
      (row.matchedStudentName && row.matchedStudentName.toLowerCase().includes(term)) ||
      (row.certificateType && row.certificateType.toLowerCase().includes(term)) ||
      (row.matchReason && row.matchReason.toLowerCase().includes(term))
    );
  });

  const handleCopyProofText = () => {
    if (!proof) return;
    const lines = [
      `=== CLASS CERTIFICATE MANAGER — GOOGLE SHEET SYNC PROOF ===`,
      `Proof ID: ${proof.proofId}`,
      `Verified At: ${new Date(proof.timestamp).toLocaleString()}`,
      `Spreadsheet Name: ${proof.spreadsheetName}`,
      `Worksheet: ${proof.sheetName}`,
      `Total Rows Read: ${proof.totalRowsScanned}`,
      `Matched with 67 Roster: ${matchedCount}`,
      `Outside Class (Ignored): ${outsideCount}`,
      `Unresolved: ${unmatchedCount}`,
      `Spreadsheet URL: ${proof.spreadsheetUrl}`,
      ``,
      `--- ROW-BY-ROW AUDIT LOG ---`,
      ...rows.map(
        (r) =>
          `[Row #${r.rowIndex}] ${r.matchedRollNo || r.rollNo || 'NO-ROLL'} | ${
            r.matchedStudentName || r.name || 'Unknown'
          } | Cert: ${r.certificateType || 'General'} | Status: ${r.matchStatus} | Proof Link: ${
            r.certificateUrl || 'N/A'
          }`
      ),
    ];

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadCsv = () => {
    if (!proof || rows.length === 0) return;
    const headers = [
      'Row Number',
      'Submission Timestamp',
      'Roll Number (Raw)',
      'Matched Roll Number',
      'Student Name (Roster)',
      'Certificate Type',
      'Certificate Proof URL',
      'Verification Status',
      'Audit Reason',
    ];

    const csvLines = [
      headers.join(','),
      ...rows.map((r) =>
        [
          r.rowIndex,
          `"${(r.submissionTimestamp || '').replace(/"/g, '""')}"`,
          `"${(r.rollNo || '').replace(/"/g, '""')}"`,
          `"${(r.matchedRollNo || '').replace(/"/g, '""')}"`,
          `"${(r.matchedStudentName || r.name || '').replace(/"/g, '""')}"`,
          `"${(r.certificateType || '').replace(/"/g, '""')}"`,
          `"${(r.certificateUrl || '').replace(/"/g, '""')}"`,
          `"${(r.matchStatus || '').replace(/"/g, '""')}"`,
          `"${(r.matchReason || '').replace(/"/g, '""')}"`,
        ].join(',')
      ),
    ];

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Sheet_Sync_Proof_${proof.proofId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleConfirmAssign = (rowIndex: number) => {
    if (!selectedRollNo || !onManualAssignRollNo) return;
    onManualAssignRollNo(rowIndex, selectedRollNo);
    setAssigningRow(null);
    setSelectedRollNo('');
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between gap-4 bg-slate-900/90 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Google Sheet Live Sync Proof
                </h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Audit Verified
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Exact raw row inspection &amp; verification proof from your connected Google Sheet
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefreshLiveProof && (
              <button
                onClick={onRefreshLiveProof}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
                title="Fetch latest rows directly from Google Sheet"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
                <span className="hidden sm:inline">{isRefreshing ? 'Fetching Sheet...' : 'Sync Fresh Proof'}</span>
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

        {/* Proof Summary Card */}
        <div className="p-5 border-b border-slate-800/80 bg-slate-950/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
              Connected Spreadsheet
            </span>
            <div className="font-semibold text-white mt-1 truncate" title={proof?.spreadsheetName}>
              {proof?.spreadsheetName || 'No Sheet Connected'}
            </div>
            {proof?.spreadsheetUrl && (
              <a
                href={proof.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-[11px] inline-flex items-center gap-1 mt-1 font-medium"
              >
                <span>Open in Google Sheets</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
              Proof Timestamp &amp; ID
            </span>
            <div className="font-semibold text-slate-200 mt-1 font-mono text-[11px]">
              {proof?.timestamp ? new Date(proof.timestamp).toLocaleTimeString() : '—'}
            </div>
            <span className="text-[10px] text-slate-500 font-mono block mt-0.5 truncate">
              {proof?.proofId || 'N/A'}
            </span>
          </div>

          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
              Roster Matches (67 Class)
            </span>
            <div className="font-bold text-emerald-400 text-sm mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{matchedCount} Matched</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Out of {rows.length} total rows
            </span>
          </div>

          <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
              Outside Class / Ignored
            </span>
            <div className="font-bold text-amber-400 text-sm mt-1 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>{outsideCount} Ignored</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {unmatchedCount} unlinked
            </span>
          </div>
        </div>

        {/* Action Bar (Search, Tabs, Export) */}
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/40">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({rows.length})
            </button>
            <button
              onClick={() => setStatusFilter('MATCHED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'MATCHED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Matched ({matchedCount})
            </button>
            <button
              onClick={() => setStatusFilter('OUTSIDE_CLASS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'OUTSIDE_CLASS'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Outside Class ({outsideCount})
            </button>
            <button
              onClick={() => setStatusFilter('UNMATCHED_ROLL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                statusFilter === 'UNMATCHED_ROLL'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Needs Review ({unmatchedCount})
            </button>
          </div>

          {/* Search & Export Buttons */}
          <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search roll, name, cert..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              onClick={handleCopyProofText}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
              title="Copy audit proof to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Proof'}</span>
            </button>

            <button
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
              title="Download proof as CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Proof Rows Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {rows.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 space-y-2">
              <FileSpreadsheet className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-300">No Spreadsheet Rows Fetched Yet</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Connect your Google Sheet under Google Integration and click &quot;Sync Now&quot; to inspect every raw row with proof verification.
              </p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 text-xs text-slate-400">
              No spreadsheet rows match the selected filter.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredRows.map((row) => (
                <div
                  key={row.rowIndex}
                  className={`p-4 rounded-2xl border transition ${
                    row.matchStatus === 'MATCHED'
                      ? 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700'
                      : row.matchStatus === 'OUTSIDE_CLASS'
                      ? 'bg-amber-950/20 border-amber-900/40'
                      : 'bg-red-950/20 border-red-900/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Row info & Student */}
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          Row #{row.rowIndex}
                        </span>

                        {row.submissionTimestamp && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            {row.submissionTimestamp}
                          </span>
                        )}

                        {row.matchStatus === 'MATCHED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Verified Class Student
                          </span>
                        ) : row.matchStatus === 'OUTSIDE_CLASS' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800">
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            Outside Class Roster (Ignored)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-950/80 text-red-300 border border-red-800">
                            <XCircle className="w-3 h-3 text-red-400" />
                            Unmatched Roll Number
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold text-white">
                          {row.matchedRollNo || row.rollNo || 'Missing Roll No'}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-sm font-medium text-slate-200">
                          {row.matchedStudentName || row.name || 'Unnamed Submission'}
                        </span>
                        {row.certificateType && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-950 text-blue-300 border border-blue-800">
                            {row.certificateType}
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span className="text-slate-500">Proof Audit:</span>
                        <span>{row.matchReason}</span>
                      </div>
                    </div>

                    {/* Right: Certificate Link & Manual Override */}
                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                      {row.certificateUrl ? (
                        <a
                          href={row.certificateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-semibold rounded-xl transition cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View Certificate Proof</span>
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-500 px-2 py-1">
                          No URL column
                        </span>
                      )}

                      {/* Manual Assignment if unmatched */}
                      {row.matchStatus !== 'MATCHED' && onManualAssignRollNo && (
                        <div>
                          {assigningRow === row.rowIndex ? (
                            <div className="flex items-center gap-1">
                              <select
                                value={selectedRollNo}
                                onChange={(e) => setSelectedRollNo(e.target.value)}
                                className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                              >
                                <option value="">Select student...</option>
                                {FIXED_CLASS_ROSTER.map((s) => (
                                  <option key={s.rollNo} value={s.rollNo}>
                                    {s.rollNo} - {s.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => handleConfirmAssign(row.rowIndex)}
                                disabled={!selectedRollNo}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                              >
                                Link
                              </button>
                              <button
                                onClick={() => setAssigningRow(null)}
                                className="p-1 text-slate-400 hover:text-white"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setAssigningRow(row.rowIndex);
                                setSelectedRollNo('');
                              }}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition cursor-pointer"
                              title="Assign this row to a class student"
                            >
                              <UserCheck className="w-3.5 h-3.5 inline mr-1" />
                              Fix Match
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Raw cell breakdown dropdown / toggle */}
                  <div className="mt-3 pt-2.5 border-t border-slate-900 text-xs">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1.5">
                      Raw Sheet Values Read:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {Object.entries(row.rawValues).map(([col, val]) => (
                        <div key={col} className="p-1.5 bg-slate-900/60 rounded border border-slate-800/40">
                          <span className="text-[10px] text-slate-500 block truncate">{col}</span>
                          <span className="text-slate-300 font-mono text-[11px] block truncate" title={val}>
                            {val || '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Diagnostic helper for "Why isn't my sheet updating?" */}
          <div className="mt-4 p-4 rounded-2xl bg-blue-950/30 border border-blue-900/40 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-blue-300 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-blue-400" />
                <span>Why might newly added sheet entries not update immediately?</span>
              </span>
              <button
                onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                className="text-[11px] text-blue-400 hover:underline cursor-pointer"
              >
                {showTroubleshooting ? 'Hide details' : 'Show checklist'}
              </button>
            </div>

            {showTroubleshooting && (
              <ul className="list-disc list-inside space-y-1.5 text-slate-300 pt-1 text-[11px]">
                <li>
                  <strong>Sync Trigger:</strong> Google Sheets does not push updates to your browser automatically. Click <strong>&quot;Sync Fresh Proof&quot;</strong> or <strong>&quot;Sync Now&quot;</strong> on the dashboard to pull newly added rows.
                </li>
                <li>
                  <strong>Fixed 67-Student Boundary:</strong> The app strictly manages the 67 official class students. Any submissions with roll numbers from other branches or senior batches (e.g. 24A31A05...) are classified as <em>&quot;Outside Class&quot;</em> and logged in this proof table.
                </li>
                <li>
                  <strong>Column Header Check:</strong> Check that your Google Form / Sheet header row includes a column for Roll Number (e.g. &quot;Roll No&quot;, &quot;Registration Number&quot;).
                </li>
                <li>
                  <strong>Persistent Cache:</strong> Synced sheet records are saved in your browser session so refreshing does not wipe your submissions.
                </li>
              </ul>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Audit proof generated from Google Sheets API v4
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Close Proof
          </button>
        </div>
      </div>
    </div>
  );
};
