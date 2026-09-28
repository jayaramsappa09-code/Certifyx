import React, { useState } from 'react';
import {
  FolderTree,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { StudentStatusRecord, SheetSyncProof, AuditLogEntry, DriveCertificateFile } from '../types';
import { ReconciliationExporter } from './ReconciliationExporter';
import {
  exportClassSummaryCsv,
  exportIndividualCertificatesCsv,
  exportMultiSheetExcelXml,
  exportOutsideClassCsv,
  exportManualReviewQueueCsv,
  exportGapAnalysisCsv,
} from '../services/csvExportService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DashboardDriveOrganizerHubProps {
  students: StudentStatusRecord[];
  accessToken: string | null;
  sheetSyncProof?: SheetSyncProof | null;
  auditLogs?: AuditLogEntry[];
  unidentifiedFiles?: DriveCertificateFile[];
  outsideClassFiles?: DriveCertificateFile[];
  duplicateFiles?: DriveCertificateFile[];
  ambiguousCertFiles?: DriveCertificateFile[];
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  onOpenSheetProof?: () => void;
}

export const DashboardDriveOrganizerHub: React.FC<DashboardDriveOrganizerHubProps> = ({
  students,
  accessToken,
  sheetSyncProof,
  unidentifiedFiles = [],
  outsideClassFiles = [],
  onToast,
  onOpenSheetProof,
}) => {
  const [activeHubTab, setActiveHubTab] = useState<'DRIVE_ORGANIZER' | 'QUICK_EXPORTS'>('DRIVE_ORGANIZER');

  // Export handlers
  const handleExportSummary = () => {
    exportClassSummaryCsv(students);
    onToast?.(`Exported 67-Student Summary CSV with UTF-8 BOM.`, 'success');
  };

  const handleExportIndividual = () => {
    exportIndividualCertificatesCsv(students);
    onToast?.(`Exported Individual Certificates breakdown CSV.`, 'success');
  };

  const handleExportExcel = () => {
    exportMultiSheetExcelXml(students);
    onToast?.(`Exported Multi-Sheet Excel Workbook (.xls)!`, 'success');
  };

  const handleExportDefaulters = () => {
    exportGapAnalysisCsv(students);
    onToast?.(`Exported Defaulter Action Notice CSV!`, 'success');
  };

  const handleExportPdf = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 26, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('CLASS CERTIFICATE RECONCILIATION REPORT', 14, 13);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated: ${new Date().toLocaleString()} • Total Students: ${students.length}`, 14, 20);

      const tableData = students.map((s) => [
        s.rollNo,
        s.name,
        (s.driveFiles?.length || 0).toString(),
        (s.sheetRecords?.length || 0).toString(),
        s.driveUploaded ? 'YES' : 'NO',
        s.sheetUpdated ? 'YES' : 'NO',
        s.submitted ? 'YES' : 'NO',
        s.overallStatus,
      ]);

      autoTable(doc, {
        head: [['Roll No', 'Name', 'Drive Files', 'Sheet Records', 'Drive Sync', 'Sheet Sync', 'Submitted', 'Status']],
        body: tableData,
        startY: 32,
        theme: 'striped',
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: 240,
          fontStyle: 'bold',
          fontSize: 8,
        },
        bodyStyles: {
          fontSize: 7.5,
          cellPadding: 2,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
      });

      doc.save(`Reconciliation_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
      onToast?.('Reconciliation PDF Report downloaded successfully!', 'success');
    } catch (err: any) {
      onToast?.('Failed to generate PDF report: ' + (err.message || 'Unknown error'), 'error');
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-6">
      {/* Top Header & Navigation Segment */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
            <FolderTree className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Drive Organization &amp; Export Hub
              </h2>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                Dashboard Integrated
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Reorganize files into new Google Drive folders without altering filenames and export multi-format workbooks.
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center p-1 bg-slate-950/80 border border-slate-800 rounded-2xl shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveHubTab('DRIVE_ORGANIZER')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeHubTab === 'DRIVE_ORGANIZER'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Drive Exporter</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveHubTab('QUICK_EXPORTS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeHubTab === 'QUICK_EXPORTS'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>All Export Formats</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Live Google Drive Folder Exporter & Reorganizer */}
      {activeHubTab === 'DRIVE_ORGANIZER' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <span>Exact Existing Filenames Preserved</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.2 rounded-full font-mono">
                    Zero Renaming
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  When exporting to your new Google Drive destination, original file names remain 100% untouched. No roll number prefixes or random IDs will be added to the files.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              {onOpenSheetProof && (
                <button
                  type="button"
                  onClick={onOpenSheetProof}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Inspect Live Proof</span>
                </button>
              )}
            </div>
          </div>

          {/* Embedded Full Drive Exporter */}
          <ReconciliationExporter
            students={students}
            accessToken={accessToken}
            onToast={onToast}
          />
        </div>
      )}

      {/* Tab 2: Dashboard Quick Export Hub */}
      {activeHubTab === 'QUICK_EXPORTS' && (
        <div className="space-y-5 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* Multi-Sheet Excel XML */}
            <div className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex flex-col justify-between transition group">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-white">Multi-Sheet Excel (.xls)</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Export structured multi-tab workbook with Class Summary, Individual Certificates, Discrepancies, and Metrics.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportExcel}
                className="mt-4 w-full py-2 bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Multi-Sheet Excel</span>
              </button>
            </div>

            {/* 67-Student Summary CSV */}
            <div className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex flex-col justify-between transition group">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition">
                  <Download className="w-5 h-5" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-white">Class Summary CSV</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Clean roster summary formatted with UTF-8 BOM, student roll numbers, Drive &amp; Sheet reconciliation flags.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportSummary}
                className="mt-4 w-full py-2 bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Summary CSV</span>
              </button>
            </div>

            {/* Individual Certificates CSV */}
            <div className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex flex-col justify-between transition group">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition">
                  <FileText className="w-5 h-5" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-white">Detailed Certificates Breakdown</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Row-by-row certificate list with verified categories (Courses, Hackathons, Workshops) and direct Drive links.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportIndividual}
                className="mt-4 w-full py-2 bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Certificates CSV</span>
              </button>
            </div>

            {/* Defaulter Action Notice CSV */}
            <div className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex flex-col justify-between transition group">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-white">Defaulter Action Notice CSV</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Filtered list of students missing either Drive uploads or Google Sheet submissions with email reminder targets.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportDefaulters}
                className="mt-4 w-full py-2 bg-slate-800 hover:bg-amber-600 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Defaulter CSV</span>
              </button>
            </div>

            {/* Formal PDF Reconciliation Document */}
            <div className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex flex-col justify-between transition group">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-105 transition">
                  <FileText className="w-5 h-5" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-white">Formal PDF Report</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Print-ready compliance dossier featuring verification timestamps, administrative header, and status table.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportPdf}
                className="mt-4 w-full py-2 bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF Report</span>
              </button>
            </div>

            {/* Outside Class & Review Queue CSV */}
            <div className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex flex-col justify-between transition group">
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition">
                  <Layers className="w-5 h-5" />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-white">Review Queue &amp; Outside Class</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Export unrecognized roll numbers, ambiguous files, and duplicates for manual administrative audit.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  exportOutsideClassCsv(outsideClassFiles, sheetSyncProof || null);
                  onToast?.('Exported Outside Class Submissions CSV.', 'success');
                }}
                className="mt-4 w-full py-2 bg-slate-800 hover:bg-purple-600 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Review Queue CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
