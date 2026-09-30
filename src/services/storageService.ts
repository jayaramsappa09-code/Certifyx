import {
  AuditLogEntry,
  GoogleDriveFolderConfig,
  GoogleSheetConfig,
  AppSettings,
  SyncReport,
  SheetSyncProof,
  DriveCertificateFile,
  SheetRowRecord,
  PendingUpdateRecord,
  ToggleFieldType,
  Student,
} from '../types';
import { DEFAULT_ADMIN_EMAILS } from './firebaseAuth';
import { FIXED_CLASS_ROSTER } from '../data/classRoster';

const STORAGE_KEYS = {
  SUBMITTED_STATUS: 'ccam_submitted_status_map',
  DRIVE_STATUS_OVERRIDES: 'ccam_drive_status_override_map',
  SHEET_STATUS_OVERRIDES: 'ccam_sheet_status_override_map',
  DRIVE_CONFIG: 'ccam_drive_folder_config',
  DRIVE_CONFIGS_LIST: 'ccam_drive_folder_configs_list',
  SHEET_CONFIG: 'ccam_google_sheet_config',
  SHEET_CONFIGS_LIST: 'ccam_google_sheet_configs_list',
  SETTINGS: 'ccam_app_settings',
  SYNC_HISTORY: 'ccam_sync_history',
  AUDIT_LOGS: 'ccam_audit_logs',
  MANUAL_OVERRIDES: 'ccam_manual_file_overrides',
  DUPLICATE_RESOLUTIONS: 'ccam_duplicate_resolutions',
  LAST_SYNCED_DATA: 'ccam_last_synced_data',
  SHEET_PROOF: 'ccam_last_sheet_sync_proof',
  PENDING_UPDATES: 'ccam_offline_pending_updates',
  DYNAMIC_ROSTER: 'ccam_dynamic_roster',
  THEME: 'ccam_theme_preference',
  LAST_LOCAL_MODIFICATION: 'ccam_last_local_modification_time',
};

// Local Modification Tracking Helpers
export function getLastLocalModificationTime(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.LAST_LOCAL_MODIFICATION);
  } catch {
    return null;
  }
}

export function saveLastLocalModificationTime(timestamp?: string): string {
  const iso = timestamp || new Date().toISOString();
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_LOCAL_MODIFICATION, iso);
  } catch (e) {
    console.error('Failed to save last local modification time:', e);
  }
  return iso;
}

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
    saveLastLocalModificationTime();
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
    saveLastLocalModificationTime();
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
    saveLastLocalModificationTime();
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
    saveLastLocalModificationTime();
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
    saveLastLocalModificationTime();
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
    saveLastLocalModificationTime();
  } catch (e) {
    console.error('Failed to save batch sheet override:', e);
  }
}

// 2. Drive Folder Configs (Multi-Drive Folders Support)
export function getSavedDriveConfigs(): GoogleDriveFolderConfig[] {
  try {
    const listRaw = localStorage.getItem(STORAGE_KEYS.DRIVE_CONFIGS_LIST);
    if (listRaw) {
      const parsed = JSON.parse(listRaw);
      if (Array.isArray(parsed)) return parsed;
    }
    // Fallback to single legacy config if present
    const single = getSavedDriveConfig();
    return single ? [single] : [];
  } catch {
    return [];
  }
}

export function saveDriveConfigs(configs: GoogleDriveFolderConfig[]): void {
  try {
    const valid = (configs || []).filter((c) => c && c.folderId);
    localStorage.setItem(STORAGE_KEYS.DRIVE_CONFIGS_LIST, JSON.stringify(valid));
    // Keep primary legacy config in sync
    if (valid.length > 0) {
      localStorage.setItem(STORAGE_KEYS.DRIVE_CONFIG, JSON.stringify(valid[0]));
    } else {
      localStorage.removeItem(STORAGE_KEYS.DRIVE_CONFIG);
    }
  } catch (e) {
    console.error('Failed to save drive configs list:', e);
  }
}

export function getSavedDriveConfig(): GoogleDriveFolderConfig | null {
  try {
    const list = getSavedDriveConfigs();
    if (list.length > 0) return list[0];
    const raw = localStorage.getItem(STORAGE_KEYS.DRIVE_CONFIG);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDriveConfig(config: GoogleDriveFolderConfig | null): void {
  try {
    if (config && config.folderId) {
      localStorage.setItem(STORAGE_KEYS.DRIVE_CONFIG, JSON.stringify(config));
      const existing = getSavedDriveConfigs();
      const idx = existing.findIndex((c) => c.folderId === config.folderId);
      if (idx !== -1) {
        existing[idx] = config;
      } else {
        existing.unshift(config);
      }
      localStorage.setItem(STORAGE_KEYS.DRIVE_CONFIGS_LIST, JSON.stringify(existing));
    } else {
      localStorage.removeItem(STORAGE_KEYS.DRIVE_CONFIG);
    }
  } catch (e) {
    console.error('Failed to save drive config:', e);
  }
}

// 3. Google Sheet Configs (Multi-Sheets & Worksheets Support)
export function getSavedSheetConfigs(): GoogleSheetConfig[] {
  try {
    const listRaw = localStorage.getItem(STORAGE_KEYS.SHEET_CONFIGS_LIST);
    if (listRaw) {
      const parsed = JSON.parse(listRaw);
      if (Array.isArray(parsed)) return parsed;
    }
    // Fallback to single legacy config if present
    const single = getSavedSheetConfig();
    return single ? [single] : [];
  } catch {
    return [];
  }
}

export function saveSheetConfigs(configs: GoogleSheetConfig[]): void {
  try {
    const valid = (configs || []).filter((c) => c && c.spreadsheetId);
    localStorage.setItem(STORAGE_KEYS.SHEET_CONFIGS_LIST, JSON.stringify(valid));
    // Keep primary legacy config in sync
    if (valid.length > 0) {
      localStorage.setItem(STORAGE_KEYS.SHEET_CONFIG, JSON.stringify(valid[0]));
    } else {
      localStorage.removeItem(STORAGE_KEYS.SHEET_CONFIG);
    }
  } catch (e) {
    console.error('Failed to save sheet configs list:', e);
  }
}

export function getSavedSheetConfig(): GoogleSheetConfig | null {
  try {
    const list = getSavedSheetConfigs();
    if (list.length > 0) return list[0];
    const raw = localStorage.getItem(STORAGE_KEYS.SHEET_CONFIG);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSheetConfig(config: GoogleSheetConfig | null): void {
  try {
    if (config && config.spreadsheetId) {
      localStorage.setItem(STORAGE_KEYS.SHEET_CONFIG, JSON.stringify(config));
      const existing = getSavedSheetConfigs();
      const key = `${config.spreadsheetId}_${config.sheetName || 'default'}`;
      const idx = existing.findIndex((c) => `${c.spreadsheetId}_${c.sheetName || 'default'}` === key);
      if (idx !== -1) {
        existing[idx] = config;
      } else {
        existing.unshift(config);
      }
      localStorage.setItem(STORAGE_KEYS.SHEET_CONFIGS_LIST, JSON.stringify(existing));
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
    theme: 'dark',
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const themeRaw = localStorage.getItem(STORAGE_KEYS.THEME) as 'dark' | 'light' | null;
    if (!raw) {
      if (themeRaw === 'light' || themeRaw === 'dark') {
        defaults.theme = themeRaw;
      }
      return defaults;
    }
    const parsed = JSON.parse(raw);
    const result = { ...defaults, ...parsed };
    if (themeRaw === 'light' || themeRaw === 'dark') {
      result.theme = themeRaw;
    }
    return result;
  } catch {
    return defaults;
  }
}

export function saveAppSettings(settings: Partial<AppSettings>): AppSettings {
  const current = getAppSettings();
  const updated = { ...current, ...settings };
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
    if (settings.theme) {
      localStorage.setItem(STORAGE_KEYS.THEME, settings.theme);
    }
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
  return updated;
}

export function getThemePreference(): 'dark' | 'light' {
  try {
    const direct = localStorage.getItem(STORAGE_KEYS.THEME);
    if (direct === 'light' || direct === 'dark') return direct;
    const settings = getAppSettings();
    return settings.theme || 'dark';
  } catch {
    return 'dark';
  }
}

export function saveThemePreference(theme: 'dark' | 'light'): void {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    const current = getAppSettings();
    current.theme = theme;
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to save theme preference:', e);
  }
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
  filename?: string;
  assignedRollNo?: string;
  assignedCertType?: string;
  assignedCertTitle?: string;
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
    if (override.fileId) overrides[override.fileId] = override;
    if (override.filename) {
      overrides[override.filename] = override;
      overrides[override.filename.toLowerCase().trim()] = override;
    }
    localStorage.setItem(STORAGE_KEYS.MANUAL_OVERRIDES, JSON.stringify(overrides));
  } catch (e) {
    console.error('Failed to save manual file override:', e);
  }
}

export function saveBatchManualFileOverrides(
  overrideList: Array<ManualFileOverride & { filename?: string }>
): void {
  try {
    const overrides = getManualFileOverrides();
    for (const item of overrideList) {
      if (item.fileId) {
        overrides[item.fileId] = item;
      }
      if (item.filename) {
        const cleanName = item.filename.trim();
        overrides[cleanName] = item;
        overrides[cleanName.toLowerCase()] = item;
      }
    }
    localStorage.setItem(STORAGE_KEYS.MANUAL_OVERRIDES, JSON.stringify(overrides));
  } catch (e) {
    console.error('Failed to save batch manual file overrides:', e);
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

/**
 * Automatically resolves and removes duplicate files by grouping them by student & certificate category,
 * designating the highest quality/newest file as KEEP, and marking all redundant copies as IGNORE.
 */
export function removeAllDuplicateFiles(
  duplicateFiles: DriveCertificateFile[],
  userEmail: string = 'admin'
): { removedCount: number; keptCount: number } {
  const resolutions = getDuplicateResolutions();
  let removedCount = 0;
  let keptCount = 0;

  // Group duplicate files by student rollNo + detected certType
  const groups = new Map<string, DriveCertificateFile[]>();
  for (const f of duplicateFiles) {
    const key = `${f.detectedRollNo || f.name}__${(f.detectedCertType || 'cert').toLowerCase()}`;
    const list = groups.get(key) || [];
    list.push(f);
    groups.set(key, list);
  }

  for (const [, list] of groups.entries()) {
    if (list.length === 0) continue;

    if (list.length === 1) {
      resolutions[list[0].id] = 'KEEP';
      keptCount++;
      continue;
    }

    // Sort to keep the best one:
    // 1. Non-seed file preferred over seed file
    // 2. Has thumbnail or webViewLink
    // 3. Most recent modifiedTime
    // 4. Larger file size
    list.sort((a, b) => {
      const aIsSeed = a.id?.startsWith('seed_') ? 1 : 0;
      const bIsSeed = b.id?.startsWith('seed_') ? 1 : 0;
      if (aIsSeed !== bIsSeed) return aIsSeed - bIsSeed;

      const aTime = a.modifiedTime ? new Date(a.modifiedTime).getTime() : 0;
      const bTime = b.modifiedTime ? new Date(b.modifiedTime).getTime() : 0;
      if (bTime !== aTime) return bTime - aTime;

      const aSize = Number(a.size) || 0;
      const bSize = Number(b.size) || 0;
      return bSize - aSize;
    });

    // Primary file is KEPT
    resolutions[list[0].id] = 'KEEP';
    keptCount++;

    // All other copies are REMOVED / IGNORED
    for (let i = 1; i < list.length; i++) {
      resolutions[list[i].id] = 'IGNORE';
      removedCount++;
    }
  }

  try {
    localStorage.setItem(STORAGE_KEYS.DUPLICATE_RESOLUTIONS, JSON.stringify(resolutions));
  } catch (e) {
    console.error('Failed to save bulk duplicate resolutions:', e);
  }

  addAuditLog(
    'Removed Duplicates',
    userEmail,
    `Batch removed ${removedCount} duplicate certificate files, preserving ${keptCount} primary certificates.`,
    'REVIEW'
  );

  return { removedCount, keptCount };
}

export function clearAllDuplicateResolutions(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.DUPLICATE_RESOLUTIONS);
  } catch (e) {
    console.error('Failed to clear duplicate resolutions:', e);
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

// 11. Offline Pending Updates Buffer
export function getPendingUpdates(): PendingUpdateRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PENDING_UPDATES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read pending updates:', e);
    return [];
  }
}

export function savePendingUpdates(updates: PendingUpdateRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PENDING_UPDATES, JSON.stringify(updates));
  } catch (e) {
    console.error('Failed to save pending updates:', e);
  }
}

export function addPendingUpdate(
  rollNo: string,
  field: ToggleFieldType,
  newValue: boolean,
  studentName?: string
): PendingUpdateRecord {
  const updates = getPendingUpdates();
  const normalizedRoll = rollNo.toUpperCase().trim();

  // If there's an existing pending update for the same rollNo and field, update or replace it
  const existingIdx = updates.findIndex(
    (u) => u.rollNo === normalizedRoll && u.field === field
  );

  const newRecord: PendingUpdateRecord = {
    id: `pending_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    rollNo: normalizedRoll,
    studentName,
    field,
    newValue,
    timestamp: new Date().toISOString(),
    status: 'PENDING',
    retryCount: 0,
  };

  if (existingIdx >= 0) {
    updates[existingIdx] = newRecord;
  } else {
    updates.push(newRecord);
  }

  savePendingUpdates(updates);
  return newRecord;
}

export function addBatchPendingUpdates(
  items: Array<{ rollNo: string; field: ToggleFieldType; newValue: boolean; studentName?: string }>
): void {
  const updates = getPendingUpdates();
  const now = new Date().toISOString();

  for (const item of items) {
    const normalizedRoll = item.rollNo.toUpperCase().trim();
    const existingIdx = updates.findIndex(
      (u) => u.rollNo === normalizedRoll && u.field === item.field
    );

    const record: PendingUpdateRecord = {
      id: `pending_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      rollNo: normalizedRoll,
      studentName: item.studentName,
      field: item.field,
      newValue: item.newValue,
      timestamp: now,
      status: 'PENDING',
      retryCount: 0,
    };

    if (existingIdx >= 0) {
      updates[existingIdx] = record;
    } else {
      updates.push(record);
    }
  }

  savePendingUpdates(updates);
}

export function removePendingUpdate(id: string): void {
  const updates = getPendingUpdates();
  const filtered = updates.filter((u) => u.id !== id);
  savePendingUpdates(filtered);
}

export function clearPendingUpdates(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.PENDING_UPDATES);
  } catch (e) {
    console.error('Failed to clear pending updates:', e);
  }
}

export function updatePendingUpdateStatus(
  id: string,
  status: PendingUpdateRecord['status'],
  error?: string
): void {
  const updates = getPendingUpdates();
  const item = updates.find((u) => u.id === id);
  if (item) {
    item.status = status;
    if (error) item.error = error;
    if (status === 'FAILED') item.retryCount = (item.retryCount || 0) + 1;
    savePendingUpdates(updates);
  }
}

// 12. Dynamic Class Roster CRUD
export function getDynamicRoster(): Student[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DYNAMIC_ROSTER);
    if (!raw) return [...FIXED_CLASS_ROSTER];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read dynamic roster:', e);
    return [...FIXED_CLASS_ROSTER];
  }
}

export function saveDynamicRoster(roster: Student[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DYNAMIC_ROSTER, JSON.stringify(roster));
  } catch (e) {
    console.error('Failed to save dynamic roster:', e);
  }
}

