import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Download,
  Smartphone,
  Laptop,
  CheckCircle2,
  Sparkles,
  Zap,
  Globe,
  X,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Share2,
} from 'lucide-react';

interface DashboardPWAInstallCTAProps {
  onOpenAndroidDownloadModal?: () => void;
}

export const DashboardPWAInstallCTA: React.FC<DashboardPWAInstallCTAProps> = ({
  onOpenAndroidDownloadModal,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [activeInstructionTab, setActiveInstructionTab] = useState<'desktop' | 'android' | 'ios'>('desktop');
  const [isInstalling, setIsInstalling] = useState(false);

  // Check iframe state
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('pwa_cta_dismissed');
      if (dismissed === 'true') {
        setIsDismissed(true);
      }
    } catch (e) {
      console.warn('localStorage is not available:', e);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem('pwa_cta_dismissed', 'true');
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  };

  const handleRestore = () => {
    setIsDismissed(false);
    try {
      localStorage.removeItem('pwa_cta_dismissed');
    } catch (e) {
      console.error('Failed to remove from localStorage:', e);
    }
  };

  const handlePrimaryInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      try {
        const result = await install();
        if (result) {
          setIsDismissed(false);
        }
      } catch (err) {
        console.error('PWA install error:', err);
      } finally {
        setIsInstalling(false);
      }
    } else if (isIframe) {
      // Open in a direct tab so browser triggers the standard native install bar
      window.open(window.location.href, '_blank');
    } else if (isIOS) {
      setActiveInstructionTab('ios');
      setShowGuideModal(true);
    } else {
      setActiveInstructionTab('desktop');
      setShowGuideModal(true);
    }
  };

  // If dismissed, show a compact floating/inline pill so the user can easily re-open or see status
  if (isDismissed && !isInstalled) {
    return (
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border border-blue-500/20 rounded-xl text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Install application as a native PWA for offline access &amp; instant desktop/mobile launching.</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrimaryInstallClick}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            <span>Install App</span>
          </button>
          <button
            type="button"
            onClick={handleRestore}
            className="text-slate-400 hover:text-slate-200 text-xs underline cursor-pointer"
          >
            Show banner
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-r from-slate-900 via-blue-950/60 to-slate-900 p-5 sm:p-6 shadow-xl text-slate-100 transition-all duration-300">
        {/* Glow background accent */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Main Info Area */}
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              {isInstalled ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Native Application Mode Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold rounded-full">
                  <Sparkles className="w-3.5 h-3.5" />
                  Progressive Web App (PWA) Ready
                </span>
              )}

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-800/80 border border-slate-700/80 text-slate-300 text-[11px] font-medium rounded-full">
                <Zap className="w-3 h-3 text-amber-400" />
                Offline-First Sync
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-800/80 border border-slate-700/80 text-slate-300 text-[11px] font-medium rounded-full">
                <Globe className="w-3 h-3 text-cyan-400" />
                Cross-Platform (Android / iOS / Desktop)
              </span>
            </div>

            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>{isInstalled ? 'Certifyx Installed as Native App' : 'Install Certifyx Application on Your Device'}</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                {isInstalled
                  ? 'You are running the app in native windowed mode! Roster data and certificate matrices are cached locally for offline management.'
                  : 'Get a full native application experience without app store downloads. Features dedicated window, desktop/mobile launcher icon, offline caching, and instant launch.'}
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
                <Laptop className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">Standalone Window</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Instant Offline Access</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900/50 p-2 rounded-xl border border-slate-800">
                <Smartphone className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">Home Screen Launcher</span>
              </div>
            </div>
          </div>

          {/* Action Buttons Group */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 justify-center">
            {isInstalled ? (
              <div className="flex flex-col gap-2">
                <div className="px-4 py-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs font-semibold text-emerald-300 flex items-center gap-2 justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Installed &amp; Active</span>
                </div>
                {onOpenAndroidDownloadModal && (
                  <button
                    type="button"
                    onClick={onOpenAndroidDownloadModal}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Android Version Hub</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handlePrimaryInstallClick}
                  disabled={isInstalling}
                  className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/30 border border-blue-400/30 transition-all transform active:scale-95 cursor-pointer flex items-center justify-center gap-2 group"
                >
                  <Download className="w-4 h-4 text-blue-100 group-hover:translate-y-0.5 transition-transform" />
                  <span>
                    {isInstalling
                      ? 'Installing App...'
                      : isInstallable
                      ? 'Install Application Now'
                      : isIframe
                      ? 'Launch Direct & Install'
                      : 'Install Native App'}
                  </span>
                </button>

                <div className="flex items-center gap-2">
                  {onOpenAndroidDownloadModal && (
                    <button
                      type="button"
                      onClick={onOpenAndroidDownloadModal}
                      className="flex-1 px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700/80 transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Android APK</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowGuideModal(true)}
                    className="flex-1 px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700/80 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                    <span>Instructions</span>
                  </button>
                </div>
              </>
            )}

            {!isInstalled && (
              <button
                type="button"
                onClick={handleDismiss}
                className="text-[11px] text-slate-400 hover:text-slate-200 text-center transition cursor-pointer pt-1"
              >
                Dismiss this banner
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Installation Instructions Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 relative space-y-5">
            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">How to Install Certifyx App</h3>
                <p className="text-xs text-slate-400">Follow the step-by-step instructions for your device</p>
              </div>
            </div>

            {/* Instruction Tabs */}
            <div className="flex border-b border-slate-800 gap-1">
              <button
                type="button"
                onClick={() => setActiveInstructionTab('desktop')}
                className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition cursor-pointer flex items-center gap-1.5 border-b-2 ${
                  activeInstructionTab === 'desktop'
                    ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Desktop (Chrome/Edge/Brave)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveInstructionTab('android')}
                className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition cursor-pointer flex items-center gap-1.5 border-b-2 ${
                  activeInstructionTab === 'android'
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Android Mobile</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveInstructionTab('ios')}
                className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition cursor-pointer flex items-center gap-1.5 border-b-2 ${
                  activeInstructionTab === 'ios'
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>iOS (iPhone/iPad)</span>
              </button>
            </div>

            {/* Tab Content */}
            <div className="text-xs text-slate-300 space-y-3 min-h-[160px] bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              {activeInstructionTab === 'desktop' && (
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                    <p>
                      <strong>Open Direct Window:</strong> If you are inside an embedded frame (like AI Studio preview), click <strong>"Launch in Direct Tab"</strong> below.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                    <p>
                      <strong>Address Bar Install Icon:</strong> Click the <strong className="text-blue-400">Install Icon</strong> (a monitor icon with a down arrow) at the far right of your browser address bar.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                    <p>
                      <strong>Alternative Menu:</strong> Or click the 3 dots in Chrome/Edge &rarr; <strong>"Save and share"</strong> &rarr; <strong>"Install Class Certificate Organizer..."</strong>.
                    </p>
                  </div>
                </div>
              )}

              {activeInstructionTab === 'android' && (
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                    <p>
                      <strong>One-Touch WebAPK Install:</strong> Tap <strong>"Install App"</strong> in Chrome for Android to instantly place the app in your App Drawer and Home Screen.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                    <p>
                      <strong>Chrome Menu Method:</strong> Tap the <strong>3 vertical dots</strong> in Chrome &rarr; select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                    <p>
                      <strong>Android Version Hub:</strong> Use our Android Hub for WebAPK manifests and APK sideload guides.
                    </p>
                  </div>
                </div>
              )}

              {activeInstructionTab === 'ios' && (
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                    <p>
                      <strong>Open Safari:</strong> Launch this application directly in <strong>Safari browser</strong> on your iPhone or iPad.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                    <p>
                      <strong>Share Menu:</strong> Tap the <strong className="text-indigo-400">Share button</strong> (square with up arrow) in Safari's bottom or top toolbar.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                    <p>
                      <strong>Add to Home Screen:</strong> Scroll down and tap <strong className="text-indigo-400">"Add to Home Screen"</strong>, then confirm by tapping <strong>Add</strong>.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  window.open(window.location.href, '_blank');
                  setShowGuideModal(false);
                }}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Launch in Direct Tab</span>
              </button>

              {onOpenAndroidDownloadModal && (
                <button
                  type="button"
                  onClick={() => {
                    setShowGuideModal(false);
                    onOpenAndroidDownloadModal();
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 border border-slate-700"
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Open Android Hub</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
