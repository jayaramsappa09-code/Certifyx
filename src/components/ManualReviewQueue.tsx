import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  HelpCircle,
  UserX,
  Copy,
  Tag,
  CheckCircle2,
  ExternalLink,
  Save,
  Check,
  Eye,
  X,
  LayoutGrid,
  List,
  FileText,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Sparkles,
  Search,
  Upload,
  Wand2,
  CheckCheck,
  Zap,
  Trash2,
} from 'lucide-react';
import { DriveCertificateFile } from '../types';
import { FIXED_CLASS_ROSTER } from '../data/classRoster';
import { BulkMappingUploadModal } from './BulkMappingUploadModal';
import {
  scanUnidentifiedFilesForAutoMapping,
  StudentSimilarityMatch,
} from '../utils/fileSimilarityMatcher';
import {
  saveManualFileOverride,
  saveDuplicateResolution,
  getDuplicateResolutions,
  removeAllDuplicateFiles,
  addAuditLog,
  getDynamicRoster,
} from '../services/storageService';

interface ManualReviewQueueProps {
  unidentifiedFiles: DriveCertificateFile[];
  outsideClassFiles: DriveCertificateFile[];
  ambiguousCertFiles: DriveCertificateFile[];
  duplicateFiles: DriveCertificateFile[];
  onRefreshAfterResolution: () => void;
  userEmail: string;
}

import { CertificateThumbnail } from './CertificateThumbnail';
export { CertificateThumbnail };

export const ManualReviewQueue: React.FC<ManualReviewQueueProps> = ({
  unidentifiedFiles,
  outsideClassFiles,
  ambiguousCertFiles,
  duplicateFiles,
  onRefreshAfterResolution,
  userEmail,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'unidentified' | 'outside' | 'ambiguous' | 'duplicates'
  >('unidentified');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentForFile, setSelectedStudentForFile] = useState<
    Record<string, string>
  >({});
  const [selectedTypeForFile, setSelectedTypeForFile] = useState<
    Record<string, string>
  >({});
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [showBulkMappingModal, setShowBulkMappingModal] = useState(false);
  const [autoMapFilter, setAutoMapFilter] = useState<'ALL' | 'MATCHABLE' | 'UNMATCHED'>('ALL');

  // Modal Preview state
  const [previewFile, setPreviewFile] = useState<DriveCertificateFile | null>(
    null
  );
  const [previewIndex, setPreviewIndex] = useState<number>(0);

  const duplicateResolutions = getDuplicateResolutions();
  const rosterStudents = getDynamicRoster();

  // Automatic string similarity analysis between unidentified files and class roster
  const autoMapAnalysis = React.useMemo(() => {
    return scanUnidentifiedFilesForAutoMapping(unidentifiedFiles, rosterStudents);
  }, [unidentifiedFiles, rosterStudents]);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Get active file list based on current sub-tab
  const currentFilesList = React.useMemo(() => {
    let list: DriveCertificateFile[] = [];
    if (activeSubTab === 'unidentified') {
      list = unidentifiedFiles;
      if (autoMapFilter === 'MATCHABLE') {
        list = list.filter((f) => autoMapAnalysis.results.get(f.id)?.bestMatch != null);
      } else if (autoMapFilter === 'UNMATCHED') {
        list = list.filter((f) => autoMapAnalysis.results.get(f.id)?.bestMatch == null);
      }
    } else if (activeSubTab === 'outside') list = outsideClassFiles;
    else if (activeSubTab === 'ambiguous') list = ambiguousCertFiles;
    else if (activeSubTab === 'duplicates') list = duplicateFiles;

    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(
      (f) =>
        f.name.toLowerCase().includes(term) ||
        (f.detectedRollNo && f.detectedRollNo.toLowerCase().includes(term)) ||
        (f.detectedCertType && f.detectedCertType.toLowerCase().includes(term)) ||
        (f.parentFolderName && f.parentFolderName.toLowerCase().includes(term))
    );
  }, [
    activeSubTab,
    unidentifiedFiles,
    outsideClassFiles,
    ambiguousCertFiles,
    duplicateFiles,
    searchTerm,
    autoMapFilter,
    autoMapAnalysis,
  ]);

  // Batch auto-map high-confidence files (>= 75% similarity)
  const handleAutoMapAllHighConfidence = () => {
    const targets = autoMapAnalysis.highConfidenceMatches;
    if (targets.length === 0) {
      showToast('No high-confidence matches found to auto-map.');
      return;
    }

    let mappedCount = 0;
    targets.forEach(({ file, bestMatch }) => {
      if (!bestMatch) return;
      saveManualFileOverride({
        fileId: file.id,
        assignedRollNo: bestMatch.student.rollNo,
        assignedCertType: selectedTypeForFile[file.id] || file.detectedCertType,
        resolvedAt: new Date().toISOString(),
      });
      mappedCount++;
    });

    addAuditLog(
      'Batch auto-mapping via string similarity',
      userEmail,
      `Auto-mapped ${mappedCount} unidentified files to roster students based on filename similarity`,
      'REVIEW'
    );

    showToast(`✨ Successfully auto-mapped ${mappedCount} files based on filename string similarity! Run Sync to update roster.`);
    onRefreshAfterResolution();
  };

  // Pre-populate student dropdowns with top matching suggestions for review
  const handlePrePopulateAllSuggestions = () => {
    const updates: Record<string, string> = {};
    let populatedCount = 0;

    unidentifiedFiles.forEach((file) => {
      const match = autoMapAnalysis.results.get(file.id)?.bestMatch;
      if (match) {
        updates[file.id] = match.student.rollNo;
        populatedCount++;
      }
    });

    setSelectedStudentForFile((prev) => ({ ...prev, ...updates }));
    showToast(`Pre-populated ${populatedCount} suggested students into dropdowns. Review and click Assign.`);
  };

  // Single suggestion 1-click apply
  const handleApplySingleSuggestion = (file: DriveCertificateFile, match: StudentSimilarityMatch) => {
    saveManualFileOverride({
      fileId: file.id,
      assignedRollNo: match.student.rollNo,
      assignedCertType: selectedTypeForFile[file.id] || file.detectedCertType,
      resolvedAt: new Date().toISOString(),
    });

    addAuditLog(
      'Auto-mapped via string similarity',
      userEmail,
      `Auto-mapped "${file.name}" to ${match.student.rollNo} (${match.student.name}) [${match.matchReason}, ${match.confidence}% confidence]`,
      'REVIEW'
    );

    showToast(`✨ Mapped "${file.name}" to ${match.student.rollNo} (${match.student.name}). Run Sync to apply.`);
    onRefreshAfterResolution();
  };

  // Handle open preview modal
  const handleOpenPreview = (file: DriveCertificateFile, idx?: number) => {
    setPreviewFile(file);
    if (typeof idx === 'number') {
      setPreviewIndex(idx);
    } else {
      const foundIdx = currentFilesList.findIndex((f) => f.id === file.id);
      setPreviewIndex(foundIdx >= 0 ? foundIdx : 0);
    }
  };

  const handleNextPreview = () => {
    if (previewIndex < currentFilesList.length - 1) {
      const nextIdx = previewIndex + 1;
      setPreviewIndex(nextIdx);
      setPreviewFile(currentFilesList[nextIdx]);
    }
  };

  const handlePrevPreview = () => {
    if (previewIndex > 0) {
      const prevIdx = previewIndex - 1;
      setPreviewIndex(prevIdx);
      setPreviewFile(currentFilesList[prevIdx]);
    }
  };

  // Assign roll number to unidentified file
  const handleAssignRollNo = (file: DriveCertificateFile) => {
    const assignedRoll = selectedStudentForFile[file.id];
    if (!assignedRoll) return;

    saveManualFileOverride({
      fileId: file.id,
      assignedRollNo: assignedRoll,
      assignedCertType: selectedTypeForFile[file.id] || file.detectedCertType,
      resolvedAt: new Date().toISOString(),
    });

    addAuditLog(
      'Manual file mapped',
      userEmail,
      `Assigned roll number ${assignedRoll} to file "${file.name}"`,
      'REVIEW'
    );

    showToast(`Assigned ${assignedRoll} to "${file.name}". Run Sync to apply.`);
    onRefreshAfterResolution();
  };

  // Assign certificate type to ambiguous file
  const handleAssignCertType = (file: DriveCertificateFile) => {
    const assignedType = selectedTypeForFile[file.id];
    if (!assignedType) return;

    saveManualFileOverride({
      fileId: file.id,
      assignedRollNo: file.detectedRollNo,
      assignedCertType: assignedType,
      resolvedAt: new Date().toISOString(),
    });

    addAuditLog(
      'Certificate type assigned',
      userEmail,
      `Assigned type ${assignedType} to file "${file.name}"`,
      'REVIEW'
    );

    showToast(`Set type "${assignedType}" on "${file.name}". Run Sync to apply.`);
    onRefreshAfterResolution();
  };

  // Duplicate resolution
  const handleResolveDuplicate = (
    file: DriveCertificateFile,
    resolution: 'KEEP' | 'IGNORE' | 'REVIEW'
  ) => {
    saveDuplicateResolution(file.id, resolution);

    addAuditLog(
      'Duplicate resolved',
      userEmail,
      `Marked duplicate "${file.name}" as ${resolution}`,
      'REVIEW'
    );

    showToast(`Marked "${file.name}" as ${resolution}. Run Sync to apply.`);
    onRefreshAfterResolution();
  };

  // One-click batch remove all duplicates
  const handleRemoveAllDuplicates = () => {
    if (duplicateFiles.length === 0) {
      showToast('No duplicate files to remove.');
      return;
    }

    const { removedCount, keptCount } = removeAllDuplicateFiles(duplicateFiles, userEmail);
    showToast(`Successfully removed ${removedCount} duplicate certificates! Kept ${keptCount} primary files.`);
    onRefreshAfterResolution();
  };

  const certTypeOptions = [
    'Hackathon / Contest',
    'Course Completion',
    'Certificate of Participation',
    'Workshop / Webinar',
    'Paper / Poster Presentation',
    'Internship',
    'Coordinator Certificate',
    'Merit / Award',
    'Badge / Credential',
    'Certification',
    'Other',
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 border border-emerald-500 text-emerald-200 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">{successToast}</span>
        </div>
      )}

      {/* Sub-tab Navigation & View Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setActiveSubTab('unidentified');
              setSearchTerm('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
              activeSubTab === 'unidentified'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-rose-400" />
            <span>Unidentified</span>
            <span className="px-2 py-0.2 rounded-full text-xs bg-slate-900 border border-slate-800 text-slate-300">
              {unidentifiedFiles.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('outside');
              setSearchTerm('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
              activeSubTab === 'outside'
                ? 'bg-slate-700/40 text-slate-200 border border-slate-600/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <UserX className="w-4 h-4 text-slate-400" />
            <span>Outside Class</span>
            <span className="px-2 py-0.2 rounded-full text-xs bg-slate-900 border border-slate-800 text-slate-300">
              {outsideClassFiles.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('ambiguous');
              setSearchTerm('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
              activeSubTab === 'ambiguous'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Tag className="w-4 h-4 text-amber-400" />
            <span>Ambiguous Types</span>
            <span className="px-2 py-0.2 rounded-full text-xs bg-slate-900 border border-slate-800 text-slate-300">
              {ambiguousCertFiles.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('duplicates');
              setSearchTerm('');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
              activeSubTab === 'duplicates'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Copy className="w-4 h-4 text-indigo-400" />
            <span>Duplicates</span>
            <span className="px-2 py-0.2 rounded-full text-xs bg-slate-900 border border-slate-800 text-slate-300">
              {duplicateFiles.length}
            </span>
          </button>
        </div>

        {/* Search, Bulk CSV Upload & Layout View Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBulkMappingModal(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-purple-600/30 flex items-center gap-1.5 shrink-0 cursor-pointer"
            title="Bulk-upload a custom CSV filename mapping to resolve unidentified files directly into student records"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bulk CSV Mapping</span>
            <span className="sm:hidden">Bulk CSV</span>
          </button>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search files..."
              className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-36 sm:w-48"
            />
          </div>

          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Compact List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Thumbnail Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Sub-tab Description Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            {activeSubTab === 'unidentified' && (
              <>
                <HelpCircle className="w-4 h-4 text-rose-400" />
                <span>Unidentified Certificate Files</span>
              </>
            )}
            {activeSubTab === 'outside' && (
              <>
                <UserX className="w-4 h-4 text-slate-400" />
                <span>Files Outside Fixed 67-Student Class Roster</span>
              </>
            )}
            {activeSubTab === 'ambiguous' && (
              <>
                <Tag className="w-4 h-4 text-amber-400" />
                <span>Ambiguous Certificate Categories</span>
              </>
            )}
            {activeSubTab === 'duplicates' && (
              <>
                <Copy className="w-4 h-4 text-indigo-400" />
                <span>Potential Duplicate Certificate Submissions</span>
              </>
            )}
          </h3>
          <p className="text-xs text-slate-400">
            {activeSubTab === 'unidentified' &&
              'Click any file thumbnail to inspect certificate contents and assign it to a student in the 67 roster.'}
            {activeSubTab === 'outside' &&
              'Files with unknown roll numbers are isolated here and will never affect the 67-student roster.'}
            {activeSubTab === 'ambiguous' &&
              'Preview certificate visual details to assign the accurate certificate type.'}
            {activeSubTab === 'duplicates' &&
              'Multiple certificates of the same category for a student. Visually compare and mark.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeSubTab === 'duplicates' && duplicateFiles.length > 0 && (
            <button
              type="button"
              onClick={handleRemoveAllDuplicates}
              className="px-3.5 py-1.5 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-rose-600/30 flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Batch-remove all redundant duplicate submissions, keeping the primary certificate for each category"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove All Duplicates ({duplicateFiles.length})</span>
            </button>
          )}

          <span className="text-xs text-slate-400 font-medium">
            Showing <strong className="text-white">{currentFilesList.length}</strong> file(s)
          </span>
        </div>
      </div>

      {/* Dedicated Duplicate File Cleanup Banner */}
      {activeSubTab === 'duplicates' && duplicateFiles.length > 0 && (
        <div className="bg-gradient-to-r from-rose-950/70 via-slate-900 to-indigo-950/70 border border-rose-800/60 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                    <span>Batch Duplicate File Deduplication</span>
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-950 text-rose-300 border border-rose-700">
                    {duplicateFiles.length} Redundant Copies
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Automatically pairs multiple submissions of the same certificate category, keeps the best primary certificate, and removes redundant duplicates in 1 click.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={handleRemoveAllDuplicates}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove All Duplicates ({duplicateFiles.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Automatic String Similarity Matching Engine Banner for Unidentified Files */}
      {activeSubTab === 'unidentified' && unidentifiedFiles.length > 0 && (
        <div className="bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/70 border border-purple-800/60 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3.5 animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 shrink-0">
                <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                    <span>String Similarity Auto-Mapping Engine</span>
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-700">
                    Fuzzy Matcher Active
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Automatically analyzes filename tokens, roll numbers, serials, and student names to pair unidentified files with class roster students.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {autoMapAnalysis.highConfidenceMatches.length > 0 && (
                <button
                  type="button"
                  onClick={handleAutoMapAllHighConfidence}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-900/30 cursor-pointer"
                  title="Automatically map all high-confidence (≥75% similarity) files to roster students in 1 click"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Auto-Map All High-Confidence ({autoMapAnalysis.highConfidenceMatches.length})</span>
                </button>
              )}

              {(autoMapAnalysis.highConfidenceMatches.length > 0 || autoMapAnalysis.mediumConfidenceMatches.length > 0) && (
                <button
                  type="button"
                  onClick={handlePrePopulateAllSuggestions}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                  title="Pre-populate student dropdowns with top matching suggestions for manual inspection"
                >
                  <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Review Suggestions</span>
                </button>
              )}
            </div>
          </div>

          {/* Metric Chips & Quick Filter */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400 text-[11px] font-semibold">Match Results:</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {autoMapAnalysis.highConfidenceMatches.length} High Confidence (≥75%)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800">
                <Zap className="w-3 h-3 text-indigo-400" />
                {autoMapAnalysis.mediumConfidenceMatches.length} Suggestions (60–74%)
              </span>
              {autoMapAnalysis.unmatchedCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-900 text-slate-400 border border-slate-800">
                  {autoMapAnalysis.unmatchedCount} Require Manual Search
                </span>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setAutoMapFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  autoMapFilter === 'ALL'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({unidentifiedFiles.length})
              </button>
              <button
                type="button"
                onClick={() => setAutoMapFilter('MATCHABLE')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  autoMapFilter === 'MATCHABLE'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Matchable ({autoMapAnalysis.highConfidenceMatches.length + autoMapAnalysis.mediumConfidenceMatches.length})
              </button>
              <button
                type="button"
                onClick={() => setAutoMapFilter('UNMATCHED')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  autoMapFilter === 'UNMATCHED'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                No Match ({autoMapAnalysis.unmatchedCount})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content: Files List / Grid View */}
      {currentFilesList.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <div className="text-sm font-semibold text-slate-200">
            {searchTerm ? 'No matching files found' : 'Queue is all clear!'}
          </div>
          <p className="text-xs text-slate-500">
            {searchTerm
              ? 'Try changing your search keywords.'
              : 'No files require review under this section.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW WITH LARGE THUMBNAILS */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {currentFilesList.map((file, idx) => {
            const dupRes = duplicateResolutions[file.id] || 'REVIEW';
            const autoMatch = activeSubTab === 'unidentified' ? autoMapAnalysis.results.get(file.id) : null;
            const bestMatch = autoMatch?.bestMatch;

            return (
              <div
                key={file.id ? `${file.id}_${idx}` : `grid_${idx}`}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 flex flex-col justify-between gap-3 shadow-lg transition group"
              >
                {/* Large Thumbnail Card */}
                <CertificateThumbnail
                  file={file}
                  size="lg"
                  onClick={() => handleOpenPreview(file, idx)}
                />

                {/* File Meta Info */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        activeSubTab === 'unidentified'
                          ? 'bg-rose-950 text-rose-300 border border-rose-900'
                          : activeSubTab === 'outside'
                          ? 'bg-slate-950 text-slate-400 border border-slate-800'
                          : activeSubTab === 'ambiguous'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                      }`}
                    >
                      {file.detectedRollNo || file.detectedCertType || 'Review Needed'}
                    </span>
                    {file.parentFolderName && (
                      <span className="text-[10px] font-mono text-slate-500 truncate max-w-[120px]">
                        📁 {file.parentFolderName}
                      </span>
                    )}
                  </div>

                  <h4
                    className="text-xs font-mono text-slate-200 font-semibold truncate title-hover"
                    title={file.name}
                  >
                    {file.name}
                  </h4>
                </div>

                {/* String Similarity Suggested Match for Unidentified Files */}
                {activeSubTab === 'unidentified' && bestMatch && (
                  <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/60 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-400" />
                        Suggested Student
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded font-mono font-bold text-[10px] ${
                          bestMatch.confidence >= 75
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {bestMatch.confidence}% Match
                      </span>
                    </div>
                    <div className="font-mono text-white font-bold truncate">
                      {bestMatch.student.rollNo}
                    </div>
                    <div className="text-slate-300 text-[11px] truncate font-medium">
                      {bestMatch.student.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate" title={bestMatch.matchReason}>
                      {bestMatch.matchReason}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplySingleSuggestion(file, bestMatch)}
                      className="w-full mt-1 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[11px] font-bold rounded-lg transition flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                      title={`Accept suggested match to ${bestMatch.student.rollNo}`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept &amp; Map</span>
                    </button>
                  </div>
                )}

                {/* Inline Action Controls */}
                <div className="pt-2 border-t border-slate-800/80">
                  {activeSubTab === 'unidentified' && (
                    <div className="space-y-2">
                      <select
                        value={selectedStudentForFile[file.id] || (bestMatch ? bestMatch.student.rollNo : '')}
                        onChange={(e) =>
                          setSelectedStudentForFile((prev) => ({
                            ...prev,
                            [file.id]: e.target.value,
                          }))
                        }
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Assign to Student...</option>
                        {bestMatch && (
                          <option value={bestMatch.student.rollNo} className="text-emerald-400 font-bold bg-slate-900">
                            ★ [Suggested {bestMatch.confidence}%] {bestMatch.student.rollNo} - {bestMatch.student.name}
                          </option>
                        )}
                        {rosterStudents.map((s) => (
                          <option key={s.rollNo} value={s.rollNo}>
                            {s.rollNo} - {s.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          const assignedRoll = selectedStudentForFile[file.id] || bestMatch?.student.rollNo;
                          if (assignedRoll) {
                            if (!selectedStudentForFile[file.id] && bestMatch) {
                              handleApplySingleSuggestion(file, bestMatch);
                            } else {
                              handleAssignRollNo(file);
                            }
                          }
                        }}
                        disabled={!selectedStudentForFile[file.id] && !bestMatch}
                        className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Assign Student</span>
                      </button>
                    </div>
                  )}

                  {activeSubTab === 'ambiguous' && (
                    <div className="space-y-2">
                      <select
                        value={selectedTypeForFile[file.id] || ''}
                        onChange={(e) =>
                          setSelectedTypeForFile((prev) => ({
                            ...prev,
                            [file.id]: e.target.value,
                          }))
                        }
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select Category...</option>
                        {certTypeOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAssignCertType(file)}
                        disabled={!selectedTypeForFile[file.id]}
                        className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Type</span>
                      </button>
                    </div>
                  )}

                  {activeSubTab === 'duplicates' && (
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => handleResolveDuplicate(file, 'KEEP')}
                        className={`py-1 text-[11px] font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
                          dupRes === 'KEEP'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 hover:bg-emerald-950/60 hover:text-emerald-300 text-slate-300'
                        }`}
                        title="Keep this file as primary valid certificate"
                      >
                        <Check className="w-3 h-3" />
                        <span>Keep Primary</span>
                      </button>
                      <button
                        onClick={() => handleResolveDuplicate(file, 'IGNORE')}
                        className={`py-1 text-[11px] font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
                          dupRes === 'IGNORE'
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-300'
                        }`}
                        title="Remove this duplicate submission"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                  )}

                  {activeSubTab === 'outside' && (
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleOpenPreview(file, idx)}
                        className="text-xs text-blue-400 hover:underline inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Drive</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW WITH COMPACT THUMBNAILS */
        <div className="space-y-3">
          {currentFilesList.map((file, idx) => {
            const dupRes = duplicateResolutions[file.id] || 'REVIEW';
            const autoMatch = activeSubTab === 'unidentified' ? autoMapAnalysis.results.get(file.id) : null;
            const bestMatch = autoMatch?.bestMatch;
            return (
              <div
                key={file.id ? `${file.id}_${idx}` : `list_${idx}`}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition group shadow-md"
              >
                {/* Left: Thumbnail & Details */}
                <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                  <CertificateThumbnail
                    file={file}
                    size="md"
                    onClick={() => handleOpenPreview(file, idx)}
                  />

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {file.detectedRollNo && (
                        <span className="font-mono text-xs font-bold text-blue-400">
                          {file.detectedRollNo}
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          activeSubTab === 'unidentified'
                            ? 'bg-rose-950 text-rose-300 border border-rose-900'
                            : activeSubTab === 'outside'
                            ? 'bg-slate-950 text-slate-400 border border-slate-800'
                            : activeSubTab === 'ambiguous'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                        }`}
                      >
                        {file.detectedCertType ||
                          (activeSubTab === 'unidentified'
                            ? 'Unidentified'
                            : 'Outside Roster')}
                      </span>
                      {file.parentFolderName && (
                        <span className="text-[10px] font-mono text-slate-500">
                          📁 {file.parentFolderName}
                        </span>
                      )}
                    </div>

                    <div className="font-mono text-xs font-semibold text-slate-200 break-all">
                      {file.name}
                    </div>

                    {/* String Similarity Suggestion in List View */}
                    {activeSubTab === 'unidentified' && bestMatch && (
                      <div className="flex flex-wrap items-center gap-2 py-1 px-2.5 rounded-xl bg-purple-950/40 border border-purple-800/50 text-xs">
                        <span className="inline-flex items-center gap-1 font-bold text-purple-300 text-[11px]">
                          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                          Suggested:
                        </span>
                        <span className="font-mono font-bold text-white text-xs">
                          {bestMatch.student.rollNo}
                        </span>
                        <span className="text-slate-300 text-xs font-medium">
                          ({bestMatch.student.name})
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded font-mono font-bold text-[10px] ${
                            bestMatch.confidence >= 75
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                          title={bestMatch.matchReason}
                        >
                          {bestMatch.confidence}% Match
                        </span>
                        <span className="text-[10px] text-slate-400 hidden lg:inline max-w-xs truncate" title={bestMatch.matchReason}>
                          • {bestMatch.matchReason}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <button
                        onClick={() => handleOpenPreview(file, idx)}
                        className="text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Quick Preview</span>
                      </button>
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-slate-200 inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Google Drive</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-wrap md:flex-nowrap items-center gap-2 shrink-0 self-end md:self-center">
                  {activeSubTab === 'unidentified' && (
                    <>
                      {bestMatch && (
                        <button
                          type="button"
                          onClick={() => handleApplySingleSuggestion(file, bestMatch)}
                          className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                          title={`Accept suggestion to map to ${bestMatch.student.rollNo} (${bestMatch.student.name})`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept &amp; Map</span>
                        </button>
                      )}

                      <select
                        value={selectedStudentForFile[file.id] || (bestMatch ? bestMatch.student.rollNo : '')}
                        onChange={(e) =>
                          setSelectedStudentForFile((prev) => ({
                            ...prev,
                            [file.id]: e.target.value,
                          }))
                        }
                        className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 max-w-xs"
                      >
                        <option value="">Select Student from 67 Roster...</option>
                        {bestMatch && (
                          <option value={bestMatch.student.rollNo} className="text-emerald-400 font-bold bg-slate-900">
                            ★ [Suggested {bestMatch.confidence}%] {bestMatch.student.rollNo} - {bestMatch.student.name}
                          </option>
                        )}
                        {rosterStudents.map((s) => (
                          <option key={s.rollNo} value={s.rollNo}>
                            {s.rollNo} - {s.name}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => {
                          const assignedRoll = selectedStudentForFile[file.id] || bestMatch?.student.rollNo;
                          if (assignedRoll) {
                            if (!selectedStudentForFile[file.id] && bestMatch) {
                              handleApplySingleSuggestion(file, bestMatch);
                            } else {
                              handleAssignRollNo(file);
                            }
                          }
                        }}
                        disabled={!selectedStudentForFile[file.id] && !bestMatch}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <span>Assign</span>
                      </button>
                    </>
                  )}

                  {activeSubTab === 'ambiguous' && (
                    <>
                      <select
                        value={selectedTypeForFile[file.id] || ''}
                        onChange={(e) =>
                          setSelectedTypeForFile((prev) => ({
                            ...prev,
                            [file.id]: e.target.value,
                          }))
                        }
                        className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select Certificate Type...</option>
                        {certTypeOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleAssignCertType(file)}
                        disabled={!selectedTypeForFile[file.id]}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                      >
                        Save Type
                      </button>
                    </>
                  )}

                  {activeSubTab === 'duplicates' && (
                    <>
                      <button
                        onClick={() => handleResolveDuplicate(file, 'KEEP')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1 ${
                          dupRes === 'KEEP'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 hover:bg-emerald-950/60 hover:text-emerald-300 text-slate-300'
                        }`}
                        title="Keep this file as primary valid certificate"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Keep Primary</span>
                      </button>
                      <button
                        onClick={() => handleResolveDuplicate(file, 'IGNORE')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1 ${
                          dupRes === 'IGNORE'
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-300'
                        }`}
                        title="Remove this duplicate submission"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Duplicate</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULL-SCREEN LIGHTWEIGHT CERTIFICATE PREVIEW MODAL / LIGHTBOX */}
      {previewFile && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewFile(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-900/90">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                  <Eye className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-white truncate">
                      {previewFile.name}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {previewIndex + 1} / {currentFilesList.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {previewFile.parentFolderName && `Folder: ${previewFile.parentFolderName} • `}
                    {previewFile.detectedCertType || 'Certificate Review'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {previewFile.webViewLink && (
                  <a
                    href={previewFile.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-xl transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Open Drive Tab</span>
                  </a>
                )}
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Visual Preview + Navigation */}
            <div className="relative flex-1 bg-slate-950 p-4 sm:p-6 overflow-hidden flex items-center justify-center min-h-[360px] max-h-[58vh]">
              {/* Prev / Next navigation buttons */}
              {previewIndex > 0 && (
                <button
                  onClick={handlePrevPreview}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 shadow-xl transition cursor-pointer z-10"
                  title="Previous Certificate"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {previewIndex < currentFilesList.length - 1 && (
                <button
                  onClick={handleNextPreview}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 shadow-xl transition cursor-pointer z-10"
                  title="Next Certificate"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}

              {/* Embedded Google Drive Preview or Image Fallback */}
              {previewFile.id && !previewFile.id.startsWith('seed_') ? (
                <iframe
                  src={`https://drive.google.com/file/d/${previewFile.id}/preview`}
                  className="w-full h-full rounded-xl border border-slate-800 bg-white"
                  title={previewFile.name}
                  allow="autoplay"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
                  <FileText className="w-16 h-16 text-blue-400 animate-pulse" />
                  <div className="font-mono text-sm font-bold text-white">
                    {previewFile.name}
                  </div>
                  <p className="text-xs text-slate-400 max-w-sm">
                    {previewFile.detectedRollNo
                      ? `Detected Roll Number: ${previewFile.detectedRollNo}`
                      : 'Unidentified file. Use the controls below to map to a student.'}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer: Quick Assignment / Resolution Toolbar */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/90 flex flex-col gap-3">
              {/* If unidentified, show matched recommendation banner inside modal if available */}
              {activeSubTab === 'unidentified' && (() => {
                const previewBestMatch = autoMapAnalysis.results.get(previewFile.id)?.bestMatch;
                if (!previewBestMatch) return null;
                return (
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/60 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 font-bold text-purple-300">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        Suggested Match:
                      </span>
                      <span className="font-mono font-bold text-white">
                        {previewBestMatch.student.rollNo}
                      </span>
                      <span className="text-slate-300 font-medium">
                        ({previewBestMatch.student.name})
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded font-mono font-bold text-[10px] ${
                          previewBestMatch.confidence >= 75
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {previewBestMatch.confidence}% Match
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handleApplySingleSuggestion(previewFile, previewBestMatch);
                        if (previewIndex < currentFilesList.length - 1) {
                          handleNextPreview();
                        } else {
                          setPreviewFile(null);
                        }
                      }}
                      className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept Match &amp; Next</span>
                    </button>
                  </div>
                );
              })()}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs text-slate-400 font-semibold">Quick Action:</span>
                  {activeSubTab === 'unidentified' && (() => {
                    const previewBestMatch = autoMapAnalysis.results.get(previewFile.id)?.bestMatch;
                    return (
                      <select
                        value={selectedStudentForFile[previewFile.id] || (previewBestMatch ? previewBestMatch.student.rollNo : '')}
                        onChange={(e) =>
                          setSelectedStudentForFile((prev) => ({
                            ...prev,
                            [previewFile.id]: e.target.value,
                          }))
                        }
                        className="flex-1 sm:flex-none px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200"
                      >
                        <option value="">Select Student from 67 Roster...</option>
                        {previewBestMatch && (
                          <option value={previewBestMatch.student.rollNo} className="text-emerald-400 font-bold bg-slate-900">
                            ★ [Suggested {previewBestMatch.confidence}%] {previewBestMatch.student.rollNo} - {previewBestMatch.student.name}
                          </option>
                        )}
                        {rosterStudents.map((s) => (
                          <option key={s.rollNo} value={s.rollNo}>
                            {s.rollNo} - {s.name}
                          </option>
                        ))}
                      </select>
                    );
                  })()}

                  {activeSubTab === 'ambiguous' && (
                    <select
                      value={selectedTypeForFile[previewFile.id] || ''}
                      onChange={(e) =>
                        setSelectedTypeForFile((prev) => ({
                          ...prev,
                          [previewFile.id]: e.target.value,
                        }))
                      }
                      className="flex-1 sm:flex-none px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200"
                    >
                      <option value="">Select Category...</option>
                      {certTypeOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {activeSubTab === 'unidentified' && (() => {
                    const previewBestMatch = autoMapAnalysis.results.get(previewFile.id)?.bestMatch;
                    const assignedRoll = selectedStudentForFile[previewFile.id] || previewBestMatch?.student.rollNo;
                    return (
                      <button
                        onClick={() => {
                          if (assignedRoll) {
                            if (!selectedStudentForFile[previewFile.id] && previewBestMatch) {
                              handleApplySingleSuggestion(previewFile, previewBestMatch);
                            } else {
                              handleAssignRollNo(previewFile);
                            }
                            if (previewIndex < currentFilesList.length - 1) {
                              handleNextPreview();
                            } else {
                              setPreviewFile(null);
                            }
                          }
                        }}
                        disabled={!assignedRoll}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                      >
                        Assign &amp; Next
                      </button>
                    );
                  })()}

                  {activeSubTab === 'ambiguous' && (
                    <button
                      onClick={() => {
                        handleAssignCertType(previewFile);
                        if (previewIndex < currentFilesList.length - 1) {
                          handleNextPreview();
                        } else {
                          setPreviewFile(null);
                        }
                      }}
                      disabled={!selectedTypeForFile[previewFile.id]}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                    >
                      Save &amp; Next
                    </button>
                  )}

                  {activeSubTab === 'duplicates' && (
                    <>
                      <button
                        onClick={() => {
                          handleResolveDuplicate(previewFile, 'KEEP');
                          if (previewIndex < currentFilesList.length - 1) {
                            handleNextPreview();
                          } else {
                            setPreviewFile(null);
                          }
                        }}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Keep Primary</span>
                      </button>
                      <button
                        onClick={() => {
                          handleResolveDuplicate(previewFile, 'IGNORE');
                          if (previewIndex < currentFilesList.length - 1) {
                            handleNextPreview();
                          } else {
                            setPreviewFile(null);
                          }
                        }}
                        className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Duplicate</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk CSV Mapping Upload Modal */}
      <BulkMappingUploadModal
        isOpen={showBulkMappingModal}
        onClose={() => setShowBulkMappingModal(false)}
        unidentifiedFiles={unidentifiedFiles}
        onRefreshAfterResolution={onRefreshAfterResolution}
        userEmail={userEmail}
      />
    </div>
  );
};
