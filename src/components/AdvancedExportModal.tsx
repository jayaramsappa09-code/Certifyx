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
} from 'lucide-react';
import { StudentStatusRecord } from '../types';
import {
  AdvancedExportOptions,
  DEFAULT_ADVANCED_EXPORT_OPTIONS,
  exportAdvancedCustomizedDataCsv,
  exportClassificationAndAnalysisCsv,
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

  if (!isOpen) return null;

  const total = students.length || 67;
  const missingDriveCount = students.filter((s) => !s.driveUploaded).length;
  const missingSheetCount = students.filter((s) => !s.sheetUpdated).length;
  const missingBothCount = students.filter((s) => !s.driveUploaded && !s.sheetUpdated).length;
  const completedBothCount = students.filter((s) => s.driveUploaded && s.sheetUpdated).length;

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

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4 sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Advanced Export Customizer & Analysis Engine
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-purple-950 text-purple-300 border border-purple-800 text-xs font-semibold">
                  2-Sheet Package
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Customize boolean values (instead of raw TRUE/FALSE) and generate classification breakdown sheets
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

        <div className="p-6 space-y-6 flex-1">
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
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Exports UTF-8 BOM CSV files formatted for Excel and Google Sheets.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleExportBothSheets}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-purple-600/20 flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Full 2-Sheet Package</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
