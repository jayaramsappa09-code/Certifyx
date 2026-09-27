import {
  StudentStatusRecord,
  SheetRowRecord,
  DriveCertificateFile,
  ReconciliationAnalysis,
} from '../types';
import { FIXED_CLASS_ROSTER, normalizeRollNumber, isValidClassRollNumber } from '../data/classRoster';

/**
 * Performs deep multi-source cross-reconciliation across:
 * 1. 67-Student Fixed Roster
 * 2. Google Sheets Rows / Form Responses
 * 3. Google Drive Uploaded Certificate Files
 */
export function generateReconciliationAnalysis(
  students: StudentStatusRecord[],
  sheetRows: SheetRowRecord[] = [],
  driveFiles: DriveCertificateFile[] = [],
  strictRosterEnforced: boolean = true
): ReconciliationAnalysis {
  const timestamp = new Date().toISOString();
  const totalRosterStudents = FIXED_CLASS_ROSTER.length;
  const totalSheetRowsScanned = sheetRows.length;
  const totalDriveFilesScanned = driveFiles.length;

  // 1. Roster Students Missing from Spreadsheet
  const rosterMissingInSheet: ReconciliationAnalysis['rosterMissingInSheet'] = [];
  const driveMissingInSheet: ReconciliationAnalysis['driveMissingInSheet'] = [];
  const sheetMissingInDrive: ReconciliationAnalysis['sheetMissingInDrive'] = [];
  const quantityMismatches: ReconciliationAnalysis['quantityMismatches'] = [];

  students.forEach((student) => {
    const sheetCount = student.sheetRecords ? student.sheetRecords.length : (student.sheetUpdated ? 1 : 0);
    const driveCount = student.driveFiles ? student.driveFiles.length : (student.driveUploaded ? 1 : 0);

    // Gaps: In Roster, Missing from Sheet
    if (sheetCount === 0) {
      rosterMissingInSheet.push({
        rollNo: student.rollNo,
        name: student.name,
        driveFilesCount: driveCount,
        overallStatus: student.overallStatus,
        hasDriveFiles: driveCount > 0,
      });
    }

    // Gaps: In Drive, Missing from Sheet
    if (driveCount > 0 && sheetCount === 0) {
      driveMissingInSheet.push({
        rollNo: student.rollNo,
        name: student.name,
        fileCount: driveCount,
        files: student.driveFiles || [],
      });
    }

    // Gaps: In Sheet, Missing from Drive
    if (sheetCount > 0 && driveCount === 0) {
      sheetMissingInDrive.push({
        rollNo: student.rollNo,
        name: student.name,
        sheetCount,
        records: student.sheetRecords || [],
      });
    }

    // Quantity / Count Discrepancies (both have > 0 but mismatch, or 1 vs 2, 3 vs 2, etc.)
    if (student.countMismatch && student.countMismatch.hasMismatch) {
      quantityMismatches.push({
        rollNo: student.rollNo,
        name: student.name,
        sheetCount: student.countMismatch.sheetCount,
        driveCount: student.countMismatch.driveCount,
        difference: student.countMismatch.difference,
        type: student.countMismatch.type === 'MORE_IN_DRIVE' ? 'MORE_IN_DRIVE' : 'MORE_IN_SHEET',
        description: student.countMismatch.description,
      });
    } else if (sheetCount > 0 && driveCount > 0 && sheetCount !== driveCount) {
      const diff = Math.abs(sheetCount - driveCount);
      const isMoreDrive = driveCount > sheetCount;
      quantityMismatches.push({
        rollNo: student.rollNo,
        name: student.name,
        sheetCount,
        driveCount,
        difference: diff,
        type: isMoreDrive ? 'MORE_IN_DRIVE' : 'MORE_IN_SHEET',
        description: isMoreDrive
          ? `${driveCount} Drive files vs ${sheetCount} Sheet entries (${diff} missing in Sheet)`
          : `${sheetCount} Sheet entries vs ${driveCount} Drive files (${diff} missing in Drive)`,
      });
    }
  });

  // 2. Spreadsheet Rows Outside Roster / Unmatched
  const sheetMissingInRoster: ReconciliationAnalysis['sheetMissingInRoster'] = [];

  sheetRows.forEach((row) => {
    const rawRoll = (row.rollNo || '').trim();
    const normalized = normalizeRollNumber(rawRoll);
    const isMatched = row.matchStatus === 'MATCHED' || (normalized && isValidClassRollNumber(normalized));

    if (!isMatched) {
      // Look for fuzzy name match among missing roster students
      let suggestedMatch: { rollNo: string; name: string; confidence: number } | undefined = undefined;
      const rowName = (row.name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

      if (rowName.length >= 4) {
        for (const rosterStudent of FIXED_CLASS_ROSTER) {
          const normRosterName = rosterStudent.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (rowName === normRosterName) {
            suggestedMatch = { rollNo: rosterStudent.rollNo, name: rosterStudent.name, confidence: 95 };
            break;
          } else if (normRosterName.includes(rowName) || rowName.includes(normRosterName)) {
            suggestedMatch = { rollNo: rosterStudent.rollNo, name: rosterStudent.name, confidence: 80 };
            break;
          }
        }
      }

      sheetMissingInRoster.push({
        rowIndex: row.rowIndex,
        rawRoll: row.rollNo || '(empty)',
        rawName: row.name,
        rawEmail: row.email,
        certificateType: row.certificateType,
        reason:
          row.matchReason ||
          (rawRoll ? `Roll number "${rawRoll}" not found in 67-student roster.` : 'Missing roll number in row.'),
        suggestedRosterMatch: suggestedMatch,
      });
    }
  });

  // 3. Summary & Integrity Calculation
  const matchedRosterCount = students.filter((s) => (s.sheetRecords && s.sheetRecords.length > 0) || s.sheetUpdated).length;
  const rosterMissingSheetCount = rosterMissingInSheet.length;
  const sheetOutsideRosterCount = sheetMissingInRoster.length;
  const outsideClassQuarantinedCount = sheetOutsideRosterCount;
  const driveMissingSheetCount = driveMissingInSheet.length;
  const sheetMissingDriveCount = sheetMissingInDrive.length;
  const quantityMismatchCount = quantityMismatches.length;

  // When strict roster is enforced, outside-class submissions (e.g. 447 rows from other branches/sections)
  // are safely quarantined and do NOT count as gaps for the 67-student class roster
  const totalGapsCount = strictRosterEnforced
    ? rosterMissingSheetCount + driveMissingSheetCount + sheetMissingDriveCount + quantityMismatchCount
    : rosterMissingSheetCount + sheetOutsideRosterCount + driveMissingSheetCount + sheetMissingDriveCount + quantityMismatchCount;

  // Integrity Score: strictly evaluates the 67 students in the class
  const fullRosterCount = totalRosterStudents || 67;
  const completedClean = students.filter(
    (s) => s.driveUploaded && s.sheetUpdated && s.submitted && (!s.countMismatch || !s.countMismatch.hasMismatch)
  ).length;

  const integrityScore = Math.round(
    Math.max(0, Math.min(100, (completedClean / fullRosterCount) * 100))
  );

  return {
    timestamp,
    totalRosterStudents,
    totalSheetRowsScanned,
    totalDriveFilesScanned,
    rosterMissingInSheet,
    sheetMissingInRoster,
    driveMissingInSheet,
    sheetMissingInDrive,
    quantityMismatches,
    summary: {
      matchedRosterCount,
      rosterMissingSheetCount,
      sheetOutsideRosterCount,
      outsideClassQuarantinedCount,
      strictRosterEnforced,
      driveMissingSheetCount,
      sheetMissingDriveCount,
      quantityMismatchCount,
      totalGapsCount,
      integrityScore,
    },
  };
}

/**
 * Simplified discrepancy analysis helper for Data Health views
 */
export function analyzeReconciliationDiscrepancies(
  students: StudentStatusRecord[],
  sheetRows: SheetRowRecord[] = [],
  driveFiles: DriveCertificateFile[] = []
) {
  const analysis = generateReconciliationAnalysis(students, sheetRows, driveFiles);
  return {
    analysis,
    discrepancies: [
      ...analysis.rosterMissingInSheet.map((s) => ({
        studentName: s.name,
        rollNo: s.rollNo,
        type: 'MISSING IN SHEET',
        description: `Student exists in roster but has no entries in Google Sheet. Drive files: ${s.driveFilesCount}.`,
      })),
      ...analysis.driveMissingInSheet.map((d) => ({
        studentName: d.name,
        rollNo: d.rollNo,
        type: 'MISSING IN SHEET',
        description: `Student has ${d.fileCount} certificate file(s) in Drive but no response in Google Sheet.`,
      })),
      ...analysis.sheetMissingInDrive.map((s) => ({
        studentName: s.name,
        rollNo: s.rollNo,
        type: 'MISSING IN DRIVE',
        description: `Student has response in Google Sheet but no PDF file in Google Drive.`,
      })),
      ...analysis.quantityMismatches.map((q) => ({
        studentName: q.name,
        rollNo: q.rollNo,
        type: q.type,
        description: q.description,
      })),
    ],
  };
}

/**
 * Exports detailed Data Mismatch Reconciliation Report to CSV
 */
export function exportDataMismatchCsv(analysis: ReconciliationAnalysis) {
  const lines: string[] = [];

  // Header & Metadata
  lines.push(`"DATA MISMATCH & RECONCILIATION AUDIT REPORT"`);
  lines.push(`"Generated At","${new Date(analysis.timestamp).toLocaleString()}"`);
  lines.push(`"Roster Students Checked",${analysis.totalRosterStudents}`);
  lines.push(`"Spreadsheet Rows Scanned",${analysis.totalSheetRowsScanned}`);
  lines.push(`"Drive Files Scanned",${analysis.totalDriveFilesScanned}`);
  lines.push(`"Integrity Score","${analysis.summary.integrityScore}%"`);
  lines.push('');

  // 1. In Roster but Missing in Sheet
  lines.push(`"--- SECTION 1: IN ROSTER, MISSING IN SPREADSHEET (${analysis.rosterMissingInSheet.length} Students) ---"`);
  lines.push(`"Roll Number","Student Name","Overall Status","Drive Uploads Found"`);
  analysis.rosterMissingInSheet.forEach((s) => {
    lines.push(`"${s.rollNo}","${s.name}","${s.overallStatus}",${s.driveFilesCount}`);
  });
  lines.push('');

  // 2. In Sheet but Outside Roster
  lines.push(`"--- SECTION 2: IN SPREADSHEET, OUTSIDE ROSTER (${analysis.sheetMissingInRoster.length} Entries) ---"`);
  lines.push(`"Row #","Recorded Roll No","Recorded Name","Recorded Email","Certificate Type","Audit Reason","Suggested Match"`);
  analysis.sheetMissingInRoster.forEach((r) => {
    const sug = r.suggestedRosterMatch ? `${r.suggestedRosterMatch.rollNo} (${r.suggestedRosterMatch.confidence}%)` : 'None';
    lines.push(`"${r.rowIndex}","${r.rawRoll}","${r.rawName || ''}","${r.rawEmail || ''}","${r.certificateType || ''}","${r.reason}","${sug}"`);
  });
  lines.push('');

  // 3. In Drive, Missing in Sheet
  lines.push(`"--- SECTION 3: IN DRIVE, MISSING IN SPREADSHEET (${analysis.driveMissingInSheet.length} Students) ---"`);
  lines.push(`"Roll Number","Student Name","Drive Files Count","Files"`);
  analysis.driveMissingInSheet.forEach((d) => {
    const fileNames = d.files.map((f) => f.name).join('; ');
    lines.push(`"${d.rollNo}","${d.name}",${d.fileCount},"${fileNames}"`);
  });
  lines.push('');

  // 4. In Sheet, Missing in Drive
  lines.push(`"--- SECTION 4: IN SPREADSHEET, MISSING IN DRIVE (${analysis.sheetMissingInDrive.length} Students) ---"`);
  lines.push(`"Roll Number","Student Name","Sheet Entries Count"`);
  analysis.sheetMissingInDrive.forEach((s) => {
    lines.push(`"${s.rollNo}","${s.name}",${s.sheetCount}`);
  });
  lines.push('');

  // 5. Quantity Discrepancies
  lines.push(`"--- SECTION 5: QUANTITY DISCREPANCIES (${analysis.quantityMismatches.length} Students) ---"`);
  lines.push(`"Roll Number","Student Name","Sheet Count","Drive Count","Difference","Discrepancy Type","Details"`);
  analysis.quantityMismatches.forEach((q) => {
    lines.push(`"${q.rollNo}","${q.name}",${q.sheetCount},${q.driveCount},${q.difference},"${q.type}","${q.description}"`);
  });

  const csvContent = '\uFEFF' + lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Data_Mismatch_Reconciliation_Audit_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
