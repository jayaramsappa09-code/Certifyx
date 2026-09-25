import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  HardDrive,
  FileSpreadsheet,
  Layers,
  RefreshCw,
  X,
  ArrowRight,
  Shield,
  Folder,
} from 'lucide-react';
import { GoogleDriveFolderConfig, GoogleSheetConfig } from '../types';

interface SetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  isGoogleConnected: boolean;
  driveConfig: GoogleDriveFolderConfig | null;
  sheetConfig: GoogleSheetConfig | null;
  onConnectGoogle: () => void;
  onGoToIntegration: () => void;
  onTriggerSync: () => void;
}

export const SetupWizardModal: React.FC<SetupWizardModalProps> = ({
  isOpen,
  onClose,
  isGoogleConnected,
  driveConfig,
  sheetConfig,
  onConnectGoogle,
  onGoToIntegration,
  onTriggerSync,
}) => {
  if (!isOpen) return null;

  const steps = [
    {
      num: 1,
      title: 'Connect Google Account',
      desc: 'Sign in with your authorized administrator Google account (OAuth 2.0).',
      done: isGoogleConnected,
      action: !isGoogleConnected ? (
        <button
          onClick={onConnectGoogle}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
        >
          Sign in with Google
        </button>
      ) : null,
    },
    {
      num: 2,
      title: 'Select Drive Folder',
      desc: 'Connect the Google Drive folder containing student certificate files.',
      done: Boolean(driveConfig),
      action: !driveConfig ? (
        <button
          onClick={() => {
            onClose();
            onGoToIntegration();
          }}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
        >
          Select Folder
        </button>
      ) : null,
    },
    {
      num: 3,
      title: 'Select Google Sheet',
      desc: 'Connect the Google Sheet tracking student submissions and certificates.',
      done: Boolean(sheetConfig),
      action: !sheetConfig ? (
        <button
          onClick={() => {
            onClose();
            onGoToIntegration();
          }}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
        >
          Select Sheet
        </button>
      ) : null,
    },
    {
      num: 4,
      title: 'Map Spreadsheet Columns',
      desc: 'Verify the detected Roll Number, Name, and Certificate columns.',
      done: Boolean(sheetConfig?.columnMapping?.rollNoCol),
      action: null,
    },
    {
      num: 5,
      title: 'Run First Synchronization',
      desc: 'Execute automated comparison against the 67-student class roster.',
      done: false,
      action: (
        <button
          onClick={() => {
            onClose();
            onTriggerSync();
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-lg shadow-blue-600/30 flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>SYNC NOW</span>
        </button>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Quick Setup Wizard
              </h2>
              <p className="text-xs text-slate-400">
                Get started with automated Drive + Sheets reconciliation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps List */}
        <div className="space-y-3">
          {steps.map((step) => (
            <div
              key={step.num}
              className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                step.done
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : 'bg-slate-950/70 border-slate-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                    step.done
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {step.done ? <CheckCircle2 className="w-4 h-4" /> : step.num}
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>{step.title}</span>
                    {step.done && (
                      <span className="text-[10px] text-emerald-400 font-semibold">
                        Ready
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {step.desc}
                  </p>
                </div>
              </div>

              {step.action && <div className="shrink-0">{step.action}</div>}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
          <span className="text-slate-500">67 Students Fixed Roster</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl transition cursor-pointer"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
