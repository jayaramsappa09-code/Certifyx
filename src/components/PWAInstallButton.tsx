import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Laptop, X, HelpCircle } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showGeneralGuide, setShowGeneralGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-slate-100 text-xs font-semibold rounded-xl shadow-lg transition duration-200 cursor-pointer border border-blue-500/30"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl shadow-lg transition duration-200 cursor-pointer border border-slate-700"
        >
          <Laptop className="w-3.5 h-3.5" />
          <span>Install iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 relative">
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-4 text-blue-400">
                <HelpCircle className="w-6 h-6" />
                <h3 className="text-base font-bold text-white">Install Certifyx on iOS</h3>
              </div>
              <p className="text-xs text-slate-300 space-y-2 leading-relaxed">
                1. Tap the <strong className="text-blue-400">Share</strong> icon in the Safari toolbar (bottom on iPhone, top on iPad).<br />
                2. Scroll down and select <strong className="text-blue-400">Add to Home Screen</strong>.<br />
                3. Tap <strong className="text-blue-400">Add</strong> in the top-right corner to complete!
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // General Fallback (when inside iframe or event not triggered yet)
  return (
    <>
      <button
        type="button"
        onClick={() => setShowGeneralGuide(true)}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl shadow-lg transition duration-200 cursor-pointer border border-slate-700"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>

      {showGeneralGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100 relative">
            <button
              type="button"
              onClick={() => setShowGeneralGuide(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4 text-blue-400">
              <HelpCircle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Install App Guide</h3>
            </div>
            <p className="text-xs text-slate-300 space-y-2 leading-relaxed">
              To install this application on your desktop or mobile device:
              <br /><br />
              1. **Open this application in a direct tab** rather than inside an iframe (such as the AI Studio panel or preview window).
              <br />
              2. Click the **Install Icon** (a monitor with an arrow, or <strong className="text-blue-400">+</strong> symbol) at the far-right of your browser's top **URL address bar**.
              <br />
              3. Or open your browser menu (the **3 dots** in Chrome/Edge) and select **"Save and share"** or **"Install Class Certificate..."**.
            </p>
            <button
              type="button"
              onClick={() => setShowGeneralGuide(false)}
              className="mt-6 w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
