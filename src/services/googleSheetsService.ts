import { ColumnMapping, SheetRowRecord } from '../types';

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

  // Row 0 is assumed to be header row
  const headerRow = rawValues[0].map((h) => (h || '').toString().trim());

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
    (h) => h.toLowerCase() === mapping.rollNoCol.toLowerCase()
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

  const records: SheetRowRecord[] = [];

  for (let i = 1; i < rawValues.length; i++) {
    const row = rawValues[i];
    if (!row || row.length === 0) continue;

    const rollNo = rollColIdx >= 0 ? (row[rollColIdx] || '').toString().trim() : '';
    // Skip completely empty rows
    if (!rollNo && row.every((c) => !c || c.trim() === '')) continue;

    const name = nameColIdx >= 0 ? (row[nameColIdx] || '').toString().trim() : undefined;
    const certType = certColIdx >= 0 ? (row[certColIdx] || '').toString().trim() : undefined;
    const year = yearColIdx >= 0 ? (row[yearColIdx] || '').toString().trim() : undefined;
    const section = secColIdx >= 0 ? (row[secColIdx] || '').toString().trim() : undefined;

    const rawMap: Record<string, string> = {};
    headerRow.forEach((h, colIdx) => {
      rawMap[h || `Col_${colIdx + 1}`] = (row[colIdx] || '').toString();
    });

    records.push({
      rowIndex: i + 1, // 1-indexed for spreadsheet display
      rollNo,
      name,
      certificateType: certType,
      year,
      section,
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

  for (const h of headers) {
    const n = norm(h);

    // Roll number patterns: 'rollno', 'rollnumber', 'studentid', 'htno', 'hallticket', 'regno', 'id'
    if (!rollNoCol && (n.includes('roll') || n.includes('regno') || n.includes('hallticket') || n === 'id' || n === 'studentid')) {
      rollNoCol = h;
    }

    // Name patterns: 'name', 'studentname', 'fullname', 'candidate'
    if (!nameCol && (n.includes('name') || n.includes('candidate'))) {
      nameCol = h;
    }

    // Certificate patterns: 'certificate', 'certificatetype', 'achievement', 'type', 'event', 'course'
    if (!certTypeCol && (n.includes('cert') || n.includes('type') || n.includes('achieve') || n.includes('event') || n.includes('course'))) {
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
