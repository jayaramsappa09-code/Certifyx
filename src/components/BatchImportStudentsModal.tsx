import React, { useState, useMemo, useRef } from 'react';
import {
  Users,
  X,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Check,
  Copy,
  Trash2,
  FileSpreadsheet,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { FIXED_CLASS_ROSTER, normalizeRollNumber, extractRollNumberFromText } from '../data/classRoster';

interface BatchImportStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBatchImport: (students: Array<{ rollNo: string; name: string }>) => Promise<{
    added: Array<{ rollNo: string; name: string }>;
    skipped: Array<{ student: { rollNo: string; name: string }; reason: string }>;
  }> | {
    added: Array<{ rollNo: string; name: string }>;
    skipped: Array<{ student: { rollNo: string; name: string }; reason: string }>;
  };
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export interface ParsedStudentEntry {
  lineNum: number;
  rawLine: string;
  rollNo: string;
  name: string;
  status: 'READY' | 'DUPLICATE' | 'INVALID';
  message: string;
}

const SAMPLE_DATA = `25A31A05HA, KONDURI SAI KUMAR
25A31A05HB\tPOLISETTI LIKHITHA
25A31A05HC - RAYUDU MANIDEEP
25A31A05HD | SHAIK SHARUKH
25A31A05HE : THOTA HARSHA VARDHAN`;

export const BatchImportStudentsModal: React.FC<BatchImportStudentsModalProps> = ({
  isOpen,
  onClose,
  onBatchImport,
  onToast,
}) => {
  const [inputText, setInputText] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [autoUppercase, setAutoUppercase] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'EDIT' | 'PREVIEW'>('EDIT');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set of existing normalized roll numbers for fast duplicate checking
  const existingRollSet = useMemo(() => {
    return new Set(FIXED_CLASS_ROSTER.map((s) => s.rollNo.toUpperCase().trim()));
  }, [isOpen]);

  // Robust line-by-line parsing
  const parsedEntries = useMemo<ParsedStudentEntry[]>(() => {
    if (!inputText.trim()) return [];

    const lines = inputText.split(/\r?\n/);
    const results: ParsedStudentEntry[] = [];
    const seenInBatch = new Set<string>();

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return; // Skip empty lines

      // Ignore comment lines or common header rows
      if (trimmed.startsWith('#') || trimmed.startsWith('//')) return;
      if (/^(roll\s*no|reg\s*no|id|student\s*name|name\s*,\s*roll)/i.test(trimmed)) {
        return; // Skip table header line if pasted with header
      }

      let rollNo = '';
      let name = '';

      // 1. Try Tab delimiter (common when pasting from Excel or Google Sheets)
      if (trimmed.includes('\t')) {
        const parts = trimmed.split('\t').map((p) => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          // Detect which part is the roll number
          if (extractRollNumberFromText(parts[0]) || /^[0-9a-zA-Z]{5,15}$/.test(parts[0])) {
            rollNo = parts[0];
            name = parts.slice(1).join(' ');
          } else if (extractRollNumberFromText(parts[1]) || /^[0-9a-zA-Z]{5,15}$/.test(parts[1])) {
            rollNo = parts[1];
            name = parts[0];
          } else {
            rollNo = parts[0];
            name = parts.slice(1).join(' ');
          }
        }
      }

      // 2. Try Comma delimiter
      if (!rollNo && trimmed.includes(',')) {
        const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          if (extractRollNumberFromText(parts[0]) || /^[0-9a-zA-Z]{5,15}$/.test(parts[0])) {
            rollNo = parts[0];
            name = parts.slice(1).join(' ');
          } else if (extractRollNumberFromText(parts[parts.length - 1])) {
            rollNo = parts[parts.length - 1];
            name = parts.slice(0, -1).join(' ');
          } else {
            rollNo = parts[0];
            name = parts.slice(1).join(' ');
          }
        }
      }

      // 3. Try Pipe delimiter
      if (!rollNo && trimmed.includes('|')) {
        const parts = trimmed.split('|').map((p) => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          rollNo = parts[0];
          name = parts.slice(1).join(' ');
        }
      }

      // 4. Try Semicolon or Colon or Hyphen delimiter
      if (!rollNo && /[:;\-]/.test(trimmed)) {
        const parts = trimmed.split(/[:;\-]/).map((p) => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          rollNo = parts[0];
          name = parts.slice(1).join(' ');
        }
      }

      // 5. Try whitespace separation if first word looks like a roll number
      if (!rollNo) {
        const match = trimmed.match(/^([0-9]{2}[A-Za-z][0-9]{2}[A-Za-z][0-9]{2}[A-Za-z0-9]{2}|[A-Za-z0-9]{6,12})\s+(.+)$/i);
        if (match) {
          rollNo = match[1];
          name = match[2];
        } else {
          // Fallback: split on first space
          const spaceIdx = trimmed.indexOf(' ');
          if (spaceIdx > 0) {
            rollNo = trimmed.slice(0, spaceIdx).trim();
            name = trimmed.slice(spaceIdx + 1).trim();
          } else {
            // Check if whole line is just a single roll number
            const singleRoll = extractRollNumberFromText(trimmed) || trimmed.replace(/[^a-zA-Z0-9]/g, '');
            if (singleRoll && singleRoll.length >= 4) {
              rollNo = singleRoll;
              name = `Student ${singleRoll.toUpperCase()}`;
            }
          }
        }
      }

      // If rollNo found but name is missing, provide smart fallback name
      if (rollNo && !name) {
        name = `Student ${rollNo.toUpperCase().trim()}`;
      }

      // Clean roll number and name
      if (autoUppercase) {
        rollNo = normalizeRollNumber(rollNo);
        name = name.toUpperCase().trim();
      } else {
        rollNo = rollNo.trim();
        name = name.trim();
      }

      // Validation
      let status: 'READY' | 'DUPLICATE' | 'INVALID' = 'READY';
      let message = 'Ready to import';

      if (!rollNo) {
        status = 'INVALID';
        message = 'Missing roll number';
      } else if (existingRollSet.has(rollNo.toUpperCase().trim())) {
        status = 'DUPLICATE';
        message = 'Already exists in class roster';
      } else if (seenInBatch.has(rollNo.toUpperCase().trim())) {
        status = 'DUPLICATE';
        message = 'Repeated inside this import batch';
      } else {
        seenInBatch.add(rollNo.toUpperCase().trim());
      }

      results.push({
        lineNum: index + 1,
        rawLine: trimmed,
        rollNo,
        name,
        status,
        message,
      });
    });

    return results;
  }, [inputText, autoUppercase, existingRollSet]);

  // Derived counts
  const readyList = useMemo(() => parsedEntries.filter((p) => p.status === 'READY'), [parsedEntries]);
  const duplicateList = useMemo(() => parsedEntries.filter((p) => p.status === 'DUPLICATE'), [parsedEntries]);
  const invalidList = useMemo(() => parsedEntries.filter((p) => p.status === 'INVALID'), [parsedEntries]);

  // Load sample data
  const handleLoadSample = () => {
    setInputText(SAMPLE_DATA);
    setActiveTab('PREVIEW');
  };

  // Handle local text / CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setInputText(content);
        setActiveTab('PREVIEW');
        onToast?.(`Loaded ${file.name} successfully into textarea.`, 'info');
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Execute batch import
  const handleExecuteImport = async () => {
    if (readyList.length === 0) {
      onToast?.('No valid new students found to import.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const studentsToImport = readyList.map((entry) => ({
        rollNo: entry.rollNo,
        name: entry.name,
      }));

      const result = await onBatchImport(studentsToImport);
      const count = result.added.length;

      onToast?.(
        `🎉 Successfully batch-imported ${count} student${count === 1 ? '' : 's'} into the active class roster!`,
        'success'
      );
      setInputText('');
      onClose();
    } catch (err: any) {
      console.error('Batch import failed:', err);
      onToast?.(err.message || 'Failed to batch import students.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 z-50 animate-in fade-in duration-150"
    >
      <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Batch Import Students to Class Roster
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                  Bulk Roster
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Paste roll numbers and names to bulk-add students to the 67+ roster and all active analyses
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Subheader / Tab Toggle */}
        <div className="px-5 pt-3 pb-2 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('EDIT')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'EDIT'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Input Textarea</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PREVIEW')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'PREVIEW'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Parsed Preview ({parsedEntries.length})</span>
            </button>
          </div>

          {/* Quick Helper Actions */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".txt,.csv,.tsv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
              title="Upload text or CSV file to populate textarea"
            >
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              <span>Upload File</span>
            </button>

            <button
              type="button"
              onClick={handleLoadSample}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
              title="Fill textarea with 5 sample students"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Load Sample</span>
            </button>

            {inputText && (
              <button
                type="button"
                onClick={() => setInputText('')}
                className="px-2 py-1.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 rounded-lg text-xs transition cursor-pointer"
                title="Clear input textarea"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'EDIT' ? (
            <div className="space-y-3">
              {/* Instructions and Format Support */}
              <div className="p-3 bg-blue-950/30 border border-blue-900/50 rounded-2xl text-xs space-y-1.5">
                <div className="font-semibold text-blue-300 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-blue-400" />
                  <span>Accepted Formats (One student per line):</span>
                </div>
                <div className="text-[11px] text-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono">
                  <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                    <span className="text-blue-400 font-bold">Comma Separated:</span>
                    <p className="text-slate-400 mt-0.5">25A31A05HA, KONDURI SAI KUMAR</p>
                  </div>
                  <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                    <span className="text-emerald-400 font-bold">Google Sheet / Excel:</span>
                    <p className="text-slate-400 mt-0.5">25A31A05HB [Tab] POLISETTI LIKHITHA</p>
                  </div>
                  <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                    <span className="text-purple-400 font-bold">Hyphen or Colon:</span>
                    <p className="text-slate-400 mt-0.5">25A31A05HC - RAYUDU MANIDEEP</p>
                  </div>
                  <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                    <span className="text-cyan-400 font-bold">Space Separated:</span>
                    <p className="text-slate-400 mt-0.5">25A31A05HD SHAIK SHARUKH</p>
                  </div>
                </div>
              </div>

              {/* Textarea Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-300 px-1 font-semibold">
                  <span>Enter or paste students list:</span>
                  <span className="text-slate-500 font-mono text-[11px]">
                    {parsedEntries.length} line{parsedEntries.length === 1 ? '' : 's'} parsed
                  </span>
                </div>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  rows={9}
                  placeholder={`25A31A05HA, KONDURI SAI KUMAR\n25A31A05HB\tPOLISETTI LIKHITHA\n25A31A05HC - RAYUDU MANIDEEP\n25A31A05HD SHAIK SHARUKH`}
                  className="w-full p-3.5 bg-slate-950 border border-slate-700/80 rounded-2xl text-xs sm:text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 leading-relaxed resize-y"
                />
              </div>

              {/* Parsing summary chips */}
              {parsedEntries.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                    Total: <strong className="text-white">{parsedEntries.length}</strong>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ready to Add: <strong>{readyList.length}</strong>
                  </span>
                  {duplicateList.length > 0 && (
                    <span className="px-2.5 py-1 rounded-xl bg-amber-950/80 text-amber-300 border border-amber-800 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Duplicates (Skipped): <strong>{duplicateList.length}</strong>
                    </span>
                  )}
                  {invalidList.length > 0 && (
                    <span className="px-2.5 py-1 rounded-xl bg-rose-950/80 text-rose-300 border border-rose-800 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Incomplete: <strong>{invalidList.length}</strong>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveTab('PREVIEW')}
                    className="ml-auto text-blue-400 hover:text-blue-300 font-semibold underline text-xs cursor-pointer"
                  >
                    View detailed preview →
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* PREVIEW TAB */
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">
                  Live Parsed Students Table ({parsedEntries.length} total)
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('EDIT')}
                  className="text-blue-400 hover:underline cursor-pointer"
                >
                  ← Edit text input
                </button>
              </div>

              {parsedEntries.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/40 border border-slate-800 rounded-2xl space-y-2">
                  <p className="text-xs text-slate-400">No student lines entered yet.</p>
                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
                  >
                    Load Sample Data
                  </button>
                </div>
              ) : (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-inner max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900/90 sticky top-0 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="p-3 w-12 text-center">#</th>
                        <th className="p-3 w-36">Roll Number</th>
                        <th className="p-3">Student Full Name</th>
                        <th className="p-3 w-32 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {parsedEntries.map((entry) => (
                        <tr
                          key={entry.lineNum}
                          className={`hover:bg-slate-900/40 transition ${
                            entry.status === 'DUPLICATE'
                              ? 'bg-amber-950/10'
                              : entry.status === 'INVALID'
                              ? 'bg-rose-950/10'
                              : ''
                          }`}
                        >
                          <td className="p-3 text-slate-500 text-center font-mono text-[11px]">
                            {entry.lineNum}
                          </td>
                          <td className="p-3 font-mono font-bold">
                            {entry.rollNo ? (
                              <span className="text-blue-400">{entry.rollNo}</span>
                            ) : (
                              <span className="text-rose-400 italic">None</span>
                            )}
                          </td>
                          <td className="p-3 font-semibold text-white">
                            {entry.name || (
                              <span className="text-slate-500 italic">Missing Name</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {entry.status === 'READY' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                <CheckCircle2 className="w-3 h-3" /> Ready
                              </span>
                            ) : entry.status === 'DUPLICATE' ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 cursor-help"
                                title={entry.message}
                              >
                                <AlertTriangle className="w-3 h-3" /> Duplicate
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800 cursor-help"
                                title={entry.message}
                              >
                                <AlertCircle className="w-3 h-3" /> Invalid
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Import Settings Checkboxes */}
          <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>Skip duplicate students already in active roster</span>
            </label>

            <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoUppercase}
                onChange={(e) => setAutoUppercase(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>Auto-convert roll numbers & names to uppercase</span>
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {readyList.length > 0 ? (
              <span>
                <strong className="text-emerald-400 font-mono">{readyList.length}</strong> new student{readyList.length === 1 ? '' : 's'} will be added to the roster and synced across all devices.
              </span>
            ) : (
              <span>Enter or paste student names and roll numbers above to preview.</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={isSubmitting || readyList.length === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition shadow-lg shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>{isSubmitting ? 'Importing...' : `Import ${readyList.length} Student${readyList.length === 1 ? '' : 's'}`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
