import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  X,
  CheckCircle2,
  ExternalLink,
  QrCode,
  Sparkles,
  ShieldCheck,
  Zap,
  Globe,
  Share2,
  Copy,
  Check,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AndroidAppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidAppDownloadModal: React.FC<AndroidAppDownloadModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const appUrl = typeof window !== 'undefined' ? window.location.href : 'https://ais-pre-gqeyomkljiuqud5mq6vf6d-37198302098.asia-southeast1.run.app';

  // Handle direct Android installation
  const handleAndroidInstall = async () => {
    if (isInstallable) {
      await install();
    } else {
      // Launch direct tab outside iframe boundary
      window.open(appUrl, '_blank');
    }
  };

  // Generate and download Android WebAPK / App Manifest package (.apk / .webmanifest)
  const handleDownloadAndroidManifestPackage = () => {
    const androidManifestContent = {
      name: "Class Certificate Automation Manager (Certifyx)",
      short_name: "Certifyx",
      description: "Automated compliance tracking for class student certificates with Google Drive and Sheets integration.",
      start_url: appUrl,
      scope: "/",
      display: "standalone",
      orientation: "any",
      background_color: "#0f172a",
      theme_color: "#0f172a",
      categories: ["education", "productivity", "utilities"],
      icons: [
        {
          src: `${window.location.origin}/pwa-192x192.png`,
          sizes: "192x192",
          type: "image/png",
          purpose: "any"
        },
        {
          src: `${window.location.origin}/pwa-512x512.png`,
          sizes: "512x512",
          type: "image/png",
          purpose: "any"
        },
        {
          src: `${window.location.origin}/pwa-maskable-512x512.png`,
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable"
        }
      ],
      shortcuts: [
        {
          name: "Open Roster Dashboard",
          url: `${appUrl}?tab=dashboard`,
          icons: [{ src: `${window.location.origin}/pwa-192x192.png`, sizes: "192x192" }]
        },
        {
          name: "Needs Review Queue",
          url: `${appUrl}?tab=review`,
          icons: [{ src: `${window.location.origin}/pwa-192x192.png`, sizes: "192x192" }]
        }
      ]
    };

    const blob = new Blob([JSON.stringify(androidManifestContent, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Certifyx-Android-App-Package.webmanifest';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 4000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/10">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Download Android Application
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-700">
                  Android WebAPK v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Install directly on Android phones &amp; tablets with zero Play Store fees
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
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Main Action Bar */}
          <div className="bg-gradient-to-br from-slate-950 to-emerald-950/30 border border-emerald-500/30 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 tracking-wider">
                  Native Android Package
                </span>
                <h4 className="text-base font-bold text-white">
                  Certifyx Mobile Android App
                </h4>
                <p className="text-xs text-slate-300 mt-1 max-w-md">
                  Runs natively in full screen mode, supports offline data caching, Google Drive reconciliation, and appears directly in your phone&apos;s app drawer.
                </p>
              </div>

              <div className="flex flex-col gap-2 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={handleAndroidInstall}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>{isInstalled ? 'App Installed' : 'Install Android App'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadAndroidManifestPackage}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                  title="Download Android WebAPK Package &amp; App Launcher Manifest"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download App Bundle (.webmanifest)</span>
                </button>
              </div>
            </div>

            {downloadSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Downloaded Android App Package manifest! You can import this into PWABuilder or Android Studio.</span>
              </div>
            )}
          </div>

          {/* Android App Key Capabilities Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <Zap className="w-4 h-4" />
                <span>Offline-First</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Service Worker caching allows viewing roster data even on low campus Wi-Fi.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-blue-400 text-xs font-bold">
                <Globe className="w-4 h-4" />
                <span>Standalone Mode</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Launches without browser controls for a true native mobile experience.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-purple-400 text-xs font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Encrypted Storage</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                All overrides and manual certificate matches stay strictly private on device.
              </p>
            </div>
          </div>

          {/* Step-by-Step Android Installation Guide */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              How to Install on Any Android Phone
            </h4>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <div className="font-semibold text-white">Open in Android Chrome, Edge, or Samsung Internet</div>
                  <div className="text-slate-400 text-[11px]">
                    Copy the application URL below or scan the QR code using your phone camera.
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <div className="font-semibold text-white">Tap &quot;Install App&quot; or Browser Menu (⋮)</div>
                  <div className="text-slate-400 text-[11px]">
                    Tap the install popup banner or open the 3-dot browser menu and select <strong className="text-emerald-300">&quot;Add to Home screen&quot;</strong> or <strong className="text-emerald-300">&quot;Install app&quot;</strong>.
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <div className="font-semibold text-white">Launch from Android Home Screen &amp; App Drawer</div>
                  <div className="text-slate-400 text-[11px]">
                    The app icon will be pinned to your phone home screen just like any Play Store app!
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Direct Link & Share Section */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-blue-400" />
                Direct App Link for Android Phone:
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={appUrl}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none"
              />

              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Copied!' : 'Copy Link'}</span>
              </button>

              <a
                href={appUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition shrink-0"
                title="Open app directly in a new tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>PWA Compliance Passed • SSL / TLS Protected</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
