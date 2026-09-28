import React, { useState } from 'react';
import { FileText, Download, X, FolderTree, FileSpreadsheet, HardDrive } from 'lucide-react';
import { StudentStatusRecord } from '../types';
import { exportClassSummaryCsv } from '../services/csvExportService';
import { ReconciliationExporter } from './ReconciliationExporter';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportCenterModalProps {
  students: StudentStatusRecord[];
  accessToken?: string | null;
  onClose: () => void;
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const ExportCenterModal: React.FC<ExportCenterModalProps> = ({
  students,
  accessToken = null,
  onClose,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'DRIVE_EXPORT' | 'FILE_DOWNLOAD'>('DRIVE_EXPORT');
  const [format, setFormat] = useState<'CSV' | 'PDF'>('CSV');
  const [category, setCategory] = useState<'ALL' | 'COMPLETED' | 'PENDING'>('ALL');
  const [dateRange, setDateRange] = useState('ALL_TIME');

  const filteredStudents = students.filter(s => {
    // 1. Category filter
    if (category === 'COMPLETED' && s.overallStatus !== 'COMPLETED') return false;
    if (category === 'PENDING' && s.overallStatus === 'COMPLETED') return false;

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

  const handleExport = () => {
    if (format === 'CSV') {
      exportClassSummaryCsv(filteredStudents);
    } else {
      const doc = new jsPDF();
      doc.text("Student Data Export", 10, 10);
      autoTable(doc, {
        head: [['Roll No', 'Name', 'Status']],
        body: filteredStudents.map(s => [s.rollNo, s.name, s.overallStatus]),
      });
      doc.save('export.pdf');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 my-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Export Center
              </h2>
              <p className="text-xs text-slate-400">
                Organize into Google Drive category folders or download CSV/PDF reports
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
            <span>CSV / PDF Data Downloads</span>
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
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Format</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormat('CSV')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    format === 'CSV' ? 'bg-blue-600 text-white' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  CSV Spreadsheet
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('PDF')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    format === 'PDF' ? 'bg-blue-600 text-white' : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  PDF Document Report
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Student Subset</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Students ({students.length})</option>
                <option value="COMPLETED">Verified (Completed)</option>
                <option value="PENDING">Pending Issues / Incomplete</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date Activity Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="ALL_TIME">All Time</option>
                <option value="LAST_7_DAYS">Last 7 Days</option>
                <option value="LAST_30_DAYS">Last 30 Days</option>
              </select>
            </div>

            <button 
              type="button"
              onClick={handleExport}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20 text-xs mt-2"
            >
              <Download className="w-4 h-4" />
              <span>Download {category} Students Data ({format})</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
