export interface Student {
  rollNo: string;
  name: string;
}

export interface DriveCertificateFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  size?: string;
  detectedRollNo?: string;
  detectedCertType?: string;
  isOutsideClass?: boolean;
  isUnidentified?: boolean;
  isDuplicate?: boolean;
}

export type CertificateType =
  | 'Hackathon'
  | 'Course'
  | 'Participation'
  | 'Merit'
  | 'Award'
  | 'Certification'
  | 'Badge'
  | 'Certificate of Participation'
  | 'Course Completion'
  | 'Coordinator Certificate'
  | 'Other';

export interface SheetRowRecord {
  rowIndex: number;
  rollNo: string;
  name?: string;
  certificateType?: string;
  year?: string;
  section?: string;
  rawValues: Record<string, string>;
}

export interface ColumnMapping {
  rollNoCol: string;
  nameCol: string;
  certTypeCol: string;
  yearCol?: string;
  sectionCol?: string;
}

export interface StudentStatusRecord {
  rollNo: string;
  name: string;
  certificates: string[];
  driveUploaded: boolean;
  sheetUpdated: boolean;
  submitted: boolean;
  overallStatus: 'COMPLETED' | 'PENDING' | 'NOT STARTED';
  driveFiles: DriveCertificateFile[];
  sheetRecords: SheetRowRecord[];
  lastUpdated?: string;
}

export interface SyncReport {
  id: string;
  timestamp: string;
  studentsChecked: number;
  driveFilesScanned: number;
  matchedCertificates: number;
  studentsWithCertificates: number;
  spreadsheetRecordsChecked: number;
  spreadsheetMatches: number;
  outsideClassIgnored: number;
  unidentifiedFiles: number;
  errors: number;
  errorMessages?: string[];
  durationMs: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  details: string;
  category: 'AUTH' | 'SYNC' | 'DRIVE' | 'SHEETS' | 'STATUS' | 'REVIEW' | 'SETTINGS';
}

export interface GoogleDriveFolderConfig {
  folderId: string;
  folderName: string;
  fileCount?: number;
  lastSynced?: string;
}

export interface GoogleSheetConfig {
  spreadsheetId: string;
  spreadsheetName: string;
  sheetName: string;
  availableSheets?: string[];
  columnMapping?: ColumnMapping;
  lastSynced?: string;
}

export interface AppSettings {
  autoSyncIntervalMinutes: number; // 0 for off, 5, 15, 30, 60
  enableSpreadsheetWrite: boolean;
  adminEmails: string[];
}
