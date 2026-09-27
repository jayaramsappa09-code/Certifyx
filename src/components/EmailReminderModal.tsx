import React, { useState, useMemo } from 'react';
import {
  X,
  Mail,
  Send,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ExternalLink,
  Users,
  Search,
  CheckSquare,
  Square,
  Edit2,
  Eye,
  FileSpreadsheet,
  HardDrive,
  Info,
  ShieldAlert,
  MessageCircle,
  Share2,
  Phone,
  Settings,
  Smartphone,
} from 'lucide-react';
import { StudentStatusRecord, GoogleDriveFolderConfig, GoogleSheetConfig, WhatsAppApiConfig } from '../types';
import { getAppSettings, saveAppSettings } from '../services/storageService';
import { sendWhatsAppNotice, normalizePhoneNumber } from '../services/whatsAppService';

interface EmailReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentStatusRecord[];
  initialTargetRollNo?: string;
  driveConfig: GoogleDriveFolderConfig | null;
  sheetConfig: GoogleSheetConfig | null;
  onRecordAuditLog?: (action: string, details: string) => void;
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const EmailReminderModal: React.FC<EmailReminderModalProps> = ({
  isOpen,
  onClose,
  students,
  initialTargetRollNo,
  driveConfig,
  sheetConfig,
  onRecordAuditLog,
  onToast,
}) => {
  // Dispatch Channel: 'EMAIL' | 'WHATSAPP' | 'BOTH'
  const [dispatchChannel, setDispatchChannel] = useState<'EMAIL' | 'WHATSAPP' | 'BOTH'>('EMAIL');

  // Custom inline phone numbers state: rollNo -> custom phone
  const [customPhones, setCustomPhones] = useState<Record<string, string>>({});
  const [editingPhoneRollNo, setEditingPhoneRollNo] = useState<string | null>(null);
  const [tempPhoneInput, setTempPhoneInput] = useState('');

  // WhatsApp API Settings Modal Drawer toggle & state
  const [whatsAppConfig] = useState<WhatsAppApiConfig>({
    provider: 'DIRECT_WA_LINK',
  });

  // Batch WhatsApp API Sending progress state
  const [isBatchSendingWhatsApp, setIsBatchSendingWhatsApp] = useState(false);
  const [whatsAppProgress, setWhatsAppProgress] = useState<{ current: number; total: number; successCount: number; errors: string[] } | null>(null);

  // Filter: 'ALL' (Not Started + Pending), 'NOT_STARTED', 'PENDING'
  const [filterType, setFilterType] = useState<'ALL' | 'NOT_STARTED' | 'PENDING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRollNos, setSelectedRollNos] = useState<Set<string>>(() => {
    if (initialTargetRollNo) {
      return new Set([initialTargetRollNo]);
    }
    // Default to all incomplete students
    const incomplete = students
      .filter((s) => s.overallStatus === 'NOT STARTED' || s.overallStatus === 'PENDING')
      .map((s) => s.rollNo);
    return new Set(incomplete);
  });

  // Send Mode: 'SEND_NOW' | 'SCHEDULE'
  const [sendMode, setSendMode] = useState<'SEND_NOW' | 'SCHEDULE'>('SEND_NOW');
  const [scheduleFrequency, setScheduleFrequency] = useState<'DAILY' | 'WEEKLY' | 'ON_DISCREPANCY'>('DAILY');

  // Template Preset Type
  const [templatePreset, setTemplatePreset] = useState<'GENERAL' | 'DISCREPANCY' | 'MISSING_DRIVE' | 'MISSING_SHEET' | 'CUSTOM'>('GENERAL');

  // Custom inline emails state: rollNo -> custom email
  const [customEmails, setCustomEmails] = useState<Record<string, string>>({});
  const [editingEmailRollNo, setEditingEmailRollNo] = useState<string | null>(null);
  const [tempEmailInput, setTempEmailInput] = useState('');

  // Per-student custom draft overrides (studentRoll -> { subject, body })
  const [customStudentDrafts, setCustomStudentDrafts] = useState<Record<string, { subject: string; body: string }>>({});
  const [isDirectEditingPreview, setIsDirectEditingPreview] = useState(false);

  // Email Template customization
  const [subjectTemplate, setSubjectTemplate] = useState(
    'Action Required: Certificate Submission Pending - {{student_name}} ({{roll_no}})'
  );
  const [bodyTemplate, setBodyTemplate] = useState(
    `Dear {{student_name}},

This is an official reminder regarding your certificate submission for the class roster (Roll No: {{roll_no}}).

Current Status: {{status}}

Required Action(s):
{{missing_items}}

Please complete your pending submission at your earliest convenience:
• Google Drive Upload Folder: {{drive_link}}
• Google Sheet / Response Form: {{sheet_link}}

Note: If you have already uploaded your certificate file or submitted the response within the last few minutes, please allow some time for administrator verification.

Best regards,
Academic Certification & Verification Committee`
  );

  const handleSelectTemplatePreset = (preset: 'GENERAL' | 'DISCREPANCY' | 'MISSING_DRIVE' | 'MISSING_SHEET' | 'CUSTOM') => {
    setTemplatePreset(preset);
    if (preset === 'GENERAL') {
      setSubjectTemplate('Action Required: Certificate Submission Pending - {{student_name}} ({{roll_no}})');
      setBodyTemplate(
        `Dear {{student_name}},

This is an official reminder regarding your certificate submission for the class roster (Roll No: {{roll_no}}).

Current Status: {{status}}

Required Action(s):
{{missing_items}}

Please complete your pending submission at your earliest convenience:
• Google Drive Upload Folder: {{drive_link}}
• Google Sheet / Response Form: {{sheet_link}}

Best regards,
Academic Certification & Verification Committee`
      );
    } else if (preset === 'DISCREPANCY') {
      setSubjectTemplate('⚠️ Certificate Count Discrepancy Notice - {{student_name}} ({{roll_no}})');
      setBodyTemplate(
        `Dear {{student_name}},

During our automated certificate reconciliation audit for Roll No: {{roll_no}}, a quantity mismatch was identified between your Google Sheet form responses and your Google Drive uploads.

Discrepancy Details:
{{discrepancy_details}}

Summary of Missing Items:
{{missing_items}}

Next Steps:
1. If you submitted form entries without uploading the corresponding certificate file(s), please upload the original PDF/image to Google Drive:
   {{drive_link}}
2. If you uploaded certificate files in Google Drive but forgot to fill the details in the Google Form, please submit your response:
   {{sheet_link}}

Please resolve this mismatch so your verification status can be marked as COMPLETED.

Regards,
Academic Verification Committee`
      );
    } else if (preset === 'MISSING_DRIVE') {
      setSubjectTemplate('Action Required: Missing Certificate PDF in Google Drive - {{student_name}} ({{roll_no}})');
      setBodyTemplate(
        `Dear {{student_name}},

Your details have been logged in the Google Sheet form, but we have not yet detected your certificate PDF in the official Google Drive folder.

Please upload your certificate file named with your Roll Number (e.g., {{roll_no}}_Certificate.pdf) to:
• Google Drive Upload Folder: {{drive_link}}

Thank you,
Verification Team`
      );
    } else if (preset === 'MISSING_SHEET') {
      setSubjectTemplate('Action Required: Missing Google Form Response - {{student_name}} ({{roll_no}})');
      setBodyTemplate(
        `Dear {{student_name}},

We noticed that you have uploaded certificate files in the Google Drive folder, but have not submitted your certificate response in the Google Sheet / Registration Form.

Please record your certificate details here:
• Form Link: {{sheet_link}}

Thank you,
Verification Team`
      );
    }
  };

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Preview index (for showing live preview of selected students)
  const [previewStudentRoll, setPreviewStudentRoll] = useState<string | null>(initialTargetRollNo || null);

  // Incomplete students list
  const incompleteStudents = useMemo(() => {
    return students.filter(
      (s) => s.overallStatus === 'NOT STARTED' || s.overallStatus === 'PENDING'
    );
  }, [students]);

  // Filtered by status tab and search query
  const filteredStudents = useMemo(() => {
    return incompleteStudents.filter((s) => {
      if (filterType === 'NOT_STARTED' && s.overallStatus !== 'NOT STARTED') return false;
      if (filterType === 'PENDING' && s.overallStatus !== 'PENDING') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const rollMatch = s.rollNo.toLowerCase().includes(q);
        const nameMatch = s.name.toLowerCase().includes(q);
        const emailMatch = (customEmails[s.rollNo] || s.email || '').toLowerCase().includes(q);
        return rollMatch || nameMatch || emailMatch;
      }
      return true;
    });
  }, [incompleteStudents, filterType, searchQuery, customEmails]);

  if (!isOpen) return null;

  // Resolve email for a student
  const getStudentEmail = (student: StudentStatusRecord): string => {
    if (customEmails[student.rollNo]) {
      return customEmails[student.rollNo];
    }
    if (student.email) {
      return student.email;
    }
    // Check in sheet records if any
    for (const r of student.sheetRecords || []) {
      if (r.email) return r.email;
      if (r.rawValues) {
        for (const [k, v] of Object.entries(r.rawValues)) {
          if ((k.toLowerCase().includes('email') || k.toLowerCase().includes('mail')) && v && v.includes('@')) {
            return v.trim();
          }
        }
      }
    }
    // Fallback: university student email template (Pragati Engineering College)
    return `${student.rollNo.toLowerCase()}@pragati.ac.in`;
  };

  // Resolve phone number for a student from roster, sheet records, or custom overrides
  const getStudentPhone = (student: StudentStatusRecord): string => {
    if (customPhones[student.rollNo]) {
      return customPhones[student.rollNo];
    }
    if (student.phone) {
      return student.phone;
    }
    // Check in sheet records
    for (const r of student.sheetRecords || []) {
      if (r.phone) return r.phone;
      if (r.rawValues) {
        for (const [k, v] of Object.entries(r.rawValues)) {
          if (
            (k.toLowerCase().includes('phone') ||
              k.toLowerCase().includes('mobile') ||
              k.toLowerCase().includes('contact') ||
              k.toLowerCase().includes('whatsapp') ||
              k.toLowerCase().includes('number')) &&
            v &&
            v.trim()
          ) {
            return v.trim();
          }
        }
      }
    }
    return '';
  };

  const handleSavePhone = (rollNo: string) => {
    setCustomPhones((prev) => ({ ...prev, [rollNo]: tempPhoneInput.trim() }));
    setEditingPhoneRollNo(null);
    onToast?.(`Updated phone number for student ${rollNo}`, 'success');
  };

  const getMissingItemsDescription = (student: StudentStatusRecord): string => {
    const items: string[] = [];

    // Check count mismatch first
    if (student.countMismatch && student.countMismatch.hasMismatch) {
      if (student.countMismatch.difference > 0) {
        if (student.countMismatch.type === 'MORE_IN_SHEET') {
          items.push(
            `• Certificate File Discrepancy: You logged ${student.countMismatch.sheetCount} certificate entry/entries in Google Sheets, but only ${student.countMismatch.driveCount} PDF(s) are uploaded in Google Drive. Please upload the missing ${student.countMismatch.difference} certificate file(s).`
          );
        } else if (student.countMismatch.type === 'MORE_IN_DRIVE') {
          items.push(
            `• Google Sheet Entry Discrepancy: You uploaded ${student.countMismatch.driveCount} certificate file(s) in Google Drive, but only ${student.countMismatch.sheetCount} entry/entries are recorded in the Google Sheet. Please submit the missing details in the Google Form.`
          );
        }
      } else {
        // Status-only mismatch (e.g. driveUploaded !== sheetUpdated but counts are equal)
        if (student.driveUploaded && !student.sheetUpdated) {
          items.push('• Verification Mismatch: Your certificate file is verified in Google Drive, but your Google Sheet registration form entry is currently marked as unverified.');
        } else if (!student.driveUploaded && student.sheetUpdated) {
          items.push('• Verification Mismatch: Your Google Sheet registration entry is verified, but your Google Drive certificate file is currently marked as unverified.');
        }
      }
    }

    if (!student.driveUploaded) {
      items.push('• Google Drive Certificate File: MISSING. Please upload your original PDF or image certificate to the shared Google Drive folder.');
    } else {
      items.push(`• Google Drive Certificate File: COMPLETED (${student.driveFiles.length} file(s) on record).`);
    }

    if (!student.sheetUpdated) {
      items.push('• Google Sheet Response Record: MISSING. Please fill out the registration/response form with your certificate details.');
    } else {
      items.push(`• Google Sheet Response Record: COMPLETED (${student.sheetRecords.length} entry/entries on record).`);
    }

    if (student.driveUploaded && student.sheetUpdated && !student.submitted) {
      items.push('• Admin Verification: Awaiting final review & confirmation by faculty administrator.');
    }

    return items.join('\n');
  };

  const driveFolderUrl = driveConfig?.folderId
    ? `https://drive.google.com/drive/folders/${driveConfig.folderId}`
    : 'https://drive.google.com';

  const sheetUrl = sheetConfig?.spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${sheetConfig.spreadsheetId}/edit`
    : 'https://docs.google.com/spreadsheets';

  // Render personalized template for a student
  const renderPersonalizedEmail = (student: StudentStatusRecord) => {
    // If admin wrote a specific custom draft for this student
    if (customStudentDrafts[student.rollNo]) {
      return customStudentDrafts[student.rollNo];
    }

    const missingDesc = getMissingItemsDescription(student);
    const discrepancyDesc = student.countMismatch && student.countMismatch.hasMismatch
      ? student.countMismatch.description
      : 'No quantity discrepancies detected.';

    const sheetCount = student.sheetRecords ? student.sheetRecords.length : (student.sheetUpdated ? 1 : 0);
    const driveCount = student.driveFiles ? student.driveFiles.length : (student.driveUploaded ? 1 : 0);

    const subject = subjectTemplate
      .replace(/{{student_name}}/g, student.name)
      .replace(/{{roll_no}}/g, student.rollNo)
      .replace(/{{status}}/g, student.overallStatus)
      .replace(/{{sheet_count}}/g, String(sheetCount))
      .replace(/{{drive_count}}/g, String(driveCount));

    const body = bodyTemplate
      .replace(/{{student_name}}/g, student.name)
      .replace(/{{roll_no}}/g, student.rollNo)
      .replace(/{{status}}/g, student.overallStatus)
      .replace(/{{missing_items}}/g, missingDesc)
      .replace(/{{discrepancy_details}}/g, discrepancyDesc)
      .replace(/{{sheet_count}}/g, String(sheetCount))
      .replace(/{{drive_count}}/g, String(driveCount))
      .replace(/{{drive_link}}/g, driveFolderUrl)
      .replace(/{{sheet_link}}/g, sheetUrl);

    return { subject, body };
  };

  // Student currently selected for preview
  const activePreviewStudent =
    (previewStudentRoll && students.find((s) => s.rollNo === previewStudentRoll)) ||
    (selectedRollNos.size > 0
      ? students.find((s) => selectedRollNos.has(s.rollNo))
      : filteredStudents[0]) ||
    students[0];

  const previewEmailContent = activePreviewStudent
    ? renderPersonalizedEmail(activePreviewStudent)
    : { subject: '', body: '' };

  // Handlers for selection
  const handleToggleSelectStudent = (rollNo: string) => {
    setSelectedRollNos((prev) => {
      const next = new Set(prev);
      if (next.has(rollNo)) next.delete(rollNo);
      else next.add(rollNo);
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedRollNos((prev) => {
      const next = new Set(prev);
      filteredStudents.forEach((s) => next.add(s.rollNo));
      return next;
    });
  };

  const handleDeselectAllFiltered = () => {
    setSelectedRollNos((prev) => {
      const next = new Set(prev);
      filteredStudents.forEach((s) => next.delete(s.rollNo));
      return next;
    });
  };

  // Save inline custom email
  const handleSaveEmail = (rollNo: string) => {
    if (tempEmailInput.trim() && tempEmailInput.includes('@')) {
      setCustomEmails((prev) => ({ ...prev, [rollNo]: tempEmailInput.trim() }));
      onToast?.(`Updated email for student ${rollNo}`, 'success');
    }
    setEditingEmailRollNo(null);
    setTempEmailInput('');
  };

  // Launch Gmail Web Compose for single student
  const handleOpenGmailWeb = (student: StudentStatusRecord) => {
    const email = getStudentEmail(student);
    const { subject, body } = renderPersonalizedEmail(student);

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      email
    )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    const link = document.createElement('a');
    link.href = gmailUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onRecordAuditLog?.(
      'Email Reminder Sent via Gmail',
      `Sent personalized reminder to ${student.name} (${student.rollNo}) at ${email}`
    );
    onToast?.(`Opened Gmail compose for ${student.name}`, 'success');
  };

  // Launch default Mail Client via mailto: for single student
  const handleOpenMailto = (student: StudentStatusRecord) => {
    const email = getStudentEmail(student);
    const { subject, body } = renderPersonalizedEmail(student);

    const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    const link = document.createElement('a');
    link.href = mailtoUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onRecordAuditLog?.(
      'Email Reminder Dispatched via Mail Client',
      `Dispatched reminder mailto link for ${student.name} (${student.rollNo}) at ${email}`
    );
    onToast?.(`Opened mail client for ${student.name}`, 'info');
  };

  // Batch BCC Dispatch via Gmail Web Compose
  const handleBatchSendGmail = () => {
    const selectedStudentsList = students.filter((s) => selectedRollNos.has(s.rollNo));
    if (selectedStudentsList.length === 0) {
      onToast?.('Please select at least one student recipient.', 'error');
      return;
    }

    const bccEmails = selectedStudentsList.map((s) => getStudentEmail(s)).join(',');
    const generalSubject = 'Urgent Action Required: Certificate Submission Pending';
    const generalBody = `Dear Students,

This is an official administrative reminder regarding your pending certificate submission for the class roster.

According to our verification records, your certificate submission is currently INCOMPLETE (Status: NOT STARTED or PENDING).

Please review your submission requirements:
1. Google Drive Upload: Upload your certificate file to the class folder: ${driveFolderUrl}
2. Google Sheet Form: Ensure your details are filled in the responses sheet: ${sheetUrl}

Please complete these steps immediately to ensure institutional compliance.

Best regards,
Academic Certification & Verification Committee`;

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&bcc=${encodeURIComponent(
      bccEmails
    )}&su=${encodeURIComponent(generalSubject)}&body=${encodeURIComponent(generalBody)}`;

    const link = document.createElement('a');
    link.href = gmailUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onRecordAuditLog?.(
      'Batch Reminder Emails Sent',
      `Initiated batch BCC reminder to ${selectedStudentsList.length} students`
    );
    onToast?.(`Opened Gmail with ${selectedStudentsList.length} BCC recipients!`, 'success');
  };

  // Batch Mailto Dispatch
  const handleBatchSendMailto = () => {
    const selectedStudentsList = students.filter((s) => selectedRollNos.has(s.rollNo));
    if (selectedStudentsList.length === 0) {
      onToast?.('Please select at least one student recipient.', 'error');
      return;
    }

    const bccEmails = selectedStudentsList.map((s) => getStudentEmail(s)).join(',');
    const generalSubject = 'Urgent Action Required: Certificate Submission Pending';
    const generalBody = `Dear Students,\n\nThis is an official reminder regarding your pending certificate submission.\n\nPlease upload your certificates to Google Drive and ensure your sheet entry is completed.\n\nDrive Folder: ${driveFolderUrl}\nSheet: ${sheetUrl}\n\nRegards,\nCertificate Committee`;

    const mailtoUrl = `mailto:?bcc=${encodeURIComponent(bccEmails)}&subject=${encodeURIComponent(
      generalSubject
    )}&body=${encodeURIComponent(generalBody)}`;

    const link = document.createElement('a');
    link.href = mailtoUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onRecordAuditLog?.(
      'Batch Reminder Mailto Triggered',
      `Dispatched mailto for ${selectedStudentsList.length} recipients`
    );
    onToast?.(`Triggered mail client with ${selectedStudentsList.length} recipients.`, 'info');
  };

  // Format WhatsApp Individual Notice
  const formatWhatsAppIndividual = (student: StudentStatusRecord): string => {
    const missingItems = getMissingItemsDescription(student);
    const discrepancy = student.countMismatch && student.countMismatch.hasMismatch
      ? `\n⚠️ *Discrepancy:* ${student.countMismatch.description}`
      : '';

    return (
      `*📢 ACADEMIC CERTIFICATE NOTICE*\n\n` +
      `Hello *${student.name}* (Roll: \`${student.rollNo}\`),\n\n` +
      `This is an official administrative reminder regarding your pending certificate submission for the class roster.\n\n` +
      `*Status:* ${student.overallStatus}\n` +
      `*Action Required:*\n${missingItems}${discrepancy}\n\n` +
      `*Official Submission Links:*\n` +
      `📁 Google Drive Upload: ${driveFolderUrl}\n` +
      `📋 Google Sheet Form: ${sheetUrl}\n\n` +
      `_Please complete your pending upload/response immediately._\n` +
      `- Academic Certification Committee`
    );
  };

  // Launch WhatsApp for single student (Deep-link)
  const handleOpenWhatsAppIndividual = async (student: StudentStatusRecord) => {
    const message = formatWhatsAppIndividual(student);
    const phoneNumber = getStudentPhone(student);

    if (!phoneNumber) {
      onToast?.(`Missing phone number for ${student.name}. Please enter a phone number inline.`, 'error');
      setEditingPhoneRollNo(student.rollNo);
      return;
    }

    const res = await sendWhatsAppNotice(phoneNumber, message);

    if (res.success && res.deeplinkUrl) {
      window.open(res.deeplinkUrl, '_blank', 'noopener,noreferrer');
      onToast?.(`Opened WhatsApp notice for ${student.name}`, 'success');
      onRecordAuditLog?.(
        'WhatsApp Reminder Sent',
        `Dispatched WhatsApp notice for ${student.name} (${student.rollNo})`
      );
    } else {
      onToast?.(`WhatsApp dispatch failed: ${res.error}`, 'error');
    }
  };

  // Dispatch Batch WhatsApp Notices via Twilio / Meta / Webhook / Deeplink
  const handleBatchSendWhatsAppApi = async () => {
    const selectedList = students.filter((s) => selectedRollNos.has(s.rollNo));
    if (selectedList.length === 0) {
      onToast?.('Please select at least one student recipient.', 'error');
      return;
    }

    setIsBatchSendingWhatsApp(true);
    setWhatsAppProgress({ current: 0, total: selectedList.length, successCount: 0, errors: [] });

    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < selectedList.length; i++) {
      const student = selectedList[i];
      const phone = getStudentPhone(student);
      const message = formatWhatsAppIndividual(student);

      setWhatsAppProgress({
        current: i + 1,
        total: selectedList.length,
        successCount,
        errors,
      });

      if (!phone) {
        errors.push(`${student.rollNo} (${student.name}): Missing phone number`);
        continue;
      }

      const res = await sendWhatsAppNotice(phone, message);

      if (res.success) {
        successCount++;
        if (res.mode === 'DEEPLINK' && res.deeplinkUrl) {
          window.open(res.deeplinkUrl, '_blank', 'noopener,noreferrer');
        }
      } else {
        errors.push(`${student.rollNo} (${student.name}): ${res.error || 'Failed'}`);
      }

      // Small delay between calls
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    setIsBatchSendingWhatsApp(false);
    onRecordAuditLog?.(
      'Batch WhatsApp Dispatch',
      `Sent ${successCount} of ${selectedList.length} WhatsApp notices via ${whatsAppConfig.provider || 'WhatsApp'}`
    );

    if (errors.length > 0) {
      onToast?.(`Sent ${successCount} WhatsApp notices (${errors.length} failed/missing phone).`, 'info');
    } else {
      onToast?.(`Successfully dispatched all ${successCount} WhatsApp notices!`, 'success');
    }
  };

  // Format Class WhatsApp Group Broadcast Bulletin
  const formatWhatsAppGroupBroadcast = (): string => {
    const selectedList = students.filter((s) => selectedRollNos.has(s.rollNo));
    let msg = `*📢 URGENT CLASS NOTICE: CERTIFICATE SUBMISSION STATUS*\n\n` +
      `Attention All Students & Class Representatives,\n\n` +
      `The following *${selectedList.length} student(s)* currently have pending certificate requirements (Missing Drive Upload / Google Form response / Discrepancy):\n\n`;

    selectedList.forEach((s, idx) => {
      let tag = '❌ Not Started';
      if (s.overallStatus === 'PENDING') {
        if (!s.driveUploaded && s.sheetUpdated) tag = '⚠️ Missing Drive File';
        else if (s.driveUploaded && !s.sheetUpdated) tag = '⚠️ Missing Sheet Form';
        else if (s.countMismatch?.hasMismatch) tag = `⚠️ Count Mismatch (${s.countMismatch.driveCount} Drive vs ${s.countMismatch.sheetCount} Sheet)`;
        else tag = '⏳ Pending Verification';
      }
      msg += `${idx + 1}. *${s.rollNo}* - ${s.name} [${tag}]\n`;
    });

    msg += `\n*🔗 Official Links:*\n` +
      `📁 *Drive Folder:* ${driveFolderUrl}\n` +
      `📋 *Sheet Form:* ${sheetUrl}\n\n` +
      `_Please clear your pending submissions today to achieve 100% compliance._\n` +
      `- Academic Certification & Verification Committee`;
    return msg;
  };

  // Launch WhatsApp Class Group Broadcast
  const handleOpenWhatsAppGroupBroadcast = () => {
    const selectedList = students.filter((s) => selectedRollNos.has(s.rollNo));
    if (selectedList.length === 0) {
      onToast?.('Please select at least one student recipient.', 'error');
      return;
    }

    const message = formatWhatsAppGroupBroadcast();
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    const link = document.createElement('a');
    link.href = waUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onRecordAuditLog?.(
      'WhatsApp Group Broadcast Triggered',
      `Generated and launched WhatsApp class notice for ${selectedList.length} students`
    );
    onToast?.(`Opened WhatsApp with formatted class broadcast notice!`, 'success');
  };

  // Copy WhatsApp Broadcast Notice
  const handleCopyWhatsAppBroadcast = () => {
    const message = formatWhatsAppGroupBroadcast();
    navigator.clipboard.writeText(message);
    setCopiedKey('whatsapp');
    setTimeout(() => setCopiedKey(null), 2500);
    onToast?.(`Copied formatted WhatsApp notice for ${selectedCount} student(s) to clipboard!`, 'success');
  };

  // Copy selected emails
  const handleCopyEmails = () => {
    const selectedStudentsList = students.filter((s) => selectedRollNos.has(s.rollNo));
    const emailsList = selectedStudentsList.map((s) => getStudentEmail(s)).join(', ');
    navigator.clipboard.writeText(emailsList);
    setCopiedKey('emails');
    setTimeout(() => setCopiedKey(null), 2500);
    onToast?.(`Copied ${selectedStudentsList.length} email address(es) to clipboard!`, 'success');
  };

  // Copy active preview message
  const handleCopyMessage = () => {
    if (!previewEmailContent.body) return;
    const textToCopy = `Subject: ${previewEmailContent.subject}\n\n${previewEmailContent.body}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedKey('message');
    setTimeout(() => setCopiedKey(null), 2500);
    onToast?.('Copied personalized message to clipboard!', 'success');
  };

  const selectedCount = selectedRollNos.size;
  const notStartedCount = incompleteStudents.filter((s) => s.overallStatus === 'NOT STARTED').length;
  const pendingCount = incompleteStudents.filter((s) => s.overallStatus === 'PENDING').length;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full max-h-[94vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-slate-900/95 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Student Email Reminder Dispatcher
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 text-xs font-semibold">
                  {incompleteStudents.length} Defaulters Found
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Send personalized notification reminders to students with <strong className="text-red-400">NOT STARTED</strong> or <strong className="text-amber-400">PENDING</strong> status using email data extracted from Google Sheets.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Student List & Selection (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Dispatch Channel Selector Toggle Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-950 border border-slate-800 rounded-2xl">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDispatchChannel('EMAIL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    dispatchChannel === 'EMAIL'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDispatchChannel('WHATSAPP')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    dispatchChannel === 'WHATSAPP'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDispatchChannel('BOTH')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                    dispatchChannel === 'BOTH'
                      ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Both (Email + WA)</span>
                </button>
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-2xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  filterType === 'ALL'
                    ? 'bg-amber-950 text-amber-200 border border-amber-800 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <span>All Defaulters</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-900/80 text-[10px] font-mono">
                  {incompleteStudents.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterType('NOT_STARTED')}
                className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  filterType === 'NOT_STARTED'
                    ? 'bg-red-950 text-red-200 border border-red-800 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <span>NOT STARTED</span>
                <span className="px-1.5 py-0.2 rounded-full bg-red-900/80 text-[10px] font-mono">
                  {notStartedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterType('PENDING')}
                className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  filterType === 'PENDING'
                    ? 'bg-yellow-950 text-yellow-200 border border-yellow-800 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <span>PENDING</span>
                <span className="px-1.5 py-0.2 rounded-full bg-yellow-900/80 text-[10px] font-mono">
                  {pendingCount}
                </span>
              </button>
            </div>

            {/* Search & Bulk Selection Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search student, roll, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end text-xs">
                <span className="text-slate-400 text-[11px] font-mono">
                  {selectedCount} of {filteredStudents.length} selected
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllFiltered}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs font-medium transition cursor-pointer"
                  >
                    Deselect
                  </button>
                </div>
              </div>
            </div>

            {/* Students List Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden max-h-[380px] overflow-y-auto divide-y divide-slate-800/60">
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <Check className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-xs font-semibold text-white">No Defaulters Found</p>
                  <p className="text-[11px] text-slate-500">
                    All students under this category have completed their submissions or no students match your search.
                  </p>
                </div>
              ) : (
                filteredStudents.map((s) => {
                  const isSelected = selectedRollNos.has(s.rollNo);
                  const isPreviewed = activePreviewStudent?.rollNo === s.rollNo;
                  const currentEmail = getStudentEmail(s);
                  const currentPhone = getStudentPhone(s);
                  const isCustom = Boolean(customEmails[s.rollNo]);
                  const isPhoneCustom = Boolean(customPhones[s.rollNo]);
                  const isFromSheet = Boolean(s.email);

                  return (
                    <div
                      key={s.rollNo}
                      className={`p-3 flex items-start gap-3 transition-colors ${
                        isPreviewed
                          ? 'bg-amber-950/30 border-l-4 border-l-amber-500'
                          : isSelected
                          ? 'bg-slate-900/70 hover:bg-slate-900'
                          : 'hover:bg-slate-900/40 opacity-75'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleSelectStudent(s.rollNo)}
                        className="mt-1 text-slate-400 hover:text-white cursor-pointer shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-white">
                              {s.rollNo}
                            </span>
                            <span className="text-xs text-slate-300 font-medium truncate max-w-[150px] sm:max-w-[200px]">
                              {s.name}
                            </span>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.overallStatus === 'NOT STARTED'
                                ? 'bg-red-950 text-red-300 border border-red-800'
                                : 'bg-yellow-950 text-yellow-300 border border-yellow-800'
                            }`}
                          >
                            {s.overallStatus}
                          </span>
                        </div>

                        {/* Email row with inline edit */}
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          {editingEmailRollNo === s.rollNo ? (
                            <div className="flex items-center gap-1.5 w-full">
                              <input
                                type="email"
                                value={tempEmailInput}
                                onChange={(e) => setTempEmailInput(e.target.value)}
                                placeholder="student@example.com"
                                className="bg-slate-900 border border-amber-500 rounded px-2 py-0.5 text-xs text-white flex-1 focus:outline-none"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEmail(s.rollNo)}
                                className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-bold"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingEmailRollNo(null)}
                                className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap text-[11px]">
                              <span className="text-slate-400 font-mono flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-500" />
                                {currentEmail}
                              </span>

                              {isFromSheet && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[9px]">
                                  From Sheet
                                </span>
                              )}
                              {isCustom && (
                                <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[9px]">
                                  Edited
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingEmailRollNo(s.rollNo);
                                  setTempEmailInput(currentEmail);
                                }}
                                className="text-slate-500 hover:text-amber-400 transition"
                                title="Edit student email"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )}

                          {/* Phone row with inline edit (visible when WhatsApp or BOTH mode is selected) */}
                          {(dispatchChannel === 'WHATSAPP' || dispatchChannel === 'BOTH') && (
                            <div className="w-full pt-1 border-t border-slate-900/80 mt-1 flex items-center justify-between gap-2">
                              {editingPhoneRollNo === s.rollNo ? (
                                <div className="flex items-center gap-1.5 w-full">
                                  <input
                                    type="tel"
                                    value={tempPhoneInput}
                                    onChange={(e) => setTempPhoneInput(e.target.value)}
                                    placeholder="+919876543210 or 9876543210"
                                    className="bg-slate-900 border border-emerald-500 rounded px-2 py-0.5 text-xs text-white flex-1 focus:outline-none font-mono"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSavePhone(s.rollNo)}
                                    className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold"
                                  >
                                    Save
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingPhoneRollNo(null)}
                                    className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px]"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                                  <span className="text-emerald-300/90 font-mono flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-emerald-500" />
                                    {currentPhone || <em className="text-slate-500 italic">No Phone Number</em>}
                                  </span>
                                  {isPhoneCustom && (
                                    <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[9px]">
                                      Edited Phone
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingPhoneRollNo(s.rollNo);
                                      setTempPhoneInput(currentPhone);
                                    }}
                                    className="text-slate-500 hover:text-emerald-300 transition"
                                    title="Edit student phone number"
                                  >
                                    <Edit2 className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Quick 1-click single student actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setPreviewStudentRoll(s.rollNo)}
                              className={`p-1 rounded text-[10px] transition cursor-pointer ${
                                isPreviewed
                                  ? 'text-amber-300 bg-amber-950'
                                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
                              }`}
                              title="Preview personalized email for this student"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenWhatsAppIndividual(s)}
                              className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 rounded text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer"
                              title="Send personalized reminder notice via WhatsApp"
                            >
                              <MessageCircle className="w-2.5 h-2.5 text-emerald-400" />
                              <span>WhatsApp</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenGmailWeb(s)}
                              className="px-2 py-1 bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 rounded text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer"
                              title="Send 1-on-1 personalized email via Gmail"
                            >
                              <Send className="w-2.5 h-2.5" />
                              <span>Gmail</span>
                            </button>
                          </div>
                        </div>

                        {/* Missing items breakdown tags */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px]">
                          {s.countMismatch && s.countMismatch.hasMismatch && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-600/70 flex items-center gap-1 font-mono font-bold">
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                              {s.countMismatch.type === 'MORE_IN_SHEET'
                                ? `Mismatch: ${s.countMismatch.sheetCount} Sheet vs ${s.countMismatch.driveCount} Drive`
                                : `Mismatch: ${s.countMismatch.driveCount} Drive vs ${s.countMismatch.sheetCount} Sheet`}
                            </span>
                          )}
                          {!s.driveUploaded && (
                            <span className="px-1.5 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-900 flex items-center gap-1">
                              <HardDrive className="w-2.5 h-2.5" /> Missing Drive
                            </span>
                          )}
                          {!s.sheetUpdated && (
                            <span className="px-1.5 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-900 flex items-center gap-1">
                              <FileSpreadsheet className="w-2.5 h-2.5" /> Missing Sheet
                            </span>
                          )}
                          {s.driveUploaded && s.sheetUpdated && !s.submitted && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-900 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" /> Unconfirmed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Template Customizer & Live Preview (5 cols) */}
          <div className="lg:col-span-5 space-y-4 flex flex-col">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Personalized Email Template
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Dynamic Tags</span>
              </div>

              {/* Template Presets Selector */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Select Template Preset:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'GENERAL', label: 'Default Action Required' },
                    { id: 'DISCREPANCY', label: '⚠️ Count Mismatch (3 vs 2)' },
                    { id: 'MISSING_DRIVE', label: 'Missing Drive File' },
                    { id: 'MISSING_SHEET', label: 'Missing Sheet Entry' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectTemplatePreset(preset.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                        templatePreset === preset.id
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                          : 'bg-slate-900 hover:bg-slate-850 text-slate-400 border-slate-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Tokens list */}
              <div className="text-[10px] text-slate-400 space-y-1">
                <span className="block font-semibold text-slate-300">Click to Insert Dynamic Variable:</span>
                <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                  {[
                    '{{student_name}}',
                    '{{roll_no}}',
                    '{{status}}',
                    '{{missing_items}}',
                    '{{discrepancy_details}}',
                    '{{sheet_count}}',
                    '{{drive_count}}',
                    '{{drive_link}}',
                    '{{sheet_link}}',
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setBodyTemplate((prev) => prev + ' ' + tag)}
                      className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-amber-300 border border-slate-800 transition cursor-pointer"
                      title="Click to insert tag into message body"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Subject Line Template:
                </label>
                <input
                  type="text"
                  value={subjectTemplate}
                  onChange={(e) => setSubjectTemplate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* Body Textarea */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Body Message Template:
                </label>
                <textarea
                  rows={6}
                  value={bodyTemplate}
                  onChange={(e) => setBodyTemplate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono leading-relaxed"
                />
              </div>
            </div>

            {/* Live Preview & Direct Student Draft Editor */}
            <div className="p-4 bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 rounded-2xl space-y-3 flex-1 shadow-lg">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {isDirectEditingPreview ? 'Customizing Draft for Student' : 'Live Personalized Preview'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {activePreviewStudent && (
                    <button
                      type="button"
                      onClick={() => setIsDirectEditingPreview(!isDirectEditingPreview)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer border ${
                        isDirectEditingPreview
                          ? 'bg-purple-950 text-purple-300 border-purple-700'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                      }`}
                    >
                      {isDirectEditingPreview ? 'Switch to Auto-Preview' : '✏️ Edit This Student Draft'}
                    </button>
                  )}
                  {activePreviewStudent && (
                    <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-mono font-bold">
                      {activePreviewStudent.rollNo}
                    </span>
                  )}
                </div>
              </div>

              {activePreviewStudent ? (
                <div className="space-y-2.5 text-xs">
                  {/* Real Delivery Assurance Card */}
                  <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 flex items-start gap-2.5 text-[11px] text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-200">Real Email Delivery:</strong> Clicking <strong>Send via Gmail</strong> or <strong>Mail Client</strong> opens an authentic message draft in your real email client with recipient, subject, and personalized body filled in. Clicking send delivers genuine emails directly to actual student inboxes.
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-bold uppercase text-[9px] w-14">To:</span>
                      <span className="text-slate-200 font-mono">{getStudentEmail(activePreviewStudent)}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-bold uppercase text-[9px] w-14">Subject:</span>
                      {isDirectEditingPreview ? (
                        <input
                          type="text"
                          value={customStudentDrafts[activePreviewStudent.rollNo]?.subject ?? previewEmailContent.subject}
                          onChange={(e) => {
                            const newSub = e.target.value;
                            setCustomStudentDrafts((prev) => ({
                              ...prev,
                              [activePreviewStudent.rollNo]: {
                                subject: newSub,
                                body: prev[activePreviewStudent.rollNo]?.body ?? previewEmailContent.body,
                              },
                            }));
                          }}
                          className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                        />
                      ) : (
                        <span className="text-white font-semibold">{previewEmailContent.subject}</span>
                      )}
                    </div>
                  </div>

                  {isDirectEditingPreview ? (
                    <textarea
                      rows={6}
                      value={customStudentDrafts[activePreviewStudent.rollNo]?.body ?? previewEmailContent.body}
                      onChange={(e) => {
                        const newBody = e.target.value;
                        setCustomStudentDrafts((prev) => ({
                          ...prev,
                          [activePreviewStudent.rollNo]: {
                            subject: prev[activePreviewStudent.rollNo]?.subject ?? previewEmailContent.subject,
                            body: newBody,
                          },
                        }));
                      }}
                      className="w-full bg-slate-900/90 border border-amber-500/50 rounded-xl p-3 text-slate-200 text-xs font-mono leading-relaxed focus:outline-none"
                    />
                  ) : (
                    <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-300 text-[11px] font-sans whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed border-l-2 border-l-amber-500">
                      {previewEmailContent.body}
                    </div>
                  )}

                  {/* Actions for preview student */}
                  <div className="flex items-center gap-2 pt-1 justify-end flex-wrap">
                    {customStudentDrafts[activePreviewStudent.rollNo] && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomStudentDrafts((prev) => {
                            const next = { ...prev };
                            delete next[activePreviewStudent.rollNo];
                            return next;
                          });
                        }}
                        className="px-2.5 py-1 text-[11px] text-rose-400 hover:bg-rose-950/40 rounded-lg border border-rose-500/30 transition cursor-pointer"
                      >
                        Reset to Template
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleCopyMessage}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                    >
                      {copiedKey === 'message' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy Message</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenWhatsAppIndividual(activePreviewStudent)}
                      className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      title="Open WhatsApp chat with prefilled personalized message"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenMailto(activePreviewStudent)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition cursor-pointer"
                      title="Open default system mail client"
                    >
                      <Mail className="w-3 h-3 text-blue-400" />
                      <span>Mail Client</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenGmailWeb(activePreviewStudent)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-red-600/20"
                      title="Open authentic Gmail composer ready to send to real student mailbox"
                    >
                      <Send className="w-3 h-3" />
                      <span>Send to {activePreviewStudent.rollNo} via Gmail</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic py-4 text-center">
                  Select a student from the list to view live personalized email preview.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer / Batch Dispatch Bar */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Selected <strong>{selectedCount}</strong> student recipient(s) for reminder outreach.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {/* WhatsApp Group Broadcast Actions */}
            <button
              type="button"
              onClick={handleCopyWhatsAppBroadcast}
              disabled={selectedCount === 0}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5 border border-slate-700"
              title="Copy formatted WhatsApp notice for class group to clipboard"
            >
              {copiedKey === 'whatsapp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
              <span>Copy WhatsApp Text</span>
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsAppGroupBroadcast}
              disabled={selectedCount === 0}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
              title="Open WhatsApp Web or WhatsApp Desktop app with formatted class notice for all selected defaulters"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Broadcast to Group ({selectedCount})</span>
            </button>

            {(dispatchChannel === 'WHATSAPP' || dispatchChannel === 'BOTH') && (
              <button
                type="button"
                onClick={handleBatchSendWhatsAppApi}
                disabled={selectedCount === 0 || isBatchSendingWhatsApp}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
                title="Dispatch WhatsApp notices directly via WhatsApp API (Twilio / Meta / Webhook)"
              >
                {isBatchSendingWhatsApp ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin text-white" />
                    <span>Dispatching ({whatsAppProgress?.current}/{whatsAppProgress?.total})...</span>
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4" />
                    <span>Batch WhatsApp API ({selectedCount})</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyEmails}
              disabled={selectedCount === 0}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5"
            >
              {copiedKey === 'emails' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy Emails</span>
            </button>

            <button
              type="button"
              onClick={handleBatchSendGmail}
              disabled={selectedCount === 0}
              className="px-4 py-2 bg-gradient-to-r from-red-600 via-amber-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-orange-600/20 flex items-center gap-2 cursor-pointer"
              title="Open Gmail Web with selected students pre-populated in BCC"
            >
              <Send className="w-4 h-4" />
              <span>Batch Remind via Gmail ({selectedCount})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
