import React, { useState } from 'react';
import {
  ShieldCheck,
  FolderSync,
  FileSpreadsheet,
  CheckCircle2,
  X,
  ArrowRight,
  ArrowLeft,
  Key,
  RefreshCw,
} from 'lucide-react';
import { googleSignIn, signInWithDirectToken } from '../services/firebaseAuth';
import { GoogleDriveFolderConfig, GoogleSheetConfig, SyncReport } from '../types';

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  isGoogleConnected: boolean;
  driveConfig: GoogleDriveFolderConfig | null;
  sheetConfig: GoogleSheetConfig | null;
  pendingSyncReport?: SyncReport | null;
  onConnectGoogle: () => void;
  onTriggerSync: () => void;
  onConfirmFirstSync?: () => void;
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({
  isOpen,
  onClose,
  isGoogleConnected,
  driveConfig,
  sheetConfig,
  pendingSyncReport,
  onConnectGoogle,
  onTriggerSync,
  onConfirmFirstSync,
  onToast,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [manualToken, setManualToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleManualTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    try {
      setIsLoading(true);
      await signInWithDirectToken(manualToken.trim());
      onToast?.('Google token verified and connected successfully!', 'success');
      setCurrentStep(2);
    } catch (err: any) {
      onToast?.(err.message || 'Failed to verify token', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-slate-100">
        {/* Header & Step Indicator */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white">System Onboarding & Setup</h3>
            <p className="text-xs text-slate-400">Step {currentStep} of 3: {currentStep === 1 ? 'Connect Google' : currentStep === 2 ? 'Folder & Sheet Setup' : 'First Sync Preview'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl transition hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Pills */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`flex-1 h-2 rounded-full transition-all ${
                step === currentStep
                  ? 'bg-blue-600 shadow-md shadow-blue-600/30'
                  : step < currentStep
                  ? 'bg-emerald-500'
                  : 'bg-slate-800'
              }`}
            />
          ))}
        </div>

        {/* STEP 1: Connect Google OAuth */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                <span>1. Connect Official Google Account</span>
              </h4>
              <p className="text-xs text-slate-400">
                Grant read-only access to Google Drive &amp; Google Sheets for certificate cross-matching.
              </p>
            </div>

            {isGoogleConnected ? (
              <div className="p-4 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl flex items-center justify-between text-xs text-emerald-200">
                <span className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Google OAuth Account Connected
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    onConnectGoogle();
                  }}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-2xl transition shadow-lg shadow-blue-600/20 cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Sign In with Google OAuth (Instant Popup)</span>
                </button>

                <form onSubmit={handleManualTokenSubmit} className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-[11px] text-slate-400 font-semibold block">
                    Or Enter Google Access Token Manually:
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="ya29.a0AfH6SM..."
                      className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 font-mono"
                    />
                    <button
                      type="submit"
                      disabled={isLoading || !manualToken.trim()}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Connect
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Configure Drive & Sheet */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderSync className="w-4 h-4 text-blue-400" />
                <span>2. Select Drive Folder &amp; Google Sheet</span>
              </h4>
              <p className="text-xs text-slate-400">
                Configure your target Drive folder containing certificate PDFs and your registration Google Sheet.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Drive Folder:</span>
                  <span className="text-slate-400">{driveConfig ? driveConfig.folderName : 'Not selected yet'}</span>
                </div>
                {driveConfig && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Google Sheet:</span>
                  <span className="text-slate-400">{sheetConfig ? sheetConfig.spreadsheetName : 'Not selected yet'}</span>
                </div>
                {sheetConfig && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onTriggerSync();
                  setCurrentStep(3);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-blue-600/20 cursor-pointer flex items-center gap-1.5"
              >
                <span>Run Initial Sync Audit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: First Sync Preview */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>3. Initial Reconciliation Audit Complete</span>
              </h4>
              <p className="text-xs text-slate-400">
                Review initial sync results before opening your dashboard.
              </p>
            </div>

            {pendingSyncReport && (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 text-xs">
                <div className="flex justify-between text-slate-300 font-mono">
                  <span>Matched Certificates:</span>
                  <strong className="text-emerald-400">{pendingSyncReport.matchedCertificates}</strong>
                </div>
                <div className="flex justify-between text-slate-300 font-mono">
                  <span>Roster Students Audited:</span>
                  <strong className="text-blue-400">{pendingSyncReport.studentsChecked}</strong>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  onConfirmFirstSync?.();
                  onClose();
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                Complete Onboarding &amp; Enter Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
