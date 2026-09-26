import { StudentStatusRecord, DatePresetType, DateFilterBasis, DateRangeFilterConfig } from '../types';

export interface StudentActivityEvent {
  date: Date;
  isoDate: string;
  source: 'SHEET' | 'DRIVE' | 'STATUS';
  title: string;
  detail: string;
  rollNo: string;
  studentName?: string;
}

export interface DayTimelinePoint {
  dateStr: string; // YYYY-MM-DD
  displayDate: string; // e.g. "Sep 24"
  sheetSubmissions: number;
  driveUploads: number;
  totalActivities: number;
  cumulativeActivities: number;
  activeStudents: number;
}

export interface DateRangeAnalysisResult {
  totalRosterStudents: number;
  activeStudentsInRange: number;
  activePercentage: number;
  driveUploadsInRange: number;
  sheetSubmissionsInRange: number;
  statusUpdatesInRange: number;
  completedInRange: number;
  dailyTimeline: DayTimelinePoint[];
  peakDay: { date: string; count: number } | null;
  earliestActivity: string | null;
  latestActivity: string | null;
}

/**
 * Flexible Date Parser supporting Google Form timestamps, ISO 8601, and varied regional formats
 */
export function parseFlexibleDate(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // 1. Standard ISO or direct Date constructor
  const directDate = new Date(trimmed);
  if (!isNaN(directDate.getTime())) {
    return directDate;
  }

  // 2. Google Forms / Excel timestamp format: M/D/YYYY HH:MM:SS or D/M/YYYY HH:MM:SS
  const matchSlash = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([APap][Mm]))?)?$/);
  if (matchSlash) {
    let part1 = parseInt(matchSlash[1], 10);
    let part2 = parseInt(matchSlash[2], 10);
    let year = parseInt(matchSlash[3], 10);
    if (year < 100) year += 2000;

    let hour = matchSlash[4] ? parseInt(matchSlash[4], 10) : 0;
    const min = matchSlash[5] ? parseInt(matchSlash[5], 10) : 0;
    const sec = matchSlash[6] ? parseInt(matchSlash[6], 10) : 0;
    const ampm = matchSlash[7]?.toUpperCase();

    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    // Disambiguate M/D/YYYY vs D/M/YYYY (if part1 > 12, it must be Day)
    let month = part1;
    let day = part2;
    if (part1 > 12 && part2 <= 12) {
      day = part1;
      month = part2;
    }

    const constructed = new Date(year, month - 1, day, hour, min, sec);
    if (!isNaN(constructed.getTime())) {
      return constructed;
    }
  }

  return null;
}

/**
 * Format Date to YYYY-MM-DD input string
 */
export function formatDateToISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Compute start and end dates based on preset
 */
export function getDatesFromPreset(preset: DatePresetType): { startDate: string | null; endDate: string | null } {
  const now = new Date();
  const todayISO = formatDateToISO(now);

  switch (preset) {
    case 'ALL_TIME':
      return { startDate: null, endDate: null };

    case 'TODAY':
      return { startDate: todayISO, endDate: todayISO };

    case 'YESTERDAY': {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const yISO = formatDateToISO(yesterday);
      return { startDate: yISO, endDate: yISO };
    }

    case 'LAST_7_DAYS': {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      return { startDate: formatDateToISO(start), endDate: todayISO };
    }

    case 'LAST_14_DAYS': {
      const start = new Date(now);
      start.setDate(now.getDate() - 13);
      return { startDate: formatDateToISO(start), endDate: todayISO };
    }

    case 'LAST_30_DAYS': {
      const start = new Date(now);
      start.setDate(now.getDate() - 29);
      return { startDate: formatDateToISO(start), endDate: todayISO };
    }

    case 'THIS_MONTH': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: formatDateToISO(start), endDate: todayISO };
    }

    case 'LAST_MONTH': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: formatDateToISO(start), endDate: formatDateToISO(end) };
    }

    case 'CUSTOM':
    default:
      return { startDate: null, endDate: null };
  }
}

/**
 * Extract all timestamped activity events for a student
 */
export function getStudentActivityEvents(student: StudentStatusRecord): StudentActivityEvent[] {
  const events: StudentActivityEvent[] = [];

  // 1. Google Sheet row submissions
  if (student.sheetRecords && student.sheetRecords.length > 0) {
    student.sheetRecords.forEach((row, idx) => {
      const rawTimestamp = row.submissionTimestamp || (row.rawValues ? row.rawValues['Timestamp'] || row.rawValues['timestamp'] : null);
      const parsed = parseFlexibleDate(rawTimestamp);
      if (parsed) {
        events.push({
          date: parsed,
          isoDate: formatDateToISO(parsed),
          source: 'SHEET',
          title: row.certificateType ? `Form Entry: ${row.certificateType}` : `Spreadsheet Row #${row.rowIndex}`,
          detail: row.certificateUrl ? 'Certificate link submitted' : 'Response recorded in Google Sheet',
          rollNo: student.rollNo,
          studentName: student.name,
        });
      }
    });
  }

  // 2. Google Drive certificate uploads
  if (student.driveFiles && student.driveFiles.length > 0) {
    student.driveFiles.forEach((file) => {
      const rawDate = file.createdTime || file.modifiedTime;
      const parsed = parseFlexibleDate(rawDate);
      if (parsed) {
        events.push({
          date: parsed,
          isoDate: formatDateToISO(parsed),
          source: 'DRIVE',
          title: file.detectedCertTitle || file.name,
          detail: `Uploaded to Google Drive (${file.detectedCertType || 'Certificate'})`,
          rollNo: student.rollNo,
          studentName: student.name,
        });
      }
    });
  }

  // 3. Manual / Supabase status updates
  if (student.lastUpdated) {
    const parsed = parseFlexibleDate(student.lastUpdated);
    if (parsed) {
      events.push({
        date: parsed,
        isoDate: formatDateToISO(parsed),
        source: 'STATUS',
        title: `Verification Status: ${student.overallStatus}`,
        detail: `Drive: ${student.driveUploaded ? 'Yes' : 'No'} | Sheet: ${student.sheetUpdated ? 'Yes' : 'No'} | Confirmed: ${student.submitted ? 'Yes' : 'No'}`,
        rollNo: student.rollNo,
        studentName: student.name,
      });
    }
  }

  // Sort chronological descending (most recent first)
  return events.sort((a, b) => b.date.getTime() - a.date.getTime());
}

/**
 * Get latest activity timestamp for a student
 */
export function getLatestStudentActivity(student: StudentStatusRecord): StudentActivityEvent | null {
  const events = getStudentActivityEvents(student);
  return events.length > 0 ? events[0] : null;
}

/**
 * Check if student has activity matching date range filter
 */
export function isStudentMatchingDateRange(
  student: StudentStatusRecord,
  config: DateRangeFilterConfig
): { matches: boolean; matchingEventsCount: number; latestMatchingDate: string | null } {
  // If no date range restriction, all students match
  if (!config.startDate && !config.endDate && config.preset === 'ALL_TIME') {
    const latest = getLatestStudentActivity(student);
    return { matches: true, matchingEventsCount: getStudentActivityEvents(student).length, latestMatchingDate: latest ? latest.isoDate : null };
  }

  const events = getStudentActivityEvents(student);
  if (events.length === 0) {
    return { matches: false, matchingEventsCount: 0, latestMatchingDate: null };
  }

  // Filter events by source basis
  const filteredByBasis = events.filter((e) => {
    if (config.basis === 'ALL') return true;
    if (config.basis === 'SHEET_ONLY') return e.source === 'SHEET';
    if (config.basis === 'DRIVE_ONLY') return e.source === 'DRIVE';
    if (config.basis === 'STATUS_ONLY') return e.source === 'STATUS';
    return true;
  });

  if (filteredByBasis.length === 0) {
    return { matches: false, matchingEventsCount: 0, latestMatchingDate: null };
  }

  const startBound = config.startDate ? new Date(`${config.startDate}T00:00:00`) : null;
  const endBound = config.endDate ? new Date(`${config.endDate}T23:59:59.999`) : null;

  const matchingEvents = filteredByBasis.filter((e) => {
    const time = e.date.getTime();
    if (startBound && time < startBound.getTime()) return false;
    if (endBound && time > endBound.getTime()) return false;
    return true;
  });

  return {
    matches: matchingEvents.length > 0,
    matchingEventsCount: matchingEvents.length,
    latestMatchingDate: matchingEvents.length > 0 ? matchingEvents[0].isoDate : null,
  };
}

/**
 * Perform deep aggregation across all students for timeline graphs and summary statistics
 */
export function analyzeDateRangeProgress(
  students: StudentStatusRecord[],
  config: DateRangeFilterConfig
): DateRangeAnalysisResult {
  const totalRosterStudents = students.length;
  let activeStudentsInRange = 0;
  let driveUploadsInRange = 0;
  let sheetSubmissionsInRange = 0;
  let statusUpdatesInRange = 0;
  let completedInRange = 0;

  const dayMap = new Map<string, { sheet: number; drive: number; status: number; studentSet: Set<string> }>();
  let earliestDate: Date | null = null;
  let latestDate: Date | null = null;

  const startBound = config.startDate ? new Date(`${config.startDate}T00:00:00`) : null;
  const endBound = config.endDate ? new Date(`${config.endDate}T23:59:59.999`) : null;

  for (const student of students) {
    const check = isStudentMatchingDateRange(student, config);
    if (check.matches) {
      activeStudentsInRange++;
      if (student.overallStatus === 'COMPLETED') {
        completedInRange++;
      }
    }

    const events = getStudentActivityEvents(student);
    for (const event of events) {
      // Check source basis
      if (config.basis !== 'ALL') {
        if (config.basis === 'SHEET_ONLY' && event.source !== 'SHEET') continue;
        if (config.basis === 'DRIVE_ONLY' && event.source !== 'DRIVE') continue;
        if (config.basis === 'STATUS_ONLY' && event.source !== 'STATUS') continue;
      }

      const time = event.date.getTime();
      if (startBound && time < startBound.getTime()) continue;
      if (endBound && time > endBound.getTime()) continue;

      if (!earliestDate || event.date < earliestDate) earliestDate = event.date;
      if (!latestDate || event.date > latestDate) latestDate = event.date;

      const dateKey = event.isoDate;
      const existing = dayMap.get(dateKey) || { sheet: 0, drive: 0, status: 0, studentSet: new Set<string>() };

      if (event.source === 'SHEET') {
        existing.sheet++;
        sheetSubmissionsInRange++;
      } else if (event.source === 'DRIVE') {
        existing.drive++;
        driveUploadsInRange++;
      } else if (event.source === 'STATUS') {
        existing.status++;
        statusUpdatesInRange++;
      }

      existing.studentSet.add(student.rollNo);
      dayMap.set(dateKey, existing);
    }
  }

  // Generate sorted day points
  const sortedDates = Array.from(dayMap.keys()).sort();
  let cumulative = 0;
  let peakDay: { date: string; count: number } | null = null;

  const dailyTimeline: DayTimelinePoint[] = sortedDates.map((dateStr) => {
    const d = dayMap.get(dateStr)!;
    const total = d.sheet + d.drive;
    cumulative += total;

    if (!peakDay || total > peakDay.count) {
      peakDay = { date: dateStr, count: total };
    }

    const dateObj = new Date(`${dateStr}T12:00:00`);
    const displayDate = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

    return {
      dateStr,
      displayDate,
      sheetSubmissions: d.sheet,
      driveUploads: d.drive,
      totalActivities: total,
      cumulativeActivities: cumulative,
      activeStudents: d.studentSet.size,
    };
  });

  return {
    totalRosterStudents,
    activeStudentsInRange,
    activePercentage: totalRosterStudents > 0 ? Math.round((activeStudentsInRange / totalRosterStudents) * 100) : 0,
    driveUploadsInRange,
    sheetSubmissionsInRange,
    statusUpdatesInRange,
    completedInRange,
    dailyTimeline,
    peakDay,
    earliestActivity: earliestDate ? formatDateToISO(earliestDate) : null,
    latestActivity: latestDate ? formatDateToISO(latestDate) : null,
  };
}
