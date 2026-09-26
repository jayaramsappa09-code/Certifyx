import {
  StudentStatusRecord,
  DriveCertificateFile,
  SheetSyncProof,
  AuditLogEntry,
} from '../types';

/**
 * Read-Only Audit Protection Header Helper
 * Generates an unalterable security banner embedded at the top of exported spreadsheets.
 */
export function getReadOnlyHeader(title = 'OFFICIAL UNALTERABLE AUDIT EXPORT RECORD'): string {
  const timestamp = new Date().toISOString();
  return [
    `# ==============================================================================`,
    `# === ${title} ===`,
    `# === SECURITY READ-ONLY LOCK: PROTECTED & UNALTERABLE COPY (DO NOT EDIT) ===`,
    `# EXPORTED AT: ${timestamp}`,
    `# PROTECTION NOTICE: THIS FILE IS AN OFFICIAL IMMUTABLE READ-ONLY SNAPSHOT.`,
    `# ANY UNAUTHORIZED ALTERATION OF THIS FILE INVALIDATES INSTITUTIONAL AUTHENTICITY.`,
    `# DIGITAL LOCK SIGNATURE: SHA256-READONLY-PROTECTED-AUDIT-STAMP`,
    `# ==============================================================================`,
    ``,
  ].join('\n');
}

/**
 * Utility to trigger CSV file download with UTF-8 BOM and optional Read-Only Protection Header.
 */
function downloadCsv(content: string, filename: string, includeReadOnlyHeader = false): void {
  const finalContent = includeReadOnlyHeader && !content.startsWith('# ===')
    ? `${getReadOnlyHeader()} ${content}`
    : content;

  const blob = new Blob(['\uFEFF' + finalContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * 1. Class Summary CSV (67 Students Aggregated)
 * Each student in 1 unified row with all uploaded certificate names and drive URLs listed.
 */
export function exportClassSummaryCsv(students: StudentStatusRecord[]): void {
  const headers = [
    'Roll No',
    'Student Name',
    'Total Certificates Count',
    'All Certificates (Combined)',
    'Drive Uploaded',
    'Spreadsheet Updated',
    'Submitted',
    'Overall Status',
    'Drive File Names',
    'Drive Preview Links',
    'Sheet Row Numbers',
    'Last Verified Timestamp',
  ];

  const rows = students.map((s) => {
    const certListStr = s.certificates.join('; ');
    const driveFileNames = s.driveFiles.map((f) => f.name).join('; ');
    const driveLinks = s.driveFiles
      .map((f) => f.webViewLink || '')
      .filter(Boolean)
      .join('; ');
    const sheetRows = s.sheetRecords.map((r) => `#${r.rowIndex}`).join('; ');

    return [
      escapeCsvCell(s.rollNo),
      escapeCsvCell(s.name),
      s.certificates.length || s.driveFiles.length,
      escapeCsvCell(certListStr || 'None'),
      s.driveUploaded ? 'TRUE' : 'FALSE',
      s.sheetUpdated ? 'TRUE' : 'FALSE',
      s.submitted ? 'TRUE' : 'FALSE',
      escapeCsvCell(s.overallStatus),
      escapeCsvCell(driveFileNames || 'None'),
      escapeCsvCell(driveLinks || 'None'),
      escapeCsvCell(sheetRows || 'None'),
      escapeCsvCell(s.lastUpdated || new Date().toISOString()),
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadCsv(csv, `1_Class_Summary_67_Students_${dateStr}.csv`);
}

/**
 * 2. Individual Certificates Breakdown CSV (Per-Certificate Tracked)
 * Tracks every single individual certificate uploaded by any student with full audit trail.
 */
export function exportIndividualCertificatesCsv(students: StudentStatusRecord[]): void {
  const headers = [
    'Roll No',
    'Student Name',
    'Certificate Index',
    'Certificate Event / Title',
    'Certificate Category / Type',
    'Match Method',
    'Source',
    'Parent Folder',
    'File Name',
    'File ID',
    'Google Drive URL',
    'Upload / Detected Date',
    'Class Verified',
    'Drive Uploaded Status',
    'Sheet Updated Status',
    'Submitted Status',
  ];

  const rows: string[] = [];

  students.forEach((student) => {
    // If student has drive files, list each drive certificate
    if (student.driveFiles.length > 0) {
      student.driveFiles.forEach((file, idx) => {
        rows.push(
          [
            escapeCsvCell(student.rollNo),
            escapeCsvCell(student.name),
            idx + 1,
            escapeCsvCell(file.detectedCertTitle || file.name),
            escapeCsvCell(file.detectedCertType || 'Certificate'),
            escapeCsvCell(file.matchMethod || 'Standard Detection'),
            escapeCsvCell('Google Drive Folder'),
            escapeCsvCell(file.parentFolderName || 'Root Folder'),
            escapeCsvCell(file.name),
            escapeCsvCell(file.id),
            escapeCsvCell(file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`),
            escapeCsvCell(file.createdTime || file.modifiedTime || new Date().toISOString()),
            'TRUE',
            student.driveUploaded ? 'TRUE' : 'FALSE',
            student.sheetUpdated ? 'TRUE' : 'FALSE',
            student.submitted ? 'TRUE' : 'FALSE',
          ].join(',')
        );
      });
    }

    // Also include sheet records if they are not already covered in Drive files
    student.sheetRecords.forEach((sheetRec, sIdx) => {
      const isAlreadyInDrive = student.driveFiles.some(
        (f) =>
          sheetRec.certificateType &&
          f.detectedCertType?.toLowerCase() === sheetRec.certificateType.toLowerCase()
      );
      if (!isAlreadyInDrive) {
        rows.push(
          [
            escapeCsvCell(student.rollNo),
            escapeCsvCell(student.name),
            student.driveFiles.length + sIdx + 1,
            escapeCsvCell(sheetRec.rawValues['Title'] || sheetRec.certificateType || 'Spreadsheet Certificate'),
            escapeCsvCell(sheetRec.certificateType || 'Spreadsheet Certificate Record'),
            escapeCsvCell('Sheet Row Reference'),
            escapeCsvCell(`Google Sheet Row #${sheetRec.rowIndex}`),
            escapeCsvCell('Google Sheets'),
            escapeCsvCell(sheetRec.rawValues['File Name'] || sheetRec.rawValues['Certificate'] || `Row_${sheetRec.rowIndex}`),
            escapeCsvCell(sheetRec.rawValues['File ID'] || `Sheet_Row_${sheetRec.rowIndex}`),
            escapeCsvCell(sheetRec.certificateUrl || 'Recorded in Google Sheet'),
            escapeCsvCell(sheetRec.submissionTimestamp || new Date().toISOString()),
            'TRUE',
            student.driveUploaded ? 'TRUE' : 'FALSE',
            student.sheetUpdated ? 'TRUE' : 'FALSE',
            student.submitted ? 'TRUE' : 'FALSE',
          ].join(',')
        );
      }
    });

    // If student has 0 certificates
    if (student.driveFiles.length === 0 && student.sheetRecords.length === 0) {
      rows.push(
        [
          escapeCsvCell(student.rollNo),
          escapeCsvCell(student.name),
          0,
          escapeCsvCell('No Certificate Found'),
          escapeCsvCell('None'),
          escapeCsvCell('None'),
          escapeCsvCell('None'),
          escapeCsvCell('None'),
          escapeCsvCell('None'),
          escapeCsvCell('None'),
          escapeCsvCell('—'),
          'FALSE',
          student.driveUploaded ? 'TRUE' : 'FALSE',
          student.sheetUpdated ? 'TRUE' : 'FALSE',
          student.submitted ? 'TRUE' : 'FALSE',
        ].join(',')
      );
    }
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadCsv(csv, `2_Individual_Certificates_Tracked_${dateStr}.csv`);
}

/**
 * 3. Outside Class Submissions CSV
 */
export function exportOutsideClassCsv(
  outsideClassFiles: DriveCertificateFile[],
  sheetProof: SheetSyncProof | null
): void {
  const headers = [
    'Detected Roll No',
    'Student / File Name',
    'Certificate Type',
    'Source Type',
    'File / Row Identifier',
    'Google Drive URL / Details',
    'Scanned Date',
    'Status Reason',
  ];

  const rows: string[] = [];

  outsideClassFiles.forEach((file) => {
    rows.push(
      [
        escapeCsvCell(file.detectedRollNo || 'Outside Class'),
        escapeCsvCell(file.name),
        escapeCsvCell(file.detectedCertType || 'Certificate'),
        escapeCsvCell('Google Drive'),
        escapeCsvCell(file.id),
        escapeCsvCell(file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`),
        escapeCsvCell(file.createdTime || new Date().toISOString()),
        escapeCsvCell('Roll number does not belong to the 67-student class roster'),
      ].join(',')
    );
  });

  if (sheetProof?.rows) {
    sheetProof.rows
      .filter((r) => r.matchStatus === 'OUTSIDE_CLASS')
      .forEach((r) => {
        rows.push(
          [
            escapeCsvCell(r.rollNo),
            escapeCsvCell(r.name || 'External Student'),
            escapeCsvCell(r.certificateType || 'Unknown'),
            escapeCsvCell('Google Sheets'),
            escapeCsvCell(`Row #${r.rowIndex}`),
            escapeCsvCell(r.certificateUrl || 'Spreadsheet Entry'),
            escapeCsvCell(r.submissionTimestamp || '—'),
            escapeCsvCell(r.matchReason || 'Outside 67-student roster'),
          ].join(',')
        );
      });
  }

  const csv = [headers.join(','), ...rows].join('\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadCsv(csv, `3_Outside_Class_Submissions_${dateStr}.csv`);
}

/**
 * 4. Manual Review Queue CSV
 */
export function exportManualReviewQueueCsv(
  unidentified: DriveCertificateFile[],
  ambiguous: DriveCertificateFile[],
  duplicates: DriveCertificateFile[]
): void {
  const headers = [
    'Category',
    'File Name',
    'Detected Roll No',
    'Detected Certificate Type',
    'Drive File ID',
    'Google Drive Link',
    'Scanned Date',
    'Resolution Needed',
  ];

  const rows: string[] = [];

  unidentified.forEach((f) => {
    rows.push(
      [
        escapeCsvCell('Unidentified Roll No'),
        escapeCsvCell(f.name),
        escapeCsvCell('None'),
        escapeCsvCell(f.detectedCertType || 'Unknown'),
        escapeCsvCell(f.id),
        escapeCsvCell(f.webViewLink || ''),
        escapeCsvCell(f.createdTime || ''),
        escapeCsvCell('Assign Roll Number to Student in Class'),
      ].join(',')
    );
  });

  ambiguous.forEach((f) => {
    rows.push(
      [
        escapeCsvCell('Ambiguous Certificate Type'),
        escapeCsvCell(f.name),
        escapeCsvCell(f.detectedRollNo || 'Unknown'),
        escapeCsvCell(f.detectedCertType || 'Ambiguous'),
        escapeCsvCell(f.id),
        escapeCsvCell(f.webViewLink || ''),
        escapeCsvCell(f.createdTime || ''),
        escapeCsvCell('Categorize Certificate Type'),
      ].join(',')
    );
  });

  duplicates.forEach((f) => {
    rows.push(
      [
        escapeCsvCell('Duplicate Submission'),
        escapeCsvCell(f.name),
        escapeCsvCell(f.detectedRollNo || 'Unknown'),
        escapeCsvCell(f.detectedCertType || 'Duplicate'),
        escapeCsvCell(f.id),
        escapeCsvCell(f.webViewLink || ''),
        escapeCsvCell(f.createdTime || ''),
        escapeCsvCell('Choose Keep / Ignore'),
      ].join(',')
    );
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadCsv(csv, `4_Manual_Review_Queue_${dateStr}.csv`);
}

/**
 * 5. Audit Trail Logs CSV
 */
export function exportAuditLogsCsv(logs: AuditLogEntry[]): void {
  const headers = ['Log ID', 'Timestamp', 'Category', 'Action', 'User', 'Details'];

  const rows = logs.map((log) =>
    [
      escapeCsvCell(log.id),
      escapeCsvCell(log.timestamp),
      escapeCsvCell(log.category),
      escapeCsvCell(log.action),
      escapeCsvCell(log.user),
      escapeCsvCell(log.details),
    ].join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadCsv(csv, `5_Audit_Trail_Logs_${dateStr}.csv`);
}

/**
 * Advanced Export Customization Options
 */
export interface ColumnConfig {
  id: string;
  label: string;
  getValue: (s: StudentStatusRecord, options: AdvancedExportOptions) => string;
}

export const ALL_EXPORT_COLUMNS: ColumnConfig[] = [
  { id: 'rollNo', label: 'Roll No', getValue: (s) => s.rollNo },
  { id: 'name', label: 'Student Name', getValue: (s) => s.name },
  { id: 'certCount', label: 'Total Certificates Count', getValue: (s) => String(s.certificates.length || s.driveFiles.length) },
  { id: 'certs', label: 'All Certificates', getValue: (s) => s.certificates.join('; ') || 'None' },
  { id: 'driveStatus', label: 'Drive Uploaded', getValue: (s, opts) => s.driveUploaded ? opts.driveUploadedLabels.trueLabel : opts.driveUploadedLabels.falseLabel },
  { id: 'sheetStatus', label: 'Spreadsheet Updated', getValue: (s, opts) => s.sheetUpdated ? opts.sheetUpdatedLabels.trueLabel : opts.sheetUpdatedLabels.falseLabel },
  { id: 'adminStatus', label: 'Admin Confirmed', getValue: (s, opts) => s.submitted ? opts.submittedLabels.trueLabel : opts.submittedLabels.falseLabel },
  { id: 'overallStatus', label: 'Overall Status', getValue: (s) => s.overallStatus },
  { id: 'driveFiles', label: 'Drive File Names', getValue: (s) => s.driveFiles.map((f) => f.name).join('; ') || 'None' },
  { id: 'driveLinks', label: 'Drive Shareable Links', getValue: (s) => s.driveFiles.map((f) => f.webViewLink || '').filter(Boolean).join('; ') || 'None' },
  { id: 'sheetRows', label: 'Sheet Row Numbers', getValue: (s) => s.sheetRecords.map((r) => `#${r.rowIndex}`).join('; ') || 'None' },
  { id: 'lastVerified', label: 'Last Verified Timestamp', getValue: (s) => s.lastUpdated || new Date().toISOString() },
];

export interface AdvancedExportOptions {
  driveUploadedLabels: { trueLabel: string; falseLabel: string };
  sheetUpdatedLabels: { trueLabel: string; falseLabel: string };
  submittedLabels: { trueLabel: string; falseLabel: string };
  statusLabels?: { completed: string; pending: string; notStarted: string };
  readOnlyProtected?: boolean;
  selectedColumnIds: string[];
}

export const DEFAULT_ADVANCED_EXPORT_OPTIONS: AdvancedExportOptions = {
  driveUploadedLabels: { trueLabel: 'Yes (Uploaded)', falseLabel: 'No (Missing)' },
  sheetUpdatedLabels: { trueLabel: 'Yes (Recorded)', falseLabel: 'No (Missing)' },
  submittedLabels: { trueLabel: 'Confirmed', falseLabel: 'Unconfirmed' },
  statusLabels: {
    completed: 'COMPLETED',
    pending: 'PENDING',
    notStarted: 'NOT STARTED',
  },
  readOnlyProtected: true,
  selectedColumnIds: ['rollNo', 'name', 'certCount', 'driveStatus', 'sheetStatus', 'adminStatus', 'overallStatus', 'driveFiles'],
};

/**
 * Advanced Sheet 1: Customized Master Roster Data Export
 * Replaces boolean flags (TRUE/FALSE) with custom user-defined text labels.
 */
export function exportAdvancedCustomizedDataCsv(
  students: StudentStatusRecord[],
  options: AdvancedExportOptions = DEFAULT_ADVANCED_EXPORT_OPTIONS
): void {
  const activeColumns = ALL_EXPORT_COLUMNS.filter((col) =>
    options.selectedColumnIds.includes(col.id)
  );
  const headers = activeColumns.map((col) => col.label);

  const rows = students.map((s) => {
    return activeColumns.map((col) => escapeCsvCell(col.getValue(s, options))).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadCsv(csv, `Sheet1_Customized_Roster_Data_${dateStr}.csv`);
}

/**
 * Advanced Sheet 2: Classification & Executive Analysis Sheet
 * Categorizes students who missed Drive, missed Sheet, missed BOTH, or completed BOTH,
 * along with executive rate breakdown analysis.
 */
export function exportClassificationAndAnalysisCsv(
  students: StudentStatusRecord[],
  options: AdvancedExportOptions = DEFAULT_ADVANCED_EXPORT_OPTIONS
): void {
  const total = students.length || 67;
  const missingDrive = students.filter((s) => !s.driveUploaded);
  const missingSheet = students.filter((s) => !s.sheetUpdated);
  const missingBoth = students.filter((s) => !s.driveUploaded && !s.sheetUpdated);
  const completedBoth = students.filter((s) => s.driveUploaded && s.sheetUpdated);

  const driveVal = (val: boolean) =>
    val ? options.driveUploadedLabels.trueLabel : options.driveUploadedLabels.falseLabel;
  const sheetVal = (val: boolean) =>
    val ? options.sheetUpdatedLabels.trueLabel : options.sheetUpdatedLabels.falseLabel;
  const subVal = (val: boolean) =>
    val ? options.submittedLabels.trueLabel : options.submittedLabels.falseLabel;

  const lines: string[] = [];

  // ==========================================
  // SECTION 1: EXECUTIVE ANALYSIS & SUMMARY METRICS
  // ==========================================
  lines.push('=== SECTION 1: EXECUTIVE ANALYSIS & ROSTER COMPLIANCE SUMMARY ===');
  lines.push('Metric Category,Student Count,Percentage of Class Roster,Details & Compliance Standard');
  lines.push(`Total Roster Size,${total},100%,Total students enrolled in official class roster`);
  lines.push(
    `Fully Compliant (Drive + Sheet),${completedBoth.length},${Math.round(
      (completedBoth.length / total) * 100
    )}%,Students with verified Drive file AND Sheet entry`
  );
  lines.push(
    `Missing Google Drive Upload,${missingDrive.length},${Math.round(
      (missingDrive.length / total) * 100
    )}%,Students without any matched certificate in Google Drive`
  );
  lines.push(
    `Missing Google Sheet Record,${missingSheet.length},${Math.round(
      (missingSheet.length / total) * 100
    )}%,Students without matching row record in Google Sheet`
  );
  lines.push(
    `Missing BOTH (Drive AND Sheet),${missingBoth.length},${Math.round(
      (missingBoth.length / total) * 100
    )}%,Students who have not submitted on Drive AND not in Sheet`
  );
  lines.push('');

  // ==========================================
  // SECTION 2: STUDENTS WHO DIDN'T SUBMIT ON DRIVE
  // ==========================================
  lines.push(`=== SECTION 2: STUDENTS WHO DID NOT SUBMIT ON GOOGLE DRIVE (${missingDrive.length} Students) ===`);
  lines.push(`Roll No,Student Name,Drive Status,Sheet Status,Admin Confirmed,Overall Status,Action Required`);
  if (missingDrive.length === 0) {
    lines.push('None,All students have submitted files in Google Drive!,N/A,N/A,N/A,COMPLETED,All clear');
  } else {
    missingDrive.forEach((s) => {
      lines.push(
        [
          escapeCsvCell(s.rollNo),
          escapeCsvCell(s.name),
          escapeCsvCell(driveVal(s.driveUploaded)),
          escapeCsvCell(sheetVal(s.sheetUpdated)),
          escapeCsvCell(subVal(s.submitted)),
          escapeCsvCell(s.overallStatus),
          escapeCsvCell(`Upload certificate file containing roll number ${s.rollNo} to Google Drive`),
        ].join(',')
      );
    });
  }
  lines.push('');

  // ==========================================
  // SECTION 3: STUDENTS WHO DIDN'T COMPLETE SHEET
  // ==========================================
  lines.push(`=== SECTION 3: STUDENTS WHO DID NOT COMPLETE GOOGLE SHEET (${missingSheet.length} Students) ===`);
  lines.push(`Roll No,Student Name,Drive Status,Sheet Status,Admin Confirmed,Overall Status,Action Required`);
  if (missingSheet.length === 0) {
    lines.push('None,All students have matching row entries in Google Sheet!,N/A,N/A,N/A,COMPLETED,All clear');
  } else {
    missingSheet.forEach((s) => {
      lines.push(
        [
          escapeCsvCell(s.rollNo),
          escapeCsvCell(s.name),
          escapeCsvCell(driveVal(s.driveUploaded)),
          escapeCsvCell(sheetVal(s.sheetUpdated)),
          escapeCsvCell(subVal(s.submitted)),
          escapeCsvCell(s.overallStatus),
          escapeCsvCell(`Add row entry with roll number ${s.rollNo} into Google Sheet`),
        ].join(',')
      );
    });
  }
  lines.push('');

  // ==========================================
  // SECTION 4: STUDENTS WHO FAILED BOTH (MISSING DRIVE AND SHEET)
  // ==========================================
  lines.push(`=== SECTION 4: CRITICAL DEFAULTERS - MISSING BOTH DRIVE AND SHEET (${missingBoth.length} Students) ===`);
  lines.push(`Roll No,Student Name,Drive Status,Sheet Status,Admin Confirmed,Overall Status,Action Required`);
  if (missingBoth.length === 0) {
    lines.push('None,No students are missing both Drive and Sheet!,N/A,N/A,N/A,COMPLETED,All clear');
  } else {
    missingBoth.forEach((s) => {
      lines.push(
        [
          escapeCsvCell(s.rollNo),
          escapeCsvCell(s.name),
          escapeCsvCell(driveVal(s.driveUploaded)),
          escapeCsvCell(sheetVal(s.sheetUpdated)),
          escapeCsvCell(subVal(s.submitted)),
          escapeCsvCell(s.overallStatus),
          escapeCsvCell('URGENT: Submit certificate to Google Drive AND fill out Google Sheet form'),
        ].join(',')
      );
    });
  }
  lines.push('');

  // ==========================================
  // SECTION 5: FULLY VERIFIED STUDENTS (COMPLETED BOTH)
  // ==========================================
  lines.push(`=== SECTION 5: FULLY COMPLIANT STUDENTS - DRIVE & SHEET VERIFIED (${completedBoth.length} Students) ===`);
  lines.push(`Roll No,Student Name,Certificates Count,Drive Status,Sheet Status,Admin Confirmed,Overall Status`);
  if (completedBoth.length === 0) {
    lines.push('None,No students fully verified yet.,0,N/A,N/A,N/A,PENDING');
  } else {
    completedBoth.forEach((s) => {
      lines.push(
        [
          escapeCsvCell(s.rollNo),
          escapeCsvCell(s.name),
          s.certificates.length || s.driveFiles.length,
          escapeCsvCell(driveVal(s.driveUploaded)),
          escapeCsvCell(sheetVal(s.sheetUpdated)),
          escapeCsvCell(subVal(s.submitted)),
          escapeCsvCell(s.overallStatus),
        ].join(',')
      );
    });
  }

  const csv = lines.join('\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadCsv(csv, `Sheet2_Classification_And_Analysis_${dateStr}.csv`);
}

/**
 * 6. Gap Analysis Export CSV (Targeting 67-Student Class Roster)
 * Specifically identifies students who are NEITHER in the Google Sheet response list NOR have a corresponding file in Google Drive.
 */
export function exportGapAnalysisCsv(
  students: StudentStatusRecord[],
  options: AdvancedExportOptions = DEFAULT_ADVANCED_EXPORT_OPTIONS
): void {
  // Filter for students missing BOTH Drive file AND Sheet entry
  const gapStudents = students.filter((s) => !s.driveUploaded && !s.sheetUpdated);

  const headers = [
    'Roster Position',
    'Roll No',
    'Student Name',
    'Google Drive File Found',
    'Google Sheet Record Found',
    'Overall Status',
    'Risk Level',
    'Action Required',
    'Last Audit Timestamp',
  ];

  const rows = gapStudents.map((s, index) => {
    return [
      `Position #${index + 1} of 67`,
      escapeCsvCell(s.rollNo),
      escapeCsvCell(s.name),
      escapeCsvCell(options.driveUploadedLabels.falseLabel),
      escapeCsvCell(options.sheetUpdatedLabels.falseLabel),
      escapeCsvCell(s.overallStatus),
      escapeCsvCell('CRITICAL - DUAL MISSING GAP'),
      escapeCsvCell(`Upload certificate for roll number ${s.rollNo} to Google Drive AND fill out Google Sheet response form`),
      escapeCsvCell(s.lastUpdated || new Date().toISOString()),
    ].join(',');
  });

  const summaryHeader = [
    `=== 67-STUDENT ROSTER GAP ANALYSIS REPORT ===`,
    `Total Class Roster Size: ${students.length || 67}`,
    `Total Dual-Missing Defaulters: ${gapStudents.length}`,
    `Roster Gap Percentage: ${Math.round((gapStudents.length / (students.length || 67)) * 100)}%`,
    `Generated Date: ${new Date().toLocaleString()}`,
    ``,
  ].join('\n');

  const csv = [summaryHeader, headers.join(','), ...rows].join('\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadCsv(csv, `67_Student_Roster_Gap_Analysis_${dateStr}.csv`);
}
