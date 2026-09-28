import { Student, DriveCertificateFile } from '../types';
import { getStringSimilarity, getTokenSetSimilarity, normalizeOcrRollNumber } from './advancedSearchAndMatchEngine';

export interface StudentSimilarityMatch {
  student: Student;
  confidence: number; // 0 to 100
  matchReason: string;
  matchedBy: 'EXACT_ROLL' | 'PARTIAL_ROLL' | 'FUZZY_ROLL' | 'EXACT_NAME' | 'TOKEN_NAME' | 'FUZZY_NAME';
  matchedSnippet: string;
}

export interface FileAutoMapResult {
  file: DriveCertificateFile;
  bestMatch: StudentSimilarityMatch | null;
  alternativeMatches: StudentSimilarityMatch[];
  isHighConfidence: boolean; // >= 75%
}

// Common generic words in certificate filenames to ignore during name extraction
const CERT_STOPWORDS = new Set([
  'certificate',
  'certificates',
  'cert',
  'certs',
  'participation',
  'participated',
  'completion',
  'completed',
  'hackathon',
  'workshop',
  'webinar',
  'course',
  'internship',
  'intern',
  'award',
  'merit',
  'badge',
  'presentation',
  'paper',
  'poster',
  'file',
  'document',
  'doc',
  'copy',
  'img',
  'image',
  'scan',
  'scanned',
  'final',
  'new',
  'drive',
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'student',
  'college',
  'verified',
  'unnamed',
  'download',
  'uploads',
  'unknown',
  'batch',
  'unmarked',
  'attendance',
]);

/**
 * Normalizes common OCR misreads in roll numbers:
 * - 'O' or 'o' -> '0'
 * - 'I' or 'l' -> '1'
 * - 'S' or 's' -> '5'
 * - 'B' -> '8'
 * - 'Z' -> '2'
 */
export function normalizeOcrSubstitutions(text: string): string {
  if (!text) return '';
  return text
    .toUpperCase()
    .replace(/[\s\-_.]/g, '')
    // Replace 'O' with '0' if surrounded by digits or standard roll positions
    .replace(/(?<=25[A-Z]31[A-Z])O(?=[0-9A-Z]{2,3})/gi, '0')
    .replace(/25[A-Z]31[A-Z]O5/gi, (m) => m.replace(/O/gi, '0'))
    .replace(/(?<=[0-9])O(?=[0-9])/g, '0')
    .replace(/(?<=[0-9]{2}[A-Z][0-9]{2}[A-Z])O/g, '0');
}

/**
 * Normalizes a filename into clean searchable tokens and a contiguous string
 */
function cleanFilename(rawName: string): { cleanText: string; tokens: string[]; rawNormalized: string; ocrClean: string } {
  if (!rawName) return { cleanText: '', tokens: [], rawNormalized: '', ocrClean: '' };

  // Remove extension
  const withoutExt = rawName.replace(/\.[a-zA-Z0-9]{2,5}$/, '');
  // Normalize punctuation to spaces
  const cleanWithSpaces = withoutExt.replace(/[_\-./\\()[\]+%,#@&:]/g, ' ').toLowerCase();

  // Split into tokens
  const rawTokens = cleanWithSpaces.split(/\s+/).filter((t) => t.length > 0);
  const filteredTokens = rawTokens.filter((t) => !CERT_STOPWORDS.has(t) && t.length >= 2);

  // Contiguous normalized string (e.g. "25a31a05dvhackathon")
  const rawNormalized = withoutExt.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const ocrClean = normalizeOcrSubstitutions(rawNormalized).toLowerCase();

  return {
    cleanText: filteredTokens.join(' '),
    tokens: filteredTokens,
    rawNormalized,
    ocrClean,
  };
}

/**
 * Cleans a student name into distinctive tokens
 */
function cleanStudentName(name: string): { fullClean: string; tokens: string[]; rawNormalized: string } {
  const clean = name.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
  const tokens = clean.split(/\s+/).filter((t) => t.length >= 2);
  const rawNormalized = clean.replace(/[^a-z0-9]/g, '');
  return { fullClean: clean, tokens, rawNormalized };
}

/**
 * Pre-computes how frequently each name token appears across the entire student roster.
 * Tokens with frequency == 1 are completely unique identifiers for a student!
 */
export function buildRosterTokenFrequency(roster: Student[]): Map<string, number> {
  const freq = new Map<string, number>();
  roster.forEach((s) => {
    const { tokens } = cleanStudentName(s.name);
    tokens.forEach((t) => {
      freq.set(t, (freq.get(t) || 0) + 1);
    });
  });
  return freq;
}

/**
 * Calculates string similarity match between a file and a student
 */
export function calculateFileToStudentSimilarity(
  file: DriveCertificateFile,
  student: Student,
  tokenFrequency?: Map<string, number>
): StudentSimilarityMatch | null {
  const fileName = file.name || '';
  const folderName = file.parentFolderName || '';
  const combinedFileText = `${fileName} ${folderName}`;

  const { cleanText, tokens: fileTokens, rawNormalized: fileRawNorm, ocrClean: fileOcrClean } = cleanFilename(combinedFileText);
  const studentRollNorm = student.rollNo.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const studentRollOcr = normalizeOcrSubstitutions(student.rollNo).toLowerCase();
  const { fullClean: studentNameClean, tokens: studentNameTokens, rawNormalized: studentNameRawNorm } = cleanStudentName(student.name);

  // 1. EXACT ROLL NUMBER MATCH (in raw normalized or filename)
  if (fileRawNorm.includes(studentRollNorm)) {
    return {
      student,
      confidence: 99,
      matchReason: `Exact roll number "${student.rollNo}" matched in filename`,
      matchedBy: 'EXACT_ROLL',
      matchedSnippet: student.rollNo,
    };
  }

  // 2. OCR / TYPO-TOLERANT ROLL NUMBER MATCH
  // Check OCR normalized string
  if (fileOcrClean.includes(studentRollOcr)) {
    return {
      student,
      confidence: 97,
      matchReason: `Roll number matched via OCR normalization (OCR typo resolved to "${student.rollNo}")`,
      matchedBy: 'FUZZY_ROLL',
      matchedSnippet: student.rollNo,
    };
  }

  // Check if any file token or window matches student roll with edit distance <= 1 or OCR normalization
  const ocrNormalizedRoll = normalizeOcrRollNumber(student.rollNo).toLowerCase();
  for (const token of fileTokens) {
    if (token.length >= 7) {
      const ocrToken = normalizeOcrSubstitutions(token).toLowerCase();
      if (ocrToken === studentRollOcr || ocrToken === ocrNormalizedRoll) {
        return {
          student,
          confidence: 96,
          matchReason: `Roll number matched via OCR substitution ("${token}" ≈ "${student.rollNo}")`,
          matchedBy: 'FUZZY_ROLL',
          matchedSnippet: token,
        };
      }
      const sim = getStringSimilarity(ocrToken, studentRollOcr);
      if (sim >= 0.88) {
        return {
          student,
          confidence: Math.round(sim * 100),
          matchReason: `Fuzzy roll number match ("${token}" ≈ "${student.rollNo}", ${Math.round(sim * 100)}%)`,
          matchedBy: 'FUZZY_ROLL',
          matchedSnippet: token,
        };
      }
    }
  }

  // 3. PARTIAL ROLL SUFFIX MATCH (e.g. "05DV", "05dv", "A05DV", "0501" when length >= 4)
  if (studentRollNorm.length >= 4) {
    const rollSuffix4 = studentRollNorm.slice(-4); // e.g. "05dv" or "05dy"
    const rollSuffix5 = studentRollNorm.length >= 5 ? studentRollNorm.slice(-5) : ''; // e.g. "a05dv"

    if (rollSuffix5 && (fileRawNorm.includes(rollSuffix5) || fileTokens.includes(rollSuffix5) || fileOcrClean.includes(rollSuffix5))) {
      return {
        student,
        confidence: 92,
        matchReason: `Roll number branch suffix "${student.rollNo.slice(-5)}" found in filename`,
        matchedBy: 'PARTIAL_ROLL',
        matchedSnippet: student.rollNo.slice(-5),
      };
    }

    if (fileRawNorm.includes(rollSuffix4) || fileTokens.includes(rollSuffix4) || fileOcrClean.includes(rollSuffix4)) {
      return {
        student,
        confidence: 88,
        matchReason: `Roll number serial suffix "${student.rollNo.slice(-4)}" found in filename`,
        matchedBy: 'PARTIAL_ROLL',
        matchedSnippet: student.rollNo.slice(-4),
      };
    }
  }

  // 4. EXACT FULL NAME MATCH
  if (studentNameRawNorm.length >= 6 && fileRawNorm.includes(studentNameRawNorm)) {
    return {
      student,
      confidence: 98,
      matchReason: `Full student name "${student.name}" found in filename`,
      matchedBy: 'EXACT_NAME',
      matchedSnippet: student.name,
    };
  }

  // 5. TOKEN-SET NAME SIMILARITY (handles permutations, middle names, partial matches, distinctive surnames)
  if (studentNameTokens.length > 0 && fileTokens.length > 0) {
    let matchedTokenCount = 0;
    const matchedTokenWords: string[] = [];
    let hasUniqueDistinctiveToken = false;

    studentNameTokens.forEach((sToken) => {
      // Check if this token is unique to this student across the entire class roster
      const isUniqueInRoster = tokenFrequency ? tokenFrequency.get(sToken) === 1 : false;

      // Direct token match
      if (fileTokens.includes(sToken)) {
        matchedTokenCount++;
        matchedTokenWords.push(sToken);
        if (isUniqueInRoster && sToken.length >= 4) {
          hasUniqueDistinctiveToken = true;
        }
      } else {
        // Substring token match or typo in token (e.g. sToken length >= 4)
        for (const fToken of fileTokens) {
          if (sToken.length >= 4 && fToken.includes(sToken)) {
            matchedTokenCount += 0.92;
            matchedTokenWords.push(sToken);
            if (isUniqueInRoster) hasUniqueDistinctiveToken = true;
            break;
          } else if (fToken.length >= 4 && sToken.includes(fToken)) {
            matchedTokenCount += 0.88;
            matchedTokenWords.push(fToken);
            break;
          } else if (sToken.length >= 4 && fToken.length >= 4 && getStringSimilarity(sToken, fToken) >= 0.82) {
            matchedTokenCount += 0.82;
            matchedTokenWords.push(`${fToken}≈${sToken}`);
            if (isUniqueInRoster) hasUniqueDistinctiveToken = true;
            break;
          }
        }
      }
    });

    const tokenRatio = matchedTokenCount / studentNameTokens.length;

    // Unique distinctive token match (e.g. "ZAHURUNNISA", "THRAITHESHWARI", "BABI", "JERIYA", "NAVYA", "DEEPTHI")
    if (hasUniqueDistinctiveToken && matchedTokenWords.length >= 1) {
      const confidence = Math.min(95, Math.round(85 + (matchedTokenCount / studentNameTokens.length) * 12));
      return {
        student,
        confidence,
        matchReason: `Unique roster name token "${matchedTokenWords.join(', ').toUpperCase()}" matched in filename`,
        matchedBy: 'TOKEN_NAME',
        matchedSnippet: matchedTokenWords.join(' '),
      };
    }

    // 2 or more distinctive tokens matched, or >= 60% of name tokens matched
    if (matchedTokenCount >= 2 || (tokenRatio >= 0.60 && studentNameTokens.length <= 2)) {
      const confidence = Math.min(94, Math.round(75 + tokenRatio * 20));
      return {
        student,
        confidence,
        matchReason: `Matched name parts: [${matchedTokenWords.slice(0, 3).join(', ')}] in filename`,
        matchedBy: 'TOKEN_NAME',
        matchedSnippet: matchedTokenWords.join(' '),
      };
    }

    // Single strong distinctive token match (must be length >= 5 chars)
    if (matchedTokenCount >= 1 && matchedTokenWords.length === 1) {
      const word = matchedTokenWords[0];
      if (word.length >= 5) {
        return {
          student,
          confidence: 76,
          matchReason: `Distinctive name part "${word.toUpperCase()}" matched in filename`,
          matchedBy: 'TOKEN_NAME',
          matchedSnippet: word,
        };
      }
    }

    // 6. OVERALL TOKEN-SET SIMILARITY via NLP helper
    const setSim = getTokenSetSimilarity(cleanText, studentNameClean);
    if (setSim >= 0.58) {
      const confidence = Math.round(setSim * 100);
      return {
        student,
        confidence,
        matchReason: `Fuzzy name similarity (${confidence}%) between filename and student`,
        matchedBy: 'FUZZY_NAME',
        matchedSnippet: cleanText,
      };
    }
  }

  return null;
}

/**
 * Finds the best student match for an unidentified file from the class roster
 */
export function findBestStudentMatchForFile(
  file: DriveCertificateFile,
  roster: Student[],
  tokenFrequency?: Map<string, number>
): FileAutoMapResult {
  const matches: StudentSimilarityMatch[] = [];
  const freq = tokenFrequency || buildRosterTokenFrequency(roster);

  for (const student of roster) {
    const match = calculateFileToStudentSimilarity(file, student, freq);
    if (match && match.confidence >= 60) {
      matches.push(match);
    }
  }

  // Sort by confidence descending
  matches.sort((a, b) => b.confidence - a.confidence);

  const bestMatch = matches.length > 0 ? matches[0] : null;
  const alternativeMatches = matches.length > 1 ? matches.slice(1, 4) : [];
  const isHighConfidence = !!bestMatch && bestMatch.confidence >= 75;

  return {
    file,
    bestMatch,
    alternativeMatches,
    isHighConfidence,
  };
}

/**
 * Scans a list of unidentified files and computes auto-mapping recommendations
 */
export function scanUnidentifiedFilesForAutoMapping(
  unidentifiedFiles: DriveCertificateFile[],
  roster: Student[]
): {
  results: Map<string, FileAutoMapResult>;
  highConfidenceMatches: FileAutoMapResult[];
  mediumConfidenceMatches: FileAutoMapResult[];
  unmatchedCount: number;
} {
  const results = new Map<string, FileAutoMapResult>();
  const highConfidenceMatches: FileAutoMapResult[] = [];
  const mediumConfidenceMatches: FileAutoMapResult[] = [];
  const tokenFreq = buildRosterTokenFrequency(roster);
  let unmatchedCount = 0;

  unidentifiedFiles.forEach((file) => {
    const result = findBestStudentMatchForFile(file, roster, tokenFreq);
    results.set(file.id, result);

    if (result.bestMatch) {
      if (result.isHighConfidence) {
        highConfidenceMatches.push(result);
      } else {
        mediumConfidenceMatches.push(result);
      }
    } else {
      unmatchedCount++;
    }
  });

  return {
    results,
    highConfidenceMatches,
    mediumConfidenceMatches,
    unmatchedCount,
  };
}

