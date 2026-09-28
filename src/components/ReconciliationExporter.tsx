import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { StudentStatusRecord, DriveCertificateFile } from '../types';
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
    // Capitalize first letter
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
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [exportedFolderUrl, setExportedFolderUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Students with at least one uploaded file
  const studentsWithFiles = useMemo(() => {
    return students.filter((s) => s.driveFiles && s.driveFiles.length > 0);
  }, [students]);

  // Preview of categories that will be generated
  const categorySummary = useMemo(() => {
    const counts: Record<string, number> = {};
    studentsWithFiles.forEach((student) => {
      student.driveFiles?.forEach((file) => {
        const sheetMatch = student.sheetRecords?.find(
          (r) => r.certificateUrl?.includes(file.id) || r.certificateType
        );
        const cat = normalizeCertificateCategory(
          sheetMatch?.certificateType || file.detectedCertType,
          file.name
        );
        counts[cat] = (counts[cat] || 0) + 1;
      });
    });
    return counts;
  }, [studentsWithFiles]);

  const totalFilesToExport = useMemo(() => {
    return studentsWithFiles.reduce((acc, s) => acc + (s.driveFiles?.length || 0), 0);
  }, [studentsWithFiles]);

  const handleStartExport = async () => {
    setError(null);
    if (!accessToken) {
      setError('Google authorization required for export. Please sign in with Google first.');
      return;
    }

    if (studentsWithFiles.length === 0) {
      setError('No students with uploaded files found to export.');
      return;
    }

    setIsExporting(true);
    setExportedFolderUrl(null);
    setProgress({ current: 0, total: totalFilesToExport, status: 'Creating root folder on Drive...' });

    try {
      // 1. Create root parent folder on Google Drive
      const rootFolder = await createDriveFolder(newFolderName, accessToken);
      if (!rootFolder || !rootFolder.id) {
        throw new Error('Failed to create folder: No ID returned from Google Drive.');
      }

      const rootFolderId = rootFolder.id;
      const rootUrl = `https://drive.google.com/drive/folders/${rootFolderId}`;
      setExportedFolderUrl(rootUrl);

      // Caches for created folders to prevent duplicate API calls and multiple same-named folders
      const categoryFolderCache = new Map<string, string>(); // categoryName -> folderId
      const studentFolderCache = new Map<string, string>(); // studentKey -> folderId
      const nestedFolderCache = new Map<string, string>(); // parentId_subfolderName -> folderId

      let copiedCount = 0;

      for (const student of studentsWithFiles) {
        if (!student.driveFiles || student.driveFiles.length === 0) continue;

        const studentKey = student.rollNo;
        const studentFolderName = `${student.rollNo}_${student.name || 'Student'}`.replace(/[/\\?%*:|"<>]/g, '_');

        for (const file of student.driveFiles) {
          // Identify certificate type from spreadsheet record or file metadata
          const sheetMatch = student.sheetRecords?.find(
            (r) => r.certificateUrl?.includes(file.id) || (r.certificateType && !r.certificateUrl)
          );
          const categoryName = normalizeCertificateCategory(
            sheetMatch?.certificateType || file.detectedCertType,
            file.name
          );

          let targetFolderId = rootFolderId;
          let destinationLabel = '';

          // Determine destination folder according to chosen export structure
          if (exportStructure === 'CATEGORY_TOP') {
            // Mode 1: Spreadsheet column categories at top level (e.g. Participations/, Courses/, Hackathons/)
            if (!categoryFolderCache.has(categoryName)) {
              setProgress((prev) => ({ ...prev, status: `Creating category folder: ${categoryName}...` }));
              const catFolder = await createDriveFolder(categoryName, accessToken, rootFolderId);
              categoryFolderCache.set(categoryName, catFolder.id);
            }
            targetFolderId = categoryFolderCache.get(categoryName)!;
            destinationLabel = `${categoryName}/`;
          } else if (exportStructure === 'CATEGORY_STUDENT') {
            // Mode 2: Category Top -> Student Subfolder (Participations/25A31A05GB_Name/)
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
          } else if (exportStructure === 'STUDENT_CATEGORY') {
            // Mode 3: Student Top -> Category Subfolder (25A31A05GB_Name/Participations/)
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
            // Mode 4: Flat student folders (25A31A05GB_Name/)
            if (!studentFolderCache.has(studentKey)) {
              const sFolder = await createDriveFolder(studentFolderName, accessToken, rootFolderId);
              studentFolderCache.set(studentKey, sFolder.id);
            }
            targetFolderId = studentFolderCache.get(studentKey)!;
            destinationLabel = `${studentFolderName}/`;
          }

          // Format new file name: includes Roll Number + Category/Title
          const cleanOriginalName = file.name.replace(/\.[a-zA-Z0-9]+$/, '');
          const extension = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : '.pdf';
          
          let formattedFileName = file.name;
          if (exportStructure === 'CATEGORY_TOP') {
            // Inside Category folder, ensure roll number is prefixed clearly (e.g., 25A31A05GB_Quantathon.pdf)
            if (!cleanOriginalName.toLowerCase().includes(student.rollNo.toLowerCase())) {
              formattedFileName = `${student.rollNo}_${cleanOriginalName}${extension}`;
            }
          }

          setProgress((prev) => ({
            ...prev,
            status: `Copying: ${formattedFileName} -> ${destinationLabel}`,
          }));

          try {
            await copyDriveFile(file.id, accessToken, targetFolderId, formattedFileName);
            copiedCount++;
            setProgress((prev) => ({ ...prev, current: copiedCount }));
          } catch (err) {
            console.error(`Failed to copy file ${file.name} for student ${student.rollNo}:`, err);
          }
        }
      }

      setProgress({ current: totalFilesToExport, total: totalFilesToExport, status: 'Export complete!' });
      if (copiedCount === 0 && totalFilesToExport > 0) {
        throw new Error('All file copy operations failed. Please check your Google Drive permissions.');
      }
      onToast?.(
        `Successfully exported ${copiedCount} files organized into Google Drive!`,
        'success'
      );
    } catch (err: any) {
      console.error('Export failed:', err);
      setError(err.message || 'Failed to export data to Google Drive.');
      onToast?.(err.message || 'Failed to export data to Google Drive.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-5 bg-slate-950/50 border border-slate-800/80 rounded-2xl space-y-4 shadow-xl backdrop-blur-sm">
      {error && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>Error: {error}</span>
        </div>
      )}

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

        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl">
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span>{studentsWithFiles.length} Students ({totalFilesToExport} Files)</span>
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
          onClick={handleStartExport}
          disabled={isExporting || !accessToken || studentsWithFiles.length === 0}
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

          <a
            href={exportedFolderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-bold rounded-xl shadow-lg transition w-full justify-center ${
              isExporting
                ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
            }`}
          >
            <span>{isExporting ? 'VIEW DRIVE FOLDER IN REAL-TIME' : 'OPEN EXPORTED GOOGLE DRIVE FOLDER'}</span>
            <ExternalLink className="w-4 h-4" />
          </a>
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
