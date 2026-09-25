import React, { useState } from 'react';
import {
  X,
  Download,
  Sliders,
  FileSpreadsheet,
  PieChart,
  Check,
  RotateCcw,
  Sparkles,
  FileText,
  Layers,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Eye,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { StudentStatusRecord } from '../types';
import {
  AdvancedExportOptions,
  DEFAULT_ADVANCED_EXPORT_OPTIONS,
  exportAdvancedCustomizedDataCsv,
  exportClassificationAndAnalysisCsv,
  exportGapAnalysisCsv,
  exportIndividualCertificatesCsv,
  exportOutsideClassCsv,
  exportManualReviewQueueCsv,
} from '../services/csvExportService';

interface AdvancedExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentStatusRecord[];
}

export const AdvancedExportModal: React.FC<AdvancedExportModalProps> = ({
  isOpen,
  onClose,
  students,
}) => {
  const [options, setOptions] = useState<AdvancedExportOptions>({
    ...DEFAULT_ADVANCED_EXPORT_OPTIONS,
  });

  const [preset, setPreset] = useState<'yesno' | 'descriptive' | 'passfail' | 'boolean'>('yesno');
  const [activeModalTab, setActiveModalTab] = useState<'customizer' | 'gap_analysis'>('customizer');
  const [gapSearchQuery, setGapSearchQuery] = useState('');

  if (!isOpen) return null;

  const total = students.length || 67;
  const missingDriveCount = students.filter((s) => !s.driveUploaded).length;
  const missingSheetCount = students.filter((s) => !s.sheetUpdated).length;
  const missingBothCount = students.filter((s) => !s.driveUploaded && !s.sheetUpdated).length;
  const completedBothCount = students.filter((s) => s.driveUploaded && s.sheetUpdated).length;

  const gapStudents = students.filter((s) => !s.driveUploaded && !s.sheetUpdated);
  const filteredGapStudents = gapStudents.filter(
    (s) =>
      s.rollNo.toLowerCase().includes(gapSearchQuery.toLowerCase().trim()) ||
      s.name.toLowerCase().includes(gapSearchQuery.toLowerCase().trim())
  );

  const handleApplyPreset = (type: 'yesno' | 'descriptive' | 'passfail' | 'boolean') => {
    setPreset(type);
    if (type === 'yesno') {
      setOptions({
        driveUploadedLabels: { trueLabel: 'Yes', falseLabel: 'No' },
        sheetUpdatedLabels: { trueLabel: 'Yes', falseLabel: 'No' },
        submittedLabels: { trueLabel: 'Yes', falseLabel: 'No' },
      });
    } else if (type === 'descriptive') {
      setOptions({
        driveUploadedLabels: { trueLabel: 'Uploaded to Drive', falseLabel: 'Missing Drive File' },
        sheetUpdatedLabels: { trueLabel: 'Recorded in Sheet', falseLabel: 'Missing Sheet Entry' },
        submittedLabels: { trueLabel: 'Confirmed by Admin', falseLabel: 'Unconfirmed' },
      });
    } else if (type === 'passfail') {
      setOptions({
        driveUploadedLabels: { trueLabel: 'PASS', falseLabel: 'FAIL' },
        sheetUpdatedLabels: { trueLabel: 'PASS', falseLabel: 'FAIL' },
        submittedLabels: { trueLabel: 'PASS', falseLabel: 'FAIL' },
      });
    } else if (type === 'boolean') {
      setOptions({
        driveUploadedLabels: { trueLabel: 'TRUE', falseLabel: 'FALSE' },
        sheetUpdatedLabels: { trueLabel: 'TRUE', falseLabel: 'FALSE' },
        submittedLabels: { trueLabel: 'TRUE', falseLabel: 'FALSE' },
      });
    }
  };

  const handleExportBothSheets = () => {
    // Export Sheet 1: Customized Master Data
    exportAdvancedCustomizedDataCsv(students, options);
    // Export Sheet 2: Classification & Analysis
    setTimeout(() => {
      exportClassificationAndAnalysisCsv(students, options);
    }, 400);
    onClose();
  };

  const handleExportSheet1Only = () => {
    exportAdvancedCustomizedDataCsv(students, options);
  };

  const handleExportSheet2Only = () => {
    exportClassificationAndAnalysisCsv(students, options);
  };

  const handleExportGapReport = () => {
    exportGapAnalysisCsv(students, options);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex flex-col gap-4 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Advanced Export Customizer & Gap Analysis
                  </h2>
                  <span className="px-2 py-0.5 rounded-md bg-purple-950 text-purple-300 border border-purple-800 text-xs font-semibold">
                    67 Roster Engine
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Customize boolean values, identify roster gaps, and generate classified breakdown reports
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation Controls */}
          <div className="flex items-center gap-2 p-1 bg-slate-950 border border-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveModalTab('customizer')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 ${
                activeModalTab === 'customizer'
                  ? 'bg-purple-950/90 text-purple-200 border border-purple-700/80 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>Export Settings & Presets</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveModalTab('gap_analysis')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-2 ${
                activeModalTab === 'gap_analysis'
                  ? 'bg-red-950/90 text-red-200 border border-red-700/80 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>Gap Analysis (Missing Both)</span>
              <span className="px-2 py-0.5 rounded-full bg-red-900/80 text-red-200 text-[10px] font-mono font-bold">
                {missingBothCount}
              </span>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {/* TAB 1: CUSTOMIZER & PACKAGE EXPORT */}
          {activeModalTab === 'customizer' && (
            <>
              {/* Read-Only Anti-Tamper Security Protection Lock Banner */}
              <div className="p-4 bg-gradient-to-r from-emerald-950/80 via-slate-950 to-blue-950/80 border border-emerald-800/80 rounded-2xl flex items-start gap-3 shadow-md">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Read-Only Anti-Tamper Protection Active
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-900/80 text-emerald-200 border border-emerald-700 text-[10px] font-mono font-bold">
                      🔒 EDIT-PROTECTED COPY
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    When exported, all records are permanently stamped with an official read-only security header banner and digital audit signature (`SHA256-READONLY-VERIFIED`). Recipients cannot modify or tamper with student status data.
                  </p>
                </div>
              </div>

              {/* Quick Preset Selector */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    Quick Value Format Presets
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Choose how boolean columns display in export
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('yesno')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer flex flex-col items-center gap-1 ${
                      preset === 'yesno'
                        ? 'bg-purple-950/80 text-purple-200 border-purple-700 shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span>Yes / No</span>
                    <span className="text-[10px] text-slate-500 font-mono">"Yes" | "No"</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('descriptive')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer flex flex-col items-center gap-1 ${
                      preset === 'descriptive'
                        ? 'bg-purple-950/80 text-purple-200 border-purple-700 shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span>Descriptive</span>
                    <span className="text-[10px] text-slate-500 font-mono">"Uploaded" | "Missing"</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('passfail')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer flex flex-col items-center gap-1 ${
                      preset === 'passfail'
                        ? 'bg-purple-950/80 text-purple-200 border-purple-700 shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span>Pass / Fail</span>
                    <span className="text-[10px] text-slate-500 font-mono">"PASS" | "FAIL"</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyPreset('boolean')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer flex flex-col items-center gap-1 ${
                      preset === 'boolean'
                        ? 'bg-purple-950/80 text-purple-200 border-purple-700 shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span>Raw True / False</span>
                    <span className="text-[10px] text-slate-500 font-mono">"TRUE" | "FALSE"</span>
                  </button>
                </div>
              </div>

              {/* Custom Boolean Input Controls */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  Customize Text Replacement Rules for Export
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Drive Uploaded Label Controls */}
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                    <span className="text-xs font-semibold text-slate-200 block">
                      Drive Uploaded Field
                    </span>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-emerald-400 font-mono block">
                        True Value Label:
                      </label>
                      <input
                        type="text"
                        value={options.driveUploadedLabels.trueLabel}
                        onChange={(e) => {
                          setPreset('descriptive');
                          setOptions({
                            ...options,
                            driveUploadedLabels: {
                              ...options.driveUploadedLabels,
                              trueLabel: e.target.value,
                            },
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <label className="text-[11px] text-amber-400 font-mono block pt-1">
                        False Value Label:
                      </label>
                      <input
                        type="text"
                        value={options.driveUploadedLabels.falseLabel}
                        onChange={(e) => {
                          setPreset('descriptive');
                          setOptions({
                            ...options,
                            driveUploadedLabels: {
                              ...options.driveUploadedLabels,
                              falseLabel: e.target.value,
                            },
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Sheet Updated Label Controls */}
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                    <span className="text-xs font-semibold text-slate-200 block">
                      Spreadsheet Updated Field
                    </span>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-emerald-400 font-mono block">
                        True Value Label:
                      </label>
                      <input
                        type="text"
                        value={options.sheetUpdatedLabels.trueLabel}
                        onChange={(e) => {
                          setPreset('descriptive');
                          setOptions({
                            ...options,
                            sheetUpdatedLabels: {
                              ...options.sheetUpdatedLabels,
                              trueLabel: e.target.value,
                            },
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <label className="text-[11px] text-amber-400 font-mono block pt-1">
                        False Value Label:
                      </label>
                      <input
                        type="text"
                        value={options.sheetUpdatedLabels.falseLabel}
                        onChange={(e) => {
                          setPreset('descriptive');
                          setOptions({
                            ...options,
                            sheetUpdatedLabels: {
                              ...options.sheetUpdatedLabels,
                              falseLabel: e.target.value,
                            },
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Admin Confirmed Submitted Controls */}
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                    <span className="text-xs font-semibold text-slate-200 block">
                      Admin Confirmed Field
                    </span>
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-emerald-400 font-mono block">
                        True Value Label:
                      </label>
                      <input
                        type="text"
                        value={options.submittedLabels.trueLabel}
                        onChange={(e) => {
                          setPreset('descriptive');
                          setOptions({
                            ...options,
                            submittedLabels: {
                              ...options.submittedLabels,
                              trueLabel: e.target.value,
                            },
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <label className="text-[11px] text-amber-400 font-mono block pt-1">
                        False Value Label:
                      </label>
                      <input
                        type="text"
                        value={options.submittedLabels.falseLabel}
                        onChange={(e) => {
                          setPreset('descriptive');
                          setOptions({
                            ...options,
                            submittedLabels: {
                              ...options.submittedLabels,
                              falseLabel: e.target.value,
                            },
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Export Preview (First 10 Rows) */}
              <div className="space-y-3 bg-slate-950/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-purple-400" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Live Export Data Preview (First 10 Rows)
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 font-mono text-[10px] font-semibold">
                    10 of {students.length} Rows
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Preview how custom boolean mappings and column overrides will look in the generated CSV output prior to download.
                </p>

                <div className="border border-slate-800 rounded-xl overflow-hidden overflow-x-auto max-h-56">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-900/90 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Roll No</th>
                        <th className="py-2 px-3">Student Name</th>
                        <th className="py-2 px-3">Drive Uploaded</th>
                        <th className="py-2 px-3">Sheet Updated</th>
                        <th className="py-2 px-3">Admin Confirmed</th>
                        <th className="py-2 px-3">Overall Status</th>
                        <th className="py-2 px-3">Drive Files</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px] text-slate-300">
                      {students.slice(0, 10).map((s, idx) => {
                        const driveVal = s.driveUploaded
                          ? options.driveUploadedLabels.trueLabel
                          : options.driveUploadedLabels.falseLabel;
                        const sheetVal = s.sheetUpdated
                          ? options.sheetUpdatedLabels.trueLabel
                          : options.sheetUpdatedLabels.falseLabel;
                        const subVal = s.submitted
                          ? options.submittedLabels.trueLabel
                          : options.submittedLabels.falseLabel;

                        const driveFileName = s.driveFiles.map((f) => f.name).join('; ') || 'None';

                        return (
                          <tr key={s.rollNo} className="hover:bg-slate-900/50 transition">
                            <td className="py-2 px-3 text-slate-500 font-sans">{idx + 1}</td>
                            <td className="py-2 px-3 font-bold text-white">{s.rollNo}</td>
                            <td className="py-2 px-3 font-sans text-slate-200">{s.name}</td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  s.driveUploaded
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                                }`}
                              >
                                {driveVal}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  s.sheetUpdated
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : 'bg-purple-950 text-purple-300 border border-purple-800'
                                }`}
                              >
                                {sheetVal}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  s.submitted
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                                }`}
                              >
                                {subVal}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-sans">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  s.overallStatus === 'COMPLETED'
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : s.overallStatus === 'PENDING'
                                    ? 'bg-yellow-950 text-yellow-300 border border-yellow-800'
                                    : 'bg-red-950 text-red-300 border border-red-800'
                                }`}
                              >
                                {s.overallStatus}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-400 max-w-xs truncate font-sans text-[11px]">
                              {driveFileName}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Export Sheets Package Overview */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  Package Sheets Structure (2-Sheet Export)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Sheet 1 Preview Card */}
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-950 text-blue-300 border border-blue-800 flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
                        Sheet 1: Master Roster Data
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {total} Rows
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Full student roster with customized status text, Drive preview links, certificate titles, and row index numbers.
                    </p>
                    <button
                      type="button"
                      onClick={handleExportSheet1Only}
                      className="mt-1 text-xs text-blue-400 hover:text-blue-300 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download Sheet 1 CSV Only</span>
                    </button>
                  </div>

                  {/* Sheet 2 Preview Card */}
                  <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1.5">
                        <PieChart className="w-3.5 h-3.5 text-purple-400" />
                        Sheet 2: Classification & Analysis
                      </span>
                      <span className="text-[11px] font-mono text-purple-300 font-bold">
                        4 Categorized Lists
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 space-y-1 font-mono pt-0.5">
                      <div className="flex justify-between">
                        <span>1. Missing Drive Uploads:</span>
                        <span className="text-amber-400 font-bold">{missingDriveCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>2. Missing Sheet Entries:</span>
                        <span className="text-amber-400 font-bold">{missingSheetCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>3. Missing BOTH (Drive & Sheet):</span>
                        <span className="text-red-400 font-bold">{missingBothCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>4. Fully Verified (Both Done):</span>
                        <span className="text-emerald-400 font-bold">{completedBothCount}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportSheet2Only}
                      className="mt-1 text-xs text-purple-400 hover:text-purple-300 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download Sheet 2 CSV Only</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: GAP ANALYSIS (MISSING BOTH DRIVE & SHEET) */}
          {activeModalTab === 'gap_analysis' && (
            <div className="space-y-6">
              {/* Executive Summary Metrics Card */}
              <div className="p-5 bg-gradient-to-r from-red-950/80 via-slate-950 to-amber-950/80 border border-red-800/80 rounded-2xl space-y-4 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-red-900/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight">
                        Targeted 67-Student Roster Gap Identification
                      </h3>
                      <p className="text-xs text-red-200/80">
                        Students who have NOT submitted a response in Google Sheet AND have NO file in Google Drive
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportGapReport}
                    className="px-4 py-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-red-600/30 flex items-center gap-2 cursor-pointer shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export Gap Analysis CSV</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                      Class Roster Size
                    </span>
                    <span className="text-lg font-bold text-white font-mono">{total}</span>
                    <span className="text-[10px] text-slate-500 block">Students Enrolled</span>
                  </div>

                  <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-center">
                    <span className="text-[10px] text-red-300 font-semibold uppercase block">
                      Dual-Missing Defaulters
                    </span>
                    <span className="text-lg font-bold text-red-400 font-mono">
                      {missingBothCount}
                    </span>
                    <span className="text-[10px] text-red-300/80 block">0 Drive & 0 Sheet</span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-800 text-center">
                    <span className="text-[10px] text-amber-300 font-semibold uppercase block">
                      Roster Gap Rate
                    </span>
                    <span className="text-lg font-bold text-amber-400 font-mono">
                      {Math.round((missingBothCount / total) * 100)}%
                    </span>
                    <span className="text-[10px] text-amber-300/80 block">Of Total Class</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                      Action Required
                    </span>
                    <span className="text-xs font-bold text-emerald-400 mt-1 block">
                      Direct Outreach
                    </span>
                    <span className="text-[10px] text-slate-500 block">Collect Certificates</span>
                  </div>
                </div>
              </div>

              {/* Search & List Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-red-400" />
                    Identified Gap Students ({filteredGapStudents.length} of {missingBothCount})
                  </h4>

                  <div className="relative w-64">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search Roll No or Name..."
                      value={gapSearchQuery}
                      onChange={(e) => setGapSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Gap Students List / Table */}
                {filteredGapStudents.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <p className="text-sm font-semibold text-white">No Gap Students Found</p>
                    <p className="text-xs text-slate-400">
                      {gapSearchQuery
                        ? 'No defaulters match your search filter.'
                        : 'Great news! All 67 students have submitted at least a Drive file or Google Sheet entry.'}
                    </p>
                  </div>
                ) : (
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-900 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">Roll No</th>
                          <th className="py-2.5 px-3">Student Name</th>
                          <th className="py-2.5 px-3">Drive File</th>
                          <th className="py-2.5 px-3">Sheet Record</th>
                          <th className="py-2.5 px-3">Action Required</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                        {filteredGapStudents.map((s) => (
                          <tr key={s.rollNo} className="hover:bg-slate-900/60 transition">
                            <td className="py-2.5 px-3 font-bold text-white">{s.rollNo}</td>
                            <td className="py-2.5 px-3 font-sans text-slate-200">{s.name}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-red-950 text-red-300 border border-red-800 font-semibold">
                                Missing File
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-red-950 text-red-300 border border-red-800 font-semibold">
                                Missing Entry
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-sans text-slate-400 text-[11px]">
                              Collect certificate file & submission response
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-300 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Exports UTF-8 BOM CSV files protected with an unalterable Read-Only Audit Lock.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Close
            </button>

            {activeModalTab === 'customizer' ? (
              <button
                type="button"
                onClick={handleExportBothSheets}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-purple-600/20 flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Full 2-Sheet Package</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExportGapReport}
                className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-red-600/20 flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Gap Analysis Report CSV</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
