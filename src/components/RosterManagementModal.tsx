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
  Trash2,
  FileSpreadsheet,
  ArrowRight,
  HelpCircle,
  Search,
  Download,
  RotateCcw,
  Edit2,
  Database,
  Plus,
} from 'lucide-react';
import {
  FIXED_CLASS_ROSTER,
  FIXED_CLASS_ROSTER_STATIC,
  normalizeRollNumber,
  extractRollNumberFromText,
  resetRosterToDefault,
} from '../data/classRoster';
import { Student } from '../types';

interface RosterManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'BATCH_IMPORT' | 'ADD_SINGLE' | 'VIEW_ROSTER';
  onAddRosterStudent: (rollNo: string, name: string) => void;
  onBatchAddRosterStudents: (students: Array<{ rollNo: string; name: string }>) => Promise<{
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

export const RosterManagementModal: React.FC<RosterManagementModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'BATCH_IMPORT',
  onAddRosterStudent,
  onBatchAddRosterStudents,
  onEditRosterStudent,
  onDeleteRosterStudent,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'BATCH_IMPORT' | 'ADD_SINGLE' | 'VIEW_ROSTER'>(initialTab);

  // Single student form state
  const [singleRollNo, setSingleRollNo] = useState('');
  const [singleName, setSingleName] = useState('');
  const [singleSubmitting, setSingleSubmitting] = useState(false);

  // Batch import state
  const [inputText, setInputText] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [autoUppercase, setAutoUppercase] = useState(true);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchSubView, setBatchSubView] = useState<'INPUT' | 'PREVIEW'>('INPUT');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Roster view state
  const [rosterSearch, setRosterSearch] = useState('');
  const [editingRollNo, setEditingRollNo] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Synchronize initialTab when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Set of existing normalized roll numbers for fast duplicate checking
  const existingRollSet = useMemo(() => {
    return new Set(FIXED_CLASS_ROSTER.map((s) => s.rollNo.toUpperCase().trim()));
  }, [isOpen, FIXED_CLASS_ROSTER.length]);

  // Robust line-by-line parsing for Batch Import
  const parsedEntries = useMemo<ParsedStudentEntry[]>(() => {
    if (!inputText.trim()) return [];

    const lines = inputText.split(/\r?\n/);
    const results: ParsedStudentEntry[] = [];
    const seenInBatch = new Set<string>();

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('#') || trimmed.startsWith('//')) return;
      if (/^(roll\s*no|reg\s*no|id|student\s*name|name\s*,\s*roll)/i.test(trimmed)) {
        return;
      }

      let rollNo = '';
      let name = '';

      // 1. Tab delimiter (from Google Sheets or Excel)
      if (trimmed.includes('\t')) {
        const parts = trimmed.split('\t').map((p) => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
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

      // 2. Comma delimiter
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

      // 3. Pipe delimiter
      if (!rollNo && trimmed.includes('|')) {
        const parts = trimmed.split('|').map((p) => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          rollNo = parts[0];
          name = parts.slice(1).join(' ');
        }
      }

      // 4. Semicolon or Colon or Hyphen delimiter
      if (!rollNo && /[:;\-]/.test(trimmed)) {
        const parts = trimmed.split(/[:;\-]/).map((p) => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          rollNo = parts[0];
          name = parts.slice(1).join(' ');
        }
      }

      // 5. Space separated
      if (!rollNo) {
        const match = trimmed.match(/^([0-9]{2}[A-Za-z][0-9]{2}[A-Za-z][0-9]{2}[A-Za-z0-9]{2}|[A-Za-z0-9]{6,12})\s+(.+)$/i);
        if (match) {
          rollNo = match[1];
          name = match[2];
        } else {
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

      if (autoUppercase) {
        rollNo = normalizeRollNumber(rollNo);
        name = name.toUpperCase().trim();
      } else {
        rollNo = rollNo.trim();
        name = name.trim();
      }

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

  const readyList = useMemo(() => parsedEntries.filter((p) => p.status === 'READY'), [parsedEntries]);
  const duplicateList = useMemo(() => parsedEntries.filter((p) => p.status === 'DUPLICATE'), [parsedEntries]);
  const invalidList = useMemo(() => parsedEntries.filter((p) => p.status === 'INVALID'), [parsedEntries]);

  // Filtered roster for view tab
  const filteredRoster = useMemo(() => {
    if (!rosterSearch.trim()) return [...FIXED_CLASS_ROSTER];
    const q = rosterSearch.toLowerCase().trim();
    return FIXED_CLASS_ROSTER.filter(
      (s) =>
        s.rollNo.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q)
    );
  }, [rosterSearch, FIXED_CLASS_ROSTER.length]);

  // Check if roll number entered in single form matches an existing student
  const normalizedInputRoll = useMemo(() => normalizeRollNumber(singleRollNo), [singleRollNo]);
  const existingMatchedStudent = useMemo(() => {
    if (!normalizedInputRoll) return null;
    return FIXED_CLASS_ROSTER.find((s) => normalizeRollNumber(s.rollNo) === normalizedInputRoll);
  }, [normalizedInputRoll, FIXED_CLASS_ROSTER.length]);

  // Load sample data
  const handleLoadSample = () => {
    setInputText(SAMPLE_DATA);
    setBatchSubView('PREVIEW');
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
        setBatchSubView('PREVIEW');
        onToast?.(`Loaded ${file.name} successfully into textarea.`, 'info');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle single student submit
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRoll = normalizeRollNumber(singleRollNo);
    const cleanName = singleName.trim() || `Student ${cleanRoll}`;

    if (!cleanRoll) {
      onToast?.('Please enter a valid student roll number.', 'error');
      return;
    }

    setSingleSubmitting(true);
    try {
      await onAddRosterStudent(cleanRoll, cleanName);
      setSingleRollNo('');
      setSingleName('');
      onToast?.(`🎉 Student ${cleanName} (${cleanRoll}) added and registered!`, 'success');
      onClose();
    } catch (err: any) {
      console.error('Failed to add student to roster:', err);
      onToast?.(err.message || 'Failed to add student to roster.', 'error');
    } finally {
      setSingleSubmitting(false);
    }
  };

  // Handle batch import submit
  const handleBatchImportSubmit = async () => {
    if (readyList.length === 0) {
      onToast?.('No valid new students found to import.', 'error');
      return;
    }

    setBatchSubmitting(true);
    try {
      const studentsToImport = readyList.map((entry) => ({
        rollNo: entry.rollNo,
        name: entry.name,
      }));

      const result = await onBatchAddRosterStudents(studentsToImport);
      const count = result.added.length;

      onToast?.(
        `🎉 Successfully bulk-imported ${count} student${count === 1 ? '' : 's'} permanently into the active class roster!`,
        'success'
      );
      setInputText('');
      onClose();
    } catch (err: any) {
      console.error('Batch import failed:', err);
      onToast?.(err.message || 'Failed to bulk-import students.', 'error');
    } finally {
      setBatchSubmitting(false);
    }
  };

  // Export Roster as CSV
  const handleExportRosterCsv = () => {
    const lines: string[] = [];
    lines.push('"Roll Number","Student Name"');
    FIXED_CLASS_ROSTER.forEach((s) => {
      lines.push(`"${s.rollNo}","${s.name.replace(/"/g, '""')}"`);
    });

    const csvContent = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Class_Roster_${FIXED_CLASS_ROSTER.length}_Students_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    onToast?.(`Exported full roster CSV (${FIXED_CLASS_ROSTER.length} students).`, 'success');
  };

  // Handle save edit student
  const handleSaveEdit = (rollNo: string) => {
    if (!editingName.trim()) {
      onToast?.('Name cannot be empty.', 'error');
      return;
    }
    if (onEditRosterStudent) {
      onEditRosterStudent(rollNo, editingName.trim());
    }
    setEditingRollNo(null);
    setEditingName('');
  };

  // Handle delete student
  const handleDelete = (rollNo: string, name: string) => {
    if (confirm(`Are you sure you want to permanently remove ${name} (${rollNo}) from the active class roster?`)) {
      if (onDeleteRosterStudent) {
        onDeleteRosterStudent(rollNo);
      }
    }
  };

  // Handle restore default 67 roster
  const handleRestoreDefaultRoster = () => {
    if (
      confirm(
        `Restore original default 67-student roster? This will reset custom students to the base 67 list.`
      )
    ) {
      resetRosterToDefault();
      onToast?.('Restored default 67-student class roster.', 'info');
      window.location.reload();
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
      <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600/20 via-indigo-600/20 to-emerald-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Class Roster Management
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                  {FIXED_CLASS_ROSTER.length} Students Active
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950 text-emerald-300 border border-emerald-800">
                  <Database className="w-3 h-3 text-emerald-400" />
                  Permanent Sync
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Add students permanently or bulk-import lists via textarea, spreadsheet, or CSV
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

        {/* Tab Selector Bar */}
        <div className="px-5 pt-3 pb-2 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('BATCH_IMPORT')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'BATCH_IMPORT'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Batch Import (Bulk)</span>
              {readyList.length > 0 && (
                <span className="bg-emerald-900 text-emerald-200 px-1.5 py-0.2 rounded-full text-[10px]">
                  {readyList.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ADD_SINGLE')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ADD_SINGLE'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Single Student</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('VIEW_ROSTER')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'VIEW_ROSTER'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Current Roster ({FIXED_CLASS_ROSTER.length})</span>
            </button>
          </div>

          {/* Quick Roster Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportRosterCsv}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
              title="Download entire current roster as CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Export Roster CSV</span>
            </button>

            <button
              type="button"
              onClick={handleRestoreDefaultRoster}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
              title="Reset roster to default 67 students"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Restore Default</span>
            </button>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {/* TAB 1: BATCH IMPORT STUDENTS */}
          {activeTab === 'BATCH_IMPORT' && (
            <div className="space-y-4">
              {/* Instructions and Format Support */}
              <div className="p-3.5 bg-emerald-950/20 border border-emerald-900/40 rounded-2xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Paste any student list format directly into the textarea:</span>
                  </div>
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
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3 h-3 text-emerald-400" />
                      <span>Upload File (.csv / .txt)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadSample}
                      className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Load Sample</span>
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-300 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 font-mono">
                  <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                    <span className="text-emerald-400 font-bold">Google Sheet / Excel:</span>
                    <p className="text-slate-400 mt-0.5 truncate">25A31A05HB [Tab] POLISETTI LIKHITHA</p>
                  </div>
                  <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                    <span className="text-blue-400 font-bold">Comma Separated:</span>
                    <p className="text-slate-400 mt-0.5 truncate">25A31A05HA, KONDURI SAI KUMAR</p>
                  </div>
                  <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                    <span className="text-purple-400 font-bold">Hyphen or Colon:</span>
                    <p className="text-slate-400 mt-0.5 truncate">25A31A05HC - RAYUDU MANIDEEP</p>
                  </div>
                  <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                    <span className="text-cyan-400 font-bold">Space Separated:</span>
                    <p className="text-slate-400 mt-0.5 truncate">25A31A05HD SHAIK SHARUKH</p>
                  </div>
                </div>
              </div>

              {/* Sub-view toggle (Input Textarea vs Live Parsed Preview) */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setBatchSubView('INPUT')}
                    className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                      batchSubView === 'INPUT'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Textarea Input
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchSubView('PREVIEW')}
                    className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1 ${
                      batchSubView === 'PREVIEW'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>Parsed Table</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-700 text-slate-200 font-mono">
                      {parsedEntries.length}
                    </span>
                  </button>
                </div>

                {inputText && (
                  <button
                    type="button"
                    onClick={() => setInputText('')}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Text</span>
                  </button>
                )}
              </div>

              {batchSubView === 'INPUT' ? (
                <div className="space-y-2">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    rows={8}
                    placeholder={`Paste student names & roll numbers here (one per line)...\n\nExample:\n25A31A05HA, KONDURI SAI KUMAR\n25A31A05HB\tPOLISETTI LIKHITHA\n25A31A05HC - RAYUDU MANIDEEP\n25A31A05HD SHAIK SHARUKH`}
                    className="w-full p-3.5 bg-slate-950 border border-slate-700/80 rounded-2xl text-xs sm:text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 leading-relaxed resize-y"
                  />
                </div>
              ) : (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-inner max-h-64 overflow-y-auto">
                  {parsedEntries.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No student records entered yet. Type or paste lines into the textarea to preview.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-900/90 sticky top-0 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="p-3 w-12 text-center">#</th>
                          <th className="p-3 w-36">Roll Number</th>
                          <th className="p-3">Student Name</th>
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
                                <span className="text-emerald-400">{entry.rollNo}</span>
                              ) : (
                                <span className="text-rose-400 italic">Missing</span>
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
                  )}
                </div>
              )}

              {/* Status Chips */}
              {parsedEntries.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                    Total Lines: <strong className="text-white">{parsedEntries.length}</strong>
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
                </div>
              )}

              {/* Settings Checkboxes */}
              <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Skip duplicate students already in active roster</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoUppercase}
                    onChange={(e) => setAutoUppercase(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-600 focus:ring-0 cursor-pointer"
                  />
                  <span>Auto-convert roll numbers & names to uppercase</span>
                </label>
              </div>

              {/* Action Button */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400">
                  {readyList.length > 0
                    ? `Ready to permanently import ${readyList.length} student${readyList.length === 1 ? '' : 's'} into the database and roster.`
                    : 'Paste student names and roll numbers above to begin import.'}
                </span>

                <button
                  type="button"
                  onClick={handleBatchImportSubmit}
                  disabled={batchSubmitting || readyList.length === 0}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>
                    {batchSubmitting
                      ? 'Importing...'
                      : `Permanently Import ${readyList.length} Student${readyList.length === 1 ? '' : 's'}`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ADD SINGLE STUDENT */}
          {activeTab === 'ADD_SINGLE' && (
            <form onSubmit={handleSingleSubmit} className="space-y-4 max-w-xl mx-auto py-2">
              <div className="p-4 bg-blue-950/30 border border-blue-900/40 rounded-2xl text-xs space-y-1">
                <h4 className="font-bold text-blue-300 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-blue-400" />
                  <span>Register a Single Student Permanently</span>
                </h4>
                <p className="text-slate-400 leading-relaxed">
                  Adding a student registers them permanently across your local cache and Supabase database. They will be immediately analyzed in all Google Drive file scans and Google Sheets form responses.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    Student Roll Number:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 25A31A05HA"
                    value={singleRollNo}
                    onChange={(e) => setSingleRollNo(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 uppercase"
                  />
                  <p className="text-[11px] text-slate-500">
                    Will be normalized and used to match files (e.g. 25A31A05HA_Certificate.pdf) and sheet rows.
                  </p>
                </div>

                {existingMatchedStudent && (
                  <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-xl text-xs text-blue-300 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white">{existingMatchedStudent.rollNo}</span> is registered as &ldquo;
                      <span className="font-bold text-white">{existingMatchedStudent.name}</span>&rdquo;.
                      <p className="text-[11px] text-slate-400 mt-0.5">Submitting will update their name in the class roster.</p>
                    </div>
                    {!singleName && (
                      <button
                        type="button"
                        onClick={() => setSingleName(existingMatchedStudent.name)}
                        className="text-xs text-blue-400 hover:text-blue-200 underline font-semibold ml-2 cursor-pointer shrink-0"
                      >
                        Copy Name
                      </button>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    Full Student Name:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KONDURI SAI KUMAR"
                    value={singleName}
                    onChange={(e) => setSingleName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 uppercase"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('BATCH_IMPORT')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Switch to Batch Import for multiple students →</span>
                </button>

                <button
                  type="submit"
                  disabled={singleSubmitting || !singleRollNo.trim()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-600/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {singleSubmitting
                      ? 'Saving...'
                      : existingMatchedStudent
                      ? 'Update Student in Roster'
                      : 'Add Student Permanently'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: CURRENT CLASS ROSTER */}
          {activeTab === 'VIEW_ROSTER' && (
            <div className="space-y-3">
              {/* Search & Counter */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    placeholder="Search roster students..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>
                    Showing <strong className="text-white">{filteredRoster.length}</strong> of{' '}
                    <strong className="text-indigo-400">{FIXED_CLASS_ROSTER.length}</strong> registered students
                  </span>
                </div>
              </div>

              {/* Roster Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-inner max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900/90 sticky top-0 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3 w-36">Roll Number</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3 w-28 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredRoster.map((student, idx) => (
                      <tr key={student.rollNo} className="hover:bg-slate-900/40 transition">
                        <td className="p-3 text-slate-500 text-center font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="p-3 font-mono font-bold text-indigo-300">
                          {student.rollNo}
                        </td>
                        <td className="p-3">
                          {editingRollNo === student.rollNo ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="px-2 py-1 bg-slate-900 border border-indigo-500 rounded-lg text-xs text-white uppercase w-full"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(student.rollNo)}
                                className="p-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingRollNo(null)}
                                className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="font-semibold text-white">{student.name}</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {editingRollNo !== student.rollNo && (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRollNo(student.rollNo);
                                  setEditingName(student.name);
                                }}
                                className="p-1 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded transition cursor-pointer"
                                title="Edit Student Name"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(student.rollNo, student.name)}
                                className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition cursor-pointer"
                                title="Delete Student"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
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

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>All additions are automatically reflected in dashboard graphs, mismatch checks &amp; CSVs.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
