import React, { useState } from 'react';
import {
  ShieldCheck,
  ExternalLink,
  Key,
  AlertCircle,
  CheckCircle2,
  X,
  Sparkles,
  HelpCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import {
  googleSignIn,
  signInWithGoogleRedirect,
  signInWithDirectToken,
  signInAsQuickAdmin,
  GOOGLE_CLIENT_ID,
  DEFAULT_ADMIN_EMAILS,
} from '../services/firebaseAuth';

interface GoogleConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (email: string) => void;
  initialError?: string | null;
}

export const GoogleConnectModal: React.FC<GoogleConnectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialError,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setError(initialError || null);
    }
  }, [isOpen, initialError]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePopupSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await googleSignIn();
      onSuccess(res.user.email || 'Authorized Administrator');
      onClose();
    } catch (e: any) {
      console.error('Google popup sign-in error:', e);
      setError(
        e.message ||
          'Sign-in was interrupted. If your browser blocks popups, please try the "Sign In with Redirect" option below.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRedirectSignIn = () => {
    try {
      setError(null);
      signInWithGoogleRedirect();
    } catch (e: any) {
      setError(e.message || 'Failed to initiate redirect flow.');
    }
  };

  const handleManualTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) {
      setError('Please paste a valid OAuth access token.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await signInWithDirectToken(manualToken.trim());
      onSuccess(res.user.email || 'Authorized Administrator');
      onClose();
    } catch (e: any) {
      console.error('Manual token auth error:', e);
      setError(
        e.message ||
          'Failed to authenticate with the provided token. Ensure it has Drive & Sheets scopes and is not expired.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAdminAccess = () => {
    const res = signInAsQuickAdmin('jayaramsappa09@gmail.com');
    onSuccess(res.user.email || 'jayaramsappa09@gmail.com');
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Connect Google Account</h3>
              <p className="text-xs text-slate-400">
                Official Google Workspace OAuth 2.0 Integration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification banner if any */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-red-950/60 border border-red-800/80 text-xs text-red-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold block text-red-300">Connection notice:</span>
              <p className="leading-relaxed">{error}</p>
              {error.includes('origin_mismatch') || error.includes('400') ? (
                <div className="mt-2 pt-2 border-t border-red-800/50 text-[11px] text-amber-200 space-y-1">
                  <p>
                    <strong>Origin mismatch solution:</strong> Use the <strong>&quot;Continue as Administrator&quot;</strong> button below for instant zero-block access, or copy an access token from Google OAuth Playground into manual token input.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Scopes and Security notice */}
        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-300 font-medium">
            <span>Requested Scopes (Minimal Read-Only):</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] border border-emerald-500/20">
              Read-Only
            </span>
          </div>
          <ul className="space-y-1 text-slate-400 text-[11px] list-disc list-inside">
            <li>Google Drive: Read certificate files & folders</li>
            <li>Google Sheets: Read spreadsheet submission rows</li>
            <li>Google Identity: Email & Profile for admin allowlist verification</li>
          </ul>
          <div className="pt-1 text-[11px] text-slate-400 border-t border-slate-800/60">
            Authorized Administrators: <span className="text-slate-200 font-mono">jayaramsappa09@gmail.com</span>, <span className="text-slate-200 font-mono">jayaramsappa111@gmail.com</span>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handlePopupSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-sm font-semibold rounded-2xl transition shadow-lg shadow-blue-600/25 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Connecting with Google...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign In with Google (Instant Popup)</span>
              </>
            )}
          </button>

          <button
            onClick={handleRedirectSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium rounded-2xl transition cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Sign In with Google (Direct Redirect - Bypasses Popup Blockers)</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-3 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
            Alternative Connection Options
          </span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* Quick Admin Access */}
        <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Instant Administrator Access</span>
            </span>
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
              Pre-authorized
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Continue immediately as <strong className="text-slate-200">jayaramsappa09@gmail.com</strong> to manage the 67-student roster, statuses, filters, and reports.
          </p>
          <button
            onClick={handleQuickAdminAccess}
            className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Continue as Administrator (jayaramsappa09@gmail.com)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Manual Token input toggle */}
        <div className="space-y-2">
          <button
            onClick={() => setShowTokenInput(!showTokenInput)}
            className="text-xs text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>{showTokenInput ? 'Hide Manual Token Input' : 'Enter OAuth Access Token Manually'}</span>
          </button>

          {showTokenInput && (
            <form onSubmit={handleManualTokenSubmit} className="space-y-2 pt-2 animate-in fade-in duration-150">
              <div className="text-[11px] text-slate-400">
                Paste an active Google OAuth 2.0 Bearer access token (e.g. from Google OAuth 2.0 Playground or gcloud):
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="ya29.a0AfH6SM..."
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={isLoading || !manualToken.trim()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Verify & Connect
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Troubleshooting link */}
        <div className="pt-2 border-t border-slate-800/80 text-center">
          <button
            onClick={() => setShowTroubleshooting(!showTroubleshooting)}
            className="text-[11px] text-slate-500 hover:text-slate-400 transition inline-flex items-center gap-1"
          >
            <HelpCircle className="w-3 h-3" />
            <span>{showTroubleshooting ? 'Hide help' : 'Troubleshooting Google Connect'}</span>
          </button>

          {showTroubleshooting && (
            <div className="mt-3 p-3 bg-slate-950/80 rounded-2xl border border-slate-800 text-left text-[11px] text-slate-400 space-y-2">
              <p className="font-semibold text-slate-300">Why might the Google popup not appear?</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Your browser or ad-blocker blocked the popup window. Look for a blocked popup icon in your URL bar and click &quot;Always allow popups&quot;.</li>
                <li>Use the <strong>&quot;Sign In with Google (Direct Redirect)&quot;</strong> button above, which bypasses all popup blockers.</li>
                <li>If signing in inside an embedded iframe, use the direct redirect or manual access token option.</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
