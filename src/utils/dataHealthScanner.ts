import { StudentStatusRecord, SheetRowRecord, DriveCertificateFile } from '../types';

export type HealthSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export type HealthIssueType =
  | 'DUPLICATE_ROLL_NUMBER'
  | 'MALFORMED_ROLL_NUMBER'
  | 'INVALID_EMAIL_FORMAT'
  | 'INVALID_PHONE_FORMAT'
  | 'MISSING_REQUIRED_FIELD'
  | 'MALFORMED_DATE_TIMESTAMP'
  | 'OUTSIDE_ROSTER_MEMBER'
  | 'DUPLICATE_DRIVE_FILE';

export interface DataHealthIssue {
  id: string;
  type: HealthIssueType;
  severity: HealthSeverity;
  title: string;
  description: string;
  source: 'SHEET' | 'DRIVE' | 'ROSTER';
  rowIndex?: number;
  rollNo?: string;
  fieldName?: string;
  invalidValue?: string;
  suggestedFix?: string;
  autoFixable: boolean;
}

export interface DataHealthReportSummary {
  healthScore: number; // 0 - 100%
  grade: 'A+' | 'A' | 'B' | 'C' | 'F';
  totalIssuesCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  duplicateRollsCount: number;
  malformedFormatsCount: number;
  missingFieldsCount: number;
  dateAnomaliesCount: number;
  issues: DataHealthIssue[];
  scannedRowsCount: number;
  scannedFilesCount: number;
  scannedStudentsCount: number;
  timestamp: string;
}

// Regex validation rules
const ROLL_NUMBER_REGEX = /^[0-9]{2}[A-Za-z0-9]{2,8}$/; // e.g. 21A91A0501
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;

export function runDataHealthScan(
  students: StudentStatusRecord[],
  sheetRows: SheetRowRecord[] = [],
  driveFiles: DriveCertificateFile[] = []
): DataHealthReportSummary {
  const issues: DataHealthIssue[] = [];

  // Track occurrences for duplicate detection
  const rollNoSheetMap = new Map<string, number[]>(); // rollNo -> rowIndices
  const emailSheetMap = new Map<string, number[]>(); // email -> rowIndices
  const driveFileNameMap = new Map<string, string[]>(); // fileName -> fileIds

  // 1. Scan Google Sheet Rows
  sheetRows.forEach((row) => {
    const rIdx = row.rowIndex;
    const rawRoll = (row.rollNo || row.rawValues?.['Roll Number'] || row.rawValues?.['Roll No'] || '').trim();
    const rawName = (row.rawValues?.['Student Name'] || row.rawValues?.['Full Name'] || row.rawValues?.['Name'] || '').trim();
    const rawEmail = (row.email || row.rawValues?.['Email Address'] || row.rawValues?.['Email'] || '').trim();
    const rawPhone = (row.phone || row.rawValues?.['Phone Number'] || row.rawValues?.['Mobile'] || '').trim();
    const certType = (row.certificateType || '').trim();
    const subTime = row.submissionTimestamp;

    // Check Roll Number
    if (!rawRoll) {
      issues.push({
        id: `sheet_missing_roll_${rIdx}`,
        type: 'MISSING_REQUIRED_FIELD',
        severity: 'CRITICAL',
        title: `Blank Roll Number at Sheet Row #${rIdx}`,
        description: `Row #${rIdx} is missing a Roll Number. Data cannot be mapped to roster without roll identification.`,
        source: 'SHEET',
        rowIndex: rIdx,
        fieldName: 'Roll Number',
        invalidValue: '[EMPTY]',
        suggestedFix: 'Provide a valid student Roll Number in row entry.',
        autoFixable: false,
      });
    } else {
      const normRoll = rawRoll.toUpperCase();
      // Track duplicates
      const existing = rollNoSheetMap.get(normRoll) || [];
      existing.push(rIdx);
      rollNoSheetMap.set(normRoll, existing);

      // Check malformed format
      if (!ROLL_NUMBER_REGEX.test(normRoll)) {
        issues.push({
          id: `sheet_malformed_roll_${rIdx}`,
          type: 'MALFORMED_ROLL_NUMBER',
          severity: 'WARNING',
          title: `Malformed Roll Number "${rawRoll}" at Row #${rIdx}`,
          description: `Roll number "${rawRoll}" contains unusual characters or invalid character length.`,
          source: 'SHEET',
          rowIndex: rIdx,
          rollNo: rawRoll,
          fieldName: 'Roll Number',
          invalidValue: rawRoll,
          suggestedFix: `Format as uppercase alphanumeric (e.g. ${normRoll.replace(/[^A-Z0-9]/gi, '')})`,
          autoFixable: true,
        });
      }
    }

    // Check Email Address
    if (rawEmail) {
      if (!EMAIL_REGEX.test(rawEmail)) {
        issues.push({
          id: `sheet_invalid_email_${rIdx}`,
          type: 'INVALID_EMAIL_FORMAT',
          severity: 'WARNING',
          title: `Invalid Email Syntax at Row #${rIdx}`,
          description: `Email "${rawEmail}" at row #${rIdx} is missing @ symbol or domain name.`,
          source: 'SHEET',
          rowIndex: rIdx,
          rollNo: rawRoll,
          fieldName: 'Email',
          invalidValue: rawEmail,
          suggestedFix: 'Fix missing @ symbol or domain extension (e.g., student@college.edu).',
          autoFixable: false,
        });
      } else {
        const normEmail = rawEmail.toLowerCase();
        const existingEmails = emailSheetMap.get(normEmail) || [];
        existingEmails.push(rIdx);
        emailSheetMap.set(normEmail, existingEmails);
      }
    }

    // Check Phone Number if present
    if (rawPhone) {
      const cleanPhone = rawPhone.replace(/[\s\-\(\)]/g, '');
      if (cleanPhone && !PHONE_REGEX.test(cleanPhone)) {
        issues.push({
          id: `sheet_invalid_phone_${rIdx}`,
          type: 'INVALID_PHONE_FORMAT',
          severity: 'INFO',
          title: `Malformed Phone Number at Row #${rIdx}`,
          description: `Phone number "${rawPhone}" contains non-numeric formatting or invalid digit count.`,
          source: 'SHEET',
          rowIndex: rIdx,
          rollNo: rawRoll,
          fieldName: 'Phone Number',
          invalidValue: rawPhone,
          suggestedFix: 'Format with country code (e.g. +91 9876543210 or 10 digits).',
          autoFixable: true,
        });
      }
    }

    // Check Certificate Type
    if (!certType) {
      issues.push({
        id: `sheet_missing_cert_${rIdx}`,
        type: 'MISSING_REQUIRED_FIELD',
        severity: 'INFO',
        title: `Blank Certificate Type at Row #${rIdx}`,
        description: `Row #${rIdx} does not specify a certificate type or domain name.`,
        source: 'SHEET',
        rowIndex: rIdx,
        rollNo: rawRoll,
        fieldName: 'Certificate Type',
        invalidValue: '[BLANK]',
        suggestedFix: 'Assign default certificate category (e.g., Workshop / NPTEL / Hackathon).',
        autoFixable: true,
      });
    }

    // Check Timestamp
    if (subTime) {
      const parsedDate = new Date(subTime);
      if (isNaN(parsedDate.getTime())) {
        issues.push({
          id: `sheet_bad_date_${rIdx}`,
          type: 'MALFORMED_DATE_TIMESTAMP',
          severity: 'WARNING',
          title: `Unparseable Timestamp at Row #${rIdx}`,
          description: `Timestamp string "${subTime}" cannot be parsed into a valid Date object.`,
          source: 'SHEET',
          rowIndex: rIdx,
          rollNo: rawRoll,
          fieldName: 'Timestamp',
          invalidValue: String(subTime),
          suggestedFix: 'Use ISO date standard format (YYYY-MM-DD HH:MM:SS).',
          autoFixable: true,
        });
      } else if (parsedDate.getTime() > Date.now() + 86400000) {
        issues.push({
          id: `sheet_future_date_${rIdx}`,
          type: 'MALFORMED_DATE_TIMESTAMP',
          severity: 'WARNING',
          title: `Future Timestamp Detected at Row #${rIdx}`,
          description: `Submission date (${parsedDate.toLocaleString()}) is set in the future.`,
          source: 'SHEET',
          rowIndex: rIdx,
          rollNo: rawRoll,
          fieldName: 'Timestamp',
          invalidValue: parsedDate.toISOString(),
          suggestedFix: 'Reset timestamp to current server time.',
          autoFixable: true,
        });
      }
    }
  });

  // Flag Duplicate Roll Numbers in Sheet
  rollNoSheetMap.forEach((rowIndices, rollNo) => {
    if (rowIndices.length > 1) {
      issues.push({
        id: `sheet_duplicate_roll_${rollNo}`,
        type: 'DUPLICATE_ROLL_NUMBER',
        severity: 'CRITICAL',
        title: `Duplicate Sheet Entries for Roll No "${rollNo}" (${rowIndices.length} submissions)`,
        description: `Student "${rollNo}" has submitted Google Form ${rowIndices.length} times at Rows #${rowIndices.join(', #')}.`,
        source: 'SHEET',
        rollNo,
        fieldName: 'Roll Number',
        invalidValue: `${rowIndices.length} Rows (#${rowIndices.join(', #')})`,
        suggestedFix: 'Inspect duplicate entries and keep the latest valid form submission.',
        autoFixable: false,
      });
    }
  });

  // 2. Scan Google Drive Files
  driveFiles.forEach((file) => {
    const fname = file.name.trim();
    const existing = driveFileNameMap.get(fname) || [];
    existing.push(file.id);
    driveFileNameMap.set(fname, existing);

    // Check if filename has zero extension or bad file type
    const ext = fname.split('.').pop()?.toLowerCase();
    if (ext && !['pdf', 'png', 'jpg', 'jpeg', 'webp', 'docx'].includes(ext)) {
      issues.push({
        id: `drive_bad_ext_${file.id}`,
        type: 'MISSING_REQUIRED_FIELD',
        severity: 'INFO',
        title: `Unusual File Format "${fname}"`,
        description: `Drive file extension ".${ext}" may not be easily viewable in preview modal.`,
        source: 'DRIVE',
        fieldName: 'File Format',
        invalidValue: file.name,
        suggestedFix: 'Convert file to standard PDF or JPEG image.',
        autoFixable: false,
      });
    }
  });

  // Flag Duplicate Drive Files
  driveFileNameMap.forEach((ids, fileName) => {
    if (ids.length > 1) {
      issues.push({
        id: `drive_dup_file_${fileName}`,
        type: 'DUPLICATE_DRIVE_FILE',
        severity: 'WARNING',
        title: `Duplicate File Name "${fileName}" in Google Drive`,
        description: `${ids.length} files in Google Drive share the exact same file name "${fileName}".`,
        source: 'DRIVE',
        fieldName: 'File Name',
        invalidValue: fileName,
        suggestedFix: 'Remove or rename duplicate PDF files in Drive folder.',
        autoFixable: false,
      });
    }
  });

  // Categorize issue counts
  const criticalCount = issues.filter((i) => i.severity === 'CRITICAL').length;
  const warningCount = issues.filter((i) => i.severity === 'WARNING').length;
  const infoCount = issues.filter((i) => i.severity === 'INFO').length;

  const duplicateRollsCount = issues.filter((i) => i.type === 'DUPLICATE_ROLL_NUMBER').length;
  const malformedFormatsCount = issues.filter(
    (i) => i.type === 'MALFORMED_ROLL_NUMBER' || i.type === 'INVALID_EMAIL_FORMAT' || i.type === 'INVALID_PHONE_FORMAT'
  ).length;
  const missingFieldsCount = issues.filter((i) => i.type === 'MISSING_REQUIRED_FIELD').length;
  const dateAnomaliesCount = issues.filter((i) => i.type === 'MALFORMED_DATE_TIMESTAMP').length;

  // Compute Health Score (0 - 100%)
  // Start at 100%, deduct: Critical = -15%, Warning = -5%, Info = -2%
  let score = 100 - (criticalCount * 12 + warningCount * 4 + infoCount * 1.5);
  score = Math.max(0, Math.min(100, Math.round(score)));

  let grade: 'A+' | 'A' | 'B' | 'C' | 'F' = 'A+';
  if (score >= 95) grade = 'A+';
  else if (score >= 85) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 50) grade = 'C';
  else grade = 'F';

  return {
    healthScore: score,
    grade,
    totalIssuesCount: issues.length,
    criticalCount,
    warningCount,
    infoCount,
    duplicateRollsCount,
    malformedFormatsCount,
    missingFieldsCount,
    dateAnomaliesCount,
    issues,
    scannedRowsCount: sheetRows.length,
    scannedFilesCount: driveFiles.length,
    scannedStudentsCount: students.length,
    timestamp: new Date().toISOString(),
  };
}

export function exportDataHealthReportCsv(report: DataHealthReportSummary) {
  const lines: string[] = [];
  lines.push(`"DATA HEALTH AUDIT REPORT"`);
  lines.push(`"Overall Health Score",${report.healthScore}%`);
  lines.push(`"Health Grade","${report.grade}"`);
  lines.push(`"Total Issues Detected",${report.totalIssuesCount}`);
  lines.push(`"Critical Errors",${report.criticalCount}`);
  lines.push(`"Warnings",${report.warningCount}`);
  lines.push(`"Generated At","${new Date().toLocaleString()}"`);
  lines.push('');
  lines.push(`"Issue ID","Source","Severity","Issue Category","Title","Row #","Roll No","Field","Invalid Value","Description","Suggested Fix"`);

  report.issues.forEach((iss) => {
    lines.push(
      `"${iss.id}","${iss.source}","${iss.severity}","${iss.type}","${iss.title.replace(/"/g, '""')}","${iss.rowIndex || ''}","${
        iss.rollNo || ''
      }","${iss.fieldName || ''}","${(iss.invalidValue || '').replace(/"/g, '""')}","${iss.description.replace(
        /"/g,
        '""'
      )}","${(iss.suggestedFix || '').replace(/"/g, '""')}"`
    );
  });

  const csvContent = '\uFEFF' + lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Data_Health_Report_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
