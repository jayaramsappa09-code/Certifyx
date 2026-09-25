import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  Sparkles,
  Download,
  FileText,
  HelpCircle,
  ArrowRight,
  Database,
  Check,
  Search,
} from 'lucide-react';
import { DriveCertificateFile } from '../types';
import { ROSTER_MAP, normalizeRollNumber, isValidClassRollNumber } from '../data/classRoster';
import { saveBatchManualFileOverrides, addAuditLog, ManualFileOverride } from '../services/storageService';

interface BulkMappingUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  unidentifiedFiles?: DriveCertificateFile[];
  onRefreshAfterResolution?: () => void;
  userEmail?: string;
}

export interface ParsedCsvMappingRow {
  filename: string;
  rollNo: string;
  normalizedRollNo: string;
  studentName?: string;
  certType?: string;
  certTitle?: string;
  isValidRosterStudent: boolean;
  isMatchedToUnidentifiedFile: boolean;
  matchedFileId?: string;
  status: 'VALID_ROSTER' | 'OUTSIDE_CLASS' | 'INVALID_ROLL' | 'MISSING_FIELDS';
}

/**
 * Utility to parse CSV content robustly handling quotes, commas, and newlines
 */
export function parseCsvText(text: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentVal += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',' || char === '\t') {
        currentRow.push(currentVal.trim());
        currentVal = '';
      } else if (char === '\r') {
        // Ignore carriage return
      } else if (char === '\n') {
        currentRow.push(currentVal.trim());
        if (currentRow.some((field) => field.length > 0)) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
  }

  if (currentVal.trim().length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((field) => field.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

export const BulkMappingUploadModal: React.FC<BulkMappingUploadModalProps> = ({
  isOpen,
  onClose,
  unidentifiedFiles = [],
  onRefreshAfterResolution,
  userEmail = 'admin',
}) => {
  const [activeInputTab, setActiveInputTab] = useState<'upload' | 'paste'>('upload');
  const [rawPasteText, setRawPasteText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedCsvMappingRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Generate Sample CSV Template for Admins
  const handleDownloadSampleCsv = () => {
    const sampleHeader = 'filename,rollNo,certificateTitle,certType\n';
    const sampleRows = [
      'scan_certificate_101.pdf,25A31A05GB,Quantathon Hackathon Participation,Participation',
      'unidentified_doc_102.pdf,25A31A05DZ,Cloud Computing Course Completion,Course',
      'student_award_103.jpg,25A31A05FP,Project Expo Winner,Merit / Award',
    ].join('\n');

    const blob = new Blob([sampleHeader + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample_certificate_filename_mapping_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Process raw parsed matrix into structured ParsedCsvMappingRow items
  const processCsvMatrix = (matrix: string[][]) => {
    if (matrix.length === 0) return;

    // Detect Header row
    let headerIdx = 0;
    const firstRowLower = matrix[0].map((c) => c.toLowerCase());
    const hasHeader = firstRowLower.some(
      (c) =>
        c.includes('file') ||
        c.includes('roll') ||
        c.includes('cert') ||
        c.includes('title') ||
        c.includes('name')
    );

    let filenameCol = 0;
    let rollNoCol = 1;
    let titleCol = 2;
    let typeCol = 3;

    if (hasHeader) {
      headerIdx = 0;
      matrix[0].forEach((colName, idx) => {
        const c = colName.toLowerCase();
        if (
          c.includes('file') ||
          c.includes('doc') ||
          c.includes('name') && !c.includes('student')
        ) {
          filenameCol = idx;
        } else if (c.includes('roll') || c.includes('id') || c.includes('ht') || c.includes('pin')) {
          rollNoCol = idx;
        } else if (c.includes('title') || c.includes('course') || c.includes('cert_title')) {
          titleCol = idx;
        } else if (c.includes('type') || c.includes('category')) {
          typeCol = idx;
        }
      });
    }

    const dataRows = hasHeader ? matrix.slice(headerIdx + 1) : matrix;

    // Map unidentified files by filename for fast lookup
    const unidentifiedMap = new Map<string, DriveCertificateFile>();
    unidentifiedFiles.forEach((f) => {
      if (f.name) {
        unidentifiedMap.set(f.name.trim().toLowerCase(), f);
      }
      if (f.id) {
        unidentifiedMap.set(f.id.trim(), f);
      }
    });

    const parsed: ParsedCsvMappingRow[] = [];

    dataRows.forEach((row) => {
      const rawFilename = row[filenameCol] || row[0] || '';
      const rawRollNo = row[rollNoCol] || row[1] || '';
      const rawTitle = row[titleCol] || row[2] || '';
      const rawType = row[typeCol] || row[3] || 'Certificate';

      if (!rawFilename && !rawRollNo) return; // skip blank rows

      const normRoll = normalizeRollNumber(rawRollNo);
      const isValidRoster = isValidClassRollNumber(normRoll);
      const studentName = ROSTER_MAP.get(normRoll) || undefined;

      // Check if this filename matches an unidentified file currently in queue
      const cleanFilename = rawFilename.trim();
      const matchedUnidentifiedFile =
        unidentifiedMap.get(cleanFilename.toLowerCase()) || unidentifiedMap.get(cleanFilename);

      let status: ParsedCsvMappingRow['status'] = 'VALID_ROSTER';
      if (!cleanFilename || !rawRollNo) {
        status = 'MISSING_FIELDS';
      } else if (isValidRoster) {
        status = 'VALID_ROSTER';
      } else if (normRoll.length >= 6) {
        status = 'OUTSIDE_CLASS';
      } else {
        status = 'INVALID_ROLL';
      }

      parsed.push({
        filename: cleanFilename,
        rollNo: rawRollNo.trim().toUpperCase(),
        normalizedRollNo: normRoll,
        studentName,
        certTitle: rawTitle.trim() || undefined,
        certType: rawType.trim() || 'Certificate',
        isValidRosterStudent: isValidRoster,
        isMatchedToUnidentifiedFile: Boolean(matchedUnidentifiedFile),
        matchedFileId: matchedUnidentifiedFile?.id,
        status,
      });
    });

    setParsedRows(parsed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setUploadSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const matrix = parseCsvText(content);
        processCsvMatrix(matrix);
      }
    };
    reader.readAsText(file);
  };

  const handlePasteProcess = () => {
    if (!rawPasteText.trim()) return;
    setUploadSuccessMessage(null);
    const matrix = parseCsvText(rawPasteText);
    processCsvMatrix(matrix);
  };

  // Confirm and Apply Bulk Mapping to Database Storage
  const handleApplyBulkMapping = () => {
    const validRows = parsedRows.filter((r) => r.status === 'VALID_ROSTER' || r.status === 'OUTSIDE_CLASS');
    if (validRows.length === 0) return;

    setIsProcessing(true);

    try {
      const overridesToSave: Array<ManualFileOverride & { filename?: string }> = validRows.map((r) => ({
        fileId: r.matchedFileId || `csv_mapping_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        filename: r.filename,
        assignedRollNo: r.normalizedRollNo,
        assignedCertType: r.certType || 'Certificate',
        assignedCertTitle: r.certTitle,
        resolvedAt: new Date().toISOString(),
      }));

      // Save batch overrides into persistent storage
      saveBatchManualFileOverrides(overridesToSave);

      // Audit Log
      addAuditLog(
        'Bulk CSV Mapping Applied',
        userEmail,
        `Applied custom CSV certificate filename mapping for ${validRows.length} files (${
          validRows.filter((r) => r.isValidRosterStudent).length
        } matched to 67-student class roster).`,
        'REVIEW'
      );

      setUploadSuccessMessage(
        `Successfully applied ${validRows.length} certificate mappings! ${
          validRows.filter((r) => r.isMatchedToUnidentifiedFile).length
        } unidentified files resolved instantly.`
      );

      if (onRefreshAfterResolution) {
        onRefreshAfterResolution();
      }
    } catch (e: any) {
      console.error('Failed to apply bulk CSV mapping:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValidRosterStudent).length;
  const matchedUnidentifiedCount = parsedRows.filter((r) => r.isMatchedToUnidentifiedFile).length;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Bulk Filename Resolver
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-blue-950 text-blue-300 border border-blue-800">
                Database Bulk Update
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1.5 tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-purple-400" />
              Bulk CSV Certificate Filename Mapping Uploader
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Upload or paste a custom CSV mapping file linking certificate filenames directly to student roll numbers to resolve unidentified files in bulk.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {/* Success Banner */}
          {uploadSuccessMessage && (
            <div className="p-4 bg-emerald-950/90 border border-emerald-700/80 rounded-2xl flex items-center justify-between gap-3 text-emerald-200 text-xs shadow-lg animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="font-semibold">{uploadSuccessMessage}</span>
              </div>
              <button
                onClick={() => setUploadSuccessMessage(null)}
                className="text-emerald-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Action Header & Sample Template Download */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-4 h-4 text-blue-400" />
                CSV Format Requirement
              </h3>
              <p className="text-xs text-slate-400">
                CSV should include columns: <code className="text-purple-300 bg-slate-900 px-1 py-0.5 rounded font-mono">filename</code>, <code className="text-purple-300 bg-slate-900 px-1 py-0.5 rounded font-mono">rollNo</code>, and optional <code className="text-purple-300 bg-slate-900 px-1 py-0.5 rounded font-mono">certificateTitle</code>.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadSampleCsv}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Download CSV Template</span>
            </button>
          </div>

          {/* Input Method Switcher */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setActiveInputTab('upload')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeInputTab === 'upload'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload CSV File</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveInputTab('paste')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeInputTab === 'paste'
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Paste Raw CSV Text</span>
              </button>
            </div>

            {/* Tab 1: File Upload */}
            {activeInputTab === 'upload' && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-800 hover:border-purple-500/80 bg-slate-950/60 hover:bg-slate-950 rounded-2xl p-8 text-center cursor-pointer transition group space-y-3"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.txt"
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto group-hover:scale-110 transition">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {fileName ? `Loaded File: ${fileName}` : 'Click or Drag & Drop CSV Mapping File'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports .csv format exported from Excel, Google Sheets, or text editors.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 2: Raw Text Paste */}
            {activeInputTab === 'paste' && (
              <div className="space-y-2">
                <textarea
                  value={rawPasteText}
                  onChange={(e) => setRawPasteText(e.target.value)}
                  placeholder="Paste CSV contents here, e.g.:&#10;filename,rollNo,certificateTitle&#10;quantathon_cert_1.pdf,25A31A05GB,Quantathon Participation&#10;udemy_course_2.jpg,25A31A05DZ,Python Course"
                  rows={5}
                  className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl font-mono text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition"
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handlePasteProcess}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Parse CSV Text
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Parsed CSV Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-3 bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    CSV Mapping Verification Preview ({parsedRows.length} Rows)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Verify matched student names and unidentified file associations prior to saving into database.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                    {validCount} Matched Roster
                  </span>
                  <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold">
                    {matchedUnidentifiedCount} Unidentified Files Resolved
                  </span>
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden overflow-x-auto max-h-64">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-900 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Certificate Filename</th>
                      <th className="py-2.5 px-3">Target Roll No</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Title / Type</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/60 transition">
                        <td className="py-2 px-3 text-slate-500 font-sans">{idx + 1}</td>
                        <td className="py-2 px-3 text-white font-semibold max-w-xs truncate">
                          📄 {row.filename}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold">
                            {row.normalizedRollNo || row.rollNo || 'N/A'}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-sans text-slate-200">
                          {row.studentName || <span className="text-slate-500 italic">Non-roster</span>}
                        </td>
                        <td className="py-2 px-3 text-slate-300 font-sans">
                          {row.certTitle || row.certType || 'Certificate'}
                        </td>
                        <td className="py-2 px-3 text-center font-sans">
                          {row.status === 'VALID_ROSTER' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              CLASS ROSTER
                            </span>
                          ) : row.status === 'OUTSIDE_CLASS' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              OUTSIDE CLASS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-300 border border-red-800">
                              <XCircle className="w-3 h-3 text-red-400" />
                              INVALID
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {parsedRows.length > 0
              ? `Ready to apply ${validCount} valid class roster mappings to database.`
              : 'Upload a CSV mapping file to begin preview.'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyBulkMapping}
              disabled={parsedRows.length === 0 || isProcessing}
              className="px-5 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-lg shadow-purple-600/30 cursor-pointer flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              <span>{isProcessing ? 'Saving to Database...' : 'Apply Bulk Mapping to Database'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
