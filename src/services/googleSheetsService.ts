import { ColumnMapping, SheetRowRecord } from '../types';
import {
  extractRollNumberFromText,
  normalizeRollNumber,
  isValidClassRollNumber,
  ROSTER_MAP,
  FIXED_CLASS_ROSTER,
} from '../data/classRoster';

/**
 * Extracts Google Spreadsheet ID from a URL or raw ID string.
 * Examples:
 * - https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/edit#gid=0
 * - 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs
 */
export function extractSpreadsheetId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return match[1];
  }
  if (/^[a-zA-Z0-9_-]{20,55}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

export interface SpreadsheetMetadata {
  id: string;
  title: string;
  sheets: Array<{
    sheetId: number;
    title: string;
    rowCount?: number;
    columnCount?: number;
  }>;
}

export interface SpreadsheetListItem {
  id: string;
  name: string;
  modifiedTime?: string;
}

/**
 * List recent spreadsheets user has access to
 */
export async function listGoogleSpreadsheets(
  accessToken: string,
  pageSize = 20
): Promise<SpreadsheetListItem[]> {
  const q = "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    q
  )}&pageSize=${pageSize}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&supportsAllDrives=true&includeItemsFromAllDrives=true`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error?.message || `Failed to list spreadsheets (${res.status})`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Fetch spreadsheet metadata including all sheet/tab names
 */
export async function getSpreadsheetMetadata(
  spreadsheetId: string,
  accessToken: string
): Promise<SpreadsheetMetadata> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties(sheetId,title,gridProperties)`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Google authorization expired or invalid. Please re-authenticate.');
    }
    if (res.status === 404) {
      throw new Error(`Spreadsheet with ID "${spreadsheetId}" was not found or access was denied.`);
    }
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error?.message || `Failed to fetch spreadsheet info (${res.status})`);
  }

  const data = await res.json();
  return {
    id: spreadsheetId,
    title: data.properties?.title || 'Untitled Spreadsheet',
    sheets: (data.sheets || []).map((s: any) => ({
      sheetId: s.properties?.sheetId,
      title: s.properties?.title || 'Sheet1',
      rowCount: s.properties?.gridProperties?.rowCount,
      columnCount: s.properties?.gridProperties?.columnCount,
    })),
  };
}

/**
 * Read all rows from a worksheet and auto-detect or apply column mapping
 */
export async function readSpreadsheetValues(
  spreadsheetId: string,
  sheetName: string,
  accessToken: string,
  savedMapping?: ColumnMapping
): Promise<{
  rows: SheetRowRecord[];
  headers: string[];
  detectedMapping: ColumnMapping;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}> {
  // Fetch entire grid values formatted
  const encodedSheet = encodeURIComponent(sheetName);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodedSheet}'!A1:ZZ?valueRenderOption=FORMATTED_VALUE`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Google authorization expired. Please re-authenticate.');
    }
    const errBody = await res.json().catch(() => ({}));
    throw new Error(
      errBody.error?.message || `Failed to read worksheet "${sheetName}" (${res.status})`
    );
  }

  const data = await res.json();
  const rawValues: string[][] = data.values || [];

  if (rawValues.length === 0) {
    return {
      rows: [],
      headers: [],
      detectedMapping: { rollNoCol: '', nameCol: '', certTypeCol: '' },
      confidence: 'LOW',
    };
  }

  // Locate header row (check row 0 to 3 in case row 0 is a title or banner)
  let headerRowIndex = 0;
  for (let r = 0; r < Math.min(rawValues.length, 4); r++) {
    const candidate = rawValues[r].map((h) => (h || '').toString().trim());
    const hasHeaderKeywords = candidate.some((h) => {
      const lower = h.toLowerCase();
      return (
        lower.includes('roll') ||
        lower.includes('reg') ||
        lower.includes('name') ||
        lower.includes('cert') ||
        lower.includes('email') ||
        lower.includes('timestamp')
      );
    });
    if (hasHeaderKeywords) {
      headerRowIndex = r;
      break;
    }
  }

  const headerRow = rawValues[headerRowIndex].map((h) => (h || '').toString().trim());

  // Determine column mapping
  let mapping: ColumnMapping;
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';

  if (savedMapping && savedMapping.rollNoCol && headerRow.includes(savedMapping.rollNoCol)) {
    mapping = savedMapping;
    confidence = 'HIGH';
  } else {
    // Intelligent auto-detection
    mapping = autoDetectColumns(headerRow);
    if (mapping.rollNoCol && mapping.certTypeCol) {
      confidence = 'HIGH';
    } else if (mapping.rollNoCol) {
      confidence = 'MEDIUM';
    } else {
      confidence = 'LOW';
    }
  }

  // Build row objects
  const rollColIdx = headerRow.findIndex(
    (h) => h.toLowerCase() === (mapping.rollNoCol || '').toLowerCase()
  );
  const nameColIdx = mapping.nameCol
    ? headerRow.findIndex((h) => h.toLowerCase() === mapping.nameCol.toLowerCase())
    : -1;
  const certColIdx = mapping.certTypeCol
    ? headerRow.findIndex((h) => h.toLowerCase() === mapping.certTypeCol.toLowerCase())
    : -1;
  const yearColIdx = mapping.yearCol
    ? headerRow.findIndex((h) => h.toLowerCase() === mapping.yearCol?.toLowerCase())
    : -1;
  const secColIdx = mapping.sectionCol
    ? headerRow.findIndex((h) => h.toLowerCase() === mapping.sectionCol?.toLowerCase())
    : -1;
  const certUrlColIdx = mapping.certUrlCol
    ? headerRow.findIndex((h) => h.toLowerCase() === mapping.certUrlCol?.toLowerCase())
    : -1;
  const timestampColIdx = mapping.timestampCol
    ? headerRow.findIndex((h) => h.toLowerCase() === mapping.timestampCol?.toLowerCase())
    : -1;

  const records: SheetRowRecord[] = [];

  for (let i = headerRowIndex + 1; i < rawValues.length; i++) {
    const row = rawValues[i];
    if (!row || row.length === 0) continue;

    const rawMap: Record<string, string> = {};
    headerRow.forEach((h, colIdx) => {
      rawMap[h || `Col_${colIdx + 1}`] = (row[colIdx] || '').toString().trim();
    });

    // Check if entire row is empty
    const allCellsEmpty = row.every((c) => !c || c.toString().trim() === '');
    if (allCellsEmpty) continue;

    let rawRoll = rollColIdx >= 0 ? (row[rollColIdx] || '').toString().trim() : '';
    let name = nameColIdx >= 0 ? (row[nameColIdx] || '').toString().trim() : undefined;
    let certType = certColIdx >= 0 ? (row[certColIdx] || '').toString().trim() : undefined;
    let year = yearColIdx >= 0 ? (row[yearColIdx] || '').toString().trim() : undefined;
    let section = secColIdx >= 0 ? (row[secColIdx] || '').toString().trim() : undefined;
    let certUrl = certUrlColIdx >= 0 ? (row[certUrlColIdx] || '').toString().trim() : undefined;
    let submissionTimestamp = timestampColIdx >= 0 ? (row[timestampColIdx] || '').toString().trim() : undefined;

    // Fallback: If certUrl not in specified column, look for URL in any cell
    if (!certUrl) {
      for (const cell of row) {
        const str = (cell || '').toString().trim();
        if (str.startsWith('http://') || str.startsWith('https://') || str.includes('drive.google.com') || str.includes('forms.gle')) {
          certUrl = str;
          break;
        }
      }
    }

    // Fallback: If timestamp not in specified column, look for date pattern in any cell
    if (!submissionTimestamp) {
      for (const cell of row) {
        const str = (cell || '').toString().trim();
        if (/^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}(\s+\d{1,2}:\d{2}(:\d{2})?(\s*[APap][Mm])?)?$/.test(str)) {
          submissionTimestamp = str;
          break;
        }
      }
    }

    // Smart Roll Number Detection
    let detectedRoll = extractRollNumberFromText(rawRoll) || normalizeRollNumber(rawRoll);
    let matchedStudent = detectedRoll ? ROSTER_MAP.get(detectedRoll) : undefined;

    // If still no valid student matched, search other columns in this row for a valid roll number
    if (!matchedStudent) {
      for (let c = 0; c < row.length; c++) {
        const cellText = (row[c] || '').toString().trim();
        const candidateRoll = extractRollNumberFromText(cellText);
        if (candidateRoll && ROSTER_MAP.has(candidateRoll)) {
          detectedRoll = candidateRoll;
          matchedStudent = ROSTER_MAP.get(candidateRoll);
          break;
        }
      }
    }

    // If still not matched, check student name against 67-student roster
    if (!matchedStudent && name) {
      const normName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normName.length >= 4) {
        for (const s of FIXED_CLASS_ROSTER) {
          const sNameNorm = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (sNameNorm === normName || sNameNorm.includes(normName) || normName.includes(sNameNorm)) {
            matchedStudent = s;
            detectedRoll = s.rollNo;
            break;
          }
        }
      }
    }

    // Determine verification & match status
    let matchStatus: SheetRowRecord['matchStatus'] = 'UNMATCHED_ROLL';
    let matchReason = 'No valid roll number or matching student name found in row';

    if (matchedStudent) {
      matchStatus = 'MATCHED';
      matchReason = `Verified match with 67-student roster (${matchedStudent.rollNo} - ${matchedStudent.name})`;
    } else if (detectedRoll) {
      if (isValidClassRollNumber(detectedRoll)) {
        matchStatus = 'MATCHED';
        matchReason = `Verified match with roster (${detectedRoll})`;
      } else {
        matchStatus = 'OUTSIDE_CLASS';
        matchReason = `Roll number ${detectedRoll} is not part of the 67-student class roster`;
      }
    }

    records.push({
      rowIndex: i + 1, // 1-indexed for spreadsheet display
      rollNo: rawRoll || (matchedStudent ? matchedStudent.rollNo : detectedRoll || ''),
      name: name || (matchedStudent ? matchedStudent.name : undefined),
      certificateType: certType,
      year,
      section,
      certificateUrl: certUrl,
      submissionTimestamp,
      matchedRollNo: matchedStudent ? matchedStudent.rollNo : (isValidClassRollNumber(detectedRoll) ? detectedRoll : undefined),
      matchedStudentName: matchedStudent ? matchedStudent.name : undefined,
      matchStatus,
      matchReason,
      rawValues: rawMap,
    });
  }

  return {
    rows: records,
    headers: headerRow.filter((h) => h.length > 0),
    detectedMapping: mapping,
    confidence,
  };
}

/**
 * Intelligent Header Analysis
 */
export function autoDetectColumns(headers: string[]): ColumnMapping {
  const norm = (str: string) => str.toLowerCase().replace(/[\s\-_.]/g, '');

  let rollNoCol = '';
  let nameCol = '';
  let certTypeCol = '';
  let yearCol = '';
  let sectionCol = '';
  let certUrlCol = '';
  let timestampCol = '';

  for (const h of headers) {
    const n = norm(h);

    // Timestamp patterns
    if (!timestampCol && (n.includes('time') || n.includes('date') || n.includes('submitted'))) {
      timestampCol = h;
    }

    // Roll number patterns: 'rollno', 'rollnumber', 'studentid', 'htno', 'hallticket', 'regno', 'id', 'pin', 'reg'
    if (
      !rollNoCol &&
      (n.includes('roll') ||
        n.includes('regno') ||
        n.includes('regd') ||
        n.includes('registration') ||
        n.includes('hallticket') ||
        n.includes('htno') ||
        n.includes('pin') ||
        n === 'id' ||
        n === 'studentid')
    ) {
      rollNoCol = h;
    }

    // Name patterns: 'name', 'studentname', 'fullname', 'candidate'
    if (!nameCol && (n.includes('name') || n.includes('candidate'))) {
      nameCol = h;
    }

    // Certificate proof / URL patterns: 'upload', 'link', 'drive', 'url', 'proof', 'attachment', 'file'
    if (
      !certUrlCol &&
      (n.includes('link') ||
        n.includes('drive') ||
        n.includes('url') ||
        n.includes('upload') ||
        n.includes('proof') ||
        n.includes('file') ||
        n.includes('attach'))
    ) {
      certUrlCol = h;
    }

    // Certificate type patterns: 'certificate', 'certificatetype', 'achievement', 'type', 'event', 'course', 'title', 'topic'
    if (
      !certTypeCol &&
      (n.includes('cert') ||
        n.includes('type') ||
        n.includes('achieve') ||
        n.includes('event') ||
        n.includes('course') ||
        n.includes('topic') ||
        n.includes('title'))
    ) {
      certTypeCol = h;
    }

    // Year
    if (!yearCol && (n === 'year' || n === 'yr' || n.includes('academic'))) {
      yearCol = h;
    }

    // Section
    if (!sectionCol && (n === 'section' || n === 'sec')) {
      sectionCol = h;
    }
  }

  // Fallbacks if not found
  if (!rollNoCol && headers.length > 0) rollNoCol = headers[0];
  if (!nameCol && headers.length > 1) nameCol = headers[1];
  if (!certTypeCol && headers.length > 2) certTypeCol = headers[2];

  return {
    rollNoCol,
    nameCol,
    certTypeCol,
    yearCol,
    sectionCol,
    certUrlCol,
    timestampCol,
  };
}

/**
 * Optional spreadsheet write synchronization (requires user confirmation before executing)
 */
export async function writeRowsToSpreadsheet(
  spreadsheetId: string,
  sheetName: string,
  rowsToAddOrUpdate: Array<{ range?: string; values: string[] }>,
  accessToken: string
): Promise<{ updatedRows: number }> {
  const encodedSheet = encodeURIComponent(sheetName);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'${encodedSheet}':append?valueInputOption=USER_ENTERED`;

  const body = {
    values: rowsToAddOrUpdate.map((r) => r.values),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to write to spreadsheet (${res.status})`);
  }

  const data = await res.json();
  return { updatedRows: data.updates?.updatedRows || rowsToAddOrUpdate.length };
}
