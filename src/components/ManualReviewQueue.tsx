import React, { useState } from 'react';
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
  EyeOff,
  Filter,
} from 'lucide-react';
import { DriveCertificateFile } from '../types';
import { FIXED_CLASS_ROSTER } from '../data/classRoster';
import {
  saveManualFileOverride,
  saveDuplicateResolution,
  getDuplicateResolutions,
  addAuditLog,
} from '../services/storageService';

interface ManualReviewQueueProps {
  unidentifiedFiles: DriveCertificateFile[];
  outsideClassFiles: DriveCertificateFile[];
  ambiguousCertFiles: DriveCertificateFile[];
  duplicateFiles: DriveCertificateFile[];
  onRefreshAfterResolution: () => void;
  userEmail: string;
}

export const ManualReviewQueue: React.FC<ManualReviewQueueProps> = ({
  unidentifiedFiles,
  outsideClassFiles,
  ambiguousCertFiles,
  duplicateFiles,
  onRefreshAfterResolution,
  userEmail,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'unidentified' | 'outside' | 'ambiguous' | 'duplicates'>('unidentified');
  const [selectedStudentForFile, setSelectedStudentForFile] = useState<Record<string, string>>({});
  const [selectedTypeForFile, setSelectedTypeForFile] = useState<Record<string, string>>({});
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const duplicateResolutions = getDuplicateResolutions();

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
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
  const handleResolveDuplicate = (file: DriveCertificateFile, resolution: 'KEEP' | 'IGNORE' | 'REVIEW') => {
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

  const certTypeOptions = [
    'Hackathon',
    'Course',
    'Participation',
    'Merit',
    'Award',
    'Certification',
    'Badge',
    'Certificate of Participation',
    'Course Completion',
    'Coordinator Certificate',
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

      {/* Sub-tab Navigation */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab('unidentified')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
            activeSubTab === 'unidentified'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <HelpCircle className="w-4 h-4 text-rose-400" />
          <span>Unidentified Files</span>
          <span className="px-2 py-0.2 rounded-full text-xs bg-slate-900 border border-slate-800 text-slate-300">
            {unidentifiedFiles.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('outside')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
            activeSubTab === 'outside'
              ? 'bg-slate-700/40 text-slate-200 border border-slate-600/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <UserX className="w-4 h-4 text-slate-400" />
          <span>Outside Class Records</span>
          <span className="px-2 py-0.2 rounded-full text-xs bg-slate-900 border border-slate-800 text-slate-300">
            {outsideClassFiles.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('ambiguous')}
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
          onClick={() => setActiveSubTab('duplicates')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
            activeSubTab === 'duplicates'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Copy className="w-4 h-4 text-indigo-400" />
          <span>Possible Duplicates</span>
          <span className="px-2 py-0.2 rounded-full text-xs bg-slate-900 border border-slate-800 text-slate-300">
            {duplicateFiles.length}
          </span>
        </button>
      </div>

      {/* 1. Unidentified Files */}
      {activeSubTab === 'unidentified' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-rose-400" />
              Files With No Detectable Roll Number
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              These files in Google Drive do not follow the standard naming format (e.g. <span className="font-mono text-slate-300">25A31A05EN_Course.pdf</span>). You can inspect each file in Drive and assign it to a student from the 67-person roster.
            </p>
          </div>

          {unidentifiedFiles.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <div className="text-sm font-semibold text-slate-200">
                All Drive files identified!
              </div>
              <p className="text-xs text-slate-500">
                Every scanned file in Google Drive contains a valid roll number pattern.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {unidentifiedFiles.map((file) => (
                <div
                  key={file.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-950 text-rose-300 border border-rose-900">
                        Unidentified
                      </span>
                      <span className="font-mono text-xs font-semibold text-white break-all">
                        {file.name}
                      </span>
                    </div>
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:underline inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Preview in Google Drive
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <select
                      value={selectedStudentForFile[file.id] || ''}
                      onChange={(e) =>
                        setSelectedStudentForFile((prev) => ({
                          ...prev,
                          [file.id]: e.target.value,
                        }))
                      }
                      className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500 max-w-xs"
                    >
                      <option value="">Select Student from 67 Roster...</option>
                      {FIXED_CLASS_ROSTER.map((s) => (
                        <option key={s.rollNo} value={s.rollNo}>
                          {s.rollNo} - {s.name}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => handleAssignRollNo(file)}
                      disabled={!selectedStudentForFile[file.id]}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                    >
                      Assign
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Outside Class Files */}
      {activeSubTab === 'outside' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserX className="w-4 h-4 text-slate-400" />
              Files Belonging to Students Outside Fixed Class Roster
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Per strict class requirements, the system strictly matches only the 67 students in your class roster. Files with unknown roll numbers (e.g. <span className="font-mono text-slate-300">24A31A05JR</span>) are ignored and will <span className="font-bold text-amber-300">never</span> create unknown students automatically.
            </p>
          </div>

          {outsideClassFiles.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <div className="text-sm font-semibold text-slate-200">
                No outside-class files detected!
              </div>
              <p className="text-xs text-slate-500">
                All identified files match students within the 67-person roster.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {outsideClassFiles.map((file) => (
                <div
                  key={file.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-950 text-slate-400 border border-slate-800">
                        {file.detectedRollNo || 'UNKNOWN'}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-950 text-red-300 border border-red-900">
                        Outside Class (Ignored)
                      </span>
                    </div>
                    <div className="font-mono text-xs text-slate-300 break-all">
                      {file.name}
                    </div>
                  </div>

                  {file.webViewLink && (
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-xl transition shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View in Drive</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Ambiguous Certificate Types */}
      {activeSubTab === 'ambiguous' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-400" />
              Certificate Types Needing Review
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              These certificates could not be automatically recognized into standard categories (Hackathon, Course, Participation, Merit, Award, Certification, etc.). You can manually select the correct type.
            </p>
          </div>

          {ambiguousCertFiles.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <div className="text-sm font-semibold text-slate-200">
                All certificate types identified!
              </div>
              <p className="text-xs text-slate-500">
                No ambiguous certificate titles found.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {ambiguousCertFiles.map((file) => (
                <div
                  key={file.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {file.detectedRollNo && (
                        <span className="font-mono text-xs font-bold text-blue-400">
                          {file.detectedRollNo}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-950 text-amber-300 border border-amber-800">
                        Needs Review
                      </span>
                      <span className="text-xs text-slate-300 font-mono">
                        {file.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
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
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                    >
                      Save Type
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Possible Duplicates */}
      {activeSubTab === 'duplicates' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Copy className="w-4 h-4 text-indigo-400" />
              Potential Duplicate Certificates
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Per Section 25: If the same student has multiple certificate files of the same type (e.g. <span className="font-mono text-slate-300">25A31A05EN_Hackathon.pdf</span> and <span className="font-mono text-slate-300">25A31A05EN_Hackathon_2.pdf</span>), neither is deleted automatically. Mark them below to keep, ignore, or leave for review.
            </p>
          </div>

          {duplicateFiles.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <div className="text-sm font-semibold text-slate-200">
                No duplicate files detected!
              </div>
              <p className="text-xs text-slate-500">
                Each certificate type per student is unique.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {duplicateFiles.map((file) => {
                const currentRes = duplicateResolutions[file.id] || 'REVIEW';
                return (
                  <div
                    key={file.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-400">
                          {file.detectedRollNo}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                          {file.detectedCertType || 'Certificate'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                          Possible Duplicate
                        </span>
                      </div>
                      <div className="font-mono text-xs text-slate-300 break-all">
                        {file.name}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleResolveDuplicate(file, 'KEEP')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer ${
                          currentRes === 'KEEP'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        Keep Both
                      </button>
                      <button
                        onClick={() => handleResolveDuplicate(file, 'IGNORE')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer ${
                          currentRes === 'IGNORE'
                            ? 'bg-red-600 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        Ignore This
                      </button>
                      <button
                        onClick={() => handleResolveDuplicate(file, 'REVIEW')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition cursor-pointer ${
                          currentRes === 'REVIEW'
                            ? 'bg-amber-600 text-slate-950'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        Review Later
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
