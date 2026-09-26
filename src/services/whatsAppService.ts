import { WhatsAppApiConfig, StudentStatusRecord } from '../types';

export interface WhatsAppSendResult {
  success: boolean;
  mode: 'TWILIO' | 'META' | 'WEBHOOK' | 'DEEPLINK';
  messageId?: string;
  error?: string;
  deeplinkUrl?: string;
}

/**
 * Format raw phone input into a clean E.164 string for WhatsApp API (e.g., +919876543210 or 919876543210)
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
 * Send an individual WhatsApp notice via Twilio API, Meta WhatsApp Cloud API, Webhook, or WhatsApp Web link fallback.
 */
export async function sendWhatsAppNotice(
  phone: string,
  message: string,
  config?: WhatsAppApiConfig
): Promise<WhatsAppSendResult> {
  const cleanPhone = normalizePhoneNumber(phone);

  if (!cleanPhone && config?.provider !== 'CUSTOM_WEBHOOK') {
    return {
      success: false,
      mode: 'DEEPLINK',
      error: 'Missing or invalid phone number',
    };
  }

  // 1. TWILIO WHATSAPP API
  if (
    config?.provider === 'TWILIO' &&
    config.twilioAccountSid &&
    config.twilioAuthToken
  ) {
    try {
      const accountSid = config.twilioAccountSid.trim();
      const authToken = config.twilioAuthToken.trim();
      const fromNumber = config.twilioWhatsAppFrom?.trim() || 'whatsapp:+14155238886';
      const toNumber = cleanPhone.startsWith('+') ? `whatsapp:${cleanPhone}` : `whatsapp:+${cleanPhone}`;

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const formData = new URLSearchParams();
      formData.append('From', fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`);
      formData.append('To', toNumber);
      formData.append('Body', message);

      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const data = await response.json();

      if (response.ok && data.sid) {
        return {
          success: true,
          mode: 'TWILIO',
          messageId: data.sid,
        };
      } else {
        return {
          success: false,
          mode: 'TWILIO',
          error: data.message || data.detail || 'Twilio WhatsApp API dispatch failed',
        };
      }
    } catch (err: any) {
      return {
        success: false,
        mode: 'TWILIO',
        error: err.message || 'Twilio network request failed',
      };
    }
  }

  // 2. META WHATSAPP CLOUD API
  if (
    config?.provider === 'META_CLOUD_API' &&
    config.metaPhoneNumberId &&
    config.metaAccessToken
  ) {
    try {
      const phoneNumberId = config.metaPhoneNumberId.trim();
      const accessToken = config.metaAccessToken.trim();
      const metaUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

      const response = await fetch(metaUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: { body: message },
        }),
      });

      const data = await response.json();

      if (response.ok && data.messages?.[0]?.id) {
        return {
          success: true,
          mode: 'META',
          messageId: data.messages[0].id,
        };
      } else {
        return {
          success: false,
          mode: 'META',
          error: data.error?.message || 'Meta WhatsApp Cloud API dispatch failed',
        };
      }
    } catch (err: any) {
      return {
        success: false,
        mode: 'META',
        error: err.message || 'Meta API network request failed',
      };
    }
  }

  // 3. CUSTOM WEBHOOK API
  if (config?.provider === 'CUSTOM_WEBHOOK' && config.webhookUrl) {
    try {
      const response = await fetch(config.webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'WHATSAPP_NOTICE_DISPATCH',
          timestamp: new Date().toISOString(),
          phone: cleanPhone,
          message: message,
        }),
      });

      if (response.ok) {
        return {
          success: true,
          mode: 'WEBHOOK',
        };
      } else {
        return {
          success: false,
          mode: 'WEBHOOK',
          error: `Webhook returned status ${response.status}`,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        mode: 'WEBHOOK',
        error: err.message || 'Webhook request failed',
      };
    }
  }

  // 4. FALLBACK TO DIRECT WHATSAPP DEEPLINK (WhatsApp Web / App)
  const deeplinkUrl = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

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
