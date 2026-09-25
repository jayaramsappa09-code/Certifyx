import React, { useState } from 'react';
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
} from 'lucide-react';
import {
  GoogleDriveFolderConfig,
  GoogleSheetConfig,
  ColumnMapping,
  AppSettings,
} from '../types';
import { extractDriveFolderId, listDriveFolders, getDriveFolderMetadata, DriveFolderInfo } from '../services/googleDriveService';
import {
  extractSpreadsheetId,
  listGoogleSpreadsheets,
  getSpreadsheetMetadata,
  readSpreadsheetValues,
  SpreadsheetListItem,
} from '../services/googleSheetsService';
import { addAuditLog } from '../services/storageService';

interface GoogleIntegrationTabProps {
  accessToken: string | null;
  userEmail: string;
  driveConfig: GoogleDriveFolderConfig | null;
  sheetConfig: GoogleSheetConfig | null;
  settings: AppSettings;
  onUpdateDriveConfig: (config: GoogleDriveFolderConfig | null) => void;
  onUpdateSheetConfig: (config: GoogleSheetConfig | null) => void;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onConnectGoogle: () => void;
  onDisconnectGoogle: () => void;
  onTriggerSync: () => void;
}

export const GoogleIntegrationTab: React.FC<GoogleIntegrationTabProps> = ({
  accessToken,
  userEmail,
  driveConfig,
  sheetConfig,
  settings,
  onUpdateDriveConfig,
  onUpdateSheetConfig,
  onUpdateSettings,
  onConnectGoogle,
  onDisconnectGoogle,
  onTriggerSync,
}) => {
  // Folder state
  const [folderInput, setFolderInput] = useState('');
  const [isBrowsingFolders, setIsBrowsingFolders] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<DriveFolderInfo[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);

  // Sheet state
  const [sheetInput, setSheetInput] = useState('');
  const [isBrowsingSheets, setIsBrowsingSheets] = useState(false);
  const [availableSheets, setAvailableSheets] = useState<SpreadsheetListItem[]>([]);
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  // Column mapping state
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [mappingState, setMappingState] = useState<ColumnMapping>(
    sheetConfig?.columnMapping || {
      rollNoCol: '',
      nameCol: '',
      certTypeCol: '',
      yearCol: '',
      sectionCol: '',
    }
  );

  // Testing connection states
  const [testingDrive, setTestingDrive] = useState(false);
  const [driveTestResult, setDriveTestResult] = useState<string | null>(null);
  const [testingSheet, setTestingSheet] = useState(false);
  const [sheetTestResult, setSheetTestResult] = useState<string | null>(null);

  // New admin email input
  const [newAdminEmail, setNewAdminEmail] = useState('');

  // 1. Handle Drive Folder Selection / URL paste
  const handleConnectFolder = async (folderIdOrUrl?: string) => {
    const target = folderIdOrUrl || folderInput;
    if (!target) return;
    setFolderError(null);
    setDriveTestResult(null);

    const folderId = extractDriveFolderId(target);
    if (!folderId) {
      setFolderError('Could not parse a valid Google Drive folder ID from the input.');
      return;
    }

    if (!accessToken) {
      setFolderError('Google account is not connected. Please connect Google first.');
      return;
    }

    try {
      setTestingDrive(true);
      const info = await getDriveFolderMetadata(folderId, accessToken);
      const newConfig: GoogleDriveFolderConfig = {
        folderId: info.id,
        folderName: info.name,
        lastSynced: new Date().toISOString(),
      };
      onUpdateDriveConfig(newConfig);
      addAuditLog('Drive folder connected', userEmail, `Connected folder "${info.name}" (${info.id})`, 'DRIVE');
      setDriveTestResult(`Connected successfully to "${info.name}"`);
      setFolderInput('');
      setIsBrowsingFolders(false);
    } catch (e: any) {
      setFolderError(e.message || 'Failed to connect to Drive folder.');
    } finally {
      setTestingDrive(false);
    }
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

  // 2. Handle Google Sheet Selection / URL paste
  const handleConnectSheet = async (sheetIdOrUrl?: string) => {
    const target = sheetIdOrUrl || sheetInput;
    if (!target) return;
    setSheetError(null);
    setSheetTestResult(null);

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
      onUpdateSheetConfig(newConfig);
      addAuditLog('Google Sheet connected', userEmail, `Connected sheet "${meta.title}" (${meta.id})`, 'SHEETS');
      setSheetTestResult(`Connected to "${meta.title}" with ${meta.sheets.length} worksheet(s).`);
      setSheetInput('');
      setIsBrowsingSheets(false);
    } catch (e: any) {
      setSheetError(e.message || 'Failed to connect to Google Sheet.');
    } finally {
      setTestingSheet(false);
    }
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

  const handleChangeWorksheet = async (sheetName: string) => {
    if (!sheetConfig || !accessToken) return;
    try {
      const valuesRes = await readSpreadsheetValues(sheetConfig.spreadsheetId, sheetName, accessToken);
      setSheetHeaders(valuesRes.headers);
      setMappingState(valuesRes.detectedMapping);

      const updated = {
        ...sheetConfig,
        sheetName,
        columnMapping: valuesRes.detectedMapping,
      };
      onUpdateSheetConfig(updated);
      addAuditLog('Worksheet changed', userEmail, `Changed worksheet to "${sheetName}"`, 'SHEETS');
    } catch (e: any) {
      setSheetError(e.message || 'Failed to read worksheet.');
    }
  };

  const handleSaveMapping = () => {
    if (!sheetConfig) return;
    const updated = {
      ...sheetConfig,
      columnMapping: mappingState,
    };
    onUpdateSheetConfig(updated);
    addAuditLog('Column mapping saved', userEmail, `Updated spreadsheet column mapping`, 'SHEETS');
    setSheetTestResult('Column mapping saved successfully.');
  };

  // 3. Admin Emails Management
  const handleAddAdminEmail = () => {
    if (!newAdminEmail.trim() || !newAdminEmail.includes('@')) return;
    const normalized = newAdminEmail.trim().toLowerCase();
    if (settings.adminEmails.includes(normalized)) return;

    const updated = [...settings.adminEmails, normalized];
    onUpdateSettings({ adminEmails: updated });
    addAuditLog('Admin added', userEmail, `Added admin email ${normalized}`, 'SETTINGS');
    setNewAdminEmail('');
  };

  const handleRemoveAdminEmail = (emailToRemove: string) => {
    if (settings.adminEmails.length <= 1) return; // Prevent removing all admins
    const updated = settings.adminEmails.filter((e) => e !== emailToRemove);
    onUpdateSettings({ adminEmails: updated });
    addAuditLog('Admin removed', userEmail, `Removed admin email ${emailToRemove}`, 'SETTINGS');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Google Account Connection Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Google Workspace Authentication
                </h2>
                {accessToken ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Not Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Official Google OAuth 2.0 with minimal read-only scopes (Drive + Sheets)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {accessToken ? (
              <button
                onClick={onDisconnectGoogle}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition cursor-pointer"
              >
                Disconnect Account
              </button>
            ) : (
              <button
                onClick={onConnectGoogle}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition shadow-lg shadow-blue-600/30 cursor-pointer"
              >
                <span>Connect Google Account</span>
              </button>
            )}
          </div>
        </div>

        {accessToken && (
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Authorized Administrator:</span>
              <span className="font-mono text-emerald-400 font-semibold">{userEmail}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">OAuth Scopes Granted:</span>
              <span className="font-mono text-slate-300 text-[11px]">
                drive.readonly, spreadsheets.readonly
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Google Drive Folder Connection */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Google Drive Folder</h3>
              <p className="text-xs text-slate-400">
                Primary source for student certificate files (PDFs, JPGs, PNGs)
              </p>
            </div>
          </div>

          {driveConfig && (
            <button
              onClick={() => onUpdateDriveConfig(null)}
              className="text-xs text-slate-400 hover:text-red-400 transition"
            >
              Change Folder
            </button>
          )}
        </div>

        {driveConfig ? (
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs text-slate-500 font-semibold uppercase">
                  Connected Folder
                </span>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Folder className="w-4 h-4 text-amber-400" />
                  {driveConfig.folderName}
                </h4>
                <div className="text-xs font-mono text-slate-400 mt-0.5">
                  ID: {driveConfig.folderId}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`https://drive.google.com/drive/folders/${driveConfig.folderId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-xl transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Folder</span>
                </a>
              </div>
            </div>

            {driveTestResult && (
              <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{driveTestResult}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={folderInput}
                onChange={(e) => setFolderInput(e.target.value)}
                placeholder="Paste Drive folder link (e.g. https://drive.google.com/drive/folders/...) or raw folder ID"
                className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => handleConnectFolder()}
                disabled={testingDrive || !folderInput.trim()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition shrink-0 cursor-pointer"
              >
                {testingDrive ? 'Checking...' : 'Select Folder'}
              </button>
              <button
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

            {/* Folder Picker List Modal/Drawer */}
            {isBrowsingFolders && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 pb-2 border-b border-slate-800">
                  <span>Available Folders in Your Google Drive:</span>
                  <button
                    onClick={() => setIsBrowsingFolders(false)}
                    className="text-slate-500 hover:text-white"
                  >
                    Close
                  </button>
                </div>
                {isLoadingFolders ? (
                  <div className="py-6 text-center text-xs text-slate-500">
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
        )}
      </div>

      {/* 3. Google Sheet Connection & Column Mapping */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Google Sheet Connection</h3>
              <p className="text-xs text-slate-400">
                Primary spreadsheet source for tracking rows and student submissions
              </p>
            </div>
          </div>

          {sheetConfig && (
            <button
              onClick={() => onUpdateSheetConfig(null)}
              className="text-xs text-slate-400 hover:text-red-400 transition"
            >
              Change Spreadsheet
            </button>
          )}
        </div>

        {sheetConfig ? (
          <div className="space-y-4">
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs text-slate-500 font-semibold uppercase">
                    Connected Spreadsheet
                  </span>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    {sheetConfig.spreadsheetName}
                  </h4>
                  <div className="text-xs font-mono text-slate-400 mt-0.5">
                    ID: {sheetConfig.spreadsheetId}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${sheetConfig.spreadsheetId}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-xl transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Sheet</span>
                  </a>
                </div>
              </div>

              {/* Worksheet Tab Selector */}
              {sheetConfig.availableSheets && sheetConfig.availableSheets.length > 0 && (
                <div className="pt-2 border-t border-slate-900 flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium">Worksheet Tab:</span>
                  <select
                    value={sheetConfig.sheetName}
                    onChange={(e) => handleChangeWorksheet(e.target.value)}
                    className="px-3 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-emerald-300 font-semibold focus:outline-none"
                  >
                    {sheetConfig.availableSheets.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Column Mapping Section (Section 11) */}
            <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    Spreadsheet Column Mapping
                  </h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Map the columns in your worksheet to the corresponding student fields.
                  </p>
                </div>
                <button
                  onClick={handleSaveMapping}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Mapping</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
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
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={sheetInput}
                onChange={(e) => setSheetInput(e.target.value)}
                placeholder="Paste Google Sheet URL (e.g. https://docs.google.com/spreadsheets/d/...) or raw spreadsheet ID"
                className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={() => handleConnectSheet()}
                disabled={testingSheet || !sheetInput.trim()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition shrink-0 cursor-pointer"
              >
                {testingSheet ? 'Connecting...' : 'Select Sheet'}
              </button>
              <button
                onClick={handleBrowseSheets}
                disabled={isLoadingSheets || !accessToken}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium rounded-xl transition shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Browse Sheets</span>
              </button>
            </div>

            {sheetError && (
              <div className="p-3 rounded-xl bg-red-950/70 border border-red-800 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{sheetError}</span>
              </div>
            )}

            {isBrowsingSheets && (
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 pb-2 border-b border-slate-800">
                  <span>Available Spreadsheets in Your Drive:</span>
                  <button
                    onClick={() => setIsBrowsingSheets(false)}
                    className="text-slate-500 hover:text-white"
                  >
                    Close
                  </button>
                </div>
                {isLoadingSheets ? (
                  <div className="py-6 text-center text-xs text-slate-500">
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
        )}
      </div>

      {/* 4. Synchronization & Security Preferences */}
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
            <p className="text-[11px] text-slate-500 pt-1">
              Note: Respects Google API quotas using efficient batch queries and timestamps.
            </p>
          </div>

          {/* Spreadsheet Write Mode Toggle (Section 38) */}
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
              By default, synchronization is 100% READ-ONLY. When enabled, you can explicitly authorize writing missing rows to the spreadsheet with a confirmation preview.
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

        {/* Administrator Allowlist (Section 28) */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                Administrator Allowlist
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Only authenticated Google accounts on this list are granted access. All other accounts receive an ACCESS DENIED response.
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
                {settings.adminEmails.length > 1 && email !== 'jayaramsappa09@gmail.com' && (
                  <button
                    onClick={() => handleRemoveAdminEmail(email)}
                    className="p-1 text-slate-500 hover:text-red-400 transition"
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
