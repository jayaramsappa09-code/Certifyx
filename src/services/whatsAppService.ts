import { WhatsAppApiConfig, StudentStatusRecord } from '../types';

export interface WhatsAppSendResult {
  success: boolean;
  mode: 'DEEPLINK';
  deeplinkUrl?: string;
  error?: string;
}

/**
 * Format raw phone input into a clean E.164 string for WhatsApp API (e.g., 919876543210)
 */
export function normalizePhoneNumber(rawPhone?: string): string {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/[^0-9]/g, '');
  if (!digits) return '';
  // If 10 digits (standard Indian mobile format without country code)
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

/**
 * Send an individual WhatsApp notice via direct WhatsApp Web / App deeplink (wa.me)
 */
export async function sendWhatsAppNotice(
  phone: string,
  message: string,
  _config?: WhatsAppApiConfig
): Promise<WhatsAppSendResult> {
  const cleanPhone = normalizePhoneNumber(phone);

  if (!cleanPhone) {
    return {
      success: false,
      mode: 'DEEPLINK',
      error: 'Missing or invalid phone number',
    };
  }

  const encodedText = encodeURIComponent(message);
  const deeplinkUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;

  return {
    success: true,
    mode: 'DEEPLINK',
    deeplinkUrl,
  };
}

/**
 * Helper to build standard student notice text for WhatsApp
 */
export function buildWhatsAppStudentMessage(
  student: StudentStatusRecord,
  driveLink: string,
  sheetLink: string
): string {
  let missingItemsDesc = '';
  if (student.countMismatch && student.countMismatch.hasMismatch) {
    if (student.countMismatch.type === 'MORE_IN_SHEET') {
      missingItemsDesc = `• Certificate File Discrepancy: ${student.countMismatch.sheetCount} entries in Google Sheet vs ${student.countMismatch.driveCount} PDF(s) in Drive (${student.countMismatch.difference} missing PDF file).`;
    } else if (student.countMismatch.type === 'MORE_IN_DRIVE') {
      missingItemsDesc = `• Google Sheet Entry Discrepancy: ${student.countMismatch.driveCount} PDF(s) in Drive vs ${student.countMismatch.sheetCount} entry in Sheet (${student.countMismatch.difference} missing Form response).`;
    }
  } else if (!student.driveUploaded && !student.sheetUpdated) {
    missingItemsDesc = `• Missing both Google Drive certificate upload AND Google Form response.`;
  } else if (!student.driveUploaded) {
    missingItemsDesc = `• Missing PDF certificate upload in Google Drive.`;
  } else if (!student.sheetUpdated) {
    missingItemsDesc = `• Missing response entry in Google Form / Sheet.`;
  } else {
    missingItemsDesc = `• Pending administrator review and verification.`;
  }

  return (
    `*📢 ACADEMIC CERTIFICATE NOTICE*\n\n` +
    `Hello *${student.name}* (Roll: \`${student.rollNo}\`),\n\n` +
    `This is an official administrative reminder regarding your pending certificate submission for the class roster.\n\n` +
    `*Status:* ${student.overallStatus}\n` +
    `*Action Required:*\n${missingItemsDesc}\n\n` +
    `*Official Submission Links:*\n` +
    `📁 Google Drive Upload: ${driveLink}\n` +
    `📋 Google Sheet Form: ${sheetLink}\n\n` +
    `_Please complete your pending upload/response immediately._\n` +
    `- Academic Certification & Verification Committee`
  );
}
