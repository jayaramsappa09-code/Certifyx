import React, { useMemo } from 'react';
import { StudentStatusRecord } from '../types';

interface HighlightTextProps {
  text: string | null | undefined;
  query: string;
  className?: string;
  highlightClassName?: string;
}

/**
 * Extracts searchable highlight words from free text or structured query syntax
 */
export function extractHighlightTokens(query: string): string[] {
  if (!query || !query.trim()) return [];

  const raw = query.trim();
  const tokens: string[] = [];

  // 1. Extract quoted phrases e.g. "Sappa Jayaram"
  const quotes = raw.match(/"([^"]+)"/g);
  if (quotes) {
    quotes.forEach((q) => {
      const clean = q.replace(/"/g, '').trim();
      if (clean.length > 0) tokens.push(clean);
    });
  }

  // 2. Extract individual words and field qualifier values (e.g. "roll:25a" -> "25a", "cat:hackathon" -> "hackathon")
  const parts = raw.replace(/"[^"]+"/g, ' ').split(/\s+/).filter(Boolean);
  parts.forEach((p) => {
    let clean = p.trim();
    if (clean.startsWith('-') || clean.startsWith('+')) {
      clean = clean.slice(1).trim();
    }
    if (clean.includes(':')) {
      const parts = clean.split(':');
      const val = parts.slice(1).join(':').trim();
      if (val.length > 0) tokens.push(val);
    } else if (clean.length > 0) {
      tokens.push(clean);
    }
  });

  // Filter unique tokens and sort by length descending to match longest phrases first
  return Array.from(new Set(tokens.filter((t) => t.length > 0))).sort(
    (a, b) => b.length - a.length
  );
}

/**
 * Escapes regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Renders text with glowing visual highlights for all matching query tokens
 */
export const HighlightText: React.FC<HighlightTextProps> = ({
  text,
  query,
  className = '',
  highlightClassName = 'bg-amber-400/30 text-amber-200 font-extrabold px-1 py-0.5 rounded shadow-[0_0_8px_rgba(251,191,36,0.35)] border border-amber-400/60 inline-block align-baseline transition-all duration-150',
}) => {
  if (!text) return null;

  const tokens = useMemo(() => extractHighlightTokens(query), [query]);

  if (tokens.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Build regex pattern matching any of the tokens safely
  const pattern = `(${tokens.map(escapeRegex).join('|')})`;
  const regex = new RegExp(pattern, 'gi');

  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isMatch = tokens.some((t) => t.toLowerCase() === part.toLowerCase());
        if (isMatch) {
          return (
            <mark key={index} className={highlightClassName}>
              {part}
            </mark>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
};

export interface MatchReason {
  type: 'ROLL' | 'NAME' | 'CERT' | 'FILE' | 'STATUS';
  label: string;
  matchedText: string;
}

/**
 * Determines why a student matched the current search query to display helpful visual hints
 */
export function getStudentMatchReasons(student: StudentStatusRecord, query: string): MatchReason[] {
  if (!query || !query.trim()) return [];
  const tokens = extractHighlightTokens(query).map((t) => t.toLowerCase());
  if (tokens.length === 0) return [];

  const reasons: MatchReason[] = [];

  // Check Roll Number
  if (student.rollNo && tokens.some((t) => student.rollNo.toLowerCase().includes(t))) {
    reasons.push({
      type: 'ROLL',
      label: 'Roll No',
      matchedText: student.rollNo,
    });
  }

  // Check Student Name
  if (student.name && tokens.some((t) => student.name.toLowerCase().includes(t))) {
    reasons.push({
      type: 'NAME',
      label: 'Name',
      matchedText: student.name,
    });
  }

  // Check Certificates
  if (student.certificates && student.certificates.length > 0) {
    for (const cert of student.certificates) {
      if (tokens.some((t) => cert.toLowerCase().includes(t))) {
        reasons.push({
          type: 'CERT',
          label: 'Certificate',
          matchedText: cert,
        });
        break; // Show first matched certificate
      }
    }
  }

  // Check Drive Files
  if (student.driveFiles && student.driveFiles.length > 0) {
    for (const file of student.driveFiles) {
      if (tokens.some((t) => file.name.toLowerCase().includes(t))) {
        reasons.push({
          type: 'FILE',
          label: 'Drive File',
          matchedText: file.name,
        });
        break; // Show first matched file
      }
    }
  }

  // Check Status
  if (student.overallStatus && tokens.some((t) => student.overallStatus.toLowerCase().includes(t))) {
    reasons.push({
      type: 'STATUS',
      label: 'Status',
      matchedText: student.overallStatus,
    });
  }

  return reasons;
}
