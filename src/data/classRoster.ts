import { Student } from '../types';

/**
 * EXACT INITIAL FIXED CLASS ROSTER (67 STUDENTS ONLY)
 * As strictly specified in section 7 of the requirements.
 */
export const FIXED_CLASS_ROSTER_STATIC: Student[] = [
  { rollNo: '25A31A05DV', name: 'ADABALA NAVYA RAMYA SREE' },
  { rollNo: '25A31A05DW', name: 'BEVARA PRASANTHI' },
  { rollNo: '25A31A05DX', name: 'CHILLA DEEPTHI' },
  { rollNo: '25A31A05DY', name: 'DORA JERIYA' },
  { rollNo: '25A31A05DZ', name: 'EELI HEMA VENKATA LALITHA' },
  { rollNo: '25A31A05EA', name: 'ESARAPU SATYAVENI' },
  { rollNo: '25A31A05EB', name: 'GUBBALA YASASWI DEVI' },
  { rollNo: '25A31A05EC', name: 'GUTTA THRAITHESHWARI' },
  { rollNo: '25A31A05ED', name: 'INAKOTI BHANU CHANDINI' },
  { rollNo: '25A31A05EE', name: 'KAKILETI SHINY HADASSAH' },
  { rollNo: '25A31A05EF', name: 'KOTHAPALLI SWARNA MADHURI' },
  { rollNo: '25A31A05EG', name: 'MADDALA LEELA RAMYA VANI' },
  { rollNo: '25A31A05EH', name: 'MANGARA ELIJIBETH ROJA' },
  { rollNo: '25A31A05EI', name: 'MOHAMMAD ZAHURUNNISA BEGUM' },
  { rollNo: '25A31A05EJ', name: 'MORUKURTHI GOWTHAMI' },
  { rollNo: '25A31A05EK', name: 'MULLAPUDI MAITRI NARMADA DEVI' },
  { rollNo: '25A31A05EL', name: 'OBILISETTI VENNELA' },
  { rollNo: '25A31A05EM', name: 'PATAN FATHIMA' },
  { rollNo: '25A31A05EN', name: 'PEMMANABOIDI KEERTHANA' },
  { rollNo: '25A31A05EO', name: 'PEMMIREDDY MOUNIKA SURYA' },
  { rollNo: '25A31A05EP', name: 'PENUGONDA MOUNIKA' },
  { rollNo: '25A31A05EQ', name: 'RAMIREDDY DEVI KEERTHANA' },
  { rollNo: '25A31A05ER', name: 'REDNAM LAKSHMI SATHVIKA' },
  { rollNo: '25A31A05ES', name: 'TALLURI JAHNAVI' },
  { rollNo: '25A31A05ET', name: 'VASAMSETTI JAHNAVI DEVI' },
  { rollNo: '25A31A05EU', name: 'VASAMSETTI RAMA LAKSHMI' },
  { rollNo: '25A31A05EV', name: 'VELUGUBANTLA SOWMYA VIJAYA VIGNESWARI' },
  { rollNo: '25A31A05EW', name: 'YANDAPALLI MOHANA LAKSHMI' },
  { rollNo: '25A31A05EX', name: 'ATTULURI MANIKANTA' },
  { rollNo: '25A31A05EY', name: 'CHALLA BARGAVA SATYA SAI RAKESH' },
  { rollNo: '25A31A05EZ', name: 'CHETTI SURYA PAUL' },
  { rollNo: '25A31A05FA', name: 'DASARI MOHITH SUBHASH' },
  { rollNo: '25A31A05FB', name: 'DEVISETTI VENKATA RISHI RAJ' },
  { rollNo: '25A31A05FC', name: 'DUGGIRALA HEMANTH' },
  { rollNo: '25A31A05FD', name: 'GANAPABATHULA SUPRADEEP' },
  { rollNo: '25A31A05FE', name: 'GANNI VENKAT' },
  { rollNo: '25A31A05FF', name: 'GONELA MOHAN SAI KIRAN' },
  { rollNo: '25A31A05FG', name: 'GOPALADASU DURGA AJAY KUMAR' },
  { rollNo: '25A31A05FH', name: 'GUDURI HARI NAGA CHANDRA HANISH' },
  { rollNo: '25A31A05FI', name: 'GUMMADI PRUDVIRAJ' },
  { rollNo: '25A31A05FJ', name: 'GUMMALLA VEERA MANIKANTA VIVEK' },
  { rollNo: '25A31A05FK', name: 'JETTY ASHER JOSEPH' },
  { rollNo: '25A31A05FL', name: 'JYOTHULA MANIDEEP' },
  { rollNo: '25A31A05FM', name: 'KALLA TEJOMAYA' },
  { rollNo: '25A31A05FN', name: 'KATARI DATTA PAVAN SAI KRISHNA' },
  { rollNo: '25A31A05FO', name: 'KONDETI SATYA BHIMA SANKARA SAINADH' },
  { rollNo: '25A31A05FP', name: 'KOPPANATHI BABI' },
  { rollNo: '25A31A05FQ', name: 'LELLA BHARGAV' },
  { rollNo: '25A31A05FR', name: 'MADAKAM LAKSHMAN LOKESH' },
  { rollNo: '25A31A05FS', name: 'MANDELA VENKATESH' },
  { rollNo: '25A31A05FT', name: 'MUMMIDI PAVAN SURYA CHAITANYA' },
  { rollNo: '25A31A05FU', name: 'MUMMIDI VENKATA BAPANNA SATYA PAVAN' },
  { rollNo: '25A31A05FV', name: 'NATHIPAM SRINIVAS' },
  { rollNo: '25A31A05FW', name: 'NEELAPALA SATYA SUDHEER' },
  { rollNo: '25A31A05FX', name: 'PEDAPATI SAI MALLIKHARJUN' },
  { rollNo: '25A31A05FY', name: 'PERURI SAI NIKHIL' },
  { rollNo: '25A31A05FZ', name: 'ROHITH S S SURYANARAYANA DEVUNI' },
  { rollNo: '25A31A05GA', name: 'SALADI G S NAGA VENKATA RATNA SAIRAM' },
  { rollNo: '25A31A05GB', name: 'SAPPA JAYARAM SIVA PRASAD' },
  { rollNo: '25A31A05GC', name: 'SASUBILLI SASANK MANINDHAR' },
  { rollNo: '25A31A05GD', name: 'TAVVA KISHORE' },
  { rollNo: '25A31A05GE', name: 'TELU MALLIKARJUN' },
  { rollNo: '25A31A05GF', name: 'VADDI SHAUN AJIT' },
  { rollNo: '25A31A05GG', name: 'VANAMALI SIVA NAGA SATYA NARASIMHA' },
  { rollNo: '25A31A05GH', name: 'VASAMSETTI PRUDHVI' },
  { rollNo: '25A31A05GI', name: 'YALLA ARYA' },
];

/**
 * FIXED_CLASS_ROSTER is exported as a mutable array reference
 * that syncEngine and other views can import and loop through.
 * It is dynamically synchronized with localStorage.
 */
export const FIXED_CLASS_ROSTER: Student[] = [];

export function initializeRoster() {
  FIXED_CLASS_ROSTER.length = 0;
  try {
    const raw = localStorage.getItem('ccam_dynamic_roster');
    if (raw) {
      const parsed = JSON.parse(raw);
      FIXED_CLASS_ROSTER.push(...parsed);
      return;
    }
  } catch (e) {
    console.error('Failed to load roster from localStorage:', e);
  }
  FIXED_CLASS_ROSTER.push(...FIXED_CLASS_ROSTER_STATIC);
}

/**
 * Fast lookup map by normalized roll number
 */
export const ROSTER_MAP = new Map<string, Student>();

export function updateRosterMap() {
  ROSTER_MAP.clear();
  FIXED_CLASS_ROSTER.forEach((student) => {
    const trimmed = student.rollNo.toUpperCase().trim();
    const normalized = normalizeRollNumber(student.rollNo);
    if (trimmed) ROSTER_MAP.set(trimmed, student);
    if (normalized) ROSTER_MAP.set(normalized, student);
  });
}

// Perform initial setup
if (typeof window !== 'undefined') {
  initializeRoster();
  updateRosterMap();
} else {
  FIXED_CLASS_ROSTER.push(...FIXED_CLASS_ROSTER_STATIC);
  updateRosterMap();
}

/**
 * Dynamic Student Roster Mutators (CRUD Actions)
 */
export function addOrUpdateRosterStudent(student: Student): {
  action: 'ADDED' | 'UPDATED';
  student: Student;
} {
  const cleanRoll = normalizeRollNumber(student.rollNo);
  const cleanName = (student.name || '').trim() || `Student ${cleanRoll}`;

  if (!cleanRoll) {
    throw new Error('Valid Roll Number is required.');
  }

  const existingIndex = FIXED_CLASS_ROSTER.findIndex(
    (s) => normalizeRollNumber(s.rollNo) === cleanRoll
  );

  let action: 'ADDED' | 'UPDATED' = 'ADDED';

  if (existingIndex !== -1) {
    FIXED_CLASS_ROSTER[existingIndex].name = cleanName;
    if (student.email) FIXED_CLASS_ROSTER[existingIndex].email = student.email;
    if (student.phone) FIXED_CLASS_ROSTER[existingIndex].phone = student.phone;
    action = 'UPDATED';
  } else {
    const newStudent: Student = {
      rollNo: cleanRoll,
      name: cleanName,
      email: student.email,
      phone: student.phone,
    };
    FIXED_CLASS_ROSTER.push(newStudent);
    action = 'ADDED';
  }

  try {
    localStorage.setItem('ccam_dynamic_roster', JSON.stringify(FIXED_CLASS_ROSTER));
  } catch (e) {
    console.error('Failed to save updated roster to localStorage:', e);
  }
  updateRosterMap();

  return {
    action,
    student: FIXED_CLASS_ROSTER[existingIndex !== -1 ? existingIndex : FIXED_CLASS_ROSTER.length - 1],
  };
}

export function addRosterStudent(student: Student): {
  action: 'ADDED' | 'UPDATED';
  student: Student;
} {
  return addOrUpdateRosterStudent(student);
}

export function batchAddRosterStudents(students: Student[]): {
  added: Student[];
  updated: Student[];
  skipped: Array<{ student: Student; reason: string }>;
} {
  const added: Student[] = [];
  const updated: Student[] = [];
  const skipped: Array<{ student: Student; reason: string }> = [];

  for (const s of students) {
    const cleanRoll = normalizeRollNumber(s.rollNo);
    const cleanName = (s.name || '').trim() || `Student ${cleanRoll}`;

    if (!cleanRoll) {
      skipped.push({ student: s, reason: 'Missing roll number' });
      continue;
    }

    const { action, student: finalStudent } = addOrUpdateRosterStudent({
      rollNo: cleanRoll,
      name: cleanName,
      email: s.email,
      phone: s.phone,
    });

    if (action === 'ADDED') {
      added.push(finalStudent);
    } else {
      updated.push(finalStudent);
    }
  }

  return { added, updated, skipped };
}

export function editRosterStudent(rollNo: string, newName: string): void {
  const normalizedRoll = rollNo.toUpperCase().trim();
  const student = FIXED_CLASS_ROSTER.find(s => s.rollNo.toUpperCase().trim() === normalizedRoll);
  if (!student) {
    throw new Error(`Student with Roll Number ${rollNo} not found in roster.`);
  }
  student.name = newName.trim();
  try {
    localStorage.setItem('ccam_dynamic_roster', JSON.stringify(FIXED_CLASS_ROSTER));
  } catch {}
  updateRosterMap();
}

export function deleteRosterStudent(rollNo: string): void {
  const normalizedRoll = rollNo.toUpperCase().trim();
  const index = FIXED_CLASS_ROSTER.findIndex(s => s.rollNo.toUpperCase().trim() === normalizedRoll);
  if (index === -1) {
    throw new Error(`Student with Roll Number ${rollNo} not found in roster.`);
  }
  FIXED_CLASS_ROSTER.splice(index, 1);
  try {
    localStorage.setItem('ccam_dynamic_roster', JSON.stringify(FIXED_CLASS_ROSTER));
  } catch {}
  updateRosterMap();
}

export function resetRosterToDefault(): void {
  FIXED_CLASS_ROSTER.length = 0;
  FIXED_CLASS_ROSTER.push(...FIXED_CLASS_ROSTER_STATIC);
  try {
    localStorage.removeItem('ccam_dynamic_roster');
  } catch {}
  updateRosterMap();
}

/**
 * Normalizes roll number:
 * - Trims whitespaces
 * - Converts to uppercase
 * - Strips unwanted special characters or symbols
 */
export function normalizeRollNumber(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .trim()
    .toUpperCase()
    .replace(/[\s\-_.]/g, '');
}

/**
 * Check if a roll number belongs to the 67-person fixed class roster
 */
export function isValidClassRollNumber(rollNo: string): boolean {
  const normalized = normalizeRollNumber(rollNo);
  return ROSTER_MAP.has(normalized);
}

/**
 * Get student by roll number
 */
export function getStudentByRollNumber(rollNo: string): Student | undefined {
  const normalized = normalizeRollNumber(rollNo);
  return ROSTER_MAP.get(normalized);
}

/**
 * Extracts a candidate roll number from a filename, cell, folder name, or text string.
 * Supports:
 * - Direct 10-char roll numbers (e.g., 25A31A05DV, 25A31A05GB, 24A31A05JR)
 * - Separated roll numbers (25_A31A_05_GB, 25-a31a-05-en)
 * - Suffix patterns (05GB, 5GB, 05DV, 05EN)
 * - Full student names & distinctive name matching (e.g., "Sappa Jayaram", "Koppanathi Babi", "Hema Venkata Lalitha")
 */
export function extractRollNumberFromText(text: string): string | null {
  if (!text) return null;
  const clean = text.toString().trim();

  // 1. Direct standard university format (e.g., 25A31A05DV, 25A31A05GB, 24A31A05JR)
  const standardMatch = clean.match(/([0-9]{2}[A-Za-z][0-9]{2}[A-Za-z][0-9]{2}[A-Za-z0-9]{2})/i);
  if (standardMatch && standardMatch[1]) {
    const normalized = normalizeRollNumber(standardMatch[1]);
    return normalized;
  }

  // 2. Format with separators, e.g. 25-A31A-05-EN or 25_A31A_05_EN or 25 A31A 05 EN
  const separatedMatch = clean.match(/([0-9]{2}[\s\-_.]?[A-Za-z][\s\-_.]?[0-9]{2}[\s\-_.]?[A-Za-z][\s\-_.]?[0-9]{2}[\s\-_.]?[A-Za-z0-9]{2})/i);
  if (separatedMatch && separatedMatch[1]) {
    const normalized = normalizeRollNumber(separatedMatch[1]);
    return normalized;
  }

  // 3. Match by student full names in class roster
  const cleanLower = clean.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  for (const student of FIXED_CLASS_ROSTER) {
    const studentNameLower = student.name.toLowerCase();
    // If the clean string contains the full student name
    if (cleanLower.includes(studentNameLower)) {
      return student.rollNo;
    }
    // Or if all major words (length >= 4) in student name are present in text
    const nameParts = studentNameLower.split(/\s+/).filter((p) => p.length >= 4);
    if (nameParts.length >= 2 && nameParts.every((p) => cleanLower.includes(p))) {
      return student.rollNo;
    }
  }

  // 4. Match by roll number suffix (e.g. 05DV, 05GB, 05EN)
  for (const student of FIXED_CLASS_ROSTER) {
    const suffix = student.rollNo.substring(6); // e.g., "05DV", "05GB", "05EN"
    const suffixRegex = new RegExp(`(?:^|[\\s_\\-\\(])${suffix}(?:[\\s_\\-\\.\\)]|$)`, 'i');
    if (suffixRegex.test(clean)) {
      return student.rollNo;
    }
  }

  // 5. Loose 10-char alphanumeric string starting with 2
  const looseMatch = clean.match(/(2[0-9][a-z0-9]{8})/i);
  if (looseMatch && looseMatch[1]) {
    return normalizeRollNumber(looseMatch[1]);
  }

  return null;
}

/**
 * Initial Reference / Seed Certificate Data (from Section 43 of requirements)
 * Used as reference/seed records for demonstration & testing
 */
export const INITIAL_REFERENCE_CERTIFICATES: Array<{ rollNo: string; certType: string }> = [
  { rollNo: '25A31A05EN', certType: 'Participation' },
  { rollNo: '25A31A05EN', certType: 'Course' },
  { rollNo: '25A31A05EN', certType: 'Hackathon' },
  { rollNo: '25A31A05FT', certType: 'Participation' },
  { rollNo: '25A31A05FT', certType: 'Merit' },
  { rollNo: '25A31A05EI', certType: 'Participation' },
  { rollNo: '25A31A05EM', certType: 'Participation' },
  { rollNo: '25A31A05EH', certType: 'Course' },
  { rollNo: '25A31A05EA', certType: 'Participation' },
  { rollNo: '25A31A05EA', certType: 'Course' },
  { rollNo: '25A31A05EO', certType: 'Course' },
  { rollNo: '25A31A05EO', certType: 'Participation' },
  { rollNo: '25A31A05EV', certType: 'Course' },
  { rollNo: '25A31A05GF', certType: 'Participation' },
  { rollNo: '25A31A05ER', certType: 'Certificate of Participation' },
  { rollNo: '25A31A05ER', certType: 'Course' },
  { rollNo: '25A31A05EL', certType: 'Course' },
  { rollNo: '25A31A05EP', certType: 'Course' },
  { rollNo: '25A31A05DZ', certType: 'Course' },
  { rollNo: '25A31A05GD', certType: 'Participation' },
  { rollNo: '25A31A05EZ', certType: 'Participation' },
  { rollNo: '25A31A05EZ', certType: 'Course' },
  { rollNo: '25A31A05DX', certType: 'Certification' },
  { rollNo: '25A31A05DX', certType: 'Participation' },
  { rollNo: '25A31A05GB', certType: 'Hackathon' },
  { rollNo: '25A31A05FW', certType: 'Hackathon' },
  { rollNo: '25A31A05FW', certType: 'Participation' },
  { rollNo: '25A31A05EY', certType: 'Hackathon' },
  { rollNo: '25A31A05EY', certType: 'Participation' },
  { rollNo: '25A31A05FA', certType: 'Hackathon' },
  { rollNo: '25A31A05GC', certType: 'Course' },
  { rollNo: '25A31A05GC', certType: 'Participation' },
  { rollNo: '25A31A05GC', certType: 'Award' },
  { rollNo: '25A31A05GE', certType: 'Course' },
  { rollNo: '25A31A05GE', certType: 'Participation' },
  { rollNo: '25A31A05GE', certType: 'Award' },
];
