import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Globe,
  Key,
  ExternalLink,
  CheckCircle2,
  XCircle,
  RefreshCw,
  LogIn,
  Copy,
  Check,
  Sparkles,
  Info,
  Sliders,
  Database,
} from 'lucide-react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  getSupabaseClient,
  signInWithSupabaseGoogle,
  signOutSupabase,
  getSupabaseUser,
} from '../services/supabaseClient';
import {
  getGoogleOAuthConfig,
  saveGoogleOAuthConfig,
  requestGoogleAccessTokenStandalone,
} from '../services/googleOAuthClient';

interface SupabaseGoogleOutsideConfigCardProps {
  onGoogleTokenReceived?: (accessToken: string) => void;
  userEmail?: string;
}

export const SupabaseGoogleOutsideConfigCard: React.FC<SupabaseGoogleOutsideConfigCardProps> = ({
  onGoogleTokenReceived,
  userEmail,
}) => {
  // Supabase State
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [supabaseStatus, setSupabaseStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [supabaseMessage, setSupabaseMessage] = useState<string | null>(null);
  const [supabaseUserEmail, setSupabaseUserEmail] = useState<string | null>(null);

  // Google OAuth Client ID State
  const [googleClientId, setGoogleClientId] = useState('');
  const [googleOAuthStatus, setGoogleOAuthStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [googleOAuthMessage, setGoogleOAuthMessage] = useState<string | null>(null);

  // Copy Feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Load initial settings
  useEffect(() => {
    const supaConfig = getSupabaseConfig();
    setSupabaseUrl(supaConfig.url);
    setSupabaseAnonKey(supaConfig.anonKey);

    const googConfig = getGoogleOAuthConfig();
    setGoogleClientId(googConfig.clientId);

    // Check active Supabase session
    getSupabaseUser().then((user) => {
      if (user?.email) {
        setSupabaseUserEmail(user.email);
      }
    });
  }, []);

  // Save and test Supabase
  const handleSaveAndTestSupabase = async () => {
    saveSupabaseConfig(supabaseUrl, supabaseAnonKey);
    setSupabaseStatus('testing');
    setSupabaseMessage('Connecting to Supabase instance...');

    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setSupabaseStatus('error');
      setSupabaseMessage('Both Supabase URL and Anon Key are required.');
      return;
    }

    try {
      const client = getSupabaseClient();
      if (!client) {
        setSupabaseStatus('error');
        setSupabaseMessage('Invalid Supabase configuration parameters.');
        return;
      }

      const { data, error } = await client.auth.getSession();
      if (error) {
        setSupabaseStatus('error');
        setSupabaseMessage(`Supabase connection failed: ${error.message}`);
      } else {
        setSupabaseStatus('success');
        setSupabaseMessage('Successfully connected to Supabase backend!');
        if (data.session?.user?.email) {
          setSupabaseUserEmail(data.session.user.email);
        }
      }
    } catch (err: any) {
      setSupabaseStatus('error');
      setSupabaseMessage(`Connection error: ${err.message || String(err)}`);
    }
  };

  // Sign in via Supabase Google OAuth
  const handleSupabaseGoogleLogin = async () => {
    saveSupabaseConfig(supabaseUrl, supabaseAnonKey);
    const { error } = await signInWithSupabaseGoogle();
    if (error) {
      setSupabaseStatus('error');
      setSupabaseMessage(`Supabase OAuth error: ${error.message}`);
    }
  };

  // Sign out Supabase
  const handleSupabaseLogout = async () => {
    await signOutSupabase();
    setSupabaseUserEmail(null);
    setSupabaseStatus('idle');
    setSupabaseMessage('Signed out of Supabase session.');
  };

  // Save and test Google OAuth Client ID
  const handleSaveGoogleClientId = () => {
    saveGoogleOAuthConfig(googleClientId);
    if (!googleClientId.trim()) {
      setGoogleOAuthStatus('error');
      setGoogleOAuthMessage('Please provide a valid Google OAuth Client ID.');
      return;
    }

    setGoogleOAuthStatus('success');
    setGoogleOAuthMessage('Google OAuth Client ID saved successfully!');
    setTimeout(() => setGoogleOAuthStatus('idle'), 3000);
  };

  // Trigger Standalone Google OAuth Login (GIS)
  const handleStandaloneGoogleLogin = () => {
    saveGoogleOAuthConfig(googleClientId);
    setGoogleOAuthStatus('testing');
    setGoogleOAuthMessage('Requesting Google OAuth token via GIS...');

    requestGoogleAccessTokenStandalone(
      [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/spreadsheets.readonly',
      ],
      (token) => {
        setGoogleOAuthStatus('success');
        setGoogleOAuthMessage('Google OAuth authentication successful! Access token granted.');
        if (onGoogleTokenReceived) {
          onGoogleTokenReceived(token);
        }
      },
      (err) => {
        setGoogleOAuthStatus('error');
        setGoogleOAuthMessage(`Google OAuth error: ${err.message || String(err)}`);
      }
    );
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const supabaseCallbackUrl = supabaseUrl
    ? `${supabaseUrl.replace(/\/$/, '')}/auth/v1/callback`
    : 'https://<your-project-ref>.supabase.co/auth/v1/callback';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Supabase & Standalone Google OAuth Client Integration
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-semibold">
                Outside AI Studio
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure Supabase auth backend and Google OAuth Client ID for standalone deployment
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supabase Integration Column */}
        <div className="p-5 bg-slate-950/80 border border-slate-800/90 rounded-2xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <h4 className="text-sm font-bold text-white">1. Supabase Backend Integration</h4>
            </div>
            {supabaseUserEmail && (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                Logged in: {supabaseUserEmail}
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Supabase Project URL (`VITE_SUPABASE_URL`)
              </label>
              <input
                type="text"
                placeholder="https://your-project.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Supabase Anon Key (`VITE_SUPABASE_ANON_KEY`)
              </label>
              <input
                type="password"
                placeholder="eyJhY2Nlc3NfdG9rZW4iOi..."
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            {/* Supabase Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSaveAndTestSupabase}
                disabled={supabaseStatus === 'testing'}
                className="px-3.5 py-2 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-700 text-xs font-semibold rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                {supabaseStatus === 'testing' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Save & Test Supabase</span>
              </button>

              <button
                type="button"
                onClick={handleSupabaseGoogleLogin}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign in with Google via Supabase</span>
              </button>

              {supabaseUserEmail && (
                <button
                  type="button"
                  onClick={handleSupabaseLogout}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Sign Out
                </button>
              )}
            </div>

            {/* Supabase Status Message */}
            {supabaseMessage && (
              <div
                className={`p-3 rounded-xl border text-xs font-medium flex items-start gap-2 ${
                  supabaseStatus === 'success'
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                    : supabaseStatus === 'error'
                    ? 'bg-red-950/80 text-red-300 border-red-800'
                    : 'bg-slate-900 text-slate-300 border-slate-800'
                }`}
              >
                {supabaseStatus === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : supabaseStatus === 'error' ? (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                )}
                <span>{supabaseMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Google OAuth Client ID Column */}
        <div className="p-5 bg-slate-950/80 border border-slate-800/90 rounded-2xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-400" />
              <h4 className="text-sm font-bold text-white">2. Standalone Google OAuth Client</h4>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Google Identity Services</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Google Client ID (`VITE_GOOGLE_CLIENT_ID`)
              </label>
              <input
                type="text"
                placeholder="1234567890-abcdef.apps.googleusercontent.com"
                value={googleClientId}
                onChange={(e) => setGoogleClientId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* Google OAuth Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSaveGoogleClientId}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Save Client ID
              </button>

              <button
                type="button"
                onClick={handleStandaloneGoogleLogin}
                disabled={googleOAuthStatus === 'testing'}
                className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md"
              >
                {googleOAuthStatus === 'testing' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LogIn className="w-3.5 h-3.5" />
                )}
                <span>Authorize Drive & Sheets via GIS</span>
              </button>
            </div>

            {/* Google OAuth Status Message */}
            {googleOAuthMessage && (
              <div
                className={`p-3 rounded-xl border text-xs font-medium flex items-start gap-2 ${
                  googleOAuthStatus === 'success'
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                    : googleOAuthStatus === 'error'
                    ? 'bg-red-950/80 text-red-300 border-red-800'
                    : 'bg-slate-900 text-slate-300 border-slate-800'
                }`}
              >
                {googleOAuthStatus === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : googleOAuthStatus === 'error' ? (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                )}
                <span>{googleOAuthMessage}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Deployment & Redirect URIs Reference Accordion */}
      <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3 text-xs text-slate-300">
        <div className="flex items-center justify-between font-bold text-white border-b border-slate-800/80 pb-2">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Google Cloud Console OAuth Configuration Guide (For Custom Domains & Standalone Deploys)
          </span>
        </div>

        <div className="space-y-2 font-mono text-[11px]">
          <div>
            <span className="text-slate-400 font-sans block mb-1">
              1. Authorized JavaScript Origins (Add to Google OAuth Client):
            </span>
            <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
              <code className="text-blue-300">{currentOrigin}</code>
              <button
                onClick={() => copyToClipboard(currentOrigin, 'origin')}
                className="text-slate-400 hover:text-white flex items-center gap-1"
              >
                {copiedKey === 'origin' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <span className="text-slate-400 font-sans block mb-1">
              2. Authorized Redirect URIs (Add to Google OAuth Client & Supabase Provider):
            </span>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                <code className="text-emerald-300">{supabaseCallbackUrl}</code>
                <button
                  onClick={() => copyToClipboard(supabaseCallbackUrl, 'supabase')}
                  className="text-slate-400 hover:text-white flex items-center gap-1"
                >
                  {copiedKey === 'supabase' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                <code className="text-blue-300">{currentOrigin}</code>
                <button
                  onClick={() => copyToClipboard(currentOrigin, 'redirect')}
                  className="text-slate-400 hover:text-white flex items-center gap-1"
                >
                  {copiedKey === 'redirect' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
