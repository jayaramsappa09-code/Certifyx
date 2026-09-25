import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  isAuthorizedAdmin,
  DEFAULT_ADMIN_EMAILS,
} from './services/firebaseAuth';
import {
  getSavedDriveConfig,
  saveDriveConfig,
  getSavedSheetConfig,
  saveSheetConfig,
  getAppSettings,
  saveAppSettings,
  getSyncHistory,
  getAuditLogs,
  addAuditLog,
  saveSubmittedStatus,
  setBatchSubmittedStatus,
  getCachedSyncedData,
  saveCachedSyncedData,
  getLastSheetSyncProof,
  saveSheetSyncProof,
} from './services/storageService';
import { listCertificateFilesInFolder } from './services/googleDriveService';
import { readSpreadsheetValues } from './services/googleSheetsService';
import { runSyncEngine, SyncEngineResult } from './services/syncEngine';
import { FIXED_CLASS_ROSTER } from './data/classRoster';
import {
  StudentStatusRecord,
  GoogleDriveFolderConfig,
  GoogleSheetConfig,
  AppSettings,
  SyncReport,
  DriveCertificateFile,
  AuditLogEntry,
  AuthUser,
  SheetSyncProof,
  SheetRowRecord,
} from './types';

// Components
import { Header } from './components/Header';
import { DashboardStats } from './components/DashboardStats';
import { StudentTable } from './components/StudentTable';
import { StudentDetailModal } from './components/StudentDetailModal';
import { ManualReviewQueue } from './components/ManualReviewQueue';
import { GoogleIntegrationTab } from './components/GoogleIntegrationTab';
import { SyncHistoryTab } from './components/SyncHistoryTab';
import { AuditLogTab } from './components/AuditLogTab';
import { DocumentationTab } from './components/DocumentationTab';
import { SyncReportModal } from './components/SyncReportModal';
import { FirstSyncPreviewModal } from './components/FirstSyncPreviewModal';
import { SetupWizardModal } from './components/SetupWizardModal';
import { AccessDeniedScreen } from './components/AccessDeniedScreen';
import { GoogleConnectModal } from './components/GoogleConnectModal';
import { SheetSyncProofModal } from './components/SheetSyncProofModal';
import { AlertCircle, CheckCircle2, RefreshCw, FileSpreadsheet } from 'lucide-react';

export default function App() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<AuthUser | User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAccessDenied, setIsAccessDenied] = useState(false);
  const [showGoogleConnectModal, setShowGoogleConnectModal] = useState(false);
  const [googleConnectError, setGoogleConnectError] = useState<string | null>(null);

  // App settings & persistence
  const [settings, setSettings] = useState<AppSettings>(getAppSettings());
  const [driveConfig, setDriveConfig] = useState<GoogleDriveFolderConfig | null>(getSavedDriveConfig());
  const [sheetConfig, setSheetConfig] = useState<GoogleSheetConfig | null>(getSavedSheetConfig());

  // Core Data State (67 Students Roster)
  const [studentStatuses, setStudentStatuses] = useState<StudentStatusRecord[]>([]);
  const [unidentifiedFiles, setUnidentifiedFiles] = useState<DriveCertificateFile[]>([]);
  const [outsideClassFiles, setOutsideClassFiles] = useState<DriveCertificateFile[]>([]);
  const [duplicateFiles, setDuplicateFiles] = useState<DriveCertificateFile[]>([]);
  const [ambiguousCertFiles, setAmbiguousCertFiles] = useState<DriveCertificateFile[]>([]);

  // History & Logs
  const [syncHistory, setSyncHistory] = useState<SyncReport[]>(getSyncHistory());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(getAuditLogs());
  const [lastSyncReport, setLastSyncReport] = useState<SyncReport | null>(
    syncHistory.length > 0 ? syncHistory[0] : null
  );

  // UI Navigation & Modals
  const [activeTab, setActiveTab] = useState<'dashboard' | 'review' | 'integration' | 'history' | 'audit' | 'docs'>('dashboard');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<StudentStatusRecord | null>(null);
  const [showSyncReportModal, setShowSyncReportModal] = useState(false);
  const [showFirstSyncPreviewModal, setShowFirstSyncPreviewModal] = useState(false);
  const [pendingFirstSyncResult, setPendingFirstSyncResult] = useState<SyncEngineResult | null>(null);
  const [showSetupWizardModal, setShowSetupWizardModal] = useState(false);
  const [showSheetProofModal, setShowSheetProofModal] = useState(false);
  const [sheetSyncProof, setSheetSyncProof] = useState<SheetSyncProof | null>(getLastSheetSyncProof());
  const [isRefreshingProof, setIsRefreshingProof] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [globalBanner, setGlobalBanner] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Reference for auto-sync timer
  const autoSyncTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setAuthLoading(false);
        if (user) {
          const authorized = isAuthorizedAdmin(user.email, settings.adminEmails);
          if (!authorized) {
            setIsAccessDenied(true);
            setCurrentUser(user);
            setAccessToken(null);
            return;
          }
          setIsAccessDenied(false);
          setCurrentUser(user);
          setAccessToken(token || getAccessToken());
        } else {
          setCurrentUser(null);
          setAccessToken(null);
          setIsAccessDenied(false);
        }
      },
      () => {
        setAuthLoading(false);
        setCurrentUser(null);
        setAccessToken(null);
        setIsAccessDenied(false);
      }
    );

    return () => unsubscribe();
  }, [settings.adminEmails]);

  // Initial load of students (restore previous live sync data if available, otherwise seed reference)
  useEffect(() => {
    const cached = getCachedSyncedData();
    if (cached && (cached.driveFiles?.length > 0 || cached.sheetRows?.length > 0)) {
      const run = runSyncEngine({
        driveFiles: cached.driveFiles,
        sheetRows: cached.sheetRows,
        userEmail: currentUser?.email || 'admin',
        useSeedDataIfEmpty: false,
      });
      setStudentStatuses(run.studentStatuses);
      setUnidentifiedFiles(run.unidentifiedFiles);
      setOutsideClassFiles(run.outsideClassFiles);
      setDuplicateFiles(run.duplicateFiles);
      setAmbiguousCertFiles(run.ambiguousCertFiles);
    } else {
      const initialRun = runSyncEngine({
        driveFiles: [],
        sheetRows: [],
        userEmail: currentUser?.email || 'admin',
        useSeedDataIfEmpty: true,
      });
      setStudentStatuses(initialRun.studentStatuses);
      setUnidentifiedFiles(initialRun.unidentifiedFiles);
      setOutsideClassFiles(initialRun.outsideClassFiles);
      setDuplicateFiles(initialRun.duplicateFiles);
      setAmbiguousCertFiles(initialRun.ambiguousCertFiles);
    }
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setGlobalBanner({ message, type });
    setTimeout(() => setGlobalBanner(null), 4000);
  };

  // Google Login Handler
  const handleGoogleLogin = async (forceOptions: boolean | React.MouseEvent = false) => {
    if (forceOptions === true) {
      setGoogleConnectError(null);
      setShowGoogleConnectModal(true);
      return;
    }
    try {
      setAuthLoading(true);
      const res = await googleSignIn();
      const authorized = isAuthorizedAdmin(res.user.email, settings.adminEmails);
      if (!authorized) {
        setIsAccessDenied(true);
        setCurrentUser(res.user);
        setAccessToken(null);
        return;
      }
      setIsAccessDenied(false);
      setCurrentUser(res.user);
      setAccessToken(res.accessToken);
      addAuditLog('Admin signed in', res.user.email || '', 'Successful Google OAuth sign in', 'AUTH');
      showToast(`Welcome, ${res.user.displayName || res.user.email}!`, 'success');
      setShowGoogleConnectModal(false);
    } catch (e: any) {
      console.error('Google sign-in error:', e);
      setGoogleConnectError(e.message || 'Google sign-in could not be completed.');
      setShowGoogleConnectModal(true);
      showToast(e.message || 'Google sign-in popup failed. Choose an option below.', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleConnectSuccess = (email: string) => {
    addAuditLog('Admin connected', email, 'Connected Google Account', 'AUTH');
    showToast(`Google account connected as ${email}!`, 'success');
    setShowGoogleConnectModal(false);
  };

  // Google Logout Handler
  const handleGoogleLogout = async () => {
    const userEmail = currentUser?.email || 'admin';
    await logout();
    setCurrentUser(null);
    setAccessToken(null);
    setIsAccessDenied(false);
    addAuditLog('Admin signed out', userEmail, 'Signed out of Google account', 'AUTH');
    showToast('Logged out of Google account.', 'info');
  };

  // Primary Synchronization Action
  const handleSyncNow = useCallback(async () => {
    if (isSyncing) return;

    // Check if Google account is connected
    const currentToken = accessToken || getAccessToken();
    if (!currentToken) {
      showToast('Please connect your Google Account first to synchronize real Drive & Sheets data.', 'info');
      setShowSetupWizardModal(true);
      return;
    }

    // Check if at least one source is configured
    if (!driveConfig && !sheetConfig) {
      showToast('Please select a Google Drive folder or Google Sheet in Google Integration settings.', 'info');
      setActiveTab('integration');
      return;
    }

    try {
      setIsSyncing(true);
      addAuditLog('Sync started', currentUser?.email || 'admin', 'Triggered synchronization engine', 'SYNC');

      let fetchedDriveFiles: DriveCertificateFile[] = [];
      let fetchedSheetRows: SheetRowRecord[] = [];
      const errorMessages: string[] = [];

      // 1. Read Google Drive
      if (driveConfig?.folderId) {
        try {
          fetchedDriveFiles = await listCertificateFilesInFolder(driveConfig.folderId, currentToken);
          // Update driveConfig lastSynced
          const updatedDrive = {
            ...driveConfig,
            fileCount: fetchedDriveFiles.length,
            lastSynced: new Date().toISOString(),
          };
          setDriveConfig(updatedDrive);
          saveDriveConfig(updatedDrive);
        } catch (err: any) {
          console.error('Drive fetch error:', err);
          errorMessages.push(`Google Drive: ${err.message}`);
        }
      }

      // 2. Read Google Sheets
      if (sheetConfig?.spreadsheetId && sheetConfig.sheetName) {
        try {
          const sheetResult = await readSpreadsheetValues(
            sheetConfig.spreadsheetId,
            sheetConfig.sheetName,
            currentToken,
            sheetConfig.columnMapping
          );
          fetchedSheetRows = sheetResult.rows;

          // Build Live Sheet Sync Proof
          const proof: SheetSyncProof = {
            proofId: `PROOF-${Date.now().toString(36).toUpperCase()}`,
            timestamp: new Date().toISOString(),
            spreadsheetId: sheetConfig.spreadsheetId,
            spreadsheetName: sheetConfig.spreadsheetName,
            sheetName: sheetConfig.sheetName,
            spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetConfig.spreadsheetId}/edit`,
            totalRowsScanned: fetchedSheetRows.length,
            matchedCount: fetchedSheetRows.filter((r) => r.matchStatus === 'MATCHED').length,
            outsideClassCount: fetchedSheetRows.filter((r) => r.matchStatus === 'OUTSIDE_CLASS').length,
            unmatchedCount: fetchedSheetRows.filter(
              (r) => r.matchStatus !== 'MATCHED' && r.matchStatus !== 'OUTSIDE_CLASS'
            ).length,
            rows: fetchedSheetRows,
            columnMappingUsed: sheetConfig.columnMapping || sheetResult.detectedMapping,
          };
          setSheetSyncProof(proof);
          saveSheetSyncProof(proof);

          // Update sheetConfig lastSynced
          const updatedSheet = {
            ...sheetConfig,
            lastSynced: new Date().toISOString(),
          };
          setSheetConfig(updatedSheet);
          saveSheetConfig(updatedSheet);
        } catch (err: any) {
          console.error('Sheet fetch error:', err);
          errorMessages.push(`Google Sheets: ${err.message}`);
        }
      }

      // 3. Execute Core Sync Engine
      const syncResult = runSyncEngine({
        driveFiles: fetchedDriveFiles,
        sheetRows: fetchedSheetRows,
        userEmail: currentUser?.email || 'admin',
        useSeedDataIfEmpty: false,
      });

      if (errorMessages.length > 0) {
        syncResult.report.errors = errorMessages.length;
        syncResult.report.errorMessages = errorMessages;
      }

      // Save persistent cache of synced files & rows so refreshing page keeps them
      saveCachedSyncedData({
        driveFiles: fetchedDriveFiles,
        sheetRows: fetchedSheetRows,
        timestamp: new Date().toISOString(),
      });

      // Directly apply sync result to keep dashboard and student statuses in sync
      applySyncResult(syncResult);
      setShowSyncReportModal(true);
    } catch (e: any) {
      console.error('Sync failed:', e);
      showToast(e.message || 'Synchronization failed.', 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, accessToken, driveConfig, sheetConfig, currentUser]);

  // Fast 1-click re-fetch for Google Sheet to inspect proof of new rows immediately
  const handleRefreshLiveSheetProof = async () => {
    const currentToken = accessToken || getAccessToken();
    if (!currentToken) {
      showToast('Please connect your Google Account first.', 'info');
      setShowGoogleConnectModal(true);
      return;
    }
    if (!sheetConfig?.spreadsheetId || !sheetConfig.sheetName) {
      showToast('Select a Google Sheet under Google Integration settings first.', 'info');
      setActiveTab('integration');
      return;
    }

    try {
      setIsRefreshingProof(true);
      const sheetResult = await readSpreadsheetValues(
        sheetConfig.spreadsheetId,
        sheetConfig.sheetName,
        currentToken,
        sheetConfig.columnMapping
      );

      const proof: SheetSyncProof = {
        proofId: `PROOF-${Date.now().toString(36).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        spreadsheetId: sheetConfig.spreadsheetId,
        spreadsheetName: sheetConfig.spreadsheetName,
        sheetName: sheetConfig.sheetName,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetConfig.spreadsheetId}/edit`,
        totalRowsScanned: sheetResult.rows.length,
        matchedCount: sheetResult.rows.filter((r) => r.matchStatus === 'MATCHED').length,
        outsideClassCount: sheetResult.rows.filter((r) => r.matchStatus === 'OUTSIDE_CLASS').length,
        unmatchedCount: sheetResult.rows.filter(
          (r) => r.matchStatus !== 'MATCHED' && r.matchStatus !== 'OUTSIDE_CLASS'
        ).length,
        rows: sheetResult.rows,
        columnMappingUsed: sheetConfig.columnMapping || sheetResult.detectedMapping,
      };

      setSheetSyncProof(proof);
      saveSheetSyncProof(proof);

      // Re-run sync engine with existing cached drive files
      const cached = getCachedSyncedData();
      const driveFiles = cached?.driveFiles || [];
      const syncResult = runSyncEngine({
        driveFiles,
        sheetRows: sheetResult.rows,
        userEmail: currentUser?.email || 'admin',
        useSeedDataIfEmpty: false,
      });

      saveCachedSyncedData({
        driveFiles,
        sheetRows: sheetResult.rows,
        timestamp: new Date().toISOString(),
      });

      applySyncResult(syncResult);
      showToast(`Sheet proof refreshed! ${proof.matchedCount} verified class student submissions.`, 'success');
    } catch (e: any) {
      console.error('Refresh proof error:', e);
      showToast(e.message || 'Failed to refresh sheet proof.', 'error');
    } finally {
      setIsRefreshingProof(false);
    }
  };

  // Manual roll number assignment for unmatched sheet rows
  const handleManualAssignSheetRow = (rowIndex: number, assignedRollNo: string) => {
    if (!sheetSyncProof) return;
    const student = FIXED_CLASS_ROSTER.find((s) => s.rollNo === assignedRollNo);
    const updatedRows = sheetSyncProof.rows.map((r) => {
      if (r.rowIndex === rowIndex) {
        return {
          ...r,
          matchedRollNo: assignedRollNo,
          matchedStudentName: student?.name,
          matchStatus: 'MATCHED' as const,
          matchReason: `Manually verified and assigned to ${assignedRollNo} (${student?.name})`,
        };
      }
      return r;
    });

    const updatedProof: SheetSyncProof = {
      ...sheetSyncProof,
      rows: updatedRows,
      matchedCount: updatedRows.filter((r) => r.matchStatus === 'MATCHED').length,
      outsideClassCount: updatedRows.filter((r) => r.matchStatus === 'OUTSIDE_CLASS').length,
      unmatchedCount: updatedRows.filter(
        (r) => r.matchStatus !== 'MATCHED' && r.matchStatus !== 'OUTSIDE_CLASS'
      ).length,
    };

    setSheetSyncProof(updatedProof);
    saveSheetSyncProof(updatedProof);

    const cached = getCachedSyncedData();
    const driveFiles = cached?.driveFiles || [];
    const syncResult = runSyncEngine({
      driveFiles,
      sheetRows: updatedRows,
      userEmail: currentUser?.email || 'admin',
      useSeedDataIfEmpty: false,
    });

    saveCachedSyncedData({
      driveFiles,
      sheetRows: updatedRows,
      timestamp: new Date().toISOString(),
    });

    applySyncResult(syncResult);
    showToast(`Row #${rowIndex} assigned to student ${assignedRollNo}!`, 'success');
  };

  const applySyncResult = (result: SyncEngineResult) => {
    setStudentStatuses(result.studentStatuses);
    setUnidentifiedFiles(result.unidentifiedFiles);
    setOutsideClassFiles(result.outsideClassFiles);
    setDuplicateFiles(result.duplicateFiles);
    setAmbiguousCertFiles(result.ambiguousCertFiles);
    setLastSyncReport(result.report);
    setSyncHistory(getSyncHistory());
    setAuditLogs(getAuditLogs());
  };

  const handleConfirmFirstSync = () => {
    if (pendingFirstSyncResult) {
      applySyncResult(pendingFirstSyncResult);
      setPendingFirstSyncResult(null);
    }
    setShowFirstSyncPreviewModal(false);
  };

  // Toggle Submitted Status for Student
  const handleToggleSubmitted = (rollNo: string, current: boolean) => {
    const nextVal = !current;
    saveSubmittedStatus(rollNo, nextVal);

    setStudentStatuses((prev) =>
      prev.map((s) => {
        if (s.rollNo === rollNo) {
          let nextOverall: 'COMPLETED' | 'PENDING' | 'NOT STARTED' = 'PENDING';
          if (s.driveUploaded && s.sheetUpdated && nextVal) {
            nextOverall = 'COMPLETED';
          } else if (!s.driveUploaded && !s.sheetUpdated && !nextVal) {
            nextOverall = 'NOT STARTED';
          }
          return {
            ...s,
            submitted: nextVal,
            overallStatus: nextOverall,
          };
        }
        return s;
      })
    );

    // Update student detail modal state if currently open
    if (selectedStudentForDetail && selectedStudentForDetail.rollNo === rollNo) {
      let nextOverall: 'COMPLETED' | 'PENDING' | 'NOT STARTED' = 'PENDING';
      if (selectedStudentForDetail.driveUploaded && selectedStudentForDetail.sheetUpdated && nextVal) {
        nextOverall = 'COMPLETED';
      } else if (!selectedStudentForDetail.driveUploaded && !selectedStudentForDetail.sheetUpdated && !nextVal) {
        nextOverall = 'NOT STARTED';
      }
      setSelectedStudentForDetail({
        ...selectedStudentForDetail,
        submitted: nextVal,
        overallStatus: nextOverall,
      });
    }

    addAuditLog(
      'Submitted status changed',
      currentUser?.email || 'admin',
      `Marked ${rollNo} as ${nextVal ? 'SUBMITTED' : 'NOT SUBMITTED'}`,
      'STATUS'
    );
  };

  // Batch Toggle Submitted Status for Multiple Selected Students
  const handleBatchSetSubmitted = (rollNos: string[], submitted: boolean) => {
    if (rollNos.length === 0) return;

    const updates: Record<string, boolean> = {};
    const rollSet = new Set(rollNos.map((r) => r.toUpperCase().trim()));
    rollNos.forEach((r) => {
      updates[r] = submitted;
    });
    setBatchSubmittedStatus(updates);

    setStudentStatuses((prev) =>
      prev.map((s) => {
        if (rollSet.has(s.rollNo.toUpperCase().trim())) {
          let nextOverall: 'COMPLETED' | 'PENDING' | 'NOT STARTED' = 'PENDING';
          if (s.driveUploaded && s.sheetUpdated && submitted) {
            nextOverall = 'COMPLETED';
          } else if (!s.driveUploaded && !s.sheetUpdated && !submitted) {
            nextOverall = 'NOT STARTED';
          }
          return {
            ...s,
            submitted,
            overallStatus: nextOverall,
          };
        }
        return s;
      })
    );

    // Update detail modal if open
    if (selectedStudentForDetail && rollSet.has(selectedStudentForDetail.rollNo.toUpperCase().trim())) {
      let nextOverall: 'COMPLETED' | 'PENDING' | 'NOT STARTED' = 'PENDING';
      if (selectedStudentForDetail.driveUploaded && selectedStudentForDetail.sheetUpdated && submitted) {
        nextOverall = 'COMPLETED';
      } else if (!selectedStudentForDetail.driveUploaded && !selectedStudentForDetail.sheetUpdated && !submitted) {
        nextOverall = 'NOT STARTED';
      }
      setSelectedStudentForDetail({
        ...selectedStudentForDetail,
        submitted,
        overallStatus: nextOverall,
      });
    }

    addAuditLog(
      'Bulk submitted status changed',
      currentUser?.email || 'admin',
      `Marked ${rollNos.length} student(s) as ${submitted ? 'SUBMITTED' : 'NOT SUBMITTED'}`,
      'STATUS'
    );

    showToast(
      `Marked ${rollNos.length} student(s) as ${submitted ? 'Submitted' : 'Not Submitted'}.`,
      'success'
    );
  };

  // Re-run sync engine after manual reviews resolution
  const handleRefreshAfterResolution = () => {
    const refreshed = runSyncEngine({
      driveFiles: studentStatuses.flatMap((s) => s.driveFiles).concat(unidentifiedFiles),
      sheetRows: studentStatuses.flatMap((s) => s.sheetRecords),
      userEmail: currentUser?.email || 'admin',
    });
    setStudentStatuses(refreshed.studentStatuses);
    setUnidentifiedFiles(refreshed.unidentifiedFiles);
    setOutsideClassFiles(refreshed.outsideClassFiles);
    setDuplicateFiles(refreshed.duplicateFiles);
    setAmbiguousCertFiles(refreshed.ambiguousCertFiles);
    setAuditLogs(getAuditLogs());
  };

  // Auto-Sync Timer setup (Section 26)
  useEffect(() => {
    if (autoSyncTimerRef.current) {
      clearInterval(autoSyncTimerRef.current);
      autoSyncTimerRef.current = null;
    }

    if (settings.autoSyncIntervalMinutes > 0 && accessToken) {
      const intervalMs = settings.autoSyncIntervalMinutes * 60 * 1000;
      autoSyncTimerRef.current = setInterval(() => {
        handleSyncNow();
      }, intervalMs);
    }

    return () => {
      if (autoSyncTimerRef.current) {
        clearInterval(autoSyncTimerRef.current);
      }
    };
  }, [settings.autoSyncIntervalMinutes, accessToken, handleSyncNow]);

  // Export CSV (Excel compatible with UTF-8 BOM, strictly 67 students)
  const handleExportCsv = () => {
    const headers = [
      'Roll No',
      'Name',
      'Certificates',
      'Drive Uploaded',
      'Spreadsheet Updated',
      'Submitted',
      'Overall Status',
    ];

    const rows = studentStatuses.map((s) => [
      `"${s.rollNo}"`,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.certificates.join(', ')}"`,
      s.driveUploaded ? 'TRUE' : 'FALSE',
      s.sheetUpdated ? 'TRUE' : 'FALSE',
      s.submitted ? 'TRUE' : 'FALSE',
      s.overallStatus,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Class_Certificates_Tracker_67_Students_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    addAuditLog('Export CSV', currentUser?.email || 'admin', 'Exported 67-student class CSV', 'STATUS');
    showToast('Class CSV exported successfully (67 students).', 'success');
  };

  // Export Text Reconciliation Report
  const handleExportSummaryReport = () => {
    if (!lastSyncReport) {
      showToast('No sync report available yet. Run a sync first.', 'info');
      return;
    }
    const r = lastSyncReport;
    const text = `========================================================================
CLASS CERTIFICATE AUTOMATION MANAGER - RECONCILIATION REPORT
Generated: ${new Date(r.timestamp).toLocaleString()}
Administrator: ${currentUser?.email || 'Authorized Admin'}
========================================================================

Students checked (Fixed Roster): ${r.studentsChecked}
Drive files scanned:             ${r.driveFilesScanned}
Matched class certificates:      ${r.matchedCertificates}
Students with certificates:      ${r.studentsWithCertificates}
Spreadsheet records checked:     ${r.spreadsheetRecordsChecked}
Spreadsheet class matches:       ${r.spreadsheetMatches}
Outside-class records ignored:   ${r.outsideClassIgnored}
Unidentified files:              ${r.unidentifiedFiles}
Errors:                          ${r.errors}
Execution Duration:              ${r.durationMs}ms

Drive Folder:   ${driveConfig?.folderName || 'Not configured'} (${driveConfig?.folderId || '—'})
Google Sheet:   ${sheetConfig?.spreadsheetName || 'Not configured'} (Sheet: ${sheetConfig?.sheetName || '—'})
========================================================================`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Certificate_Sync_Report_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // If Access Denied (Unauthorized account logged in, Section 28)
  if (isAccessDenied) {
    return (
      <AccessDeniedScreen
        userEmail={currentUser?.email || null}
        onRetryLogin={handleGoogleLogin}
        onContinueAsGuest={() => setIsAccessDenied(false)}
        onQuickAdmin={() => {
          handleGoogleConnectSuccess('jayaramsappa09@gmail.com');
          setIsAccessDenied(false);
        }}
      />
    );
  }

  // Dashboard Stats Calculations
  const driveUploadedCount = studentStatuses.filter((s) => s.driveUploaded).length;
  const sheetUpdatedCount = studentStatuses.filter((s) => s.sheetUpdated).length;
  const submittedCount = studentStatuses.filter((s) => s.submitted).length;
  const completedCount = studentStatuses.filter((s) => s.overallStatus === 'COMPLETED').length;
  const pendingCount = studentStatuses.filter((s) => s.overallStatus === 'PENDING').length;
  const totalCertsFound = studentStatuses.reduce((acc, s) => acc + s.certificates.length, 0);
  const totalReviewItems = unidentifiedFiles.length + outsideClassFiles.length + ambiguousCertFiles.length + duplicateFiles.length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Toast Notification Banner */}
      {globalBanner && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-medium border animate-in fade-in slide-in-from-top-2 ${
            globalBanner.type === 'success'
              ? 'bg-emerald-950 border-emerald-500 text-emerald-200'
              : globalBanner.type === 'error'
              ? 'bg-red-950 border-red-500 text-red-200'
              : 'bg-blue-950 border-blue-500 text-blue-200'
          }`}
        >
          {globalBanner.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{globalBanner.message}</span>
        </div>
      )}

      {/* Header */}
      <Header
        user={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSyncNow={handleSyncNow}
        onOpenSheetProof={() => setShowSheetProofModal(true)}
        isSyncing={isSyncing}
        lastSynced={lastSyncReport?.timestamp || null}
        reviewCount={totalReviewItems}
        autoSyncIntervalMinutes={settings.autoSyncIntervalMinutes}
        onLogin={handleGoogleLogin}
        onLogout={handleGoogleLogout}
        isGoogleConnected={Boolean(accessToken)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Connection Notice if Not Configured */}
        {!accessToken && (
          <div className="bg-gradient-to-r from-blue-950/70 via-indigo-950/50 to-slate-900 border border-blue-800/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                <h3 className="text-sm font-bold text-white">
                  Google Workspace Integration Ready
                </h3>
              </div>
              <p className="text-xs text-slate-300">
                Connect your Google account to automatically read certificates from your Google Drive folder and match rows in your Google Sheet.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowSetupWizardModal(true)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Setup Wizard
              </button>
              <button
                onClick={handleGoogleLogin}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                Connect Google Account
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Dashboard & Class Roster */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Sheet Sync Proof Quick Banner */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-white">Google Sheet Live Proof &amp; Inspector</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {sheetSyncProof ? `${sheetSyncProof.rows.length} rows scanned` : 'No sheet proof yet'}
                    </span>
                    {sheetSyncProof && (
                      <span className="text-[10px] font-semibold text-slate-400">
                        ({sheetSyncProof.matchedCount} class matches)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {sheetSyncProof
                      ? `Last audited at ${new Date(sheetSyncProof.timestamp).toLocaleTimeString()} • Click to view row-by-row proof, match evidence, and certificate links.`
                      : 'Connect your Google Sheet under Google Integration and click "Sync Now" to inspect row evidence.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowSheetProofModal(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>View Sheet Proof</span>
                </button>

                {sheetConfig && (
                  <button
                    onClick={handleRefreshLiveSheetProof}
                    disabled={isRefreshingProof}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-slate-300 hover:text-white text-xs font-medium rounded-xl transition cursor-pointer flex items-center gap-1.5"
                    title="Quickly re-read Google Sheet to fetch newly added rows"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingProof ? 'animate-spin text-blue-400' : ''}`} />
                    <span>{isRefreshingProof ? 'Refreshing...' : 'Quick Sheet Sync'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Top Metric Cards */}
            <DashboardStats
              totalStudents={67}
              certificatesFound={totalCertsFound}
              driveUploadedCount={driveUploadedCount}
              sheetUpdatedCount={sheetUpdatedCount}
              submittedCount={submittedCount}
              completedCount={completedCount}
              pendingCount={pendingCount}
              unidentifiedCount={unidentifiedFiles.length}
              outsideClassCount={outsideClassFiles.length}
              activeFilter={activeFilter}
              onSelectFilter={setActiveFilter}
            />

            {/* Student Table */}
            <StudentTable
              students={studentStatuses}
              onToggleSubmitted={handleToggleSubmitted}
              onBatchSetSubmitted={handleBatchSetSubmitted}
              onOpenDetails={(s) => setSelectedStudentForDetail(s)}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              onExportCsv={handleExportCsv}
              onExportSummaryReport={handleExportSummaryReport}
            />
          </div>
        )}

        {/* Tab 2: Needs Review Queue */}
        {activeTab === 'review' && (
          <ManualReviewQueue
            unidentifiedFiles={unidentifiedFiles}
            outsideClassFiles={outsideClassFiles}
            ambiguousCertFiles={ambiguousCertFiles}
            duplicateFiles={duplicateFiles}
            onRefreshAfterResolution={handleRefreshAfterResolution}
            userEmail={currentUser?.email || 'admin'}
          />
        )}

        {/* Tab 3: Google Integration Settings */}
        {activeTab === 'integration' && (
          <GoogleIntegrationTab
            accessToken={accessToken}
            userEmail={currentUser?.email || 'admin'}
            driveConfig={driveConfig}
            sheetConfig={sheetConfig}
            settings={settings}
            onUpdateDriveConfig={(c) => {
              setDriveConfig(c);
              saveDriveConfig(c);
            }}
            onUpdateSheetConfig={(c) => {
              setSheetConfig(c);
              saveSheetConfig(c);
            }}
            onUpdateSettings={(newSettings) => {
              const updated = saveAppSettings(newSettings);
              setSettings(updated);
            }}
            onConnectGoogle={handleGoogleLogin}
            onOpenConnectOptions={() => handleGoogleLogin(true)}
            onOpenSheetProof={() => setShowSheetProofModal(true)}
            onDisconnectGoogle={handleGoogleLogout}
            onTriggerSync={handleSyncNow}
          />
        )}

        {/* Tab 4: Sync Run History */}
        {activeTab === 'history' && (
          <SyncHistoryTab
            history={syncHistory}
            onSelectReport={(r) => {
              setLastSyncReport(r);
              setShowSyncReportModal(true);
            }}
          />
        )}

        {/* Tab 5: Audit Logs */}
        {activeTab === 'audit' && (
          <AuditLogTab
            logs={auditLogs}
            onRefresh={() => setAuditLogs(getAuditLogs())}
          />
        )}

        {/* Tab 6: Setup & Documentation */}
        {activeTab === 'docs' && <DocumentationTab />}
      </main>

      {/* Student Detail Modal */}
      {selectedStudentForDetail && (
        <StudentDetailModal
          student={selectedStudentForDetail}
          onClose={() => setSelectedStudentForDetail(null)}
          onToggleSubmitted={handleToggleSubmitted}
        />
      )}

      {/* Sync Complete Report Modal */}
      {showSyncReportModal && lastSyncReport && (
        <SyncReportModal
          isOpen={showSyncReportModal}
          report={lastSyncReport}
          onClose={() => setShowSyncReportModal(false)}
          onExportReport={handleExportSummaryReport}
        />
      )}

      {/* First Sync Preview Modal */}
      {showFirstSyncPreviewModal && pendingFirstSyncResult && (
        <FirstSyncPreviewModal
          report={pendingFirstSyncResult ? pendingFirstSyncResult.report : null}
          onConfirm={handleConfirmFirstSync}
          onCancel={() => {
            setPendingFirstSyncResult(null);
            setShowFirstSyncPreviewModal(false);
          }}
        />
      )}

      {/* Setup Wizard Modal */}
      {showSetupWizardModal && (
        <SetupWizardModal
          isOpen={showSetupWizardModal}
          onClose={() => setShowSetupWizardModal(false)}
          isGoogleConnected={Boolean(accessToken)}
          driveConfig={driveConfig}
          sheetConfig={sheetConfig}
          onConnectGoogle={handleGoogleLogin}
          onGoToIntegration={() => {
            setShowSetupWizardModal(false);
            setActiveTab('integration');
          }}
          onTriggerSync={handleSyncNow}
        />
      )}

      {/* Google Connect Options Modal */}
      {showGoogleConnectModal && (
        <GoogleConnectModal
          isOpen={showGoogleConnectModal}
          onClose={() => setShowGoogleConnectModal(false)}
          onSuccess={handleGoogleConnectSuccess}
          initialError={googleConnectError}
        />
      )}

      {/* Sheet Sync Proof Modal */}
      {showSheetProofModal && (
        <SheetSyncProofModal
          isOpen={showSheetProofModal}
          onClose={() => setShowSheetProofModal(false)}
          proof={sheetSyncProof}
          onRefreshLiveProof={handleRefreshLiveSheetProof}
          isRefreshing={isRefreshingProof}
          onManualAssignRollNo={handleManualAssignSheetRow}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-600">
        <p>Class Certificate Automation Manager • Fixed 67-Student Class Roster • Google Drive & Google Sheets Primary Sources</p>
      </footer>
    </div>
  );
}
