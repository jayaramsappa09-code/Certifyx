export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified?: boolean;
}

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
  certificateUrl?: string;
  submissionTimestamp?: string;
  matchedRollNo?: string;
  matchedStudentName?: string;
  matchStatus?: 'MATCHED' | 'OUTSIDE_CLASS' | 'UNMATCHED_ROLL' | 'MANUAL_OVERRIDE';
  matchReason?: string;
  rawValues: Record<string, string>;
}

export interface ColumnMapping {
  rollNoCol: string;
  nameCol: string;
  certTypeCol: string;
  yearCol?: string;
  sectionCol?: string;
  certUrlCol?: string;
  timestampCol?: string;
}

export interface SheetSyncProof {
  proofId: string;
  timestamp: string;
  spreadsheetId: string;
  spreadsheetName: string;
  sheetName: string;
  spreadsheetUrl: string;
  totalRowsScanned: number;
  matchedCount: number;
  outsideClassCount: number;
  unmatchedCount: number;
  rows: SheetRowRecord[];
  columnMappingUsed: ColumnMapping;
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
