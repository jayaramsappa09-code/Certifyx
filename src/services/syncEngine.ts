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
  ReconciliationAnalysis,
} from '../types';
import { generateReconciliationAnalysis } from '../utils/reconciliationAnalyzer';
import {
  getSubmittedStatusMap,
  getDriveStatusOverrideMap,
  getSheetStatusOverrideMap,
  getManualFileOverrides,
  getDuplicateResolutions,
  getAppSettings,
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
    regex: /\b(coordinator\s+certificate|student\s+coordinator|coordinator)\b/i,
  },
  {
    type: 'Paper / Poster Presentation',
    regex: /\b(paper\s+presentation|poster\s+presentation|project\s+expo|presentation)\b/i,
  },
  {
    type: 'Workshop / Webinar',
    regex: /\b(workshop|webinar|seminar|hands\s*on|bootcamp)\b/i,
  },
  {
    type: 'Internship',
    regex: /\b(internship|intern|industrial\s+training)\b/i,
  },
  {
    type: 'Hackathon / Contest',
    regex: /\b(hackathon|hack|codefest|hacknight|quantathon|coding\s+contest|quiz)\b/i,
  },
  {
    type: 'Course',
    regex: /\b(course|training|udemy|coursera|nptel|edx|great\s*learning|infosys|cisco|oracle|aws|google\s*cloud)\b/i,
  },
  {
    type: 'Merit / Award',
    regex: /\b(merit|distinction|rank|topper|award|winner|runner|1st|2nd|3rd|first|second|third|prize)\b/i,
  },
  {
    type: 'Participation',
    regex: /\b(participation|participated|participant|attendee)\b/i,
  },
  {
    type: 'Badge / Credential',
    regex: /\b(badge|skill\s*badge|credential|milestone)\b/i,
  },
  {
    type: 'Certification',
    regex: /\b(certification|certified|certificate)\b/i,
  },
];

/**
 * Custom Regex Parser for Certificate Filenames.
 * Supports:
 * 1. Named capture groups: `(?<rollNo>...)`, `(?<studentName>...)`, `(?<certTitle>...)`, `(?<certType>...)`
 * 2. Positional capture groups: group 1 (rollNo), group 2 (studentName or title), group 3 (title)
 */
export function parseFilenameWithCustomRegex(
  filename: string,
  pattern?: string
): {
  rollNo?: string;
  studentName?: string;
  certTitle?: string;
  certType?: string;
} | null {
  if (!filename || !pattern || !pattern.trim()) return null;
  try {
    const trimmedPattern = pattern.trim();
    const regex = new RegExp(trimmedPattern, 'i');
    const match = filename.match(regex);
    if (!match) return null;

    const result: {
      rollNo?: string;
      studentName?: string;
      certTitle?: string;
      certType?: string;
    } = {};

    // 1. Check named capture groups
    if (match.groups) {
      const g = match.groups;
      if (g.rollNo || g.roll || g.rollno || g.regNo || g.id) {
        result.rollNo = g.rollNo || g.roll || g.rollno || g.regNo || g.id;
      }
      if (g.studentName || g.name || g.student) {
        result.studentName = g.studentName || g.name || g.student;
      }
      if (g.certTitle || g.title || g.event || g.subject) {
        result.certTitle = g.certTitle || g.title || g.event || g.subject;
      }
      if (g.certType || g.type || g.category) {
        result.certType = g.certType || g.type || g.category;
      }
    }

    // 2. Fallback to numbered positional groups
    if (!result.rollNo && match[1]) {
      result.rollNo = match[1];
    }
    if (!result.studentName && match[2] && isNaN(Number(match[2]))) {
      result.studentName = match[2];
    }
    if (!result.certTitle && match[3]) {
      result.certTitle = match[3];
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch (err) {
    console.warn('Invalid custom regex pattern:', pattern, err);
    return null;
  }
}

/**
 * Extract clean certificate title/subject by removing roll numbers, student names, and file extensions
 */
export function extractCertificateTitle(
  filename: string,
  rollNo?: string,
  studentName?: string
): string {
  if (!filename) return 'Certificate';
  let clean = filename.replace(/\.[a-zA-Z0-9]+$/, ''); // remove extension
  if (rollNo) {
    const rollRegex = new RegExp(rollNo, 'gi');
    clean = clean.replace(rollRegex, '');
  }
  clean = clean.replace(/[0-9]{2}[A-Za-z][0-9]{2}[A-Za-z][0-9]{2}[A-Za-z0-9]{2}/gi, '');
  if (studentName) {
    const parts = studentName.split(/\s+/).filter((p) => p.length >= 3);
    for (const part of parts) {
      clean = clean.replace(new RegExp(part, 'gi'), '');
    }
  }
  clean = clean.replace(/[_\-+=()]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean || clean.length < 2) {
    return 'Certificate';
  }
  return clean;
}

/**
 * Detect certificate type from filename or text with optional custom patterns
 */
export function detectCertificateType(
  filename: string,
  customPatterns?: Array<{ type: string; pattern: string }>
): {
  type: string;
  isAmbiguous: boolean;
} {
  if (!filename) {
    return { type: 'Certificate', isAmbiguous: false };
  }

  // Remove file extension
  const cleanName = filename.replace(/\.[a-zA-Z0-9]+$/, '').replace(/[_-]/g, ' ');

  // 1. Check custom patterns first if configured
  if (customPatterns && customPatterns.length > 0) {
    for (const custom of customPatterns) {
      if (custom.type && custom.pattern) {
        try {
          const r = new RegExp(custom.pattern, 'i');
          if (r.test(cleanName)) {
            return { type: custom.type, isAmbiguous: false };
          }
        } catch {}
      }
    }
  }

  // 2. Standard built-in patterns
  for (const item of KNOWN_CERTIFICATE_PATTERNS) {
    if (item.regex.test(cleanName)) {
      return { type: item.type, isAmbiguous: false };
    }
  }

  return { type: 'Certificate', isAmbiguous: false };
}

export interface SyncEngineInput {
  driveFiles?: DriveCertificateFile[];
  sheetRows?: SheetRowRecord[];
  userEmail?: string;
  useSeedDataIfEmpty?: boolean;
  customFilenameRegex?: string;
  customCertTypePatterns?: Array<{ type: string; pattern: string }>;
  enableFuzzyNameMatching?: boolean;
  enableParentFolderInheritance?: boolean;
  enableSheetLinkMatching?: boolean;
}

export interface SyncEngineResult {
  studentStatuses: StudentStatusRecord[];
  report: SyncReport;
  reconciliationAnalysis: ReconciliationAnalysis;
  unidentifiedFiles: DriveCertificateFile[];
  outsideClassFiles: DriveCertificateFile[];
  duplicateFiles: DriveCertificateFile[];
  ambiguousCertFiles: DriveCertificateFile[];
  processedSheetRows: SheetRowRecord[];
}

/**
 * Execute the Core Synchronization Engine
 */
export function runSyncEngine(input: SyncEngineInput): SyncEngineResult {
  const startTime = Date.now();
  const manualOverrides = getManualFileOverrides();
  const duplicateResolutions = getDuplicateResolutions();
  const submittedMap = getSubmittedStatusMap();
  const driveOverrides = getDriveStatusOverrideMap();
  const sheetOverrides = getSheetStatusOverrideMap();
  const appSettings = getAppSettings();

  const customRegex = input.customFilenameRegex ?? appSettings.customFilenameRegex;
  const customCertPatterns = input.customCertTypePatterns ?? appSettings.customCertTypePatterns;
  const allowFuzzyNames = input.enableFuzzyNameMatching ?? appSettings.enableFuzzyNameMatching ?? true;
  const allowFolderInheritance = input.enableParentFolderInheritance ?? appSettings.enableParentFolderInheritance ?? true;
  const allowSheetLinkMatch = input.enableSheetLinkMatching ?? appSettings.enableSheetLinkMatching ?? true;

  let driveFiles = input.driveFiles ? [...input.driveFiles] : [];
  let sheetRows = input.sheetRows ? [...input.sheetRows] : [];

  // Seed reference fallback if neither Drive nor Sheets are connected yet and requested
  if (driveFiles.length === 0 && sheetRows.length === 0 && input.useSeedDataIfEmpty) {
    const nowMs = Date.now();
    driveFiles = INITIAL_REFERENCE_CERTIFICATES.map((ref, idx) => {
      // Distribute timestamps over the last 15 days so timeline charts and date filters are vivid
      const daysAgo = idx % 15;
      const fileDate = new Date(nowMs - daysAgo * 86400000 - (idx * 3600000)).toISOString();
      return {
        id: `seed_drive_${idx}`,
        name: `${ref.rollNo}_${ref.certType}.pdf`,
        mimeType: 'application/pdf',
        createdTime: fileDate,
        modifiedTime: fileDate,
        webViewLink: '#',
      };
    });
    sheetRows = INITIAL_REFERENCE_CERTIFICATES.map((ref, idx) => {
      const daysAgo = (idx + 1) % 12;
      const rowDate = new Date(nowMs - daysAgo * 86400000 - (idx * 1800000)).toISOString();
      return {
        rowIndex: idx + 2,
        rollNo: ref.rollNo,
        certificateType: ref.certType,
        submissionTimestamp: rowDate,
        rawValues: { 'Roll No': ref.rollNo, Certificate: ref.certType, Timestamp: rowDate },
      };
    });
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

  // Pre-index any Google Drive file URLs present in Spreadsheet Rows to auto-link them
  const fileIdToSheetRollMap = new Map<string, string>();
  if (allowSheetLinkMatch) {
    for (const row of sheetRows) {
      if (row.certificateUrl && row.matchedRollNo) {
        const match = row.certificateUrl.match(/(?:file\/d\/|[?&]id=)([a-zA-Z0-9_-]+)/i);
        if (match && match[1]) {
          fileIdToSheetRollMap.set(match[1], row.matchedRollNo);
        }
      }
    }
  }

  // 1. Process Drive Files with Multi-Source Roll Number, Regex, and Name Detection
  for (const file of driveFiles) {
    let detectedRoll: string | null = null;
    let detectedType: string | undefined = undefined;
    let detectedTitle: string | undefined = undefined;
    let detectedName: string | undefined = undefined;
    let matchMethod: DriveCertificateFile['matchMethod'] = undefined;

    // Check 1: Manual admin override
    const override =
      manualOverrides[file.id] ||
      manualOverrides[file.name] ||
      manualOverrides[file.name.toLowerCase().trim()];
    if (override?.assignedRollNo) {
      detectedRoll = override.assignedRollNo;
      detectedType = override.assignedCertType;
      matchMethod = 'MANUAL_OVERRIDE';
    }

    // Check 2: Custom Admin Regex
    if (!detectedRoll && customRegex) {
      const parsed = parseFilenameWithCustomRegex(file.name, customRegex);
      if (parsed?.rollNo) {
        detectedRoll = parsed.rollNo;
        if (parsed.certType) detectedType = parsed.certType;
        if (parsed.certTitle) detectedTitle = parsed.certTitle;
        if (parsed.studentName) detectedName = parsed.studentName;
        matchMethod = 'CUSTOM_REGEX';
      }
    }

    // Check 3: Sheet URL Reference Link
    if (!detectedRoll && allowSheetLinkMatch) {
      const sheetRoll = fileIdToSheetRollMap.get(file.id);
      if (sheetRoll) {
        detectedRoll = sheetRoll;
        matchMethod = 'SHEET_URL_LINK';
      }
    }

    // Check 4: Standard University Format / Delimited Roll Number / Student Name in Filename
    if (!detectedRoll) {
      const extracted = extractRollNumberFromText(file.name);
      if (extracted) {
        detectedRoll = extracted;
        matchMethod = 'STANDARD_REGEX';
      }
    }

    // Check 5: Parent Subfolder Name Inheritance (e.g. inside "25A31A05GB/" or "SAPPA JAYARAM/")
    if (!detectedRoll && allowFolderInheritance && file.parentFolderName) {
      const extractedFromFolder = extractRollNumberFromText(file.parentFolderName);
      if (extractedFromFolder) {
        detectedRoll = extractedFromFolder;
        matchMethod = 'PARENT_FOLDER';
      }
    }

    // Certificate Type Detection
    if (!detectedType) {
      const typeResult = detectCertificateType(file.name, customCertPatterns);
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
    file.matchMethod = matchMethod;

    if (!detectedRoll) {
      // Unidentified file (no roll number found)
      file.isUnidentified = true;
      unidentifiedFiles.push(file);
      continue;
    }

    const normalizedRoll = normalizeRollNumber(detectedRoll);
    file.detectedRollNo = normalizedRoll;

    const matchedRosterStudent = ROSTER_MAP.get(normalizedRoll);
    if (matchedRosterStudent) {
      file.detectedStudentName = matchedRosterStudent.name;
    } else if (detectedName) {
      file.detectedStudentName = detectedName;
    }

    file.detectedCertTitle =
      detectedTitle ||
      extractCertificateTitle(
        file.name,
        normalizedRoll,
        file.detectedStudentName
      );

    if (!isValidClassRollNumber(normalizedRoll)) {
      // Roll number exists in filename or folder, but is outside the 67-person roster
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

    const dupKey = `${normalizedRoll}__${(detectedType || 'cert').toLowerCase()}`;
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
    let targetRoll = row.matchedRollNo;

    if (!targetRoll) {
      const rawRoll = row.rollNo || '';
      const extracted = extractRollNumberFromText(rawRoll);
      const normalized = normalizeRollNumber(rawRoll);
      if (extracted && isValidClassRollNumber(extracted)) {
        targetRoll = extracted;
      } else if (isValidClassRollNumber(normalized)) {
        targetRoll = normalized;
      } else if (row.name && allowFuzzyNames) {
        // Match by student name
        const normName = row.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normName.length >= 4) {
          const match = FIXED_CLASS_ROSTER.find(
            (s) => s.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normName
          );
          if (match) targetRoll = match.rollNo;
        }
      }
    }

    if (!targetRoll || !isValidClassRollNumber(targetRoll)) {
      if (row.rollNo) {
        row.matchStatus = 'OUTSIDE_CLASS';
        row.matchReason = `Roll number "${row.rollNo}" does not belong to the 67-student roster.`;
        outsideClassSheetCount++;
      } else {
        row.matchStatus = 'UNMATCHED_ROLL';
        row.matchReason = 'Missing or unreadable roll number in sheet row.';
      }
      continue;
    }

    const normRoll = normalizeRollNumber(targetRoll);
    row.matchedRollNo = normRoll;
    row.matchStatus = 'MATCHED';
    const rosterStudent = ROSTER_MAP.get(normRoll);
    if (rosterStudent) {
      row.matchedStudentName = rosterStudent.name;
      if (!row.matchReason) {
        row.matchReason = `Verified match with 67-student roster (${normRoll} - ${rosterStudent.name})`;
      }
    }

    sheetMatchesCount++;
    const currentList = studentSheetRecordsMap.get(normRoll) || [];
    currentList.push(row);
    studentSheetRecordsMap.set(normRoll, currentList);
  }

  // 3. Build Student Status Records for all roster students strictly
  const studentStatuses: StudentStatusRecord[] = FIXED_CLASS_ROSTER.map((student) => {
    const rawRoll = student.rollNo;
    const normRoll = normalizeRollNumber(rawRoll);
    const matchedDriveFiles = studentDriveFilesMap.get(normRoll) || (rawRoll !== normRoll ? studentDriveFilesMap.get(rawRoll) : undefined) || [];
    const matchedSheetRows = studentSheetRecordsMap.get(normRoll) || (rawRoll !== normRoll ? studentSheetRecordsMap.get(rawRoll) : undefined) || [];

    // Drive status: true if Drive has matching files OR manual admin override is set to true
    const driveOverrideVal = driveOverrides[normRoll] ?? driveOverrides[rawRoll];
    const driveUploaded =
      typeof driveOverrideVal === 'boolean'
        ? driveOverrideVal
        : matchedDriveFiles.length > 0;

    // Sheet status: true if Sheet has matching rows OR manual admin override is set to true
    const sheetOverrideVal = sheetOverrides[normRoll] ?? sheetOverrides[rawRoll];
    const sheetUpdated =
      typeof sheetOverrideVal === 'boolean'
        ? sheetOverrideVal
        : matchedSheetRows.length > 0;

    // Submitted status: admin tick, defaults to false
    const submitted = submittedMap[normRoll] ?? submittedMap[rawRoll] ?? false;

    // Aggregate unique certificate names/types
    const certNamesSet = new Set<string>();
    matchedDriveFiles.forEach((f) => {
      if (f.detectedCertTitle) certNamesSet.add(f.detectedCertTitle);
      else if (f.detectedCertType) certNamesSet.add(f.detectedCertType);
    });
    matchedSheetRows.forEach((r) => {
      if (r.certificateType) certNamesSet.add(r.certificateType);
    });

    // Extract student email from sheet records if available
    let studentEmail: string | undefined = undefined;
    for (const r of matchedSheetRows) {
      if (r.email && r.email.includes('@')) {
        studentEmail = r.email.trim();
        break;
      }
      if (r.rawValues) {
        for (const [key, val] of Object.entries(r.rawValues)) {
          if (
            (key.toLowerCase().includes('email') || key.toLowerCase().includes('mail')) &&
            val &&
            val.includes('@')
          ) {
            studentEmail = val.trim();
            break;
          }
        }
      }
      if (studentEmail) break;
    }

    if (!studentEmail) {
      studentEmail = `${student.rollNo.toLowerCase()}@pragati.ac.in`;
    }

    // Extract student phone number from sheet records or student object
    let studentPhone: string | undefined = student.phone;
    for (const r of matchedSheetRows) {
      if (r.phone && r.phone.trim()) {
        studentPhone = r.phone.trim();
        break;
      }
      if (r.rawValues) {
        for (const [key, val] of Object.entries(r.rawValues)) {
          if (
            (key.toLowerCase().includes('phone') ||
              key.toLowerCase().includes('mobile') ||
              key.toLowerCase().includes('contact') ||
              key.toLowerCase().includes('whatsapp') ||
              key.toLowerCase().includes('number')) &&
            val &&
            val.trim()
          ) {
            studentPhone = val.trim();
            break;
          }
        }
      }
      if (studentPhone) break;
    }

    // Overall 3-way status: Completed (all 3 true), Not Started (all 3 false), Pending (otherwise)
    let overallStatus: 'COMPLETED' | 'PENDING' | 'NOT STARTED' = 'PENDING';
    if (driveUploaded && sheetUpdated && submitted) {
      overallStatus = 'COMPLETED';
    } else if (!driveUploaded && !sheetUpdated && !submitted) {
      overallStatus = 'NOT STARTED';
    } else {
      overallStatus = 'PENDING';
    }

    // Certificate Quantity Discrepancy (e.g., 3 in Sheet vs 2 in Drive or vice-versa)
    const driveCount = matchedDriveFiles.length;
    const sheetCount = matchedSheetRows.length;
    
    let hasMismatch = false;
    let mismatchType: 'MORE_IN_SHEET' | 'MORE_IN_DRIVE' | 'EQUAL' = 'EQUAL';
    let mismatchDesc = '';

    if (driveCount > 0 && sheetCount > 0 && driveCount !== sheetCount) {
      hasMismatch = true;
      if (driveCount > sheetCount) {
        mismatchType = 'MORE_IN_DRIVE';
        const diff = driveCount - sheetCount;
        mismatchDesc = `${driveCount} Drive file${driveCount > 1 ? 's' : ''} uploaded vs ${sheetCount} Sheet response${sheetCount !== 1 ? 's' : ''} (${diff} missing in Google Sheet)`;
      } else {
        mismatchType = 'MORE_IN_SHEET';
        const diff = sheetCount - driveCount;
        mismatchDesc = `${sheetCount} Sheet response${sheetCount > 1 ? 's' : ''} logged vs ${driveCount} Drive file${driveCount !== 1 ? 's' : ''} (${diff} missing in Google Drive)`;
      }
    } else if (driveCount > 0 && sheetCount === 0 && !sheetUpdated) {
      hasMismatch = true;
      mismatchType = 'MORE_IN_DRIVE';
      mismatchDesc = `${driveCount} Drive file${driveCount > 1 ? 's' : ''} uploaded, but 0 Google Sheet form responses recorded.`;
    } else if (sheetCount > 0 && driveCount === 0 && !driveUploaded) {
      hasMismatch = true;
      mismatchType = 'MORE_IN_SHEET';
      mismatchDesc = `${sheetCount} Sheet response${sheetCount > 1 ? 's' : ''} recorded, but 0 Google Drive PDF files uploaded.`;
    }

    const countMismatch = {
      hasMismatch,
      driveCount,
      sheetCount,
      difference: Math.abs(driveCount - sheetCount),
      type: mismatchType,
      description: mismatchDesc,
    };

    return {
      rollNo: student.rollNo,
      name: student.name,
      email: studentEmail,
      phone: studentPhone,
      certificates: Array.from(certNamesSet),
      driveUploaded,
      sheetUpdated,
      submitted,
      overallStatus,
      countMismatch,
      driveFiles: matchedDriveFiles,
      sheetRecords: matchedSheetRows,
      lastUpdated: new Date().toISOString(),
    };
  });

  const studentsWithCertificates = studentStatuses.filter(
    (s) => s.driveFiles.length > 0 || s.sheetRecords.length > 0
  ).length;

  const durationMs = Date.now() - startTime;

  const report: SyncReport = {
    id: `SYNC-${Date.now().toString(36).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    studentsChecked: FIXED_CLASS_ROSTER.length,
    driveFilesScanned: driveFiles.length,
    matchedCertificates: matchedCertificatesCount,
    studentsWithCertificates,
    spreadsheetRecordsChecked: sheetRows.length,
    spreadsheetMatches: sheetMatchesCount,
    outsideClassIgnored: outsideClassDriveCount + outsideClassSheetCount,
    unidentifiedFiles: unidentifiedFiles.length,
    errors: 0,
    durationMs,
  };

  const reconciliationAnalysis = generateReconciliationAnalysis(
    studentStatuses,
    sheetRows,
    driveFiles
  );

  // Persist report & log
  addSyncReport(report);
  addAuditLog(
    'Sync completed',
    input.userEmail || 'system',
    `Scanned ${driveFiles.length} Drive files & ${sheetRows.length} Sheet rows across 67 students (${report.id})`,
    'SYNC'
  );

  return {
    studentStatuses,
    report,
    reconciliationAnalysis,
    unidentifiedFiles,
    outsideClassFiles,
    duplicateFiles,
    ambiguousCertFiles,
    processedSheetRows: sheetRows,
  };
}
