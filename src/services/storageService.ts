import {
  AuditLogEntry,
  GoogleDriveFolderConfig,
  GoogleSheetConfig,
  AppSettings,
  SyncReport,
  SheetSyncProof,
  DriveCertificateFile,
  SheetRowRecord,
} from '../types';
import { DEFAULT_ADMIN_EMAILS } from './firebaseAuth';

const STORAGE_KEYS = {
  SUBMITTED_STATUS: 'ccam_submitted_status_map',
  DRIVE_STATUS_OVERRIDES: 'ccam_drive_status_override_map',
  SHEET_STATUS_OVERRIDES: 'ccam_sheet_status_override_map',
  DRIVE_CONFIG: 'ccam_drive_folder_config',
  SHEET_CONFIG: 'ccam_google_sheet_config',
  SETTINGS: 'ccam_app_settings',
  SYNC_HISTORY: 'ccam_sync_history',
  AUDIT_LOGS: 'ccam_audit_logs',
  MANUAL_OVERRIDES: 'ccam_manual_file_overrides',
  DUPLICATE_RESOLUTIONS: 'ccam_duplicate_resolutions',
  LAST_SYNCED_DATA: 'ccam_last_synced_data',
  SHEET_PROOF: 'ccam_last_sheet_sync_proof',
};

// 1. Submitted status (Map: normalized rollNo -> boolean)
export function getSubmittedStatusMap(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SUBMITTED_STATUS);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read submitted status map:', e);
    return {};
  }
}

export function saveSubmittedStatus(rollNo: string, submitted: boolean): void {
  try {
    const map = getSubmittedStatusMap();
    map[rollNo.toUpperCase().trim()] = submitted;
    localStorage.setItem(STORAGE_KEYS.SUBMITTED_STATUS, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to save submitted status:', e);
  }
}

export function setBatchSubmittedStatus(updates: Record<string, boolean>): void {
  try {
    const map = getSubmittedStatusMap();
    for (const [r, s] of Object.entries(updates)) {
      map[r.toUpperCase().trim()] = s;
    }
    localStorage.setItem(STORAGE_KEYS.SUBMITTED_STATUS, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to save batch submitted status:', e);
  }
}

// 1b. Drive Uploaded Status Overrides (Map: normalized rollNo -> boolean)
export function getDriveStatusOverrideMap(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DRIVE_STATUS_OVERRIDES);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read drive override map:', e);
    return {};
  }
}

export function saveDriveStatusOverride(rollNo: string, overrideVal: boolean): void {
  try {
    const map = getDriveStatusOverrideMap();
    map[rollNo.toUpperCase().trim()] = overrideVal;
    localStorage.setItem(STORAGE_KEYS.DRIVE_STATUS_OVERRIDES, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to save drive override:', e);
  }
}

export function setBatchDriveStatusOverride(updates: Record<string, boolean>): void {
  try {
    const map = getDriveStatusOverrideMap();
    for (const [r, s] of Object.entries(updates)) {
      map[r.toUpperCase().trim()] = s;
    }
    localStorage.setItem(STORAGE_KEYS.DRIVE_STATUS_OVERRIDES, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to save batch drive override:', e);
  }
}

// 1c. Sheet Updated Status Overrides (Map: normalized rollNo -> boolean)
export function getSheetStatusOverrideMap(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SHEET_STATUS_OVERRIDES);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read sheet override map:', e);
    return {};
  }
}

export function saveSheetStatusOverride(rollNo: string, overrideVal: boolean): void {
  try {
    const map = getSheetStatusOverrideMap();
    map[rollNo.toUpperCase().trim()] = overrideVal;
    localStorage.setItem(STORAGE_KEYS.SHEET_STATUS_OVERRIDES, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to save sheet override:', e);
  }
}

export function setBatchSheetStatusOverride(updates: Record<string, boolean>): void {
  try {
    const map = getSheetStatusOverrideMap();
    for (const [r, s] of Object.entries(updates)) {
      map[r.toUpperCase().trim()] = s;
    }
    localStorage.setItem(STORAGE_KEYS.SHEET_STATUS_OVERRIDES, JSON.stringify(map));
  } catch (e) {
    console.error('Failed to save batch sheet override:', e);
  }
}

// 2. Drive Folder Config
export function getSavedDriveConfig(): GoogleDriveFolderConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DRIVE_CONFIG);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDriveConfig(config: GoogleDriveFolderConfig | null): void {
  try {
    if (config) {
      localStorage.setItem(STORAGE_KEYS.DRIVE_CONFIG, JSON.stringify(config));
    } else {
      localStorage.removeItem(STORAGE_KEYS.DRIVE_CONFIG);
    }
  } catch (e) {
    console.error('Failed to save drive config:', e);
  }
}

// 3. Google Sheet Config
export function getSavedSheetConfig(): GoogleSheetConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SHEET_CONFIG);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSheetConfig(config: GoogleSheetConfig | null): void {
  try {
    if (config) {
      localStorage.setItem(STORAGE_KEYS.SHEET_CONFIG, JSON.stringify(config));
    } else {
      localStorage.removeItem(STORAGE_KEYS.SHEET_CONFIG);
    }
  } catch (e) {
    console.error('Failed to save sheet config:', e);
  }
}

// 4. App Settings
export function getAppSettings(): AppSettings {
  const defaults: AppSettings = {
    autoSyncIntervalMinutes: 0,
    enableSpreadsheetWrite: false,
    adminEmails: DEFAULT_ADMIN_EMAILS,
    customFilenameRegex: '([0-9]{2}[A-Za-z][0-9]{2}[A-Za-z][0-9]{2}[A-Za-z0-9]{2})',
    enableFuzzyNameMatching: true,
    enableParentFolderInheritance: true,
    enableSheetLinkMatching: true,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

export function saveAppSettings(settings: Partial<AppSettings>): AppSettings {
  const current = getAppSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
  return updated;
}

// 5. Sync Reports & History
export function getSyncHistory(): SyncReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SYNC_HISTORY);
    if (!raw) return [];
    const list: SyncReport[] = JSON.parse(raw);
    // Guarantee uniqueness by report ID
    const seen = new Set<string>();
    const unique: SyncReport[] = [];
    for (const item of list) {
      if (item && item.id && !seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }
    return unique;
  } catch {
    return [];
  }
}

export function addSyncReport(report: SyncReport): void {
  try {
    const history = getSyncHistory();
    // Prevent duplicate entries of the same report id
    const filtered = history.filter((r) => r.id !== report.id);
    filtered.unshift(report);
    // Keep last 50 reports
    const trimmed = filtered.slice(0, 50);
    localStorage.setItem(STORAGE_KEYS.SYNC_HISTORY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to save sync report:', e);
  }
}

// 6. Audit Logs
export function getAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    if (!raw) return [];
    const list: AuditLogEntry[] = JSON.parse(raw);
    const seen = new Set<string>();
    const unique: AuditLogEntry[] = [];
    for (const item of list) {
      if (item && item.id && !seen.has(item.id)) {
        seen.add(item.id);
        unique.push(item);
      }
    }
    return unique;
  } catch {
    return [];
  }
}

export function addAuditLog(
  action: string,
  user: string,
  details: string,
  category: AuditLogEntry['category'] = 'SYNC'
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    action,
    user: user || 'admin',
    details,
    category,
  };
  try {
    const logs = getAuditLogs();
    logs.unshift(entry);
    // Keep last 200 logs
    const trimmed = logs.slice(0, 200);
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to save audit log:', e);
  }
  return entry;
}

// 7. Manual File Overrides (Assign roll number or certificate type to an unidentified file)
export interface ManualFileOverride {
  fileId: string;
  assignedRollNo?: string;
  assignedCertType?: string;
  resolvedAt: string;
}

export function getManualFileOverrides(): Record<string, ManualFileOverride> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MANUAL_OVERRIDES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveManualFileOverride(override: ManualFileOverride): void {
  try {
    const overrides = getManualFileOverrides();
    overrides[override.fileId] = override;
    localStorage.setItem(STORAGE_KEYS.MANUAL_OVERRIDES, JSON.stringify(overrides));
  } catch (e) {
    console.error('Failed to save manual file override:', e);
  }
}

// 8. Duplicate resolutions (Keep / Ignore / Review)
export function getDuplicateResolutions(): Record<string, 'KEEP' | 'IGNORE' | 'REVIEW'> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DUPLICATE_RESOLUTIONS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveDuplicateResolution(fileId: string, resolution: 'KEEP' | 'IGNORE' | 'REVIEW'): void {
  try {
    const resolutions = getDuplicateResolutions();
    resolutions[fileId] = resolution;
    localStorage.setItem(STORAGE_KEYS.DUPLICATE_RESOLUTIONS, JSON.stringify(resolutions));
  } catch (e) {
    console.error('Failed to save duplicate resolution:', e);
  }
}

// 9. Synced Data Cache (Ensures additions in sheets or drive persist across reloads)
export interface SyncedDataCache {
  driveFiles: DriveCertificateFile[];
  sheetRows: SheetRowRecord[];
  timestamp: string;
}

export function getCachedSyncedData(): SyncedDataCache | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LAST_SYNCED_DATA);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCachedSyncedData(data: SyncedDataCache): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_SYNCED_DATA, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save cached synced data:', e);
  }
}

// 10. Sheet Sync Proof Records
export function getLastSheetSyncProof(): SheetSyncProof | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SHEET_PROOF);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSheetSyncProof(proof: SheetSyncProof): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SHEET_PROOF, JSON.stringify(proof));
  } catch (e) {
    console.error('Failed to save sheet sync proof:', e);
  }
}
