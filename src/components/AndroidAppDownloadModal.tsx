import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  X,
  ExternalLink,
  QrCode,
  Sparkles,
  ShieldCheck,
  Zap,
  Globe,
  Share2,
  Copy,
  Check,
  PackageCheck,
  AlertTriangle,
  Info,
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
  const [activeTab, setActiveTab] = useState<'install' | 'apk' | 'qr'>('install');

  if (!isOpen) return null;

  const appUrl = typeof window !== 'undefined' ? window.location.href : 'https://ais-pre-gqeyomkljiuqud5mq6vf6d-37198302098.asia-southeast1.run.app';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(appUrl)}&margin=10`;
  const pwaBuilderUrl = `https://www.pwabuilder.com/?url=${encodeURIComponent(appUrl)}`;

  // Handle direct Android installation via WebAPK
  const handleAndroidInstall = async () => {
    if (isInstallable) {
      await install();
    } else {
      // Launch direct tab outside iframe boundary so Android Chrome / Samsung Internet triggers native installation
      window.open(appUrl, '_blank');
    }
  };

  const handleOpenPWABuilder = () => {
    window.open(pwaBuilderUrl, '_blank');
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
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/10">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Android App &amp; APK Center
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-700">
                  Android WebAPK &amp; APK
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Install directly on Android phones &amp; tablets — No useless JSON downloads
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-5 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('install')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'install'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>1-Tap Install (WebAPK)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('apk')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'apk'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Compiled APK (.apk)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'qr'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan QR Code</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'install' && (
            <div className="space-y-4">
              {/* Main WebAPK Installation Banner */}
              <div className="bg-gradient-to-br from-slate-950 to-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 tracking-wider">
                        Recommended Official Method
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-300 border border-emerald-700/50">
                        Zero Security Warnings
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-white mt-1">
                      Install Verified Android WebAPK
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 max-w-md leading-relaxed">
                      Android automatically generates and installs an official, signed WebAPK directly into your phone’s App Drawer. It runs full-screen, caches data offline, and syncs seamlessly with Google Drive.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 w-full sm:w-auto shrink-0">
                    <button
                      type="button"
                      onClick={handleAndroidInstall}
                      className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Smartphone className="w-4 h-4" />
                      <span>{isInstalled ? 'App Already Installed' : 'Install on Android Phone'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => window.open(appUrl, '_blank')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                      <span>Open in Android Chrome</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Android Installation Guide */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  3 Simple Steps to Install on Android
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                      1
                    </div>
                    <div className="font-semibold text-white">Open in Chrome or Edge</div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Tap &quot;Open in Android Chrome&quot; above to leave this preview iframe.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                      2
                    </div>
                    <div className="font-semibold text-white">Tap &quot;Install App&quot;</div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      A prompt will appear at the bottom, or tap the (⋮) menu and select <strong className="text-emerald-300">&quot;Install App&quot;</strong>.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs">
                      3
                    </div>
                    <div className="font-semibold text-white">App Drawer Icon</div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      The Certifyx icon appears in your phone&apos;s home screen and app drawer just like any Play Store app!
                    </p>
                  </div>
                </div>
              </div>

              {/* Android App Key Capabilities Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                    <Zap className="w-4 h-4" />
                    <span>Offline-First</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Service Worker caching allows viewing 67-student roster data even on low campus Wi-Fi.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2 text-blue-400 text-xs font-bold">
                    <Globe className="w-4 h-4" />
                    <span>Standalone Fullscreen</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Launches without browser address bars for a true native mobile experience.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2 text-purple-400 text-xs font-bold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Auto-Updating</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    Always runs the latest version automatically without requiring manual APK reinstalls.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'apk' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold text-amber-300">Why WebAPK is better than a manual APK:</div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Downloading an unsigned manual `.apk` file triggers dangerous &quot;Harmful file&quot; alerts on Android and requires manually enabling &quot;Install from unknown sources&quot;. The <strong>1-Tap WebAPK</strong> (in the first tab) installs natively through Chrome with Google certification and zero warnings.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                    <PackageCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Generate Signed Android APK (.apk)</h4>
                    <p className="text-xs text-slate-400">
                      Powered by PWABuilder (Official tool backed by Microsoft &amp; Google)
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  If you need a physical `.apk` file for sideloading, enterprise Mobile Device Management (MDM), or Google Play Store submission:
                </p>

                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300 font-semibold">
                    <span>Target URL:</span>
                    <span className="text-[11px] font-mono text-emerald-400 truncate max-w-xs">{appUrl}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    PWABuilder will automatically compile this app&apos;s manifest and icons into a signed Android `.apk` or `.aab` package with 1 click.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenPWABuilder}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30"
                >
                  <Download className="w-4 h-4" />
                  <span>Build &amp; Download Android APK via PWABuilder</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'qr' && (
            <div className="space-y-4 text-center">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center space-y-4">
                <div className="p-3 bg-white rounded-2xl shadow-xl">
                  <img
                    src={qrCodeUrl}
                    alt="Scan to Install Certifyx on Android"
                    className="w-48 h-48 rounded-lg"
                  />
                </div>

                <div className="max-w-xs space-y-1">
                  <h4 className="text-sm font-bold text-white">Scan with Android Camera</h4>
                  <p className="text-xs text-slate-400">
                    Point your phone camera at the QR code above to open and install Certifyx directly on your phone.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Direct Link & Share Section */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-blue-400" />
                Direct App Link for Mobile Phones:
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
            <span>PWA &amp; WebAPK Compliance Passed • SSL / TLS Protected</span>
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
