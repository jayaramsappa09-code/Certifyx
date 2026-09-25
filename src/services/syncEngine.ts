import {
  FIXED_CLASS_ROSTER,
  ROSTER_MAP,
  normalizeRollNumber,
  isValidClassRollNumber,
  extractRollNumberFromText,
  INITIAL_REFERENCE_CERTIFICATES,
} from '../data/classRoster';
import {
  DriveCertificateFile,
  SheetRowRecord,
  StudentStatusRecord,
  SyncReport,
} from '../types';
import {
  getSubmittedStatusMap,
  getManualFileOverrides,
  getDuplicateResolutions,
  addSyncReport,
  addAuditLog,
} from './storageService';

/**
 * Standard Certificate Types and their normalized representations
 */
export const KNOWN_CERTIFICATE_PATTERNS: Array<{
  type: string;
  regex: RegExp;
}> = [
  {
    type: 'Certificate of Participation',
    regex: /\b(certificate\s+of\s+participation|cert\s+of\s+participation)\b/i,
  },
  {
    type: 'Course Completion',
    regex: /\b(course\s+completion|completed\s+course)\b/i,
  },
  {
    type: 'Coordinator Certificate',
    regex: /\b(coordinator\s+certificate|coordinator)\b/i,
  },
  {
    type: 'Hackathon',
    regex: /\b(hackathon|hack|codefest|hacknight)\b/i,
  },
  {
    type: 'Course',
    regex: /\b(course|training|workshop|udemy|coursera|nptel|edx|bootcamp)\b/i,
  },
  {
    type: 'Participation',
    regex: /\b(participation|participated|participant|attendee)\b/i,
  },
  {
    type: 'Merit',
    regex: /\b(merit|distinction|rank|topper)\b/i,
  },
  {
    type: 'Award',
    regex: /\b(award|winner|runner|1st|2nd|3rd|first|second|third|prize)\b/i,
  },
  {
    type: 'Certification',
    regex: /\b(certification|certified|certificate)\b/i,
  },
  {
    type: 'Badge',
    regex: /\b(badge|skill\s*badge|credential)\b/i,
  },
];

/**
 * Detect certificate type from filename or text
 */
export function detectCertificateType(filename: string): {
  type: string;
  isAmbiguous: boolean;
} {
  if (!filename) {
    return { type: 'Certificate type needs review', isAmbiguous: true };
  }

  // Remove file extension
  const cleanName = filename.replace(/\.[a-zA-Z0-9]+$/, '').replace(/[_-]/g, ' ');

  for (const item of KNOWN_CERTIFICATE_PATTERNS) {
    if (item.regex.test(cleanName)) {
      return { type: item.type, isAmbiguous: false };
    }
  }

  return { type: 'Certificate type needs review', isAmbiguous: true };
}

export interface SyncEngineInput {
  driveFiles?: DriveCertificateFile[];
  sheetRows?: SheetRowRecord[];
  userEmail?: string;
  useSeedDataIfEmpty?: boolean;
}

export interface SyncEngineResult {
  studentStatuses: StudentStatusRecord[];
  report: SyncReport;
  unidentifiedFiles: DriveCertificateFile[];
  outsideClassFiles: DriveCertificateFile[];
  duplicateFiles: DriveCertificateFile[];
  ambiguousCertFiles: DriveCertificateFile[];
}

/**
 * Execute the Core Synchronization Engine
 */
export function runSyncEngine(input: SyncEngineInput): SyncEngineResult {
  const startTime = Date.now();
  const manualOverrides = getManualFileOverrides();
  const duplicateResolutions = getDuplicateResolutions();
  const submittedMap = getSubmittedStatusMap();

  let driveFiles = input.driveFiles ? [...input.driveFiles] : [];
  let sheetRows = input.sheetRows ? [...input.sheetRows] : [];

  // Seed reference fallback if neither Drive nor Sheets are connected yet and requested
  if (driveFiles.length === 0 && sheetRows.length === 0 && input.useSeedDataIfEmpty) {
    driveFiles = INITIAL_REFERENCE_CERTIFICATES.map((ref, idx) => ({
      id: `seed_drive_${idx}`,
      name: `${ref.rollNo}_${ref.certType}.pdf`,
      mimeType: 'application/pdf',
      createdTime: new Date().toISOString(),
      webViewLink: '#',
    }));
    sheetRows = INITIAL_REFERENCE_CERTIFICATES.slice(0, 20).map((ref, idx) => ({
      rowIndex: idx + 2,
      rollNo: ref.rollNo,
      certificateType: ref.certType,
      rawValues: { 'Roll No': ref.rollNo, Certificate: ref.certType },
    }));
  }

  // Collections for review
  const unidentifiedFiles: DriveCertificateFile[] = [];
  const outsideClassFiles: DriveCertificateFile[] = [];
  const duplicateFiles: DriveCertificateFile[] = [];
  const ambiguousCertFiles: DriveCertificateFile[] = [];

  // Map to hold matched Drive files per normalized roll number
  const studentDriveFilesMap = new Map<string, DriveCertificateFile[]>();
  // Map to track duplicates: key is `${rollNo}__${certType}`
  const certTypeCounts = new Map<string, DriveCertificateFile[]>();

  // Map to hold matched Sheet records per normalized roll number
  const studentSheetRecordsMap = new Map<string, SheetRowRecord[]>();

  let outsideClassDriveCount = 0;
  let outsideClassSheetCount = 0;
  let matchedCertificatesCount = 0;

  // 1. Process Drive Files
  for (const file of driveFiles) {
    // Check for manual override first
    const override = manualOverrides[file.id];
    let detectedRoll = override?.assignedRollNo || extractRollNumberFromText(file.name);
    let detectedType = override?.assignedCertType;

    if (!detectedType) {
      const typeResult = detectCertificateType(file.name);
      detectedType = typeResult.type;
      if (typeResult.isAmbiguous) {
        ambiguousCertFiles.push({
          ...file,
          detectedRollNo: detectedRoll || undefined,
          detectedCertType: detectedType,
        });
      }
    }

    file.detectedCertType = detectedType;

    if (!detectedRoll) {
      // Unidentified file (no roll number found)
      file.isUnidentified = true;
      unidentifiedFiles.push(file);
      continue;
    }

    const normalizedRoll = normalizeRollNumber(detectedRoll);
    file.detectedRollNo = normalizedRoll;

    if (!isValidClassRollNumber(normalizedRoll)) {
      // Roll number exists in filename, but is outside the 67-person roster
      file.isOutsideClass = true;
      outsideClassFiles.push(file);
      outsideClassDriveCount++;
      continue;
    }

    // Matched valid class student!
    matchedCertificatesCount++;

    // Duplicate detection
    const dupResolution = duplicateResolutions[file.id];
    if (dupResolution === 'IGNORE') {
      // Ignored by admin in duplicate review
      continue;
    }

    const dupKey = `${normalizedRoll}__${detectedType.toLowerCase()}`;
    const existingSame = certTypeCounts.get(dupKey) || [];
    if (existingSame.length > 0) {
      file.isDuplicate = true;
      duplicateFiles.push(file);
      // Also mark first one if not marked
      if (!existingSame[0].isDuplicate) {
        existingSame[0].isDuplicate = true;
        duplicateFiles.push(existingSame[0]);
      }
    }
    existingSame.push(file);
    certTypeCounts.set(dupKey, existingSame);

    // Add to student's Drive files
    const currentList = studentDriveFilesMap.get(normalizedRoll) || [];
    currentList.push(file);
    studentDriveFilesMap.set(normalizedRoll, currentList);
  }

  // 2. Process Spreadsheet Rows
  let sheetMatchesCount = 0;
  for (const row of sheetRows) {
    const rawRoll = row.rollNo;
    if (!rawRoll) continue;

    const normalizedRoll = normalizeRollNumber(rawRoll);
    if (!isValidClassRollNumber(normalizedRoll)) {
      outsideClassSheetCount++;
      continue;
    }

    sheetMatchesCount++;
    const currentList = studentSheetRecordsMap.get(normalizedRoll) || [];
    currentList.push(row);
    studentSheetRecordsMap.set(normalizedRoll, currentList);
  }

  // 3. Build status record for each of the EXACT 67 class students
  const studentStatuses: StudentStatusRecord[] = [];
  let studentsWithCertsCount = 0;

  for (const student of FIXED_CLASS_ROSTER) {
    const normRoll = normalizeRollNumber(student.rollNo);

    const driveFilesForStudent = studentDriveFilesMap.get(normRoll) || [];
    const sheetRowsForStudent = studentSheetRecordsMap.get(normRoll) || [];

    // Drive Uploaded = TRUE if at least 1 valid certificate in Drive
    const driveUploaded = driveFilesForStudent.length > 0;
    // Spreadsheet Updated = TRUE if matching row in Sheet
    const sheetUpdated = sheetRowsForStudent.length > 0;
    // Submitted status MUST be preserved from manual admin tracking (never reset!)
    const submitted = Boolean(submittedMap[normRoll]);

    // Aggregate unique certificate types from Drive and Sheet
    const certTypesSet = new Set<string>();
    for (const f of driveFilesForStudent) {
      if (f.detectedCertType && f.detectedCertType !== 'Certificate type needs review') {
        certTypesSet.add(f.detectedCertType);
      }
    }
    for (const r of sheetRowsForStudent) {
      if (r.certificateType) {
        const parsed = detectCertificateType(r.certificateType);
        certTypesSet.add(parsed.type !== 'Certificate type needs review' ? parsed.type : r.certificateType);
      }
    }

    const certificatesList = Array.from(certTypesSet);
    if (certificatesList.length > 0 || driveUploaded) {
      studentsWithCertsCount++;
    }

    // Determine Overall Status according to rule:
    // If Drive Uploaded = TRUE AND Spreadsheet Updated = TRUE AND Submitted = TRUE -> COMPLETED
    // If all three are FALSE -> NOT STARTED
    // Otherwise -> PENDING
    let overallStatus: 'COMPLETED' | 'PENDING' | 'NOT STARTED' = 'PENDING';
    if (driveUploaded && sheetUpdated && submitted) {
      overallStatus = 'COMPLETED';
    } else if (!driveUploaded && !sheetUpdated && !submitted) {
      overallStatus = 'NOT STARTED';
    } else {
      overallStatus = 'PENDING';
    }

    studentStatuses.push({
      rollNo: student.rollNo,
      name: student.name,
      certificates: certificatesList,
      driveUploaded,
      sheetUpdated,
      submitted,
      overallStatus,
      driveFiles: driveFilesForStudent,
      sheetRecords: sheetRowsForStudent,
      lastUpdated: new Date().toISOString(),
    });
  }

  // 4. Create Sync Report
  const durationMs = Date.now() - startTime;
  const report: SyncReport = {
    id: 'sync_' + Date.now(),
    timestamp: new Date().toISOString(),
    studentsChecked: FIXED_CLASS_ROSTER.length, // 67
    driveFilesScanned: driveFiles.length,
    matchedCertificates: matchedCertificatesCount,
    studentsWithCertificates: studentsWithCertsCount,
    spreadsheetRecordsChecked: sheetRows.length,
    spreadsheetMatches: sheetMatchesCount,
    outsideClassIgnored: outsideClassDriveCount + outsideClassSheetCount,
    unidentifiedFiles: unidentifiedFiles.length,
    errors: 0,
    durationMs,
  };

  // Record audit log & history
  addSyncReport(report);
  addAuditLog(
    'Sync completed',
    input.userEmail || 'admin',
    `Checked 67 students. Found ${matchedCertificatesCount} drive certificates, ${sheetMatchesCount} sheet matches. Ignored ${report.outsideClassIgnored} outside-class items.`,
    'SYNC'
  );

  return {
    studentStatuses,
    report,
    unidentifiedFiles,
    outsideClassFiles,
    duplicateFiles,
    ambiguousCertFiles,
  };
}
