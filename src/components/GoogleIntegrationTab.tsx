import React, { useState, useMemo } from 'react';
import {
  Folder,
  FileSpreadsheet,
  Link,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  ExternalLink,
  Shield,
  Layers,
  Settings,
  Sliders,
  Plus,
  Trash2,
  Check,
  FolderOpen,
  Code,
  Sparkles,
  Wand2,
  Info,
} from 'lucide-react';
import {
  GoogleDriveFolderConfig,
  GoogleSheetConfig,
  ColumnMapping,
  AppSettings,
} from '../types';
import { isAuthExpiredError } from '../services/firebaseAuth';
import {
  extractDriveFolderId,
  listDriveFolders,
  getDriveFolderMetadata,
  DriveFolderInfo,
} from '../services/googleDriveService';
import {
  extractSpreadsheetId,
  listGoogleSpreadsheets,
  getSpreadsheetMetadata,
  readSpreadsheetValues,
  SpreadsheetListItem,
} from '../services/googleSheetsService';
import { parseFilenameWithCustomRegex, detectCertificateType } from '../services/syncEngine';
import { ROSTER_MAP, normalizeRollNumber } from '../data/classRoster';
import { addAuditLog } from '../services/storageService';

interface GoogleIntegrationTabProps {
  accessToken: string | null;
  userEmail: string;
  driveConfig: GoogleDriveFolderConfig | null;
  sheetConfig: GoogleSheetConfig | null;
  driveConfigs?: GoogleDriveFolderConfig[];
  sheetConfigs?: GoogleSheetConfig[];
  settings: AppSettings;
  onUpdateDriveConfig: (config: GoogleDriveFolderConfig | null) => void;
  onUpdateSheetConfig: (config: GoogleSheetConfig | null) => void;
  onUpdateDriveConfigs?: (configs: GoogleDriveFolderConfig[]) => void;
  onUpdateSheetConfigs?: (configs: GoogleSheetConfig[]) => void;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onConnectGoogle: () => void;
  onOpenConnectOptions?: () => void;
  onOpenSheetProof?: () => void;
  onDisconnectGoogle: () => void;
  onTriggerSync: () => void;
  onToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const GoogleIntegrationTab: React.FC<GoogleIntegrationTabProps> = ({
  accessToken,
  userEmail,
  driveConfig,
  sheetConfig,
  driveConfigs = [],
  sheetConfigs = [],
  settings,
  onUpdateDriveConfig,
  onUpdateSheetConfig,
  onUpdateDriveConfigs,
  onUpdateSheetConfigs,
  onUpdateSettings,
  onConnectGoogle,
  onOpenConnectOptions,
  onOpenSheetProof,
  onDisconnectGoogle,
  onTriggerSync,
  onToast,
}) => {
  // Normalize active Drive configs list
  const activeDriveList = useMemo<GoogleDriveFolderConfig[]>(() => {
    if (driveConfigs && driveConfigs.length > 0) return driveConfigs;
    if (driveConfig && driveConfig.folderId) return [driveConfig];
    return [];
  }, [driveConfigs, driveConfig]);

  // Normalize active Sheet configs list
  const activeSheetList = useMemo<GoogleSheetConfig[]>(() => {
    if (sheetConfigs && sheetConfigs.length > 0) return sheetConfigs;
    if (sheetConfig && sheetConfig.spreadsheetId) return [sheetConfig];
    return [];
  }, [sheetConfigs, sheetConfig]);

  // Folder state
  const [folderInput, setFolderInput] = useState('');
  const [isBrowsingFolders, setIsBrowsingFolders] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<DriveFolderInfo[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [testingDrive, setTestingDrive] = useState(false);

  // Sheet state
  const [sheetInput, setSheetInput] = useState('');
  const [isBrowsingSheets, setIsBrowsingSheets] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<SpreadsheetListItem[]>([]);
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [testingSheet, setTestingSheet] = useState(false);

  // Selected sheet for mapping inspection
  const [selectedSheetIndex, setSelectedSheetIndex] = useState<number>(0);
  const currentSheet = activeSheetList[selectedSheetIndex] || activeSheetList[0] || null;

  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [mappingState, setMappingState] = useState<ColumnMapping>(
    currentSheet?.columnMapping || {
      rollNoCol: '',
      nameCol: '',
      certTypeCol: '',
      yearCol: '',
      sectionCol: '',
    }
  );

  // Update mapping state when selected sheet changes
  React.useEffect(() => {
    if (currentSheet?.columnMapping) {
      setMappingState(currentSheet.columnMapping);
    }
  }, [selectedSheetIndex, currentSheet]);

  // New admin email input
  const [newAdminEmail, setNewAdminEmail] = useState('');

  // Configurable Regex & Advanced Checking State
  const [customRegexInput, setCustomRegexInput] = useState(
    settings.customFilenameRegex || '([0-9]{2}[A-Za-z][0-9]{2}[A-Za-z][0-9]{2}[A-Za-z0-9]{2})'
  );
  const [regexSaveStatus, setRegexSaveStatus] = useState<string | null>(null);
  const [testFilename, setTestFilename] = useState('25A31A05GB_SAPPA_JAYARAM_QUANTATHON_AWARD.pdf');

  // Regex presets
  const REGEX_PRESETS = [
    {
      name: 'Standard 10-Char Roll',
      desc: 'Matches any standard university roll number (e.g. 25A31A05GB)',
      pattern: '([0-9]{2}[A-Za-z][0-9]{2}[A-Za-z][0-9]{2}[A-Za-z0-9]{2})',
    },
    {
      name: 'Full Named Groups (Roll + Name + Title)',
      desc: 'Extracts Roll, Student Name, and Event Title into separate metadata',
      pattern:
        '(?<rollNo>[0-9]{2}[A-Za-z][0-9]{2}[A-Za-z][0-9]{2}[A-Za-z0-9]{2})[_-]?(?<studentName>[A-Za-z\\s]+)?[_-]?(?<certTitle>[A-Za-z0-9\\s]+)?',
    },
    {
      name: 'Separated Delimiters (Hyphen/Underscore)',
      desc: 'Matches 25_A31A_05_GB, 25-A31A-05-GB, or spaced formats',
      pattern:
        '([0-9]{2}[-_\\s]?[A-Za-z][-_\\s]?[0-9]{2}[-_\\s]?[A-Za-z][-_\\s]?[0-9]{2}[-_\\s]?[A-Za-z0-9]{2})',
    },
    {
      name: 'Roll Suffix (e.g. 05GB, 05EN, 05DV)',
      desc: 'Matches short suffix tokens for the class section',
      pattern: '(?:^|[\\s_\\-\\(])(05[A-Za-z0-9]{2})(?:[\\s_\\-\\.\\)]|$)',
    },
  ];

  // Live test parsing result
  const liveTestResult = React.useMemo(() => {
    if (!testFilename.trim() || !customRegexInput.trim()) return null;
    try {
      const parsed = parseFilenameWithCustomRegex(testFilename.trim(), customRegexInput.trim());
      const certType = detectCertificateType(testFilename.trim(), settings.customCertTypePatterns);
      let matchedStudent = null;
      if (parsed?.rollNo) {
        const norm = normalizeRollNumber(parsed.rollNo);
        matchedStudent = ROSTER_MAP.get(norm);
      }
      return {
        parsed,
        certType: certType.type,
        matchedStudent,
        isValidRegex: true,
      };
    } catch (e: any) {
      return {
        parsed: null,
        certType: 'Invalid Regex',
        matchedStudent: null,
        isValidRegex: false,
        error: e.message,
      };
    }
  }, [testFilename, customRegexInput, settings.customCertTypePatterns]);

  const handleSaveRegex = () => {
    try {
      new RegExp(customRegexInput.trim(), 'i');
      onUpdateSettings({ customFilenameRegex: customRegexInput.trim() });
      addAuditLog(
        'Custom Regex Updated',
        userEmail,
        `Updated filename regex pattern to: ${customRegexInput.trim()}`,
        'SETTINGS'
      );
      setRegexSaveStatus('Custom Regex pattern saved successfully.');
      setTimeout(() => setRegexSaveStatus(null), 3000);
    } catch (err: any) {
      setRegexSaveStatus(`Invalid regular expression syntax: ${err.message}`);
    }
  };

  const handleApplyPreset = (pattern: string) => {
    setCustomRegexInput(pattern);
    try {
      new RegExp(pattern, 'i');
      onUpdateSettings({ customFilenameRegex: pattern });
      addAuditLog('Applied Regex Preset', userEmail, `Applied pattern: ${pattern}`, 'SETTINGS');
      setRegexSaveStatus('Applied and saved preset pattern.');
      setTimeout(() => setRegexSaveStatus(null), 3000);
    } catch {}
  };

  // 1. Add Drive Folder to Active List
  const handleConnectFolder = async (folderIdOrUrl?: string) => {
    const target = folderIdOrUrl || folderInput;
    if (!target) return;
    setFolderError(null);

    const folderId = extractDriveFolderId(target);
    if (!folderId) {
      setFolderError('Could not parse a valid Google Drive folder ID from the input.');
      return;
    }

    if (!accessToken) {
      setFolderError('Google account is not connected. Please connect Google first.');
      return;
    }

    // Check if folder is already connected
    if (activeDriveList.some((f) => f.folderId === folderId)) {
      onToast?.('This Google Drive folder is already connected in the scan list.', 'info');
      setFolderInput('');
      setIsBrowsingFolders(false);
      return;
    }

    try {
      setTestingDrive(true);
      const info = await getDriveFolderMetadata(folderId, accessToken);
      const newFolder: GoogleDriveFolderConfig = {
        folderId: info.id,
        folderName: info.name,
        lastSynced: new Date().toISOString(),
      };

      const updated = [...activeDriveList, newFolder];
      if (onUpdateDriveConfigs) {
        onUpdateDriveConfigs(updated);
      }
      onUpdateDriveConfig(updated[0] || null);

      addAuditLog('Drive folder connected', userEmail, `Connected folder "${info.name}" (${info.id})`, 'DRIVE');
      onToast?.(`🎉 Connected Drive Folder: "${info.name}"!`, 'success');
      setFolderInput('');
      setIsBrowsingFolders(false);
    } catch (e: any) {
      setFolderError(e.message || 'Failed to connect to Drive folder.');
    } finally {
      setTestingDrive(false);
    }
  };

  const handleRemoveFolder = (folderId: string) => {
    const updated = activeDriveList.filter((f) => f.folderId !== folderId);
    if (onUpdateDriveConfigs) {
      onUpdateDriveConfigs(updated);
    }
    onUpdateDriveConfig(updated[0] || null);
    addAuditLog('Drive folder removed', userEmail, `Removed folder ID: ${folderId}`, 'DRIVE');
    onToast?.('Removed Drive folder from scan list.', 'info');
  };

  const handleBrowseFolders = async () => {
    if (!accessToken) {
      setFolderError('Please connect your Google account first to browse folders.');
      return;
    }
    try {
      setIsLoadingFolders(true);
      setIsBrowsingFolders(true);
      setFolderError(null);
      const folders = await listDriveFolders(accessToken, 25);
      setAvailableFolders(folders);
    } catch (e: any) {
      setFolderError(e.message || 'Failed to list folders from Google Drive.');
    } finally {
      setIsLoadingFolders(false);
    }
  };

  // 2. Add Google Sheet to Active List
  const handleConnectSheet = async (sheetIdOrUrl?: string) => {
    const target = sheetIdOrUrl || sheetInput;
    if (!target) return;
    setSheetError(null);

    const spreadsheetId = extractSpreadsheetId(target);
    if (!spreadsheetId) {
      setSheetError('Could not parse a valid Google Spreadsheet ID from the input.');
      return;
    }

    if (!accessToken) {
      setSheetError('Google account is not connected. Please connect Google first.');
      return;
    }

    try {
      setTestingSheet(true);
      const meta = await getSpreadsheetMetadata(spreadsheetId, accessToken);
      const defaultSheetName = meta.sheets[0]?.title || 'Sheet1';

      // Read headers
      const valuesRes = await readSpreadsheetValues(spreadsheetId, defaultSheetName, accessToken);
      setSheetHeaders(valuesRes.headers);
      setMappingState(valuesRes.detectedMapping);

      const newConfig: GoogleSheetConfig = {
        spreadsheetId: meta.id,
        spreadsheetName: meta.title,
        sheetName: defaultSheetName,
        availableSheets: meta.sheets.map((s) => s.title),
        columnMapping: valuesRes.detectedMapping,
        lastSynced: new Date().toISOString(),
      };

      // Check if already in list with same tab
      const existingIdx = activeSheetList.findIndex((s) => s.spreadsheetId === meta.id);
      let updated: GoogleSheetConfig[];
      if (existingIdx !== -1) {
        updated = [...activeSheetList];
        updated[existingIdx] = newConfig;
      } else {
        updated = [...activeSheetList, newConfig];
      }

      if (onUpdateSheetConfigs) {
        onUpdateSheetConfigs(updated);
      }
      onUpdateSheetConfig(updated[0] || null);
      setSelectedSheetIndex(updated.length - 1);

      addAuditLog('Google Sheet connected', userEmail, `Connected sheet "${meta.title}" (${meta.id})`, 'SHEETS');
      onToast?.(`🎉 Connected Google Sheet: "${meta.title}" (${defaultSheetName})!`, 'success');
      setSheetInput('');
      setIsBrowsingSheets(false);
    } catch (e: any) {
      setSheetError(e.message || 'Failed to connect to Google Sheet.');
    } finally {
      setTestingSheet(false);
    }
  };

  const handleRemoveSheet = (spreadsheetId: string, sheetName: string) => {
    const updated = activeSheetList.filter(
      (s) => !(s.spreadsheetId === spreadsheetId && s.sheetName === sheetName)
    );
    if (onUpdateSheetConfigs) {
      onUpdateSheetConfigs(updated);
    }
    onUpdateSheetConfig(updated[0] || null);
    setSelectedSheetIndex(0);
    addAuditLog('Google Sheet removed', userEmail, `Removed sheet: ${spreadsheetId}`, 'SHEETS');
    onToast?.('Removed spreadsheet from scan list.', 'info');
  };

  const handleBrowseSheets = async () => {
    if (!accessToken) {
      setSheetError('Please connect your Google account first to browse spreadsheets.');
      return;
    }
    try {
      setIsLoadingSheets(true);
      setIsBrowsingSheets(true);
      setSheetError(null);
      const sheets = await listGoogleSpreadsheets(accessToken, 25);
      setAvailableSheets(sheets);
    } catch (e: any) {
      setSheetError(e.message || 'Failed to list spreadsheets from Google Drive.');
    } finally {
      setIsLoadingSheets(false);
    }
  };

  const handleChangeWorksheet = async (sheetIdx: number, sheetName: string) => {
    const targetSheet = activeSheetList[sheetIdx];
    if (!targetSheet || !accessToken) return;

    try {
      const valuesRes = await readSpreadsheetValues(targetSheet.spreadsheetId, sheetName, accessToken);
      setSheetHeaders(valuesRes.headers);
      setMappingState(valuesRes.detectedMapping);

      const updated = [...activeSheetList];
      updated[sheetIdx] = {
        ...targetSheet,
        sheetName,
        columnMapping: valuesRes.detectedMapping,
      };

      if (onUpdateSheetConfigs) {
        onUpdateSheetConfigs(updated);
      }
      onUpdateSheetConfig(updated[0] || null);
      addAuditLog('Worksheet changed', userEmail, `Changed worksheet to "${sheetName}" in "${targetSheet.spreadsheetName}"`, 'SHEETS');
      onToast?.(`Switched to worksheet "${sheetName}"`, 'success');
    } catch (e: any) {
      setSheetError(e.message || 'Failed to read worksheet.');
    }
  };

  const handleSaveMapping = (sheetIdx: number) => {
    const targetSheet = activeSheetList[sheetIdx];
    if (!targetSheet) return;

    const updated = [...activeSheetList];
    updated[sheetIdx] = {
      ...targetSheet,
      columnMapping: mappingState,
    };

    if (onUpdateSheetConfigs) {
      onUpdateSheetConfigs(updated);
    }
    onUpdateSheetConfig(updated[0] || null);
    addAuditLog('Column mapping saved', userEmail, `Updated column mapping for "${targetSheet.spreadsheetName}"`, 'SHEETS');
    onToast?.('Spreadsheet column mapping saved successfully!', 'success');
  };

  // 3. Admin Emails Management
  const handleAddAdminEmail = () => {
    if (!newAdminEmail.trim() || !newAdminEmail.includes('@')) return;
    const normalized = newAdminEmail.trim().toLowerCase();
    if (settings.adminEmails.includes(normalized)) return;

    const updated = [...settings.adminEmails, normalized];
    onUpdateSettings({ adminEmails: updated });
    addAuditLog('Admin added', userEmail, `Added admin: ${normalized}`, 'SETTINGS');
    setNewAdminEmail('');
  };

  const handleRemoveAdminEmail = (emailToRemove: string) => {
    if (emailToRemove === 'jayaramsappa09@gmail.com') return; // protect owner
    const updated = settings.adminEmails.filter((e) => e !== emailToRemove);
    onUpdateSettings({ adminEmails: updated });
    addAuditLog('Admin removed', userEmail, `Removed admin: ${emailToRemove}`, 'SETTINGS');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Account & Connection Status Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Link className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Google Workspace Authentication
                </h3>
                {accessToken ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Connected</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800">
                    Not Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                OAuth 2.0 authorization grants read-only access to scan Google Drive folders & Sheets.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {accessToken ? (
              <>
                <button
                  type="button"
                  onClick={onTriggerSync}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync All Sources Now</span>
                </button>
                <button
                  type="button"
                  onClick={onDisconnectGoogle}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onConnectGoogle}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                <span>Connect Google Account</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Multiple Google Drive Folders Connection */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Google Drive Folders</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                  {activeDriveList.length} Folder{activeDriveList.length === 1 ? '' : 's'} Active
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Scan multiple Drive folders simultaneously for student certificates (PDFs, JPGs, PNGs).
              </p>
            </div>
          </div>
        </div>

        {/* List of Connected Drive Folders */}
        {activeDriveList.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Active Folders Scanned in Parallel:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeDriveList.map((f, idx) => (
                <div
                  key={f.folderId}
                  className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3.5 space-y-2 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="truncate">{f.folderName}</span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                        ID: {f.folderId}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={`https://drive.google.com/drive/folders/${f.folderId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                        title="Open in Google Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveFolder(f.folderId)}
                        className="p-1.5 bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-400 rounded-lg transition cursor-pointer"
                        title="Remove folder"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                    <span>
                      Discovered: <strong className="text-amber-300">{f.fileCount ?? '—'} files</strong>
                    </span>
                    <span>
                      Synced: {f.lastSynced ? new Date(f.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Another Drive Folder Input Bar */}
        <div className="pt-2 space-y-3">
          <label className="text-xs font-semibold text-slate-300 block">
            ➕ Add Google Drive Folder to Scan List:
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={folderInput}
              onChange={(e) => setFolderInput(e.target.value)}
              placeholder="Paste Drive folder link (e.g. https://drive.google.com/drive/folders/...) or ID"
              className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => handleConnectFolder()}
              disabled={testingDrive || !folderInput.trim()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              {testingDrive ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Add Folder</span>
            </button>
            <button
              type="button"
              onClick={handleBrowseFolders}
              disabled={isLoadingFolders || !accessToken}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium rounded-xl transition shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <FolderOpen className="w-4 h-4 text-amber-400" />
              <span>Browse Drive</span>
            </button>
          </div>

          {folderError && (
            <div className="p-3 rounded-xl bg-red-950/70 border border-red-800 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{folderError}</span>
            </div>
          )}

          {/* Folder Picker Drawer */}
          {isBrowsingFolders && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 pb-2 border-b border-slate-800">
                <span>Available Folders in Your Google Drive:</span>
                <button
                  type="button"
                  onClick={() => setIsBrowsingFolders(false)}
                  className="text-slate-500 hover:text-white cursor-pointer"
                >
                  Close
                </button>
              </div>
              {isLoadingFolders ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-amber-400" />
                  Loading folders...
                </div>
              ) : availableFolders.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  No folders found in your Google Drive root. Try pasting a folder link above.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {availableFolders.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleConnectFolder(f.id)}
                      className="w-full p-2.5 rounded-xl hover:bg-slate-900 transition flex items-center justify-between text-left text-xs cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 text-slate-200 font-medium group-hover:text-white">
                        <Folder className="w-4 h-4 text-amber-400" />
                        <span>{f.name}</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        {f.id.slice(0, 8)}...
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Multiple Google Sheets Connection & Mapping */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Google Sheets &amp; Responses</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  {activeSheetList.length} Sheet{activeSheetList.length === 1 ? '' : 's'} Active
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Connect and audit multiple response spreadsheets (Section A, Section B, Late Submissions).
              </p>
            </div>
          </div>
        </div>

        {/* List of Connected Google Sheets */}
        {activeSheetList.length > 0 && (
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Active Spreadsheets Audited in Parallel:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeSheetList.map((s, idx) => (
                <div
                  key={`${s.spreadsheetId}_${s.sheetName}`}
                  className={`border rounded-2xl p-4 space-y-3 transition ${
                    selectedSheetIndex === idx
                      ? 'bg-slate-950 border-emerald-500/60 shadow-lg shadow-emerald-950/40'
                      : 'bg-slate-950/80 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="truncate">{s.spreadsheetName}</span>
                      </div>
                      <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                        ID: {s.spreadsheetId}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${s.spreadsheetId}/edit`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                        title="Open in Google Sheets"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveSheet(s.spreadsheetId, s.sheetName)}
                        className="p-1.5 bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-400 rounded-lg transition cursor-pointer"
                        title="Remove sheet"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Worksheet selector */}
                  {s.availableSheets && s.availableSheets.length > 0 && (
                    <div className="flex items-center justify-between gap-2 text-xs pt-2 border-t border-slate-900">
                      <span className="text-slate-400 font-medium">Worksheet Tab:</span>
                      <select
                        value={s.sheetName}
                        onChange={(e) => handleChangeWorksheet(idx, e.target.value)}
                        className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-emerald-300 font-semibold focus:outline-none"
                      >
                        {s.availableSheets.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                    <button
                      type="button"
                      onClick={() => setSelectedSheetIndex(idx)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        selectedSheetIndex === idx
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {selectedSheetIndex === idx ? 'Editing Mapping' : 'Configure Columns'}
                    </button>

                    {onOpenSheetProof && (
                      <button
                        type="button"
                        onClick={onOpenSheetProof}
                        className="text-xs text-emerald-400 hover:underline font-semibold cursor-pointer"
                      >
                        View Live Proof
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Another Google Sheet Input Bar */}
        <div className="pt-2 space-y-3">
          <label className="text-xs font-semibold text-slate-300 block">
            ➕ Add Google Spreadsheet to Scan List:
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={sheetInput}
              onChange={(e) => setSheetInput(e.target.value)}
              placeholder="Paste Google Sheet URL (e.g. https://docs.google.com/spreadsheets/d/...) or ID"
              className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => handleConnectSheet()}
              disabled={testingSheet || !sheetInput.trim()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              {testingSheet ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Add Sheet</span>
            </button>
            <button
              type="button"
              onClick={handleBrowseSheets}
              disabled={isLoadingSheets || !accessToken}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium rounded-xl transition shrink-0 cursor-pointer flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Browse Drive</span>
            </button>
          </div>

          {sheetError && (
            <div className="p-3 rounded-xl bg-red-950/70 border border-red-800 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{sheetError}</span>
            </div>
          )}

          {/* Spreadsheet Picker Drawer */}
          {isBrowsingSheets && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 pb-2 border-b border-slate-800">
                <span>Available Spreadsheets in Your Drive:</span>
                <button
                  type="button"
                  onClick={() => setIsBrowsingSheets(false)}
                  className="text-slate-500 hover:text-white cursor-pointer"
                >
                  Close
                </button>
              </div>
              {isLoadingSheets ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-emerald-400" />
                  Loading spreadsheets...
                </div>
              ) : availableSheets.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  No spreadsheets found in your Google Drive. Try pasting the sheet link above.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {availableSheets.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleConnectSheet(s.id)}
                      className="w-full p-2.5 rounded-xl hover:bg-slate-900 transition flex items-center justify-between text-left text-xs cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 text-slate-200 font-medium group-hover:text-white">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        <span>{s.name}</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        {s.id.slice(0, 8)}...
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Column Mapping Section for Currently Selected Sheet */}
        {currentSheet && (
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3 mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h5 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  Column Mapping: {currentSheet.spreadsheetName} ({currentSheet.sheetName})
                </h5>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Map the columns in this worksheet to student roll number, name, and certificate types.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSaveMapping(selectedSheetIndex)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md shrink-0"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Mapping for this Sheet</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {/* Roll Number Column */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Roll Number Column <span className="text-red-400">*</span>
                </label>
                <select
                  value={mappingState.rollNoCol}
                  onChange={(e) =>
                    setMappingState((prev) => ({ ...prev, rollNoCol: e.target.value }))
                  }
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200"
                >
                  <option value="">Select column...</option>
                  {sheetHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Name Column */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Student Name Column
                </label>
                <select
                  value={mappingState.nameCol}
                  onChange={(e) =>
                    setMappingState((prev) => ({ ...prev, nameCol: e.target.value }))
                  }
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200"
                >
                  <option value="">Select column...</option>
                  {sheetHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Certificate Type Column */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Certificate Column
                </label>
                <select
                  value={mappingState.certTypeCol}
                  onChange={(e) =>
                    setMappingState((prev) => ({ ...prev, certTypeCol: e.target.value }))
                  }
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200"
                >
                  <option value="">Select column...</option>
                  {sheetHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Configurable Regex Pattern & Advanced Analysis Sandbox */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Configurable Filename Regex &amp; Parsing</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800">
                  Custom Pattern Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Define custom regular expressions to extract student roll numbers, names, and certificate titles from Drive files.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveRegex}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shrink-0 shadow-lg shadow-purple-600/20 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Save Regex Pattern</span>
          </button>
        </div>

        {regexSaveStatus && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              regexSaveStatus.includes('Invalid')
                ? 'bg-red-950/70 border border-red-800 text-red-300'
                : 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
            }`}
          >
            {regexSaveStatus.includes('Invalid') ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{regexSaveStatus}</span>
          </div>
        )}

        {/* Regex Input & Presets */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              Active Regular Expression Pattern:
            </label>
            <div className="relative font-mono text-xs">
              <input
                type="text"
                value={customRegexInput}
                onChange={(e) => setCustomRegexInput(e.target.value)}
                placeholder="e.g. (?<rollNo>[0-9]{2}[A-Za-z][0-9]{2}[A-Za-z][0-9]{2}[A-Za-z0-9]{2})"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm text-purple-300 placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-2 pt-1 border-t border-slate-800/80">
            <span className="text-[11px] font-semibold text-slate-400 block">
              Quick Regex Presets:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REGEX_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleApplyPreset(preset.pattern)}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                    customRegexInput === preset.pattern
                      ? 'bg-purple-950/40 border-purple-600 text-purple-200'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{preset.name}</span>
                    {customRegexInput === preset.pattern && (
                      <span className="text-[10px] font-bold text-purple-400">ACTIVE</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{preset.desc}</p>
                  <code className="text-[10px] font-mono text-purple-300/80 mt-1 truncate block">
                    {preset.pattern}
                  </code>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Live Regex Sandbox / Tester */}
          <div className="pt-2 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-purple-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Live Pattern Sandbox &amp; Verification Tester
              </h4>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-400 block">
                Type a sample filename from your Google Drive to preview real-time parsing:
              </label>
              <input
                type="text"
                value={testFilename}
                onChange={(e) => setTestFilename(e.target.value)}
                placeholder="Type sample filename..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 font-mono"
              />
            </div>

            {liveTestResult && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="text-[11px] font-semibold text-slate-400">
                  Real-Time Extraction Output:
                </div>
                {liveTestResult.isValidRegex ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    {/* Extracted Roll No */}
                    <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                        Extracted Roll No
                      </span>
                      <span className="font-mono font-bold text-blue-400">
                        {liveTestResult.parsed?.rollNo || 'None detected'}
                      </span>
                      {liveTestResult.matchedStudent ? (
                        <span className="text-[10px] text-emerald-400 block mt-0.5 font-medium">
                          ✓ Verified in Roster
                        </span>
                      ) : liveTestResult.parsed?.rollNo ? (
                        <span className="text-[10px] text-amber-400 block mt-0.5">
                          ⚠ Outside Roster
                        </span>
                      ) : null}
                    </div>

                    {/* Extracted Student Name */}
                    <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                        Student Name
                      </span>
                      <span className="font-medium text-slate-200 truncate block">
                        {liveTestResult.matchedStudent?.name ||
                          liveTestResult.parsed?.studentName ||
                          '—'}
                      </span>
                    </div>

                    {/* Extracted Certificate Title */}
                    <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                        Certificate Event / Title
                      </span>
                      <span className="font-medium text-slate-200 truncate block">
                        {liveTestResult.parsed?.certTitle || '—'}
                      </span>
                    </div>

                    {/* Detected Category */}
                    <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                        Detected Category
                      </span>
                      <span className="font-medium text-emerald-300 truncate block">
                        {liveTestResult.certType}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-red-400 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    <span>Regex syntax error: {liveTestResult.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Synchronization & Security Preferences */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-400" />
          Reconciliation & Security Settings
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Auto-Sync Configuration */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Automatic Synchronization Interval
            </h4>
            <p className="text-xs text-slate-400">
              Periodically check for new Drive certificates and Sheet updates while this browser window is open.
            </p>
            <div className="pt-2">
              <select
                value={settings.autoSyncIntervalMinutes}
                onChange={(e) =>
                  onUpdateSettings({ autoSyncIntervalMinutes: Number(e.target.value) })
                }
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200"
              >
                <option value={0}>Manual Only (No Auto-Sync)</option>
                <option value={5}>Every 5 minutes</option>
                <option value={15}>Every 15 minutes</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every 1 hour</option>
              </select>
            </div>
          </div>

          {/* Spreadsheet Write Mode Toggle */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Spreadsheet Write Sync
              </h4>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  settings.enableSpreadsheetWrite
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-slate-900 text-slate-500 border border-slate-800'
                }`}
              >
                {settings.enableSpreadsheetWrite ? 'ENABLED' : 'OFF (Read-Only)'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              By default, synchronization is 100% READ-ONLY. When enabled, you can explicitly authorize writing missing rows.
            </p>
            <div className="pt-2 flex items-center justify-between">
              <label className="text-xs text-slate-300 font-medium">
                Allow spreadsheet modifications
              </label>
              <input
                type="checkbox"
                checked={settings.enableSpreadsheetWrite}
                onChange={(e) => onUpdateSettings({ enableSpreadsheetWrite: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Administrator Allowlist */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                Administrator Allowlist
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Only authenticated Google accounts on this list are granted access.
              </p>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            {settings.adminEmails.map((email) => (
              <div
                key={email}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono"
              >
                <span className="text-slate-200">{email}</span>
                {settings.adminEmails.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveAdminEmail(email)}
                    className="p-1 text-slate-500 hover:text-red-400 transition cursor-pointer"
                    title="Remove admin"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              placeholder="Add admin Google email (e.g. coadmin@gmail.com)"
              className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500"
            />
            <button
              type="button"
              onClick={handleAddAdminEmail}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
