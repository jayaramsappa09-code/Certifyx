/**
 * Advanced Search, Matching & NLP String Distance Engine
 * Provides multi-pass fuzzy matching, token-set similarity, OCR error tolerance,
 * advanced query grammar parsing, and match confidence scoring.
 */

import { StudentStatusRecord, DriveCertificateFile, SheetRowRecord, Student } from '../types';

/**
 * Calculates Levenshtein edit distance between two strings
 */
export function getLevenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d: number[][] = [];

  for (let i = 0; i <= m; i++) d[i] = [i];
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return d[m][n];
}

/**
 * Calculates fuzzy string similarity ratio between 0.0 and 1.0
 */
export function getStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const s1 = str1.trim().toLowerCase();
  const s2 = str2.trim().toLowerCase();
  if (s1 === s2) return 1.0;

  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;

  const distance = getLevenshteinDistance(s1, s2);
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Token-set fuzzy similarity: handles word permutations, extra middle names, etc.
 * e.g. "Sappa Jayaram Siva Prasad" vs "Jayaram Sappa" -> high similarity score
 */
export function getTokenSetSimilarity(name1: string, name2: string): number {
  if (!name1 || !name2) return 0;
  const clean1 = name1.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
  const clean2 = name2.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();

  if (clean1 === clean2) return 1.0;

  const tokens1 = new Set(clean1.split(/\s+/).filter((t) => t.length >= 2));
  const tokens2 = new Set(clean2.split(/\s+/).filter((t) => t.length >= 2));

  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  let intersectionCount = 0;
  tokens1.forEach((t1) => {
    if (tokens2.has(t1)) {
      intersectionCount++;
    } else {
      // Check partial/fuzzy match on individual tokens (e.g., typo in 1 word)
      for (const t2 of tokens2) {
        if (getStringSimilarity(t1, t2) >= 0.8) {
          intersectionCount += 0.9;
          break;
        }
      }
    }
  });

  const unionCount = tokens1.size + tokens2.size - intersectionCount;
  return Math.min(1.0, intersectionCount / Math.max(1, unionCount));
}

/**
 * OCR & typo-tolerant roll number normalizer
 * Normalizes common OCR misreads (e.g., capital 'O' for '0', 'I' for '1', 'S' for '5', 'B' for '8')
 */
export function normalizeOcrRollNumber(raw: string): string {
  if (!raw) return '';
  return raw
    .toUpperCase()
    .replace(/[\s\-_.]/g, '')
    .trim();
}

/**
 * Parses advanced search queries with field qualifiers, negation, and multi-tokens.
 * Examples:
 * - `25a31a05gb status:completed`
 * - `has:drive no:sheet cat:hackathon`
 * - `jayaram -completed`
 * - `"sappa jayaram" cat:course`
 */
export interface ParsedSearchQuery {
  freeTextTokens: string[];
  exactPhrases: string[];
  negatedTokens: string[];
  fieldFilters: {
    status?: 'COMPLETED' | 'PENDING' | 'NOT STARTED' | 'UNSUBMITTED_MATCH' | 'MISMATCH';
    hasDrive?: boolean;
    hasSheet?: boolean;
    isSubmitted?: boolean;
    category?: string;
    rollNo?: string;
    section?: string;
  };
}

export function parseSearchQuery(query: string): ParsedSearchQuery {
  const result: ParsedSearchQuery = {
    freeTextTokens: [],
    exactPhrases: [],
    negatedTokens: [],
    fieldFilters: {},
  };

  if (!query || !query.trim()) return result;

  // 1. Extract exact phrases in quotes (e.g. "sappa jayaram")
  let processed = query;
  const quoteMatches = processed.match(/"([^"]+)"/g);
  if (quoteMatches) {
    quoteMatches.forEach((m) => {
      const phrase = m.replace(/"/g, '').trim().toLowerCase();
      if (phrase) result.exactPhrases.push(phrase);
      processed = processed.replace(m, ' ');
    });
  }

  // 2. Tokenize remaining words
  const parts = processed.split(/\s+/).filter(Boolean);

  parts.forEach((part) => {
    const lower = part.toLowerCase();

    // Negation (e.g. -completed or -hackathon)
    if (lower.startsWith('-') && lower.length > 1) {
      result.negatedTokens.push(lower.slice(1));
      return;
    }

    // Status qualifiers
    if (lower.startsWith('status:')) {
      const val = lower.slice(7);
      if (val === 'completed' || val === 'verified') result.fieldFilters.status = 'COMPLETED';
      else if (val === 'pending' || val === 'incomplete') result.fieldFilters.status = 'PENDING';
      else if (val === 'not_started' || val === 'notstarted') result.fieldFilters.status = 'NOT STARTED';
      else if (val === 'mismatch') result.fieldFilters.status = 'MISMATCH';
      return;
    }

    // Drive presence qualifiers
    if (lower === 'has:drive' || lower === 'drive:yes') {
      result.fieldFilters.hasDrive = true;
      return;
    }
    if (lower === 'no:drive' || lower === 'drive:no') {
      result.fieldFilters.hasDrive = false;
      return;
    }

    // Sheet presence qualifiers
    if (lower === 'has:sheet' || lower === 'sheet:yes') {
      result.fieldFilters.hasSheet = true;
      return;
    }
    if (lower === 'no:sheet' || lower === 'sheet:no') {
      result.fieldFilters.hasSheet = false;
      return;
    }

    // Submission qualifiers
    if (lower === 'is:submitted' || lower === 'submitted:yes') {
      result.fieldFilters.isSubmitted = true;
      return;
    }
    if (lower === 'not:submitted' || lower === 'submitted:no') {
      result.fieldFilters.isSubmitted = false;
      return;
    }

    // Category qualifiers (e.g. cat:hackathon, type:course)
    if (lower.startsWith('cat:') || lower.startsWith('type:') || lower.startsWith('category:')) {
      const cat = lower.split(':')[1];
      if (cat) result.fieldFilters.category = cat;
      return;
    }

    // Section qualifiers (e.g. sec:a, section:a)
    if (lower.startsWith('sec:') || lower.startsWith('section:')) {
      const sec = lower.split(':')[1];
      if (sec) result.fieldFilters.section = sec.toUpperCase();
      return;
    }

    // Default free-text token
    result.freeTextTokens.push(lower);
  });

  return result;
}

/**
 * Checks whether a student record matches the parsed advanced search query
 */
export function isStudentMatchingAdvancedQuery(
  student: StudentStatusRecord,
  parsed: ParsedSearchQuery
): boolean {
  const { fieldFilters, exactPhrases, negatedTokens, freeTextTokens } = parsed;

  // 1. Status Filter Check
  if (fieldFilters.status) {
    if (fieldFilters.status === 'MISMATCH') {
      const isMismatch =
        (student.countMismatch && student.countMismatch.hasMismatch) ||
        student.driveUploaded !== student.sheetUpdated;
      if (!isMismatch) return false;
    } else if (student.overallStatus !== fieldFilters.status) {
      return false;
    }
  }

  // 2. Drive Flag Check
  if (fieldFilters.hasDrive !== undefined) {
    if (student.driveUploaded !== fieldFilters.hasDrive) return false;
  }

  // 3. Sheet Flag Check
  if (fieldFilters.hasSheet !== undefined) {
    if (student.sheetUpdated !== fieldFilters.hasSheet) return false;
  }

  // 4. Submitted Flag Check
  if (fieldFilters.isSubmitted !== undefined) {
    if (student.submitted !== fieldFilters.isSubmitted) return false;
  }

  // 5. Category Check
  if (fieldFilters.category) {
    const targetCat = fieldFilters.category.toLowerCase();
    const hasCategory =
      student.certificates.some((c) => c.toLowerCase().includes(targetCat)) ||
      student.driveFiles.some(
        (f) =>
          f.detectedCertType?.toLowerCase().includes(targetCat) ||
          f.name.toLowerCase().includes(targetCat)
      ) ||
      student.sheetRecords.some(
        (r) =>
          r.certificateType?.toLowerCase().includes(targetCat) ||
          r.matchedStudentName?.toLowerCase().includes(targetCat)
      );
    if (!hasCategory) return false;
  }

  // Build searchable text haystack
  const allText = [
    student.rollNo,
    student.name,
    student.email || '',
    student.phone || '',
    student.overallStatus,
    ...student.certificates,
    ...student.driveFiles.map((f) => `${f.name} ${f.detectedCertType || ''} ${f.detectedCertTitle || ''}`),
    ...student.sheetRecords.map((r) => `${r.certificateType || ''} ${r.name || ''} ${r.matchedRollNo || ''}`),
  ]
    .join(' ')
    .toLowerCase();

  // 6. Negated Tokens Check (MUST NOT contain)
  for (const neg of negatedTokens) {
    if (allText.includes(neg)) return false;
  }

  // 7. Exact Phrases Check (MUST contain exact string)
  for (const phrase of exactPhrases) {
    if (!allText.includes(phrase)) return false;
  }

  // 8. Free-Text Tokens Check (Every token must match something in the student's text or roll suffix)
  for (const token of freeTextTokens) {
    // Check direct substring
    if (allText.includes(token)) continue;

    // Check roll number suffix (e.g. searching "05GB" or "5GB")
    const cleanToken = token.replace(/[^a-z0-9]/g, '');
    const cleanRoll = student.rollNo.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanRoll.endsWith(cleanToken) || cleanRoll.includes(cleanToken)) continue;

    // Check fuzzy match against student name
    const nameSim = getTokenSetSimilarity(student.name, token);
    if (nameSim >= 0.75) continue;

    // If no token match found
    return false;
  }

  return true;
}

/**
 * Intelligent Match Result with confidence rating
 */
export interface MatchScoringResult {
  matchedStudent?: Student;
  confidenceScore: number; // 0 to 100
  confidenceLevel: 'EXACT' | 'HIGH' | 'MEDIUM' | 'FUZZY' | 'MANUAL';
  matchReason: string;
}

/**
 * Evaluates candidate text (filename, folder, sheet row) against class roster with multi-pass matching
 */
export function scoreStudentMatch(
  inputText: string,
  roster: Student[],
  options: {
    customRegex?: string;
    allowFuzzy?: boolean;
    emailCandidate?: string;
  } = {}
): MatchScoringResult {
  if (!inputText && !options.emailCandidate) {
    return {
      confidenceScore: 0,
      confidenceLevel: 'FUZZY',
      matchReason: 'Empty input text',
    };
  }

  const cleanText = (inputText || '').trim();
  const normalizedInput = normalizeOcrRollNumber(cleanText);

  // PASS 1: Exact 10-character standard university roll number
  for (const student of roster) {
    const studentRoll = normalizeOcrRollNumber(student.rollNo);
    if (normalizedInput.includes(studentRoll) || cleanText.toUpperCase().includes(studentRoll)) {
      return {
        matchedStudent: student,
        confidenceScore: 100,
        confidenceLevel: 'EXACT',
        matchReason: `Exact University Roll Number Match (${student.rollNo})`,
      };
    }
  }

  // PASS 2: Institutional Email Parsing (e.g., 25a31a05gb@pragati.ac.in)
  if (options.emailCandidate) {
    const cleanEmail = options.emailCandidate.toLowerCase().trim();
    for (const student of roster) {
      const rollLower = student.rollNo.toLowerCase();
      if (cleanEmail.includes(rollLower)) {
        return {
          matchedStudent: student,
          confidenceScore: 98,
          confidenceLevel: 'EXACT',
          matchReason: `Institutional Email Address Match (${student.rollNo})`,
        };
      }
    }
  }

  // PASS 3: Suffix Pattern Match (e.g. 05GB, 5GB, 05DV, 05EN) with Word Boundary
  for (const student of roster) {
    const suffix = student.rollNo.substring(6).toUpperCase(); // e.g. "05GB"
    const suffixRegex = new RegExp(`(?:^|[\\s_\\-\\(\\[])${suffix}(?:[\\s_\\-\\.\\)\\]]|$)`, 'i');
    if (suffixRegex.test(cleanText)) {
      return {
        matchedStudent: student,
        confidenceScore: 92,
        confidenceLevel: 'HIGH',
        matchReason: `Unique Section Suffix Match (${suffix} ➔ ${student.rollNo})`,
      };
    }
  }

  // PASS 4: Full Student Name in Text
  const textLower = cleanText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  for (const student of roster) {
    const nameLower = student.name.toLowerCase();
    if (textLower.includes(nameLower)) {
      return {
        matchedStudent: student,
        confidenceScore: 90,
        confidenceLevel: 'HIGH',
        matchReason: `Full Student Name Match in Text ("${student.name}")`,
      };
    }
  }

  // PASS 5: Multi-Word Name Token Matching (e.g. "Sappa Jayaram" in "Sappa Jayaram Siva Prasad")
  if (options.allowFuzzy !== false) {
    let bestMatch: Student | undefined = undefined;
    let highestSim = 0;

    for (const student of roster) {
      const sim = getTokenSetSimilarity(cleanText, student.name);
      if (sim > highestSim && sim >= 0.75) {
        highestSim = sim;
        bestMatch = student;
      }
    }

    if (bestMatch && highestSim >= 0.75) {
      const confidence = Math.round(highestSim * 100);
      return {
        matchedStudent: bestMatch,
        confidenceScore: confidence,
        confidenceLevel: confidence >= 85 ? 'HIGH' : 'MEDIUM',
        matchReason: `Fuzzy Name Token Similarity (${confidence}% with "${bestMatch.name}")`,
      };
    }
  }

  return {
    confidenceScore: 0,
    confidenceLevel: 'FUZZY',
    matchReason: 'No confident match found in class roster',
  };
}
