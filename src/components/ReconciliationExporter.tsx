import React, { useState, useMemo, useEffect } from 'react';
import {
  FolderPlus,
  Copy,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ExternalLink,
  FolderTree,
  FileSpreadsheet,
  Layers,
  Sparkles,
  RotateCcw,
  Wifi,
  WifiOff,
  History,
  Trash2,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { StudentStatusRecord } from '../types';
import { createDriveFolder, copyDriveFile } from '../services/googleDriveService';

interface ReconciliationExporterProps {
  students: StudentStatusRecord[];
  accessToken: string | null;
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export type DriveExportStructure =
  | 'CATEGORY_TOP' // Participations/25A31A05GB_File.pdf (Matches Spreadsheet Certificate Column)
  | 'CATEGORY_STUDENT' // Participations/25A31A05GB_Name/File.pdf
  | 'STUDENT_CATEGORY' // 25A31A05GB_Name/Participations/File.pdf
  | 'STUDENT_FLAT'; // 25A31A05GB_Name/File.pdf

export interface DriveExportHistoryItem {
  id: string;
  timestamp: string;
  folderName: string;
  folderUrl: string;
  folderId: string;
  fileCount: number;
  structure: DriveExportStructure;
  categoriesCreated: string[];
}

export interface ActiveExportJob {
  id: string;
  folderName: string;
  rootFolderId: string;
  rootFolderUrl: string;
  exportStructure: DriveExportStructure;
  copiedFileIds: string[];
  totalFiles: number;
  lastUpdated: string;
  categoryFolderCache: Record<string, string>;
  studentFolderCache: Record<string, string>;
  nestedFolderCache: Record<string, string>;
  completed: boolean;
}

const STORAGE_KEY_HISTORY = 'ccam_drive_export_history';
const STORAGE_KEY_ACTIVE_JOB = 'ccam_drive_export_active_job';

/**
 * Normalizes spreadsheet 'Certificate' column value or detected file type
 * into standard Google Drive category folder names (matching user's spreadsheet & Drive screenshot).
 */
export function normalizeCertificateCategory(rawType?: string, filename?: string): string {
  const combined = `${rawType || ''} ${filename || ''}`.trim().toLowerCase();
  if (!combined) return 'Other';

  if (/\b(participation|participated|participant|attendee|rotaract|quantathon|webarx|digitwinthon|sharinghan|ideathon)\b/i.test(combined)) {
    return 'Participations';
  }
  if (/\b(course|courses|completion|udemy|coursera|nptel|edx|training|infosys|cisco|oracle|aws|google\s*cloud)\b/i.test(combined)) {
    return 'Courses';
  }
  if (/\b(hackathon|hackathons|hack|codefest|hacknight|coding\s*contest|quiz)\b/i.test(combined)) {
    return 'Hackathons';
  }
  if (/\b(industrial\s*training)\b/i.test(combined)) {
    return 'Industrial Training';
  }
  if (/\b(internship|internships|intern)\b/i.test(combined)) {
    return 'Internships';
  }
  if (/\b(workshop|workshops|webinar|bootcamp|hands\s*on)\b/i.test(combined)) {
    return 'Workshops';
  }
  if (/\b(publication|publications|paper|poster|journal|conference)\b/i.test(combined)) {
    return 'Publications';
  }
  if (/\b(seminar|seminars|guest\s*lecture|symposium)\b/i.test(combined)) {
    return 'Seminars';
  }
  if (/\b(award|awards|merit|rank|topper|winner|runner|prize|distinction)\b/i.test(combined)) {
    return 'Awards';
  }

  // If rawType has a clean custom name from Spreadsheet column, preserve capitalized version
  if (rawType && rawType.trim().length > 1) {
    const trimmed = rawType.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  return 'Other';
}

export const ReconciliationExporter: React.FC<ReconciliationExporterProps> = ({
  students,
  accessToken,
  onToast,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [newFolderName, setNewFolderName] = useState(
    `Class_Certificates_${new Date().toISOString().split('T')[0]}`
  );
  const [exportStructure, setExportStructure] = useState<DriveExportStructure>('CATEGORY_TOP');
  const [preserveExactFileName, setPreserveExactFileName] = useState<boolean>(true);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [exportedFolderUrl, setExportedFolderUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedLinkUrl, setCopiedLinkUrl] = useState<string | null>(null);

  // Online / Offline Status
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      onToast?.('Internet connection restored. You can resume Drive export.', 'info');
    };
    const handleOffline = () => {
      setIsOnline(false);
      onToast?.('Internet connection lost. Progress is saved and can be resumed.', 'error');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onToast]);

  // Export History state
  const [exportHistory, setExportHistory] = useState<DriveExportHistoryItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Active / Resumable Job state
  const [activeJob, setActiveJob] = useState<ActiveExportJob | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_JOB);
      if (!raw) return null;
      const parsed: ActiveExportJob = JSON.parse(raw);
      if (!parsed.completed && parsed.copiedFileIds?.length < parsed.totalFiles) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  // Students with at least one uploaded file
  const studentsWithFiles = useMemo(() => {
    return students.filter((s) => s.driveFiles && s.driveFiles.length > 0);
  }, [students]);

  // Total flat list of files for export
  const allExportableFiles = useMemo(() => {
    const list: Array<{
      student: StudentStatusRecord;
      file: any;
      categoryName: string;
      studentFolderName: string;
    }> = [];

    studentsWithFiles.forEach((student) => {
      const studentFolderName = `${student.rollNo}_${student.name || 'Student'}`.replace(
        /[/\\?%*:|"<>]/g,
        '_'
      );
      student.driveFiles?.forEach((file) => {
        const sheetMatch = student.sheetRecords?.find(
          (r) => r.certificateUrl?.includes(file.id) || (r.certificateType && !r.certificateUrl)
        );
        const categoryName = normalizeCertificateCategory(
          sheetMatch?.certificateType || file.detectedCertType,
          file.name
        );
        list.push({ student, file, categoryName, studentFolderName });
      });
    });

    return list;
  }, [studentsWithFiles]);

  const totalFilesToExport = allExportableFiles.length;

  // Category counts summary
  const categorySummary = useMemo(() => {
    const counts: Record<string, number> = {};
    allExportableFiles.forEach((item) => {
      counts[item.categoryName] = (counts[item.categoryName] || 0) + 1;
    });
    return counts;
  }, [allExportableFiles]);

  // Save history helper
  const saveToHistory = (item: DriveExportHistoryItem) => {
    setExportHistory((prev) => {
      const filtered = prev.filter((h) => h.folderId !== item.folderId);
      const updated = [item, ...filtered].slice(0, 15); // keep last 15
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleClearHistory = () => {
    setExportHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY_HISTORY);
    } catch {}
    onToast?.('Cleared previous Drive export history.', 'info');
  };

  const handleDeleteHistoryItem = (folderId: string) => {
    setExportHistory((prev) => {
      const updated = prev.filter((h) => h.folderId !== folderId);
      try {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleCopyLink = (url: string) => {
    try {
      navigator.clipboard.writeText(url);
      setCopiedLinkUrl(url);
      onToast?.('Drive folder link copied to clipboard!', 'success');
      setTimeout(() => setCopiedLinkUrl(null), 2500);
    } catch {
      onToast?.('Failed to copy link.', 'error');
    }
  };

  const handleDismissActiveJob = () => {
    setActiveJob(null);
    try {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_JOB);
    } catch {}
  };

  // Main Export & Resumption Execution
  const runExportExecution = async (existingJob?: ActiveExportJob) => {
    setError(null);
    if (!accessToken) {
      setError('Google authorization required. Please sign in with Google first.');
      return;
    }

    if (allExportableFiles.length === 0) {
      setError('No students with uploaded files found to export.');
      return;
    }

    setIsExporting(true);

    try {
      let rootFolderId = existingJob?.rootFolderId;
      let rootFolderUrl = existingJob?.rootFolderUrl;
      const currentFolderName = existingJob ? existingJob.folderName : newFolderName;
      const currentStructure = existingJob ? existingJob.exportStructure : exportStructure;

      // 1. Create root folder if starting fresh
      if (!rootFolderId) {
        setProgress({ current: 0, total: totalFilesToExport, status: 'Creating main Google Drive root folder...' });
        const rootFolder = await createDriveFolder(currentFolderName, accessToken);
        if (!rootFolder || !rootFolder.id) {
          throw new Error('Failed to create folder: No ID returned from Google Drive.');
        }
        rootFolderId = rootFolder.id;
        rootFolderUrl = `https://drive.google.com/drive/folders/${rootFolderId}`;
      }

      setExportedFolderUrl(rootFolderUrl!);

      // Load caches from existing job or initialize fresh
      const categoryFolderCache = new Map<string, string>(
        Object.entries(existingJob?.categoryFolderCache || {})
      );
      const studentFolderCache = new Map<string, string>(
        Object.entries(existingJob?.studentFolderCache || {})
      );
      const nestedFolderCache = new Map<string, string>(
        Object.entries(existingJob?.nestedFolderCache || {})
      );
      const copiedFileIds = new Set<string>(existingJob?.copiedFileIds || []);

      let copiedCount = copiedFileIds.size;
      setProgress({
        current: copiedCount,
        total: totalFilesToExport,
        status: existingJob ? `Resuming export (${copiedCount}/${totalFilesToExport} files already copied)...` : 'Starting copies...',
      });

      // Save initial active job state
      const updateActiveJobStorage = () => {
        const jobSnapshot: ActiveExportJob = {
          id: rootFolderId!,
          folderName: currentFolderName,
          rootFolderId: rootFolderId!,
          rootFolderUrl: rootFolderUrl!,
          exportStructure: currentStructure,
          copiedFileIds: Array.from(copiedFileIds),
          totalFiles: totalFilesToExport,
          lastUpdated: new Date().toISOString(),
          categoryFolderCache: Object.fromEntries(categoryFolderCache),
          studentFolderCache: Object.fromEntries(studentFolderCache),
          nestedFolderCache: Object.fromEntries(nestedFolderCache),
          completed: false,
        };
        setActiveJob(jobSnapshot);
        try {
          localStorage.setItem(STORAGE_KEY_ACTIVE_JOB, JSON.stringify(jobSnapshot));
        } catch {}
      };

      updateActiveJobStorage();

      // Iterate through all files
      for (const item of allExportableFiles) {
        const { student, file, categoryName, studentFolderName } = item;
        const studentKey = student.rollNo;

        // Skip if already copied in previous run
        if (copiedFileIds.has(file.id)) {
          continue;
        }

        let targetFolderId = rootFolderId!;
        let destinationLabel = '';

        // All subfolders are guaranteed inside rootFolderId on the single primary drive
        if (currentStructure === 'CATEGORY_TOP') {
          // Mode 1: Root / Category / File
          if (!categoryFolderCache.has(categoryName)) {
            setProgress((prev) => ({ ...prev, status: `Creating category folder: ${categoryName}...` }));
            const catFolder = await createDriveFolder(categoryName, accessToken, rootFolderId);
            categoryFolderCache.set(categoryName, catFolder.id);
          }
          targetFolderId = categoryFolderCache.get(categoryName)!;
          destinationLabel = `${categoryName}/`;
        } else if (currentStructure === 'CATEGORY_STUDENT') {
          // Mode 2: Root / Category / Student / File
          if (!categoryFolderCache.has(categoryName)) {
            const catFolder = await createDriveFolder(categoryName, accessToken, rootFolderId);
            categoryFolderCache.set(categoryName, catFolder.id);
          }
          const parentCatId = categoryFolderCache.get(categoryName)!;
          const nestedKey = `${parentCatId}_${studentKey}`;
          if (!nestedFolderCache.has(nestedKey)) {
            const sFolder = await createDriveFolder(studentFolderName, accessToken, parentCatId);
            nestedFolderCache.set(nestedKey, sFolder.id);
          }
          targetFolderId = nestedFolderCache.get(nestedKey)!;
          destinationLabel = `${categoryName}/${studentFolderName}/`;
        } else if (currentStructure === 'STUDENT_CATEGORY') {
          // Mode 3: Root / Student / Category / File
          if (!studentFolderCache.has(studentKey)) {
            const sFolder = await createDriveFolder(studentFolderName, accessToken, rootFolderId);
            studentFolderCache.set(studentKey, sFolder.id);
          }
          const parentStudId = studentFolderCache.get(studentKey)!;
          const nestedKey = `${parentStudId}_${categoryName}`;
          if (!nestedFolderCache.has(nestedKey)) {
            const cFolder = await createDriveFolder(categoryName, accessToken, parentStudId);
            nestedFolderCache.set(nestedKey, cFolder.id);
          }
          targetFolderId = nestedFolderCache.get(nestedKey)!;
          destinationLabel = `${studentFolderName}/${categoryName}/`;
        } else {
          // Mode 4: Root / Student / File
          if (!studentFolderCache.has(studentKey)) {
            const sFolder = await createDriveFolder(studentFolderName, accessToken, rootFolderId);
            studentFolderCache.set(studentKey, sFolder.id);
          }
          targetFolderId = studentFolderCache.get(studentKey)!;
          destinationLabel = `${studentFolderName}/`;
        }

        // Format file name: when preserveExactFileName is active (default), keep 100% exact original filename without any new prefixes or names
        let formattedFileName = file.name;
        if (!preserveExactFileName && currentStructure === 'CATEGORY_TOP') {
          const cleanOriginalName = file.name.replace(/\.[a-zA-Z0-9]+$/, '');
          const extension = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '.pdf';
          if (!cleanOriginalName.toLowerCase().includes(student.rollNo.toLowerCase())) {
            formattedFileName = `${student.rollNo}_${cleanOriginalName}${extension}`;
          }
        }

        setProgress((prev) => ({
          ...prev,
          status: `Copying: ${formattedFileName} ➔ ${destinationLabel}`,
        }));

        try {
          await copyDriveFile(file.id, accessToken, targetFolderId, formattedFileName);
          copiedFileIds.add(file.id);
          copiedCount++;
          setProgress((prev) => ({ ...prev, current: copiedCount }));
          updateActiveJobStorage();
        } catch (err: any) {
          console.error(`Failed to copy file ${file.name} for student ${student.rollNo}:`, err);
          // If offline or authentication error, stop and retain active state for resume
          if (!navigator.onLine || err?.status === 401) {
            throw new Error(
              !navigator.onLine
                ? 'Network disconnected during export. Progress is safely saved. Click "Resume Export" when online.'
                : 'Google authorization expired during export. Please re-authenticate and click "Resume Export".'
            );
          }
        }
      }

      setProgress({ current: totalFilesToExport, total: totalFilesToExport, status: 'Export complete!' });

      // Save to completed history
      const historyItem: DriveExportHistoryItem = {
        id: rootFolderId!,
        timestamp: new Date().toISOString(),
        folderName: currentFolderName,
        folderUrl: rootFolderUrl!,
        folderId: rootFolderId!,
        fileCount: copiedCount,
        structure: currentStructure,
        categoriesCreated: Array.from(categoryFolderCache.keys()),
      };
      saveToHistory(historyItem);

      // Clear active job
      setActiveJob(null);
      try {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_JOB);
      } catch {}

      onToast?.(
        `Successfully exported and organized ${copiedCount} files into Google Drive!`,
        'success'
      );
    } catch (err: any) {
      console.error('Export failed or interrupted:', err);
      setError(err.message || 'Failed to export data to Google Drive.');
      onToast?.(err.message || 'Failed to export data to Google Drive.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-5 bg-slate-950/50 border border-slate-800/80 rounded-2xl space-y-4 shadow-xl backdrop-blur-sm">
      {/* Network Connectivity Status Banner */}
      {!isOnline && (
        <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-rose-400 shrink-0" />
            <span>You are currently offline. Any active export progress is saved and can be resumed.</span>
          </div>
          <span className="text-[10px] bg-rose-500/20 px-2 py-0.5 rounded font-mono">OFFLINE</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {/* Incomplete / Resumable Job Banner */}
      {activeJob && !isExporting && (
        <div className="p-4 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-2 border-amber-500/40 rounded-2xl space-y-2.5 shadow-lg animate-in fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Incomplete Export Job Detected</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono">
                    {activeJob.copiedFileIds.length} / {activeJob.totalFiles} Done
                  </span>
                </h4>
                <p className="text-[11px] text-slate-300">
                  Folder: <strong className="text-white">{activeJob.folderName}</strong> (
                  {activeJob.totalFiles - activeJob.copiedFileIds.length} files remaining)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDismissActiveJob}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => runExportExecution(activeJob)}
                disabled={!accessToken}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-amber-600/30 cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resume &amp; Continue Export</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-sm shadow-blue-500/10">
            <FolderTree className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>Drive Category Exporter</span>
              <span className="text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-mono font-medium">
                Spreadsheet Synced
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Create structured folders in Google Drive matching the spreadsheet <strong className="text-slate-300">Certificate</strong> column
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-300 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Single Unified Drive Parent Folder</span>
        </div>
      </div>

      {/* Structure Mode Selector */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span>Google Drive Folder Structure Layout</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setExportStructure('CATEGORY_TOP')}
            disabled={isExporting}
            className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
              exportStructure === 'CATEGORY_TOP'
                ? 'bg-blue-600/15 border-blue-500/60 shadow-sm shadow-blue-500/20'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                By Certificate Category (Recommended)
              </span>
              {exportStructure === 'CATEGORY_TOP' && (
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">
              📁 Participations/ , 📁 Courses/ , 📁 Hackathons/ ...
            </p>
          </button>

          <button
            type="button"
            onClick={() => setExportStructure('CATEGORY_STUDENT')}
            disabled={isExporting}
            className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
              exportStructure === 'CATEGORY_STUDENT'
                ? 'bg-blue-600/15 border-blue-500/60 shadow-sm shadow-blue-500/20'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Category ➔ Student Subfolders</span>
              {exportStructure === 'CATEGORY_STUDENT' && (
                <span className="w-2 h-2 rounded-full bg-blue-400" />
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">
              📁 Participations / 📁 25A31A05GB_Name / 📄 File.pdf
            </p>
          </button>

          <button
            type="button"
            onClick={() => setExportStructure('STUDENT_CATEGORY')}
            disabled={isExporting}
            className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
              exportStructure === 'STUDENT_CATEGORY'
                ? 'bg-blue-600/15 border-blue-500/60 shadow-sm shadow-blue-500/20'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Student ➔ Category Subfolders</span>
              {exportStructure === 'STUDENT_CATEGORY' && (
                <span className="w-2 h-2 rounded-full bg-blue-400" />
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">
              📁 25A31A05GB_Name / 📁 Participations / 📄 File.pdf
            </p>
          </button>

          <button
            type="button"
            onClick={() => setExportStructure('STUDENT_FLAT')}
            disabled={isExporting}
            className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
              exportStructure === 'STUDENT_FLAT'
                ? 'bg-blue-600/15 border-blue-500/60 shadow-sm shadow-blue-500/20'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Student Folders Only</span>
              {exportStructure === 'STUDENT_FLAT' && (
                <span className="w-2 h-2 rounded-full bg-blue-400" />
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">
              📁 25A31A05GB_Name / 📄 File.pdf
            </p>
          </button>
        </div>
      </div>

      {/* Category Badges Preview */}
      {Object.keys(categorySummary).length > 0 && (
        <div className="p-3 bg-slate-900/80 border border-slate-800/80 rounded-xl space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Detected Categories to be Created on Google Drive:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(categorySummary).map(([cat, count]) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 rounded-lg text-[11px] font-medium transition"
              >
                <span className="text-blue-400">📁</span>
                <span>{cat}</span>
                <span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded-md font-mono text-[10px]">
                  {count}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* File Naming Discipline Control */}
      <div className="flex items-center justify-between p-3.5 bg-slate-900/90 border border-slate-800 rounded-2xl hover:border-slate-700 transition">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
            preserveExactFileName
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <label htmlFor="preserve-filename-chk" className="text-xs font-bold text-white cursor-pointer flex items-center gap-2">
              <span>Preserve Exact Original Filename</span>
              <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-semibold">
                No New Names or Prefixes
              </span>
            </label>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {preserveExactFileName
                ? 'Files are copied to Google Drive with 100% untouched original names (no roll number prefix or modification).'
                : 'Custom naming: Roll number prefix will be prepended where needed.'}
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            id="preserve-filename-chk"
            type="checkbox"
            checked={preserveExactFileName}
            onChange={(e) => setPreserveExactFileName(e.target.checked)}
            disabled={isExporting}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
        </label>
      </div>

      {/* Target Folder Name Input & Start Button */}
      <div className="flex flex-col sm:flex-row items-end gap-3 pt-1">
        <div className="flex-1 space-y-1.5 w-full">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">
            New Main Drive Folder Name
          </label>
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            disabled={isExporting}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition disabled:opacity-50 font-mono"
          />
        </div>
        <button
          type="button"
          onClick={() => runExportExecution()}
          disabled={isExporting || !accessToken || totalFilesToExport === 0}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition cursor-pointer shrink-0"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FolderPlus className="w-4 h-4" />
          )}
          <span>{isExporting ? 'Exporting to Drive...' : 'Export to Google Drive'}</span>
        </button>
      </div>

      {/* Progress Bar */}
      {isExporting && (
        <div className="space-y-2 pt-3 border-t border-slate-800/60">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-blue-400 font-medium truncate max-w-[70%]">
              {progress.status}
            </span>
            <span className="text-blue-400 font-mono font-bold shrink-0">
              {progress.current} / {progress.total}
            </span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800 p-0.5">
            <div
              className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full transition-all duration-300 shadow-sm shadow-blue-500/50"
              style={{
                width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Export Result Link Card */}
      {exportedFolderUrl && (
        <div
          className={`p-4 border rounded-xl space-y-3 transition-all ${
            isExporting
              ? 'bg-blue-500/5 border-blue-500/20'
              : 'bg-emerald-500/10 border-emerald-500/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {isExporting ? (
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              )}
              <span
                className={`text-sm font-bold ${
                  isExporting ? 'text-blue-300' : 'text-emerald-300'
                }`}
              >
                {isExporting ? 'Exporting Category Folders in Progress...' : 'Google Drive Export Ready!'}
              </span>
            </div>
            {!isExporting && (
              <span className="text-[10px] bg-emerald-500 text-white px-2.5 py-0.5 rounded-full font-bold shadow-sm shadow-emerald-500/20">
                COMPLETE
              </span>
            )}
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {isExporting
              ? `Main folder and category subfolders (Participations, Courses, Hackathons, etc.) are being created. You can open the Drive link now to view progress.`
              : `All certificates have been organized into category folders matching your spreadsheet column on Google Drive.`}
          </p>

          <div className="flex items-center gap-2">
            <a
              href={exportedFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-bold rounded-xl shadow-lg transition flex-1 justify-center ${
                isExporting
                  ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
              }`}
            >
              <span>{isExporting ? 'VIEW DRIVE FOLDER IN REAL-TIME' : 'OPEN EXPORTED GOOGLE DRIVE FOLDER'}</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              type="button"
              onClick={() => handleCopyLink(exportedFolderUrl)}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Copy folder link"
            >
              {copiedLinkUrl === exportedFolderUrl ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Copy Link</span>
            </button>
          </div>
        </div>
      )}

      {/* Previously Generated Drive Links Section */}
      {exportHistory.length > 0 && (
        <div className="pt-3 border-t border-slate-800/70 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-blue-400" />
              <span>Previously Generated Drive Links ({exportHistory.length})</span>
            </h4>
            <button
              type="button"
              onClick={handleClearHistory}
              className="text-[11px] text-slate-500 hover:text-rose-400 transition cursor-pointer"
            >
              Clear History
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {exportHistory.map((item) => (
              <div
                key={item.folderId}
                className="p-3 bg-slate-900/70 hover:bg-slate-900 border border-slate-800/90 rounded-xl flex items-center justify-between gap-3 transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white truncate">
                      {item.folderName}
                    </span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                      {item.fileCount} files
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                    <span>{new Date(item.timestamp).toLocaleDateString()} at {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {item.categoriesCreated && item.categoriesCreated.length > 0 && (
                      <span className="truncate max-w-[200px] text-blue-400">
                        • {item.categoriesCreated.slice(0, 3).join(', ')}
                        {item.categoriesCreated.length > 3 ? '...' : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(item.folderUrl)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition cursor-pointer"
                    title="Copy Link"
                  >
                    {copiedLinkUrl === item.folderUrl ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <a
                    href={item.folderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                    title="Open in Google Drive"
                  >
                    <span>Open Drive</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteHistoryItem(item.folderId)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                    title="Remove from history"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!accessToken && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-[11px] text-amber-200">
            Sign in with Google to enable automatic category folder creation on your Google Drive.
          </span>
        </div>
      )}
    </div>
  );
};
