import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  FileSpreadsheet,
  AlertTriangle,
  Mail,
  Eye,
  ExternalLink,
  Sparkles,
  LayoutGrid,
  Grid,
  Maximize2,
  RefreshCw,
  Award,
  Layers,
  FileCheck,
  Check,
  X,
  Compass,
} from 'lucide-react';
import { StudentStatusRecord, SheetRowRecord, DriveCertificateFile } from '../types';

interface ClassroomMatrixViewProps {
  students: StudentStatusRecord[];
  sheetRows?: SheetRowRecord[];
  onOpenDetails: (student: StudentStatusRecord) => void;
  onOpenEmailReminder?: (student?: StudentStatusRecord) => void;
  onToggleSubmitted?: (rollNo: string, current: boolean) => void;
  onToggleDriveUploaded?: (rollNo: string, current: boolean) => void;
  onToggleSheetUpdated?: (rollNo: string, current: boolean) => void;
  activeFilter?: string;
  setActiveFilter?: (filter: string) => void;
}

export const ClassroomMatrixView: React.FC<ClassroomMatrixViewProps> = ({
  students,
  sheetRows = [],
  onOpenDetails,
  onOpenEmailReminder,
  onToggleSubmitted,
  onToggleDriveUploaded,
  onToggleSheetUpdated,
  activeFilter = 'ALL',
  setActiveFilter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewLayout, setViewLayout] = useState<'SEATING' | 'HEX' | 'COMPACT'>('SEATING');
  const [hoveredStudent, setHoveredStudent] = useState<StudentStatusRecord | null>(null);
  const [hudPosition, setHudPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentStatusRecord | null>(null);

  // Helper to determine if a student has a data mismatch
  const checkMismatch = (s: StudentStatusRecord) => {
    return Boolean((s.countMismatch && s.countMismatch.hasMismatch) || (s.driveUploaded !== s.sheetUpdated));
  };

  // Filter students based on search and active status filter
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      switch (activeFilter) {
        case 'COMPLETED':
          return s.driveUploaded && s.sheetUpdated && !checkMismatch(s);
        case 'PENDING':
          return !s.driveUploaded || !s.sheetUpdated;
        case 'DRIVE_ONLY':
          return s.driveUploaded && !s.sheetUpdated;
        case 'SHEET_ONLY':
          return !s.driveUploaded && s.sheetUpdated;
        case 'MISMATCH':
          return checkMismatch(s);
        case 'NOT_STARTED':
          return !s.driveUploaded && !s.sheetUpdated && !s.submitted;
        default:
          return true;
      }
    });
  }, [students, searchTerm, activeFilter]);

  // Overall Statistics for status pills
  const stats = useMemo(() => {
    const total = students.length || 67;
    const completed = students.filter((s) => s.driveUploaded && s.sheetUpdated && !checkMismatch(s)).length;
    const driveOnly = students.filter((s) => s.driveUploaded && !s.sheetUpdated).length;
    const sheetOnly = students.filter((s) => !s.driveUploaded && s.sheetUpdated).length;
    const mismatch = students.filter((s) => checkMismatch(s)).length;
    const missing = students.filter((s) => !s.driveUploaded && !s.sheetUpdated).length;

    return { total, completed, driveOnly, sheetOnly, mismatch, missing };
  }, [students]);

  // Determine seat status color and glowing class
  const getSeatStatusStyle = (s: StudentStatusRecord) => {
    if (checkMismatch(s)) {
      return {
        type: 'MISMATCH',
        label: 'Data Mismatch',
        bg: 'bg-purple-950/80 border-purple-500/80 text-purple-200 hover:border-purple-400',
        glow: 'shadow-[0_0_15px_rgba(168,85,247,0.4)]',
        badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        dot: 'bg-purple-400 animate-pulse',
        ring: 'ring-2 ring-purple-500/60',
      };
    }
    if (s.driveUploaded && s.sheetUpdated) {
      return {
        type: 'COMPLETED',
        label: 'Verified & Completed',
        bg: 'bg-emerald-950/80 border-emerald-500/80 text-emerald-100 hover:border-emerald-400',
        glow: 'shadow-[0_0_18px_rgba(16,185,129,0.45)]',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        dot: 'bg-emerald-400',
        ring: 'ring-2 ring-emerald-500/60',
      };
    }
    if (s.driveUploaded && !s.sheetUpdated) {
      return {
        type: 'DRIVE_ONLY',
        label: 'Drive PDF Uploaded (Sheet Missing)',
        bg: 'bg-amber-950/80 border-amber-500/80 text-amber-100 hover:border-amber-400',
        glow: 'shadow-[0_0_15px_rgba(245,158,11,0.4)]',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        dot: 'bg-amber-400 animate-ping',
        ring: 'ring-2 ring-amber-500/60',
      };
    }
    if (!s.driveUploaded && s.sheetUpdated) {
      return {
        type: 'SHEET_ONLY',
        label: 'Sheet Response Recorded (Drive PDF Missing)',
        bg: 'bg-sky-950/80 border-sky-500/80 text-sky-100 hover:border-sky-400',
        glow: 'shadow-[0_0_15px_rgba(14,165,233,0.4)]',
        badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        dot: 'bg-sky-400',
        ring: 'ring-2 ring-sky-500/60',
      };
    }
    return {
      type: 'MISSING',
      label: 'Certificate Missing',
      bg: 'bg-slate-900/90 border-slate-800 text-slate-400 hover:border-rose-500/60',
      glow: 'hover:shadow-[0_0_12px_rgba(244,63,94,0.3)]',
      badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      dot: 'bg-rose-500',
      ring: 'ring-1 ring-slate-800',
    };
  };

  const handleSeatMouseEnter = (e: React.MouseEvent, s: StudentStatusRecord) => {
    setHoveredStudent(s);
    const rect = e.currentTarget.getBoundingClientRect();
    setHudPosition({
      x: rect.left + window.scrollX + rect.width / 2,
      y: rect.top + window.scrollY,
    });
  };

  const handleSeatMouseLeave = () => {
    setHoveredStudent(null);
    setHudPosition(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Layout Switcher Header */}
      <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-md rounded-2xl p-4 md:p-5 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 p-0.5 shadow-lg shadow-blue-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-blue-400">
                <Compass className="w-6 h-6 animate-spin-slow" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Interactive Classroom Matrix
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Spatial View (67 Seats)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Visual seat-by-seat compliance status chart with real-time status glows and Mini-HUD inspection
              </p>
            </div>
          </div>

          {/* View Mode Switcher Pills */}
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start lg:self-auto">
            <button
              onClick={() => setViewLayout('SEATING')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewLayout === 'SEATING'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Classroom Desk Map</span>
            </button>

            <button
              onClick={() => setViewLayout('HEX')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewLayout === 'HEX'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Honeycomb Grid</span>
            </button>

            <button
              onClick={() => setViewLayout('COMPACT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                viewLayout === 'COMPACT'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Seat Tiles</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-slate-800/80">
          {/* Search Box */}
          <div className="md:col-span-4 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search roll number (e.g. 0501) or name..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Interactive Filter Badges */}
          <div className="md:col-span-8 flex flex-wrap items-center gap-1.5 overflow-x-auto text-xs">
            <button
              onClick={() => setActiveFilter?.('ALL')}
              className={`px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 cursor-pointer ${
                activeFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span>All Seats</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                {stats.total}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter?.('COMPLETED')}
              className={`px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 cursor-pointer ${
                activeFilter === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-semibold'
                  : 'bg-slate-950 text-emerald-400/90 hover:text-emerald-300 border border-emerald-500/20'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>🟢 Verified ({stats.completed})</span>
            </button>

            <button
              onClick={() => setActiveFilter?.('DRIVE_ONLY')}
              className={`px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 cursor-pointer ${
                activeFilter === 'DRIVE_ONLY'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 font-semibold'
                  : 'bg-slate-950 text-amber-400/90 hover:text-amber-300 border border-amber-500/20'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              <span>🟡 Drive Only ({stats.driveOnly})</span>
            </button>

            <button
              onClick={() => setActiveFilter?.('SHEET_ONLY')}
              className={`px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 cursor-pointer ${
                activeFilter === 'SHEET_ONLY'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30 font-semibold'
                  : 'bg-slate-950 text-sky-400/90 hover:text-sky-300 border border-sky-500/20'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-sky-400"></span>
              <span>🔵 Sheet Only ({stats.sheetOnly})</span>
            </button>

            <button
              onClick={() => setActiveFilter?.('MISMATCH')}
              className={`px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 cursor-pointer ${
                activeFilter === 'MISMATCH'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-semibold'
                  : 'bg-slate-950 text-purple-400/90 hover:text-purple-300 border border-purple-500/20'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
              <span>🟣 Mismatch ({stats.mismatch})</span>
            </button>

            <button
              onClick={() => setActiveFilter?.('NOT_STARTED')}
              className={`px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 cursor-pointer ${
                activeFilter === 'NOT_STARTED'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 font-semibold'
                  : 'bg-slate-950 text-rose-400/90 hover:text-rose-300 border border-rose-500/20'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>🔴 Missing ({stats.missing})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Classroom Podium / Front Stage Marker (Visible in Seating Layout) */}
      {viewLayout === 'SEATING' && (
        <div className="w-full max-w-2xl mx-auto py-2.5 bg-gradient-to-r from-blue-900/30 via-indigo-900/40 to-blue-900/30 border border-blue-500/30 rounded-2xl text-center text-xs text-blue-300 font-semibold tracking-wider uppercase flex items-center justify-center gap-2 shadow-inner">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>👨‍🏫 FRONT OF CLASSROOM / FACULTY PODIUM &amp; PRESENTATION BOARD</span>
          <Sparkles className="w-4 h-4 text-blue-400" />
        </div>
      )}

      {/* MATRIX DISPLAY CANVAS */}
      <div className="relative min-h-[400px]">
        {/* LAYOUT 1: CLASSROOM BENCH SEATING CHART (67 SEATS IN ROWS) */}
        {viewLayout === 'SEATING' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
            {filteredStudents.map((student, idx) => {
              const statusStyle = getSeatStatusStyle(student);
              const seatNo = idx + 1;
              const shortRoll = student.rollNo.length >= 4 ? student.rollNo.slice(-4) : student.rollNo;

              return (
                <div
                  key={student.rollNo}
                  onMouseEnter={(e) => handleSeatMouseEnter(e, student)}
                  onMouseLeave={handleSeatMouseLeave}
                  onClick={() => onOpenDetails(student)}
                  className={`relative group rounded-2xl p-3 border ${statusStyle.bg} ${statusStyle.glow} transition duration-200 cursor-pointer flex flex-col justify-between h-32 overflow-hidden transform hover:-translate-y-1 hover:scale-[1.02]`}
                >
                  {/* Top Seat Ribbon & Desk Badge */}
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-mono text-slate-400 font-semibold flex items-center gap-1">
                      <span>Seat #{seatNo.toString().padStart(2, '0')}</span>
                    </span>
                    <span className={`w-2.5 h-2.5 rounded-full ${statusStyle.dot}`}></span>
                  </div>

                  {/* Student Roll Number & Avatar */}
                  <div className="my-auto text-center space-y-1">
                    <div className="font-mono font-extrabold text-base sm:text-lg tracking-tight text-white group-hover:text-blue-300 transition">
                      {shortRoll}
                    </div>
                    <div className="text-[11px] font-medium text-slate-300 truncate max-w-[130px] mx-auto">
                      {student.name}
                    </div>
                  </div>

                  {/* Bottom Indicator Badges */}
                  <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px]">
                    <div className="flex items-center gap-1">
                      <span
                        className={`w-4 h-4 rounded-md flex items-center justify-center font-bold text-[9px] ${
                          student.driveUploaded
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                        title={student.driveUploaded ? 'Drive File Present' : 'Drive File Missing'}
                      >
                        D
                      </span>
                      <span
                        className={`w-4 h-4 rounded-md flex items-center justify-center font-bold text-[9px] ${
                          student.sheetUpdated
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                        title={student.sheetUpdated ? 'Sheet Response Logged' : 'Sheet Response Missing'}
                      >
                        S
                      </span>
                    </div>

                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${statusStyle.badgeBg}`}>
                      {statusStyle.type}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* LAYOUT 2: HONEYCOMB MATRIX GRID */}
        {viewLayout === 'HEX' && (
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 py-4">
            {filteredStudents.map((student, idx) => {
              const statusStyle = getSeatStatusStyle(student);
              const shortRoll = student.rollNo.length >= 4 ? student.rollNo.slice(-4) : student.rollNo;

              return (
                <div
                  key={student.rollNo}
                  onMouseEnter={(e) => handleSeatMouseEnter(e, student)}
                  onMouseLeave={handleSeatMouseLeave}
                  onClick={() => onOpenDetails(student)}
                  className={`w-20 h-22 sm:w-24 sm:h-26 clip-hexagon rounded-xl border ${statusStyle.bg} ${statusStyle.glow} transition duration-200 cursor-pointer flex flex-col items-center justify-center p-2 text-center transform hover:scale-110 z-10 hover:z-20`}
                >
                  <span className={`w-2 h-2 rounded-full mb-1 ${statusStyle.dot}`}></span>
                  <span className="font-mono font-bold text-xs sm:text-sm text-white">
                    {shortRoll}
                  </span>
                  <span className="text-[9px] text-slate-300 truncate max-w-[70px]">
                    {student.name.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* LAYOUT 3: COMPACT SEAT TILES */}
        {viewLayout === 'COMPACT' && (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
            {filteredStudents.map((student, idx) => {
              const statusStyle = getSeatStatusStyle(student);
              const shortRoll = student.rollNo.length >= 4 ? student.rollNo.slice(-4) : student.rollNo;

              return (
                <div
                  key={student.rollNo}
                  onMouseEnter={(e) => handleSeatMouseEnter(e, student)}
                  onMouseLeave={handleSeatMouseLeave}
                  onClick={() => onOpenDetails(student)}
                  className={`rounded-xl p-2.5 border text-center ${statusStyle.bg} ${statusStyle.glow} transition cursor-pointer hover:scale-105`}
                >
                  <div className="font-mono font-bold text-xs text-white">
                    {shortRoll}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    #{idx + 1}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredStudents.length === 0 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
            <Users className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">No seats match your search or filter</h3>
            <p className="text-xs text-slate-500">
              Try clearing the search query or selecting "All Seats".
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setActiveFilter?.('ALL');
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Reset Matrix Filters
            </button>
          </div>
        )}
      </div>

      {/* FLOATING HOVER MINI-HUD (GLASSMORPHISM CARD) */}
      {hoveredStudent && (
        <div className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full -mt-3 w-72 sm:w-80 bg-slate-950/95 border border-slate-700/80 backdrop-blur-xl rounded-2xl p-4 shadow-2xl text-white space-y-3 animate-in fade-in zoom-in-95 duration-150">
          {/* HUD Header */}
          <div className="flex items-start justify-between border-b border-slate-800 pb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-extrabold text-blue-400">
                  {hoveredStudent.rollNo}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                  Seat Record
                </span>
              </div>
              <h4 className="font-bold text-sm text-white mt-0.5 truncate max-w-[200px]">
                {hoveredStudent.name}
              </h4>
            </div>

            <span className={`w-3 h-3 rounded-full ${getSeatStatusStyle(hoveredStudent).dot}`}></span>
          </div>

          {/* Status Proof Indicators */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className={`p-2 rounded-xl border flex items-center gap-2 ${
              hoveredStudent.driveUploaded
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}>
              <HardDrive className="w-4 h-4 shrink-0" />
              <div>
                <div className="text-[9px] uppercase tracking-wider font-semibold">Google Drive</div>
                <div className="font-bold text-[11px]">
                  {hoveredStudent.driveUploaded ? `${hoveredStudent.driveFiles?.length || 1} PDF File(s)` : 'Missing'}
                </div>
              </div>
            </div>

            <div className={`p-2 rounded-xl border flex items-center gap-2 ${
              hoveredStudent.sheetUpdated
                ? 'bg-sky-950/40 border-sky-500/40 text-sky-300'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}>
              <FileSpreadsheet className="w-4 h-4 shrink-0" />
              <div>
                <div className="text-[9px] uppercase tracking-wider font-semibold">Google Sheet</div>
                <div className="font-bold text-[11px]">
                  {hoveredStudent.sheetUpdated ? `${hoveredStudent.sheetRecords?.length || 1} Row(s)` : 'Missing'}
                </div>
              </div>
            </div>
          </div>

          {/* Certificate File Preview if present */}
          {hoveredStudent.driveFiles && hoveredStudent.driveFiles.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
                PDF
              </div>
              <div className="overflow-hidden text-xs space-y-0.5">
                <div className="font-semibold text-slate-200 truncate">
                  {hoveredStudent.driveFiles[0].name}
                </div>
                <div className="text-[10px] text-slate-400">
                  Size: {typeof hoveredStudent.driveFiles[0].size === 'number' ? `${Math.round(hoveredStudent.driveFiles[0].size / 1024)} KB` : String(hoveredStudent.driveFiles[0].size || 'PDF Document')}
                </div>
              </div>
            </div>
          )}

          {/* Bottom Action Prompts */}
          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80 flex items-center justify-between">
            <span>💡 Click tile to inspect details</span>
            <span className="text-blue-400 font-semibold">Interactive HUD</span>
          </div>
        </div>
      )}
    </div>
  );
};
