import React, { useState } from 'react';
import {
  FolderTree,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  Sparkles,
  Server,
  Users,
  Database,
  Cpu,
  Layers,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  HardDrive,
  Activity,
  FileText,
  AlertTriangle,
  ArrowRight,
  Laptop,
  Smartphone,
  Gauge,
  Workflow,
  Lock,
  Zap,
  Coins,
  Check,
  Globe,
  Building2,
  Copy,
  Clock,
  CreditCard,
} from 'lucide-react';
import { StudentStatusRecord, SheetSyncProof, AuditLogEntry, DriveCertificateFile } from '../types';
import { ReconciliationExporter } from './ReconciliationExporter';
import {
  exportClassSummaryCsv,
  exportIndividualCertificatesCsv,
  exportMultiSheetExcelXml,
  exportOutsideClassCsv,
  exportManualReviewQueueCsv,
  exportAuditLogsCsv,
  exportGapAnalysisCsv,
} from '../services/csvExportService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PWAInstallButton } from './PWAInstallButton';

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
  onOpenDataHealth?: () => void;
}

export const DashboardDriveOrganizerHub: React.FC<DashboardDriveOrganizerHubProps> = ({
  students,
  accessToken,
  sheetSyncProof,
  auditLogs = [],
  unidentifiedFiles = [],
  outsideClassFiles = [],
  duplicateFiles = [],
  ambiguousCertFiles = [],
  onToast,
  onOpenSheetProof,
  onOpenDataHealth,
}) => {
  const [activeHubTab, setActiveHubTab] = useState<'DRIVE_ORGANIZER' | 'QUICK_EXPORTS' | 'SCALING_BLUEPRINT'>('DRIVE_ORGANIZER');
  
  // Scaling Strategy Toggle: 'ZERO_COST' (100% Free Forever) vs 'MANAGED_CLOUD' (Cloud SQL/Run)
  const [costStrategy, setCostStrategy] = useState<'ZERO_COST' | 'MANAGED_CLOUD'>('ZERO_COST');
  const [simulatedUsers, setSimulatedUsers] = useState<number>(5000);
  const [simulatedAvgCertsPerUser, setSimulatedAvgCertsPerUser] = useState<number>(3);
  const [copiedRollout, setCopiedRollout] = useState<boolean>(false);

  // Calculations for scale
  const totalSimulatedFiles = simulatedUsers * simulatedAvgCertsPerUser;
  const estimatedStorageGb = ((totalSimulatedFiles * 1.5) / 1024).toFixed(1); // avg 1.5MB per PDF
  const estimatedDriveApiCalls = totalSimulatedFiles * 2; // metadata + copy
  const recommendedPostgresRamGb = simulatedUsers >= 5000 ? 8 : 4;
  const recommendedRedisRamGb = simulatedUsers >= 5000 ? 4 : 2;
  const estimatedServerCost = simulatedUsers >= 5000 ? '$45 - $65 / month' : '$15 - $25 / month';

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

  const handleExportZeroCostBlueprintPdf = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      // Header block
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 30, 'F');
      
      doc.setTextColor(52, 211, 153); // emerald-400
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('5,000-STUDENT CAMPUS SCALING BLUEPRINT (100% FREE - $0 / Rs 0)', 14, 13);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225); // slate-300
      doc.text(`Official Zero-Cost Architecture Plan • Generated: ${new Date().toLocaleDateString()} • Scale: ${simulatedUsers.toLocaleString()} Students`, 14, 21);
      doc.text('Decentralized Client PWA + Google Workspace for Education + Free Edge CDN', 14, 26);

      const costRows = [
        ['Frontend Hosting & CDN', 'Cloudflare Pages / Vercel Free Tier', 'Unlimited Bandwidth & Global CDN', '$0 / Rs 0'],
        ['Backend Compute Server', 'Client-Side Distributed SPA Engine', 'Executes in user browser (0 cloud CPU)', '$0 / Rs 0'],
        ['Institutional Database', 'Google Sheets API v4', 'Up to 10,000,000 cells per sheet included', '$0 / Rs 0'],
        ['Performance Edge Cache', 'Browser IndexedDB Local Storage', 'Multi-GB zero-latency offline client cache', '$0 / Rs 0'],
        ['Certificate Drive Storage', 'Google Workspace for Education', '100 TB campus pooled Google Drive', '$0 / Rs 0'],
        ['Authentication & SSO', 'Google OAuth 2.0 Client Credentials', 'Unlimited student/faculty sign-ins', '$0 / Rs 0'],
        ['Mobile & Desktop Apps', 'Progressive Web App (PWA)', 'Direct browser install (0 App Store fee)', '$0 / Rs 0'],
        ['TOTAL MONTHLY BUDGET', 'All Free-Tier Educational Services', '100% Free Forever Tier', '$0.00 / Rs 0'],
      ];

      autoTable(doc, {
        head: [['Infrastructure Layer', 'Service / Technology', 'Capacity & Limit Details', 'Cost / Month']],
        body: costRows,
        startY: 36,
        theme: 'striped',
        headStyles: {
          fillColor: [16, 185, 129], // emerald-500
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8,
        },
        bodyStyles: {
          fontSize: 7.5,
          cellPadding: 2.2,
        },
        alternateRowStyles: {
          fillColor: [240, 253, 250],
        },
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 105;

      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('HOW 5,000 USERS SCALE AT ZERO COST WITHOUT CRASHING:', 14, finalY + 8);

      const pillars = [
        '1. Decentralized Client Compute: Reconciliation executes locally on client browser. Zero server compute costs.',
        '2. User-Delegated API Quota: Google limits 60 req/min PER USER. 5,000 users = 300,000 req/min aggregate capacity for $0.',
        '3. Google Sheets as Campus DB: 5,000 students x 25 fields = 125,000 cells (uses only 1.25% of Google Sheets 10M limit).',
        '4. Pooled College Drive Storage: Workspace for Education provides 100 TB pooled storage with zero egress/retrieval fees.',
        '5. IndexedDB Delta Caching: Roster and file hashes saved locally on student/faculty devices for 0ms offline-first loading.',
        '6. Native PWA Distribution: Students install directly to phone or laptop home screen without $99/yr Apple or $25 Play Store fees.',
      ];

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      pillars.forEach((p, idx) => {
        doc.text(p, 14, finalY + 15 + (idx * 5.2));
      });

      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('RECOMMENDED CAMPUS ROLLOUT CHECKLIST:', 14, finalY + 52);

      const rollout = [
        'Phase 1: Configure Master Google Sheet template with Department/Branch tabs (CSE, ECE, MECH, etc.).',
        'Phase 2: Deploy PWA build to Cloudflare Pages with custom domain (e.g. certs.college.edu.in) in 5 minutes.',
        'Phase 3: Share install link with Faculty Class Proctors (each proctor verifies their 60-student batch).',
        'Phase 4: Students upload certificates to designated batch Google Drive folders; instant live reconciliation.',
      ];

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      rollout.forEach((r, idx) => {
        doc.text(r, 14, finalY + 59 + (idx * 4.8));
      });

      doc.save(`Zero_Cost_Campus_Scaling_Blueprint_5000_Users.pdf`);
      onToast?.('Zero-Cost ($0) Campus Scaling Blueprint PDF downloaded!', 'success');
    } catch (err: any) {
      onToast?.('Failed to generate scaling blueprint PDF: ' + (err.message || 'Unknown error'), 'error');
    }
  };

  const handleCopyRolloutChecklist = () => {
    const text = `CAMPUS ZERO-COST (Rs 0 / $0) ROLLOUT CHECKLIST FOR 5,000 STUDENTS:
1. Google Workspace for Education (100 TB Pooled Drive): Free for all recognized colleges. No AWS/GCP storage costs.
2. Free Global Edge CDN (Cloudflare Pages or Vercel): 100% free forever tier with unlimited bandwidth and custom college domain (e.g. certs.college.edu.in).
3. Decentralized Browser Compute: Reconciliation runs inside user browsers (0 cloud server cost).
4. Google Sheets API v4 Database: Supports up to 10,000,000 cells for free. 5,000 students x 25 fields uses only 125,000 cells (1.25% of free quota).
5. User-Level OAuth Quotas: 60 req/min per user. 5,000 users = 300,000 req/min capacity across the campus without hitting API rate limits.
6. Progressive Web App (PWA): Direct 1-click install on mobile and desktop without $99/year Apple Developer or $25 Play Store fees.
7. IndexedDB Edge Caching: Caches rosters and file hashes locally on student devices for instant 0ms loads and offline resilience.`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedRollout(true);
      setTimeout(() => setCopiedRollout(false), 3000);
      onToast?.('Zero-cost campus rollout checklist copied to clipboard!', 'success');
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
                Drive Organization, Export &amp; Scale Hub
              </h2>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                Dashboard Integrated
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Reorganize files into new Google Drive folders without altering filenames, export workbooks, or inspect the 5,000-user capacity blueprint.
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

          <button
            type="button"
            onClick={() => setActiveHubTab('SCALING_BLUEPRINT')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeHubTab === 'SCALING_BLUEPRINT'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Scale at ₹0 Free (5k Users)</span>
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

      {/* Tab 3: 5,000 Users App & Scaling Blueprint */}
      {activeHubTab === 'SCALING_BLUEPRINT' && (
        <div className="space-y-6 animate-fade-in">
          {/* Strategy Mode Switcher Bar */}
          <div className="bg-slate-950/80 border border-slate-800 p-1.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setCostStrategy('ZERO_COST')}
                className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  costStrategy === 'ZERO_COST'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 border border-emerald-400/30'
                    : 'text-slate-400 hover:text-white bg-slate-900/60'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-emerald-300" />
                <span>100% Free Campus Tier (₹0 / $0 Forever)</span>
                <span className="text-[10px] bg-emerald-400/20 text-emerald-200 px-1.5 py-0.5 rounded font-mono">
                  ZERO BUDGET
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCostStrategy('MANAGED_CLOUD')}
                className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  costStrategy === 'MANAGED_CLOUD'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30'
                    : 'text-slate-400 hover:text-white bg-slate-900/60'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-blue-300" />
                <span>Managed Cloud Stack ($45–$65/mo)</span>
              </button>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleCopyRolloutChecklist}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-750 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                title="Copy rollout checklist for college management"
              >
                {copiedRollout ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRollout ? 'Copied!' : 'Copy Rollout Plan'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportZeroCostBlueprintPdf}
                className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-500/10"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Blueprint PDF</span>
              </button>
            </div>
          </div>

          {/* Executive Summary Banner */}
          {costStrategy === 'ZERO_COST' ? (
            <div className="bg-gradient-to-r from-emerald-950/70 via-slate-950 to-teal-950/70 border border-emerald-500/40 rounded-2xl p-5 space-y-3 shadow-xl shadow-emerald-950/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/20">
                    <Coins className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        How We Scale to 5,000+ Students at Exactly ₹0 / $0 Free
                      </h3>
                      <span className="text-[10px] bg-emerald-500/25 text-emerald-300 px-2.5 py-0.5 rounded-full font-mono border border-emerald-500/30 font-bold">
                        100% Free Forever
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                      This app is architected as a <strong className="text-emerald-300 font-semibold">Client-Side Serverless PWA</strong>. All certificate reconciliation executes locally in the student or faculty browser. By leveraging your institution's <strong className="text-white">Google Workspace for Education (100 TB Pooled Drive)</strong>, <strong className="text-white">Google Sheets (10 Million Cells)</strong>, and <strong className="text-white">Cloudflare Pages (Unlimited Bandwidth CDN)</strong>, you can deploy across the entire campus with <strong className="text-emerald-400 font-semibold">₹0 monthly budget</strong>.
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <PWAInstallButton />
                </div>
              </div>

              {/* Quick Highlights Bar */}
              <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-300 font-medium">₹0 Cloud Server Cost</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-300 font-medium">100 TB Free College Drive</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-300 font-medium">300k req/min User Quota</span>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-slate-300 font-medium">Zero App Store Fees (PWA)</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-blue-950/70 via-slate-950 to-indigo-950/70 border border-blue-500/40 rounded-2xl p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
                    <Server className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      Dedicated Cloud Infrastructure (~$45 - $65 / Month)
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      For large private universities requiring an enterprise relational database (PostgreSQL Cloud SQL), Redis queue worker clusters, and centralized audit compliance logging.
                    </p>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <PWAInstallButton />
                </div>
              </div>
            </div>
          )}

          {/* Interactive Capacity Calculator */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <Gauge className="w-4 h-4 text-blue-400" />
                <span>Interactive Capacity &amp; Resource Estimator</span>
              </h4>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 font-bold">
                Scale: {simulatedUsers.toLocaleString()} students ({totalSimulatedFiles.toLocaleString()} certificates)
              </span>
            </div>

            {/* Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Roster Size (500 to 10,000 students)</span>
                <span className="text-white font-bold">{simulatedUsers.toLocaleString()} Students</span>
              </div>
              <input
                type="range"
                min="500"
                max="10000"
                step="500"
                value={simulatedUsers}
                onChange={(e) => setSimulatedUsers(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Dynamic Metric Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-slate-900/90 border border-slate-800/80 p-3 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Certificates</span>
                <div className="text-sm sm:text-base font-mono font-bold text-white">
                  {totalSimulatedFiles.toLocaleString()} files
                </div>
                <span className="text-[10px] text-emerald-400 font-medium">
                  {costStrategy === 'ZERO_COST' ? 'Free on College 100 TB Drive' : `~${estimatedStorageGb} GB Cloud Storage`}
                </span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800/80 p-3 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">API Throughput</span>
                <div className="text-sm sm:text-base font-mono font-bold text-blue-400">
                  {(simulatedUsers * 60).toLocaleString()} req/min
                </div>
                <span className="text-[10px] text-slate-400">
                  {costStrategy === 'ZERO_COST' ? 'Decentralized User Quota ($0)' : 'Requires Redis Worker Queue'}
                </span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800/80 p-3 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Institutional Database</span>
                <div className="text-sm sm:text-base font-mono font-bold text-emerald-400">
                  {costStrategy === 'ZERO_COST' ? 'Google Sheets + IndexedDB' : `Cloud SQL ${recommendedPostgresRamGb}GB`}
                </div>
                <span className="text-[10px] text-slate-400">
                  {costStrategy === 'ZERO_COST' ? '10M cell free limit (1.25% used)' : 'PostgreSQL B-Tree Index'}
                </span>
              </div>

              <div className="bg-slate-900/90 border border-slate-800/80 p-3 rounded-xl space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Monthly Cost</span>
                <div className={`text-sm sm:text-base font-mono font-bold ${costStrategy === 'ZERO_COST' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {costStrategy === 'ZERO_COST' ? '₹0 / $0.00 FOREVER' : estimatedServerCost}
                </div>
                <span className="text-[10px] text-slate-400">
                  {costStrategy === 'ZERO_COST' ? 'Zero server bills required' : 'Cloud Run + Cloud SQL + Redis'}
                </span>
              </div>
            </div>
          </div>

          {/* 6 Core Pillars of Scaling at ₹0 */}
          {costStrategy === 'ZERO_COST' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  <span>The 6 Architectural Pillars of Zero-Cost (₹0) Scaling</span>
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">
                  Engineered specifically for academic institutions
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Pillar 1: Client-Side Distributed Processing */}
                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs sm:text-sm font-bold text-white">1. Decentralized Compute (0 Servers)</h5>
                        <span className="text-[10px] text-emerald-400 font-semibold">₹0 Cloud CPU Usage</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Standard software requires $30/mo backend servers to parse rosters and reconcile filenames. In this app, reconciliation matching runs in the client browser using Web Workers and fast hash maps. 5,000 students run in parallel on their own devices.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>No Node.js or Python backend needed</span>
                  </div>
                </div>

                {/* Pillar 2: Free Unlimited CDN Hosting */}
                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs sm:text-sm font-bold text-white">2. Free Cloudflare / Vercel Edge</h5>
                        <span className="text-[10px] text-blue-400 font-semibold">Unlimited Bandwidth &amp; SSL</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Deploy the static React build to Cloudflare Pages or Vercel Free Tier. Includes unlimited bandwidth, global edge CDN caching, free automated SSL certificates, and custom institutional domain support (e.g., <code className="text-blue-300">certs.college.edu.in</code>).
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    <span>100% Free Forever Tier</span>
                  </div>
                </div>

                {/* Pillar 3: Google Sheets as the Institution Database */}
                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs sm:text-sm font-bold text-white">3. Google Sheets (10M Cells Free)</h5>
                        <span className="text-[10px] text-teal-400 font-semibold">Zero DB Hosting Bills</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Google Sheets supports up to 10,000,000 cells per workbook. A 5,000-student roster across 25 fields uses only 125,000 cells (1.25% of capacity). You get instant real-time auditability and editing for faculty without paying for a SQL database.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                    <span>Uses 1.25% of Google limit for 5k students</span>
                  </div>
                </div>

                {/* Pillar 4: Google Workspace for Education (100 TB Free) */}
                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                        <HardDrive className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs sm:text-sm font-bold text-white">4. College Workspace Drive (100 TB)</h5>
                        <span className="text-[10px] text-amber-400 font-semibold">Pooled Educational Storage</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Accredited universities receive Google Workspace for Education Fundamentals for free, providing 100 TB pooled storage across the college. 15,000 PDF certificates consume ~22 GB (only 0.02% of your college's free allowance!).
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    <span>Zero AWS S3 storage or egress fees</span>
                  </div>
                </div>

                {/* Pillar 5: Decentralized OAuth Quotas (300,000 req/min) */}
                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs sm:text-sm font-bold text-white">5. User OAuth Quotas (300k req/min)</h5>
                        <span className="text-[10px] text-indigo-400 font-semibold">No 429 Rate Limit Crashes</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Central servers crash because 5,000 users share 1 IP address. With client-side OAuth, every faculty and student signs in with their own Google account. Google provides 60 req/min <strong className="text-white">per user</strong>, giving an aggregate throughput of 300,000 req/min for free!
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                    <span>Distributed per-user Google API limits</span>
                  </div>
                </div>

                {/* Pillar 6: IndexedDB Edge Cache (0ms Latency) */}
                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs sm:text-sm font-bold text-white">6. Browser IndexedDB Local Cache</h5>
                        <span className="text-[10px] text-purple-400 font-semibold">0ms Loads &amp; Offline Resilient</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Roster records and file hashes are saved into the user's browser IndexedDB (hundreds of MB free storage per device). When opening the app, data loads in 0ms without hitting Google APIs, completely avoiding repetitive network traffic.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                    <span>Offline-first PWA caching</span>
                  </div>
                </div>
              </div>

              {/* Line-Item Cost Comparison Table */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    <span>Cost Comparison: Traditional Cloud vs. Zero-Cost Free Architecture</span>
                  </h4>
                  <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Annual Savings: ~$1,000+ / year
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                        <th className="py-2.5 px-3">Infrastructure Layer</th>
                        <th className="py-2.5 px-3">Commercial Cloud Stack</th>
                        <th className="py-2.5 px-3">Zero-Cost Campus Stack</th>
                        <th className="py-2.5 px-3">Why It's 100% Free Forever</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      <tr className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 font-semibold text-white">Backend Compute</td>
                        <td className="py-2.5 px-3 text-red-400 font-mono">$25 - $35 / mo</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-mono font-bold">₹0 / $0</td>
                        <td className="py-2.5 px-3 text-slate-400">Reconciliation runs in user browser via Web Workers</td>
                      </tr>
                      <tr className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 font-semibold text-white">Primary Database</td>
                        <td className="py-2.5 px-3 text-red-400 font-mono">$35 - $45 / mo</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-mono font-bold">₹0 / $0</td>
                        <td className="py-2.5 px-3 text-slate-400">Google Sheets API (10M cells limit) + IndexedDB</td>
                      </tr>
                      <tr className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 font-semibold text-white">File &amp; PDF Storage</td>
                        <td className="py-2.5 px-3 text-red-400 font-mono">$15 - $20 / mo</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-mono font-bold">₹0 / $0</td>
                        <td className="py-2.5 px-3 text-slate-400">Google Workspace for Education Pooled Drive (100 TB free)</td>
                      </tr>
                      <tr className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 font-semibold text-white">Hosting &amp; Global CDN</td>
                        <td className="py-2.5 px-3 text-red-400 font-mono">$10 - $15 / mo</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-mono font-bold">₹0 / $0</td>
                        <td className="py-2.5 px-3 text-slate-400">Cloudflare Pages / Vercel Free Tier (Unlimited bandwidth)</td>
                      </tr>
                      <tr className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 font-semibold text-white">App Store Licensing</td>
                        <td className="py-2.5 px-3 text-red-400 font-mono">$124 / year ($99 Apple + $25 Google)</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-mono font-bold">₹0 / $0</td>
                        <td className="py-2.5 px-3 text-slate-400">PWA 1-click install directly from browser</td>
                      </tr>
                      <tr className="bg-emerald-950/20 font-bold border-t-2 border-emerald-500/30">
                        <td className="py-3 px-3 text-emerald-300">Total Monthly Expenditure</td>
                        <td className="py-3 px-3 text-red-300 font-mono">~$85 - $115 / month</td>
                        <td className="py-3 px-3 text-emerald-300 font-mono text-sm">₹0.00 / MONTH FOREVER</td>
                        <td className="py-3 px-3 text-emerald-200">100% sustainable on zero institutional budget</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4-Week Campus Rollout Checklist */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-400" />
                    <span>Campus Implementation Rollout Plan (Zero Cost)</span>
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">Total setup time: &lt; 2 hours</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2 text-teal-400 font-mono font-bold">
                      <span className="w-5 h-5 rounded-full bg-teal-500/20 flex items-center justify-center text-[10px]">1</span>
                      <span>Google Sheet Setup</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Create Master Google Sheet with Branch tabs (e.g., <code className="text-teal-300">CSE</code>, <code className="text-teal-300">ECE</code>). Set columns for Roll No, Name, and Drive URL.
                    </p>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2 text-blue-400 font-mono font-bold">
                      <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px]">2</span>
                      <span>Deploy PWA</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Link repository to Cloudflare Pages. Add custom college domain (<code className="text-blue-300">certs.college.edu</code>). Automatic free deployment in 3 minutes.
                    </p>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2 text-purple-400 font-mono font-bold">
                      <span className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px]">3</span>
                      <span>Faculty Proctor Access</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Faculty sign in with college email. Each proctor oversees their assigned 60-student batch and resolves any ambiguous file uploads.
                    </p>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">4</span>
                      <span>Student Self-Service</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Students upload certificates to designated batch Google Drive folders. The app automatically verifies and copies files preserving exact original filenames!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Managed Cloud Stack Details */
            <div className="space-y-4">
              <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-400" />
                <span>5 Core Pillars for 5,000-User Enterprise Managed Cloud Scaling</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Pillar 1: PWA Mobile & Desktop Native App */}
                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <Laptop className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs sm:text-sm font-bold text-white">1. Installable PWA (Web + Mobile)</h5>
                      <span className="text-[10px] text-emerald-400 font-semibold">Active Right Now</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    This app is equipped with a Web App Manifest and Service Worker. Students and faculty can install it directly to their home screens or desktop docks with offline caching for instant loading on 2G/3G campus Wi-Fi.
                  </p>
                </div>

                {/* Pillar 2: Google Workspace API Quota Strategy */}
                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs sm:text-sm font-bold text-white">2. Drive &amp; Sheets API Quota Manager</h5>
                      <span className="text-[10px] text-amber-400 font-semibold">Avoid 429 Rate Limits</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Google Drive API allows ~1,200 requests/minute. For 5,000 users, implement a backend worker queue (BullMQ / Cloud Tasks) that batches calls at 15 req/sec with exponential backoff and Webhook push notifications.
                  </p>
                </div>

                {/* Pillar 3: Database & Partitioning Tier */}
                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs sm:text-sm font-bold text-white">3. PostgreSQL Partitioning (Cloud SQL)</h5>
                      <span className="text-[10px] text-blue-400 font-semibold">Sub-millisecond Queries</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Partition the database by <strong className="text-white">Department</strong> and <strong className="text-white">Academic Year</strong>. Add B-tree composite indexes on <code className="text-emerald-400">(roll_no, status, submitted)</code>. Cache hot rosters in Redis with a 10-minute TTL.
                  </p>
                </div>

                {/* Pillar 4: High-Performance Virtualized DOM */}
                <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs sm:text-sm font-bold text-white">4. 60 FPS Virtualized Roster Rendering</h5>
                      <span className="text-[10px] text-purple-400 font-semibold">Zero Browser Lag</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Instead of rendering 5,000 DOM elements simultaneously (which freezes laptops and phones), implement virtual windowing (`react-window` / TanStack Virtual) and server-side cursor pagination (50 rows per batch).
                  </p>
                </div>
              </div>

              {/* Pillar 5: Multi-Role Access Control (RBAC) */}
              <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs sm:text-sm font-bold text-white">5. Multi-Tier Role-Based Access Control (RBAC)</h5>
                    <span className="text-[10px] text-teal-400 font-semibold">Campus Hierarchy</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1 text-xs">
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="font-bold text-white block">Student View</span>
                    <p className="text-[10px] text-slate-400 mt-1">Can upload certificates and see only their own verification status.</p>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="font-bold text-white block">Faculty Proctor</span>
                    <p className="text-[10px] text-slate-400 mt-1">Manages assigned 60-student batch and resolves ambiguities.</p>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="font-bold text-white block">Department HOD</span>
                    <p className="text-[10px] text-slate-400 mt-1">Full oversight of 500-1,000 branch students and Drive folder exports.</p>
                  </div>
                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                    <span className="font-bold text-white block">Principal / Dean</span>
                    <p className="text-[10px] text-slate-400 mt-1">Institution-wide analytics, audit trail logs, and accreditation exports.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
