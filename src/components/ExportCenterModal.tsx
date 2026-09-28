import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  X,
  FolderTree,
  FileSpreadsheet,
  HardDrive,
  Sparkles,
  Table,
  CheckSquare,
  Square,
  AlertTriangle,
  Award,
  Layers,
} from 'lucide-react';
import { StudentStatusRecord } from '../types';
import {
  exportClassSummaryCsv,
  exportIndividualCertificatesCsv,
  exportMultiSheetExcelXml,
  exportCustomizedCsv,
  exportGapAnalysisCsv,
} from '../services/csvExportService';
import { ReconciliationExporter } from './ReconciliationExporter';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportCenterModalProps {
  students: StudentStatusRecord[];
  accessToken?: string | null;
  onClose: () => void;
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export type ExportPresetFormat =
  | 'EXCEL_XML'
  | 'CSV_SUMMARY'
  | 'CSV_INDIVIDUAL_CERTS'
  | 'CSV_CUSTOM'
  | 'CSV_DEFAULTER_NOTICE'
  | 'PDF_REPORT';

const AVAILABLE_CUSTOM_FIELDS = [
  { key: 'rollNo', label: 'Roll Number' },
  { key: 'name', label: 'Student Name' },
  { key: 'overallStatus', label: 'Overall Status' },
  { key: 'driveUploaded', label: 'Drive Uploaded (T/F)' },
  { key: 'sheetUpdated', label: 'Sheet Updated (T/F)' },
  { key: 'submitted', label: 'Submission Confirmed (T/F)' },
  { key: 'certCount', label: 'Certificates Count' },
  { key: 'certTitles', label: 'Certificate Titles' },
  { key: 'driveLinks', label: 'Google Drive Links' },
  { key: 'sheetCategories', label: 'Sheet Categories' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'lastUpdated', label: 'Last Verified Date' },
];

export const ExportCenterModal: React.FC<ExportCenterModalProps> = ({
  students,
  accessToken = null,
  onClose,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'DRIVE_EXPORT' | 'FILE_DOWNLOAD'>('DRIVE_EXPORT');
  const [format, setFormat] = useState<ExportPresetFormat>('EXCEL_XML');
  const [category, setCategory] = useState<'ALL' | 'COMPLETED' | 'PENDING' | 'MISMATCH'>('ALL');
  const [dateRange, setDateRange] = useState('ALL_TIME');
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'rollNo',
    'name',
    'overallStatus',
    'driveUploaded',
    'sheetUpdated',
    'certCount',
    'certTitles',
    'driveLinks',
  ]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // 1. Category filter
      if (category === 'COMPLETED' && s.overallStatus !== 'COMPLETED') return false;
      if (category === 'PENDING' && s.overallStatus === 'COMPLETED') return false;
      if (category === 'MISMATCH') {
        const isMismatch =
          (s.countMismatch && s.countMismatch.hasMismatch) ||
          s.driveUploaded !== s.sheetUpdated ||
          (s.driveFiles?.length || 0) !== (s.sheetRecords?.length || 0);
        if (!isMismatch) return false;
      }

      // 2. Date filter
      if (dateRange !== 'ALL_TIME' && s.lastUpdated) {
        const lastUpdatedDate = new Date(s.lastUpdated);
        const now = new Date();
        const diffDays = (now.getTime() - lastUpdatedDate.getTime()) / (1000 * 3600 * 24);

        if (dateRange === 'LAST_7_DAYS' && diffDays > 7) return false;
        if (dateRange === 'LAST_30_DAYS' && diffDays > 30) return false;
      }

      return true;
    });
  }, [students, category, dateRange]);

  const handleToggleField = (key: string) => {
    setSelectedFields((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSelectAllFields = () => {
    setSelectedFields(AVAILABLE_CUSTOM_FIELDS.map((f) => f.key));
  };

  const handleExecuteExport = () => {
    if (filteredStudents.length === 0) {
      onToast?.('No students match the selected filters.', 'error');
      return;
    }

    switch (format) {
      case 'EXCEL_XML':
        exportMultiSheetExcelXml(filteredStudents);
        onToast?.('Exported Multi-Sheet Excel Workbook (.xls)!', 'success');
        break;

      case 'CSV_SUMMARY':
        exportClassSummaryCsv(filteredStudents);
        onToast?.('Exported Class Summary CSV!', 'success');
        break;

      case 'CSV_INDIVIDUAL_CERTS':
        exportIndividualCertificatesCsv(filteredStudents);
        onToast?.('Exported Individual Certificates CSV!', 'success');
        break;

      case 'CSV_CUSTOM':
        exportCustomizedCsv(filteredStudents, selectedFields);
        onToast?.(`Exported Custom CSV with ${selectedFields.length} fields!`, 'success');
        break;

      case 'CSV_DEFAULTER_NOTICE':
        exportGapAnalysisCsv(filteredStudents);
        onToast?.('Exported Defaulter Action Notice CSV!', 'success');
        break;

      case 'PDF_REPORT': {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text('Institutional Certificate Verification Report', 14, 15);
        doc.setFontSize(10);
        doc.text(
          `Generated: ${new Date().toLocaleString()} | Filter: ${category} (${filteredStudents.length} Students)`,
          14,
          22
        );

        autoTable(doc, {
          startY: 28,
          head: [['Roll No', 'Student Name', 'Status', 'Drive', 'Sheet', 'Certs']],
          body: filteredStudents.map((s) => [
            s.rollNo,
            s.name,
            s.overallStatus,
            s.driveUploaded ? 'Yes' : 'No',
            s.sheetUpdated ? 'Yes' : 'No',
            s.certificates.length || s.driveFiles.length,
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [30, 41, 59] },
        });

        doc.save(`Verification_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
        onToast?.('Exported Formatted PDF Verification Report!', 'success');
        break;
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Export &amp; Sync Control Center</span>
                <span className="text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-mono">
                  Ultimate Edition
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Create structured Drive category folders or export multi-tab workbooks &amp; custom CSVs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Tab Selector */}
        <div className="flex items-center gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('DRIVE_EXPORT')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'DRIVE_EXPORT'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Google Drive Category Export</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('FILE_DOWNLOAD')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'FILE_DOWNLOAD'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Advanced Spreadsheet &amp; Reports ({filteredStudents.length})</span>
          </button>
        </div>

        {activeTab === 'DRIVE_EXPORT' ? (
          <div className="space-y-4">
            <ReconciliationExporter
              students={students}
              accessToken={accessToken}
              onToast={onToast}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Format Selection Grid */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Export Format &amp; Preset</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    id: 'EXCEL_XML',
                    title: 'Multi-Tab Excel Workbook',
                    desc: '3 Sheets: Summary, Category Matrix, Defaulters',
                    badge: '.XLS',
                  },
                  {
                    id: 'CSV_SUMMARY',
                    title: 'Class Summary CSV',
                    desc: '1 Row per student with all certs aggregated',
                    badge: '.CSV',
                  },
                  {
                    id: 'CSV_INDIVIDUAL_CERTS',
                    title: 'Individual Certs CSV',
                    desc: 'Every certificate on a separate audit row',
                    badge: '.CSV',
                  },
                  {
                    id: 'CSV_CUSTOM',
                    title: 'Custom Field Picker',
                    desc: 'Select exact columns you want exported',
                    badge: 'Custom',
                  },
                  {
                    id: 'CSV_DEFAULTER_NOTICE',
                    title: 'Defaulter Action Notice',
                    desc: 'Filter unsubmitted & missing Drive records',
                    badge: 'Action',
                  },
                  {
                    id: 'PDF_REPORT',
                    title: 'PDF Summary Document',
                    desc: 'Printable executive status report table',
                    badge: '.PDF',
                  },
                ].map((item) => {
                  const isSelected = format === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFormat(item.id as any)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-blue-600/15 border-blue-500 text-white shadow-sm shadow-blue-500/20'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{item.title}</span>
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">{item.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Field Selector (shown only if format === 'CSV_CUSTOM') */}
            {format === 'CSV_CUSTOM' && (
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Table className="w-3.5 h-3.5 text-blue-400" />
                    <span>Select Columns to Include ({selectedFields.length} selected):</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAllFields}
                    className="text-[11px] text-blue-400 hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AVAILABLE_CUSTOM_FIELDS.map((f) => {
                    const isChecked = selectedFields.includes(f.key);
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => handleToggleField(f.key)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs text-left flex items-center gap-2 transition cursor-pointer ${
                          isChecked
                            ? 'bg-blue-950/60 border-blue-500/50 text-blue-200 font-semibold'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        )}
                        <span className="truncate">{f.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filter and Date Range Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Target Student Subset
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Students in Roster ({students.length})</option>
                  <option value="COMPLETED">Verified (Completed)</option>
                  <option value="PENDING">Pending / Defaulters</option>
                  <option value="MISMATCH">Count / Source Mismatches</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Activity Date Range
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL_TIME">All Time</option>
                  <option value="LAST_7_DAYS">Last 7 Days</option>
                  <option value="LAST_30_DAYS">Last 30 Days</option>
                </select>
              </div>
            </div>

            {/* Final Export Trigger Button */}
            <button
              type="button"
              onClick={handleExecuteExport}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/25 text-xs mt-2"
            >
              <Download className="w-4 h-4" />
              <span>
                Download {filteredStudents.length} Students ({format.replace('CSV_', '').replace('_', ' ')})
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
