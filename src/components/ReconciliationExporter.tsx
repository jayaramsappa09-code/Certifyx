import React, { useState } from 'react';
import { FolderPlus, Copy, CheckCircle2, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { StudentStatusRecord, DriveCertificateFile } from '../types';
import { createDriveFolder, copyDriveFile } from '../services/googleDriveService';

interface ReconciliationExporterProps {
  students: StudentStatusRecord[];
  accessToken: string | null;
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const ReconciliationExporter: React.FC<ReconciliationExporterProps> = ({
  students,
  accessToken,
  onToast,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [newFolderName, setNewFolderName] = useState(`Matched_Certificates_${new Date().toISOString().split('T')[0]}`);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [exportedFolderUrl, setExportedFolderUrl] = useState<string | null>(null);

  const matchedStudents = students.filter(s => s.driveUploaded && s.sheetUpdated);

  const handleStartExport = async () => {
    if (!accessToken) {
      onToast?.('Google authorization required for export.', 'error');
      return;
    }

    if (matchedStudents.length === 0) {
      onToast?.('No matched students found to export.', 'info');
      return;
    }

    setIsExporting(true);
    setExportedFolderUrl(null);
    setProgress({ current: 0, total: matchedStudents.length, status: 'Creating folder...' });

    try {
      // 1. Create target folder
      const folder = await createDriveFolder(newFolderName, accessToken);
      const targetFolderId = folder.id;
      setExportedFolderUrl(`https://drive.google.com/drive/folders/${targetFolderId}`);

      // 2. Iterate and copy files
      let copiedCount = 0;
      let totalToCopy = 0;
      
      // Pre-calculate total files for accurate progress
      matchedStudents.forEach(s => {
        totalToCopy += s.driveFiles?.length || 0;
      });

      setProgress({ current: 0, total: totalToCopy, status: 'Starting copies...' });

      for (const student of matchedStudents) {
        if (!student.driveFiles || student.driveFiles.length === 0) {
          console.warn(`Student ${student.rollNo} is matched but has no drive files in state.`);
          continue;
        }

        // Copy each file associated with this student
        for (const file of student.driveFiles) {
          setProgress(prev => ({
            ...prev,
            status: `Copying: ${file.name} (${student.rollNo})`
          }));

          try {
            await copyDriveFile(file.id, accessToken, targetFolderId, `${student.rollNo}_${file.name}`);
            copiedCount++;
            setProgress(prev => ({ ...prev, current: copiedCount }));
          } catch (err) {
            console.error(`Failed to copy file ${file.name} for student ${student.rollNo}:`, err);
            // We continue the loop even if one file fails
          }
        }
      }

      setProgress({ current: totalToCopy, total: totalToCopy, status: 'Export complete!' });
      if (copiedCount === 0 && totalToCopy > 0) {
        throw new Error('All file copy operations failed. Please check your Drive permissions.');
      }
      onToast?.(`Successfully exported ${copiedCount} files to Drive folder: ${newFolderName}`, 'success');
    } catch (err: any) {
      console.error('Export failed:', err);
      onToast?.(err.message || 'Failed to export matched data.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl space-y-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
          <FolderPlus className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">Reconciliation Export</h3>
          <p className="text-[11px] text-slate-400">Copy matched certificate files to a new Drive folder</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-end gap-3">
        <div className="flex-1 space-y-1.5 w-full">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
            New Folder Name
          </label>
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            disabled={isExporting}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition disabled:opacity-50"
          />
        </div>
        <button
          type="button"
          onClick={handleStartExport}
          disabled={isExporting || !accessToken || matchedStudents.length === 0}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition cursor-pointer shrink-0"
        >
          {isExporting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
          <span>{isExporting ? 'Exporting...' : 'Start Export'}</span>
        </button>
      </div>

      {isExporting && (
        <div className="space-y-2 pt-2 border-t border-slate-800/50">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-blue-400 animate-pulse font-bold uppercase tracking-widest">
              {progress.status}
            </span>
            <span className="text-blue-400 font-mono font-bold">{progress.current} / {progress.total}</span>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800 p-0.5">
            <div
              className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full transition-all duration-300 shadow-sm shadow-blue-500/50"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {exportedFolderUrl && (
        <div className={`mt-2 p-4 border rounded-xl space-y-3 transition-all ${
          isExporting 
            ? 'bg-blue-500/5 border-blue-500/20' 
            : 'bg-emerald-500/10 border-emerald-500/20'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isExporting ? (
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              )}
              <span className={`text-sm font-bold ${isExporting ? 'text-blue-300' : 'text-emerald-300'}`}>
                {isExporting ? 'Exporting Files to Drive...' : 'Export completed successfully!'}
              </span>
            </div>
            {!isExporting && (
               <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold">READY</span>
            )}
          </div>
          
          <p className="text-xs text-slate-400 leading-relaxed">
            {isExporting 
              ? `The target folder has been created. Files are being renamed and copied one by one. You can open the folder now to watch the files arrive.`
              : `All matching certificate files have been successfully renamed (RollNo_FileName) and copied to your new folder for distribution.`}
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
            <span>{isExporting ? 'VIEW FOLDER IN PROGRESS' : 'OPEN EXPORTED DRIVE FOLDER'}</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}

      {!accessToken && (
        <div className="mt-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span className="text-[11px] text-rose-300">Google Login Required to perform Drive operations.</span>
        </div>
      )}

      <div className="flex items-center gap-2 text-[10px] text-slate-500 bg-slate-950/20 p-2 rounded-lg border border-slate-800/40">
        <span className="font-bold text-slate-400">Target Group:</span>
        <span>Students with BOTH Drive file verified AND Sheet response recorded ({matchedStudents.length} candidates)</span>
      </div>
    </div>
  );
};
