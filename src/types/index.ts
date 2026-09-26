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
  phone?: string;
}

export interface DriveCertificateFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  size?: string;
  parentFolderName?: string;
  parentFolderId?: string;
  detectedRollNo?: string;
  detectedCertType?: string;
  detectedCertTitle?: string;
  detectedStudentName?: string;
  matchMethod?: 'CUSTOM_REGEX' | 'STANDARD_REGEX' | 'STUDENT_NAME' | 'PARENT_FOLDER' | 'SHEET_URL_LINK' | 'MANUAL_OVERRIDE';
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
  email?: string;
  phone?: string;
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
  emailCol?: string;
  phoneCol?: string;
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

export interface CountMismatchInfo {
  hasMismatch: boolean;
  driveCount: number;
  sheetCount: number;
  difference: number;
  type: 'MORE_IN_SHEET' | 'MORE_IN_DRIVE' | 'EQUAL';
  description: string;
}

export interface StudentStatusRecord {
  rollNo: string;
  name: string;
  email?: string;
  phone?: string;
  lastReminded?: string;
  certificates: string[];
  driveUploaded: boolean;
  sheetUpdated: boolean;
  submitted: boolean;
  overallStatus: 'COMPLETED' | 'PENDING' | 'NOT STARTED';
  countMismatch?: CountMismatchInfo;
  driveFiles: DriveCertificateFile[];
  sheetRecords: SheetRowRecord[];
  lastUpdated?: string;
}

export interface ReconciliationAnalysis {
  timestamp: string;
  totalRosterStudents: number;
  totalSheetRowsScanned: number;
  totalDriveFilesScanned: number;
  
  // Discrepancy Categorization
  rosterMissingInSheet: {
    rollNo: string;
    name: string;
    driveFilesCount: number;
    overallStatus: 'COMPLETED' | 'PENDING' | 'NOT STARTED';
    hasDriveFiles: boolean;
  }[];
  
  sheetMissingInRoster: {
    rowIndex: number;
    rawRoll: string;
    rawName?: string;
    rawEmail?: string;
    certificateType?: string;
    reason: string;
    suggestedRosterMatch?: {
      rollNo: string;
      name: string;
      confidence: number;
    };
  }[];

  driveMissingInSheet: {
    rollNo: string;
    name: string;
    fileCount: number;
    files: DriveCertificateFile[];
  }[];

  sheetMissingInDrive: {
    rollNo: string;
    name: string;
    sheetCount: number;
    records: SheetRowRecord[];
  }[];

  quantityMismatches: {
    rollNo: string;
    name: string;
    sheetCount: number;
    driveCount: number;
    difference: number;
    type: 'MORE_IN_SHEET' | 'MORE_IN_DRIVE';
    description: string;
  }[];

  summary: {
    matchedRosterCount: number;
    rosterMissingSheetCount: number;
    sheetOutsideRosterCount: number;
    outsideClassQuarantinedCount: number;
    strictRosterEnforced: boolean;
    driveMissingSheetCount: number;
    sheetMissingDriveCount: number;
    quantityMismatchCount: number;
    totalGapsCount: number;
    integrityScore: number; // percentage (0-100)
  };
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

export interface AutoEmailSchedulerConfig {
  enabled: boolean;
  frequency: 'HOURLY' | 'DAILY' | 'EVERY_2_DAYS' | 'WEEKLY' | 'ON_DISCREPANCY';
  targetAudience: 'ALL_DEFAULTERS' | 'NOT_STARTED_ONLY' | 'COUNT_MISMATCH_ONLY' | 'PENDING_ONLY';
  customTemplateSubject?: string;
  customTemplateBody?: string;
  deliveryMethod: 'GMAIL_PROMPT' | 'MAILTO_BATCH' | 'WEBHOOK' | 'TWILIO_WHATSAPP';
  webhookUrl?: string;
  lastAutoRun?: string;
  autoRunCount?: number;
}

export interface WhatsAppApiConfig {
  provider: 'TWILIO' | 'META_CLOUD_API' | 'CUSTOM_WEBHOOK' | 'DIRECT_WA_LINK';
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioWhatsAppFrom?: string; // e.g. whatsapp:+14155238886
  metaAccessToken?: string;
  metaPhoneNumberId?: string;
  webhookUrl?: string;
}

export interface AppSettings {
  autoSyncIntervalMinutes: number; // 0 for off, 5, 15, 30, 60
  enableSpreadsheetWrite: boolean;
  adminEmails: string[];
  autoEmailScheduler?: AutoEmailSchedulerConfig;
  whatsAppConfig?: WhatsAppApiConfig;
  customFilenameRegex?: string; // Custom regex pattern (e.g. (?<rollNo>[0-9]{2}[A-Za-z][0-9]{2}[A-Za-z][0-9]{2}[A-Za-z0-9]{2}))
  customCertTypePatterns?: Array<{ type: string; pattern: string }>;
  enableFuzzyNameMatching?: boolean;
  enableParentFolderInheritance?: boolean;
  enableSheetLinkMatching?: boolean;
  theme?: 'dark' | 'light';
}

export type ToggleFieldType = 'submitted' | 'driveUploaded' | 'sheetUpdated';

export type DatePresetType =
  | 'ALL_TIME'
  | 'TODAY'
  | 'YESTERDAY'
  | 'LAST_7_DAYS'
  | 'LAST_14_DAYS'
  | 'LAST_30_DAYS'
  | 'THIS_MONTH'
  | 'LAST_MONTH'
  | 'CUSTOM';

export type DateFilterBasis = 'ALL' | 'SHEET_ONLY' | 'DRIVE_ONLY' | 'STATUS_ONLY';

export interface DateRangeFilterConfig {
  preset: DatePresetType;
  startDate: string | null; // ISO YYYY-MM-DD
  endDate: string | null;   // ISO YYYY-MM-DD
  basis: DateFilterBasis;
  activeOnlyMatchingStudents: boolean; // whether to strictly filter the student list or just analyze
}

export interface PendingUpdateRecord {
  id: string;
  rollNo: string;
  studentName?: string;
  field: ToggleFieldType;
  newValue: boolean;
  timestamp: string;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  error?: string;
  retryCount?: number;
}

