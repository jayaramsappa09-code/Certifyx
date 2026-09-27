/**
 * Gmail Automation & Email Notification Service
 * Integrates directly with Google Workspace Gmail API (v1)
 */

export interface EmailRecipient {
  rollNo: string;
  name: string;
  email: string;
  status: string;
  driveLink?: string;
}

export interface SendEmailPayload {
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  from?: string;
}

export interface EmailDispatchResult {
  rollNo: string;
  recipientEmail: string;
  status: 'SENT' | 'FAILED' | 'SKIPPED';
  messageId?: string;
  error?: string;
  timestamp: string;
}

export interface EmailTemplate {
  id: string;
  title: string;
  subject: string;
  body: string;
  category: 'MISSING_REMINDER' | 'VERIFIED_CONFIRMATION' | 'CUSTOM';
}

/**
 * Standard templates with merge variable tags:
 * {student_name}, {roll_no}, {status}, {drive_link}, {timestamp}, {admin_email}
 */
export const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'tpl_missing_cert',
    title: '⚠️ Urgent: Certificate Missing in Google Drive',
    category: 'MISSING_REMINDER',
    subject: 'Action Required: Course Certificate Missing for Roll No: {roll_no}',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
  <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 24px; color: white;">
    <h1 style="margin: 0; font-size: 20px; font-weight: bold;">CCAM Certificate Verification Notice</h1>
    <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 13px;">Automated Academic Compliance System</p>
  </div>
  
  <div style="padding: 24px; color: #334155; line-height: 1.6;">
    <p style="font-size: 15px; margin-top: 0;">Dear <strong>{student_name}</strong> (Roll No: <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #0f172a;">{roll_no}</code>),</p>
    
    <p>Our automated Google Drive & Google Sheets verification audit indicates that your required course completion certificate has <strong>NOT</strong> been uploaded or matched in the class folder.</p>
    
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <div style="font-size: 13px; color: #991b1b; font-weight: bold; margin-bottom: 4px;">CURRENT AUDIT STATUS</div>
      <div style="font-size: 16px; color: #b91c1c; font-weight: 800;">{status}</div>
      <div style="font-size: 12px; color: #7f1d1d; margin-top: 6px;">Please upload your certificate immediately to avoid grading and attendance discrepancies.</div>
    </div>

    <h3 style="font-size: 14px; color: #0f172a; margin-top: 20px;">Upload Guidelines:</h3>
    <ul style="font-size: 13px; color: #475569; padding-left: 20px;">
      <li>Name your file as: <code>{roll_no}_certificate.pdf</code> or <code>{roll_no}.pdf</code></li>
      <li>Ensure the student name and certificate details are sharp and legible.</li>
      <li>Upload directly to the designated class Google Drive folder.</li>
    </ul>

    {drive_link_section}

    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
    <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">This is an automated notification from the Certificate Compliance Audit Module. If you have already uploaded your certificate in the last 15 minutes, please allow time for the next scheduled sync.</p>
  </div>
</div>`,
  },
  {
    id: 'tpl_verified_receipt',
    title: '✅ Verified: Certificate Submission Confirmed',
    category: 'VERIFIED_CONFIRMATION',
    subject: 'Verified: Course Certificate Accepted for Roll No: {roll_no}',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
  <div style="background: linear-gradient(135deg, #065f46 0%, #10b981 100%); padding: 24px; color: white;">
    <h1 style="margin: 0; font-size: 20px; font-weight: bold;">Certificate Submission Verified</h1>
    <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 13px;">CCAM Compliance Verification System</p>
  </div>
  
  <div style="padding: 24px; color: #334155; line-height: 1.6;">
    <p style="font-size: 15px; margin-top: 0;">Dear <strong>{student_name}</strong>,</p>
    
    <p>Great news! Your course certificate for Roll Number <strong>{roll_no}</strong> has been successfully detected in Google Drive, matched, and confirmed in the master records.</p>
    
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <div style="font-size: 13px; color: #166534; font-weight: bold; margin-bottom: 4px;">VERIFICATION STATUS</div>
      <div style="font-size: 16px; color: #15803d; font-weight: 800;">VERIFIED & RECORDED (100% COMPLETE)</div>
      <div style="font-size: 12px; color: #14532d; margin-top: 6px;">Verified Timestamp: {timestamp}</div>
    </div>

    <p style="font-size: 13px; color: #475569;">No further action is required on your part. Thank you for completing your submission on time.</p>

    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
    <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">Certificate Compliance Audit Module</p>
  </div>
</div>`,
  },
  {
    id: 'tpl_custom_broadcast',
    title: '📢 Custom Announcement / Reminder',
    category: 'CUSTOM',
    subject: 'Important Update Regarding Certificate Submissions ({roll_no})',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
  <div style="background: #1e293b; padding: 20px; color: white;">
    <h2 style="margin: 0; font-size: 18px;">Certificate Submission Notification</h2>
  </div>
  <div style="padding: 24px; color: #334155; line-height: 1.6;">
    <p>Hello <strong>{student_name}</strong> ({roll_no}),</p>
    <p>This is a notice regarding your certificate audit status: <strong>{status}</strong>.</p>
    <p>Please check your submission and contact the department coordinator if you have any questions.</p>
  </div>
</div>`,
  }
];

/**
 * Replace merge variables in text or HTML
 */
export function interpolateEmailTemplate(
  templateStr: string,
  data: {
    student_name: string;
    roll_no: string;
    status: string;
    drive_link?: string;
    admin_email?: string;
    timestamp?: string;
  }
): string {
  const ts = data.timestamp || new Date().toLocaleString();
  const driveSection = data.drive_link
    ? `<div style="margin: 20px 0;"><a href="${data.drive_link}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; font-size: 14px;">Open Class Google Drive Folder</a></div>`
    : '';

  return templateStr
    .replace(/{student_name}/g, data.student_name || 'Student')
    .replace(/{roll_no}/g, data.roll_no || '')
    .replace(/{status}/g, data.status || 'PENDING')
    .replace(/{drive_link}/g, data.drive_link || '')
    .replace(/{drive_link_section}/g, driveSection)
    .replace(/{admin_email}/g, data.admin_email || 'Course Administrator')
    .replace(/{timestamp}/g, ts);
}

/**
 * Base64URL encoding compliant with Gmail API RFC 2822 requirements
 */
function base64UrlEncode(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Construct standard RFC 2822 MIME message
 */
function buildRfc2822MimeMessage(payload: SendEmailPayload): string {
  const subjectEncoded = `=?utf-8?B?${btoa(unescape(encodeURIComponent(payload.subject)))}?=`;
  const lines = [
    `To: ${payload.to}`,
    payload.from ? `From: ${payload.from}` : '',
    `Subject: ${subjectEncoded}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    payload.bodyHtml || payload.bodyText || '',
  ].filter((line) => line !== '');

  return lines.join('\r\n');
}

/**
 * Send a single email through Gmail API (messages.send)
 */
export async function sendGmailMessage(
  accessToken: string,
  payload: SendEmailPayload
): Promise<{ id: string; threadId: string }> {
  if (!accessToken) {
    throw new Error('Google OAuth access token is required to send emails via Gmail.');
  }
  if (!payload.to || !payload.to.includes('@')) {
    throw new Error(`Invalid recipient email address: "${payload.to}"`);
  }

  const mimeMessage = buildRfc2822MimeMessage(payload);
  const rawBase64Url = base64UrlEncode(mimeMessage);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: rawBase64Url,
    }),
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson?.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(`Gmail API Error (${response.status}): ${errorDetail}`);
  }

  const data = await response.json();
  return {
    id: data.id,
    threadId: data.threadId,
  };
}

/**
 * Dispatch batch emails with rate-limiting and live progress callbacks
 */
export async function dispatchBatchGmailMessages(
  accessToken: string,
  recipients: EmailRecipient[],
  template: { subject: string; body: string },
  options?: {
    driveLink?: string;
    adminEmail?: string;
    onProgress?: (progress: {
      current: number;
      total: number;
      sent: number;
      failed: number;
      currentRecipient?: string;
    }) => void;
  }
): Promise<EmailDispatchResult[]> {
  const results: EmailDispatchResult[] = [];
  let sentCount = 0;
  let failedCount = 0;

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    options?.onProgress?.({
      current: i + 1,
      total: recipients.length,
      sent: sentCount,
      failed: failedCount,
      currentRecipient: `${r.name} (${r.rollNo})`,
    });

    if (!r.email || !r.email.includes('@')) {
      results.push({
        rollNo: r.rollNo,
        recipientEmail: r.email || '',
        status: 'SKIPPED',
        error: 'Missing or invalid email address.',
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    const interpolatedSubject = interpolateEmailTemplate(template.subject, {
      student_name: r.name,
      roll_no: r.rollNo,
      status: r.status,
      drive_link: options?.driveLink || r.driveLink,
      admin_email: options?.adminEmail,
    });

    const interpolatedBody = interpolateEmailTemplate(template.body, {
      student_name: r.name,
      roll_no: r.rollNo,
      status: r.status,
      drive_link: options?.driveLink || r.driveLink,
      admin_email: options?.adminEmail,
    });

    try {
      const res = await sendGmailMessage(accessToken, {
        to: r.email,
        subject: interpolatedSubject,
        bodyHtml: interpolatedBody,
      });

      sentCount++;
      results.push({
        rollNo: r.rollNo,
        recipientEmail: r.email,
        status: 'SENT',
        messageId: res.id,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      failedCount++;
      results.push({
        rollNo: r.rollNo,
        recipientEmail: r.email,
        status: 'FAILED',
        error: err.message || 'Unknown Gmail error',
        timestamp: new Date().toISOString(),
      });
    }

    // Gentle delay to respect standard Gmail API rate limits (250ms per email)
    if (i < recipients.length - 1) {
      await new Promise((res) => setTimeout(res, 250));
    }
  }

  options?.onProgress?.({
    current: recipients.length,
    total: recipients.length,
    sent: sentCount,
    failed: failedCount,
  });

  return results;
}
