import { Student } from '../types';

/**
 * EXACT FIXED CLASS ROSTER (67 STUDENTS ONLY)
 * As strictly specified in section 7 of the requirements.
 * Under no circumstances should any other student be added to the class roster.
 */
export const FIXED_CLASS_ROSTER: readonly Student[] = [
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
 * Fast lookup map by normalized roll number
 */
export const ROSTER_MAP = new Map<string, Student>(
  FIXED_CLASS_ROSTER.map((student) => [student.rollNo.toUpperCase().trim(), student])
);

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
 * Extracts a candidate roll number from a filename or text string
 * Examples:
 * 25A31A05EN_Hackathon.pdf -> 25A31A05EN
 * 25a31a05ey_Hackathon.pdf -> 25A31A05EY
 * 24A31A05JR_certificate.pdf -> 24A31A05JR (outside class)
 */
export function extractRollNumberFromText(text: string): string | null {
  if (!text) return null;
  // Match standard university roll number format like 25A31A05EN, 24A31A05JR, etc.
  // Standard format: 2 digits + 1 letter + 2 digits + 1 letter + 2 digits + 2 alphanumeric chars
  const match = text.match(/\b([0-9]{2}[A-Za-z][0-9]{2}[A-Za-z][0-9]{2}[A-Za-z0-9]{2})\b/i);
  if (match && match[1]) {
    return normalizeRollNumber(match[1]);
  }
  // Alternate: loose match if separated by underscores/hyphens
  const looseMatch = text.match(/(2[0-9][a-z0-9]{8})/i);
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
