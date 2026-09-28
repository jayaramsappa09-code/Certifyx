import React, { useState, useRef } from 'react';
import {
  QrCode,
  X,
  Copy,
  Check,
  Download,
  Printer,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Upload,
  User,
  GraduationCap,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { StudentStatusRecord } from '../types';

interface StudentQRCodeModalProps {
  student: StudentStatusRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenDetails?: (student: StudentStatusRecord) => void;
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const StudentQRCodeModal: React.FC<StudentQRCodeModalProps> = ({
  student,
  isOpen,
  onClose,
  onOpenDetails,
  onToast,
}) => {
  const [copiedLink, setCopiedFileId] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !student) return null;

  // Base URL calculation (works in dev preview and deployed domain)
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-gqeyomkljiuqud5mq6vf6d-37198302098.asia-southeast1.run.app';
  const targetUrl = `${origin}/?rollNo=${encodeURIComponent(student.rollNo)}`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(targetUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = targetUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedFileId(true);
      onToast?.(`Copied direct QR link for ${student.name} (${student.rollNo})!`, 'success');
      setTimeout(() => setCopiedFileId(false), 2200);
    } catch (err) {
      console.error('Failed to copy QR link:', err);
    }
  };

  const handleDownloadQrPng = () => {
    if (!qrRef.current) return;
    const svgElement = qrRef.current.querySelector('svg');
    if (!svgElement) return;

    try {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      canvas.width = 400;
      canvas.height = 400;

      img.onload = () => {
        if (!ctx) return;
        // White background for scannability
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20, 360, 360);

        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `${student.rollNo}_QR_Certificate_Pass.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        onToast?.(`Downloaded QR Code PNG for ${student.rollNo}!`, 'success');
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      console.error('Failed to download QR code PNG:', err);
      onToast?.('Failed to download QR code image', 'error');
    }
  };

  const handlePrintCertificatePass = () => {
    const printWindow = window.open('', '_blank', 'width=650,height=750');
    if (!printWindow) return;

    const statusBadge =
      student.overallStatus === 'COMPLETED'
        ? 'VERIFIED & COMPLETED'
        : student.overallStatus === 'PENDING'
        ? 'PENDING VERIFICATION'
        : 'NOT STARTED';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student Certificate Pass - ${student.rollNo}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              padding: 40px;
              text-align: center;
              background-color: #f8fafc;
              color: #0f172a;
            }
            .card {
              max-width: 450px;
              margin: 0 auto;
              background: white;
              border: 2px solid #cbd5e1;
              border-radius: 20px;
              padding: 30px;
              box-shadow: 0 10px 25px rgba(0,0,0,0.08);
            }
            .header { font-size: 20px; font-weight: bold; margin-bottom: 5px; color: #1e293b; }
            .subtitle { font-size: 13px; color: #64748b; margin-bottom: 20px; }
            .roll-no { font-family: monospace; font-size: 18px; font-weight: bold; background: #e0f2fe; color: #0369a1; padding: 6px 14px; border-radius: 8px; display: inline-block; margin-bottom: 10px; }
            .name { font-size: 16px; font-weight: 700; margin-bottom: 15px; }
            .qr-box { margin: 20px auto; padding: 15px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; display: inline-block; }
            .status { font-size: 12px; font-weight: bold; padding: 6px 12px; border-radius: 20px; display: inline-block; margin-top: 10px; }
            .status-completed { background: #dcfce7; color: #15803d; }
            .status-pending { background: #fef3c7; color: #b45309; }
            .status-missing { background: #fee2e2; color: #b91c1c; }
            .instructions { font-size: 11px; color: #64748b; margin-top: 20px; line-height: 1.5; border-top: 1px dashed #cbd5e1; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">Class Certificate Pass</div>
            <div class="subtitle">Certifyx Automated Verification System</div>
            <div class="roll-no">${student.rollNo}</div>
            <div class="name">${student.name}</div>
            <div class="qr-box">
              ${qrRef.current?.innerHTML || ''}
            </div>
            <div>
              <span class="status ${
                student.overallStatus === 'COMPLETED'
                  ? 'status-completed'
                  : student.overallStatus === 'PENDING'
                  ? 'status-pending'
                  : 'status-missing'
              }">${statusBadge}</span>
            </div>
            <div class="instructions">
              Scan this QR code with any phone camera to instantly inspect certificate verification status or submit missing certificate files.
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col text-slate-100">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 shadow-md shadow-blue-500/10">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Student Verification QR Code
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800">
                  {student.rollNo}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Scan with any phone camera to view status &amp; upload missing certificates
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 text-center">
          {/* Student Banner */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-3">
            <div className="text-left min-w-0">
              <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">{student.name}</span>
              </div>
              <div className="text-[11px] font-mono text-blue-300 font-semibold mt-0.5">
                Roll No: {student.rollNo}
              </div>
            </div>

            {student.overallStatus === 'COMPLETED' ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                VERIFIED
              </span>
            ) : student.overallStatus === 'PENDING' ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-700 flex items-center gap-1 shrink-0">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                PENDING
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-950 text-red-400 border border-red-800 flex items-center gap-1 shrink-0">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                NOT STARTED
              </span>
            )}
          </div>

          {/* QR Code Container (High-contrast canvas) */}
          <div className="inline-block p-4 bg-white border-2 border-blue-500/30 rounded-2xl shadow-xl shadow-blue-950/40 relative group">
            <div ref={qrRef} className="flex items-center justify-center">
              <QRCodeSVG
                value={targetUrl}
                size={210}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#0f172a"
              />
            </div>
            <div className="mt-2 text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              Scan to inspect or upload certificates
            </div>
          </div>

          {/* Scan Instructions */}
          <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            📲 Point any phone camera or Google Lens at this QR Code to immediately open this student&apos;s personal status report and certificate upload form.
          </p>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
              title="Copy direct verification URL to clipboard"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-blue-400" />
                  <span>Copy Direct Link</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadQrPng}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
              title="Download QR code as image file (.png)"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download PNG</span>
            </button>

            <button
              type="button"
              onClick={handlePrintCertificatePass}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
              title="Print Certificate Pass for student notice board"
            >
              <Printer className="w-4 h-4 text-purple-400" />
              <span>Print QR Pass</span>
            </button>

            {onOpenDetails && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDetails(student);
                }}
                className="px-3 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/30"
                title="Open details modal to upload certificates"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Certs</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
