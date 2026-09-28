import React, { useState } from 'react';
import { FileText, Download, X, Calendar, Filter } from 'lucide-react';
import { StudentStatusRecord } from '../types';
import { exportClassSummaryCsv } from '../services/csvExportService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ExportCenterModalProps {
  students: StudentStatusRecord[];
  onClose: () => void;
}

export const ExportCenterModal: React.FC<ExportCenterModalProps> = ({
  students,
  onClose,
}) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Export Center
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Format</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setFormat('CSV')} className={`px-4 py-2 rounded-xl text-sm font-bold ${format === 'CSV' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}>CSV</button>
              <button onClick={() => setFormat('PDF')} className={`px-4 py-2 rounded-xl text-sm font-bold ${format === 'PDF' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}>PDF</button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white">
              <option value="ALL">All Students</option>
              <option value="COMPLETED">Verified (Completed)</option>
              <option value="PENDING">Pending Issues</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date Range</label>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white">
              <option value="ALL_TIME">All Time</option>
              <option value="LAST_7_DAYS">Last 7 Days</option>
              <option value="LAST_30_DAYS">Last 30 Days</option>
            </select>
          </div>
        </div>

        <button 
          onClick={handleExport}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export {category} Data ({format})
        </button>
      </div>
    </div>
  );
};
