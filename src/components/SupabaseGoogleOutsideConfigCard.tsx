import React, { useState, useEffect } from 'react';
import {
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
  Database,
  Terminal,
  UploadCloud,
  Layers,
  AlertTriangle,
  Code,
} from 'lucide-react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  getSupabaseClient,
  signInWithSupabaseGoogle,
  signOutSupabase,
  getSupabaseUser,
  checkSupabaseTableHealth,
  saveStudentStatusesToSupabase,
  saveClassRosterToSupabase,
  pushFullDatabaseToSupabase,
  SupabaseHealthReport,
  SUPABASE_SQL_SCHEMA,
} from '../services/supabaseClient';
import {
  getGoogleOAuthConfig,
  saveGoogleOAuthConfig,
  requestGoogleAccessTokenStandalone,
} from '../services/googleOAuthClient';
import { FIXED_CLASS_ROSTER } from '../data/classRoster';
import { getSubmittedStatusMap, getDriveStatusOverrideMap, getSheetStatusOverrideMap } from '../services/storageService';

interface SupabaseGoogleOutsideConfigCardProps {
  onGoogleTokenReceived?: (accessToken: string) => void;
  userEmail?: string;
  onToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const SupabaseGoogleOutsideConfigCard: React.FC<SupabaseGoogleOutsideConfigCardProps> = ({
  onGoogleTokenReceived,
  userEmail,
  onToast,
}) => {
  // Supabase State
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [supabaseStatus, setSupabaseStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [supabaseMessage, setSupabaseMessage] = useState<string | null>(null);
  const [supabaseUserEmail, setSupabaseUserEmail] = useState<string | null>(null);

  // Table Health & Data Push State
  const [tableHealth, setTableHealth] = useState<SupabaseHealthReport & { tested: boolean }>({
    tested: false,
    configured: false,
    tableExists: false,
    statusRowCount: 0,
    rosterRowCount: 0,
    historyRowCount: 0,
    tables: {
      student_statuses: false,
      class_roster: false,
      sync_history: false,
      audit_logs: false,
    },
    error: null,
  });
  const [isCheckingTable, setIsCheckingTable] = useState(false);
  const [isPushingData, setIsPushingData] = useState(false);
  const [showSqlSchema, setShowSqlSchema] = useState(false);

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

    // Check active Supabase session & table health if configured
    if (supaConfig.url && supaConfig.anonKey) {
      getSupabaseUser().then((user) => {
        if (user?.email) {
          setSupabaseUserEmail(user.email);
        }
      });
      runTableCheck();
    }
  }, []);

  const runTableCheck = async () => {
    setIsCheckingTable(true);
    try {
      const res = await checkSupabaseTableHealth();
      setTableHealth({
        ...res,
        tested: true,
      });
      if (res.tableExists) {
        setSupabaseStatus('success');
        setSupabaseMessage(`Connected to Supabase! Roster: ${res.rosterRowCount} students • Statuses: ${res.statusRowCount} records.`);
      } else if (res.configured) {
        setSupabaseStatus('error');
        setSupabaseMessage(res.error || 'Tables not created yet in Supabase. Please run the SQL schema.');
      }
    } catch (e: any) {
      setTableHealth((prev) => ({
        ...prev,
        tested: true,
        tableExists: false,
        error: e.message || 'Error checking tables',
      }));
    } finally {
      setIsCheckingTable(false);
    }
  };

  // Save and test Supabase
  const handleSaveAndTestSupabase = async () => {
    saveSupabaseConfig(supabaseUrl, supabaseAnonKey);
    setSupabaseStatus('testing');
    setSupabaseMessage('Connecting to Supabase instance and testing database tables...');

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

      await runTableCheck();
    } catch (err: any) {
      setSupabaseStatus('error');
      setSupabaseMessage(`Connection error: ${err.message || String(err)}`);
    }
  };

  // Push all current student numbers and records to Supabase
  const handlePushAllDataToSupabase = async () => {
    setIsPushingData(true);
    try {
      const subMap = getSubmittedStatusMap();
      const driveMap = getDriveStatusOverrideMap();
      const sheetMap = getSheetStatusOverrideMap();

      const statuses = FIXED_CLASS_ROSTER.map((s) => {
        const r = s.rollNo.toUpperCase().trim();
        const submitted = subMap[r] ?? false;
        const driveUploaded = driveMap[r] ?? false;
        const sheetUpdated = sheetMap[r] ?? false;

        let overallStatus: 'COMPLETED' | 'PENDING' | 'NOT STARTED' = 'NOT STARTED';
        if (driveUploaded && sheetUpdated && submitted) overallStatus = 'COMPLETED';
        else if (driveUploaded || sheetUpdated || submitted) overallStatus = 'PENDING';
        else overallStatus = 'NOT STARTED';

        return {
          rollNo: r,
          name: s.name,
          driveUploaded,
          sheetUpdated,
          submitted,
          overallStatus,
          updatedBy: userEmail || 'admin',
          updatedAt: new Date().toISOString(),
        };
      });

      const res = await pushFullDatabaseToSupabase({
        roster: FIXED_CLASS_ROSTER.map((s) => ({ rollNo: s.rollNo, name: s.name })),
        statuses,
        userEmail: userEmail || 'admin',
      });

      if (res.success) {
        onToast?.(`🎉 Successfully stored ${res.rosterCount} roster numbers & ${res.statusCount} statuses in Supabase!`, 'success');
        setSupabaseMessage(`Successfully saved ${res.rosterCount} class roster numbers and ${res.statusCount} student statuses into Supabase tables.`);
        runTableCheck();
      } else {
        const errMsg = res.errors.join(' | ');
        onToast?.(`Error storing to Supabase: ${errMsg}`, 'error');
        setSupabaseMessage(`Error saving records: ${errMsg}`);
        if (errMsg.includes('does not exist')) {
          setShowSqlSchema(true);
        }
      }
    } catch (err: any) {
      onToast?.(`Failed to push data: ${err.message}`, 'error');
    } finally {
      setIsPushingData(false);
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
              Connect Supabase Postgres database to persist student numbers & synchronize live statuses
            </p>
          </div>
        </div>
      </div>

      {/* Supabase Diagnostic & Solution Banner */}
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white flex items-center flex-wrap gap-2">
                <span>Supabase Database Health:</span>
                {tableHealth.tested ? (
                  tableHealth.tableExists ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Tables Active ({tableHealth.rosterRowCount} Roster, {tableHealth.statusRowCount} Statuses)</span>
                    </span>
                  ) : (
                    <span className="text-rose-400 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Tables Missing from Supabase</span>
                    </span>
                  )
                ) : (
                  <span className="text-slate-400 font-normal">Not tested yet</span>
                )}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {tableHealth.tableExists
                  ? 'All student numbers, roster, and live reconciliation statuses are actively syncing to your Supabase database.'
                  : 'If no tables or student numbers appear in Supabase, copy the SQL Schema script below and click Run in your Supabase SQL Editor.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={runTableCheck}
              disabled={isCheckingTable}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
            >
              {isCheckingTable ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>Verify Table Health</span>
            </button>

            <button
              type="button"
              onClick={handlePushAllDataToSupabase}
              disabled={isPushingData || !supabaseUrl.trim() || !supabaseAnonKey.trim()}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              {isPushingData ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
              <span>Push All 67+ Numbers to Supabase</span>
            </button>
          </div>
        </div>

        {/* Table Matrix Badges */}
        {tableHealth.tested && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-900">
            <div className={`p-2 rounded-xl border flex flex-col ${tableHealth.tables.class_roster ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-rose-950/30 border-rose-800/40 text-rose-300'}`}>
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Table: class_roster</span>
              <span className="text-xs font-bold mt-0.5">{tableHealth.tables.class_roster ? `✅ ${tableHealth.rosterRowCount} Students` : '❌ Missing'}</span>
            </div>
            <div className={`p-2 rounded-xl border flex flex-col ${tableHealth.tables.student_statuses ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-rose-950/30 border-rose-800/40 text-rose-300'}`}>
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Table: student_statuses</span>
              <span className="text-xs font-bold mt-0.5">{tableHealth.tables.student_statuses ? `✅ ${tableHealth.statusRowCount} Statuses` : '❌ Missing'}</span>
            </div>
            <div className={`p-2 rounded-xl border flex flex-col ${tableHealth.tables.sync_history ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-slate-900/60 border-slate-800 text-slate-400'}`}>
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Table: sync_history</span>
              <span className="text-xs font-bold mt-0.5">{tableHealth.tables.sync_history ? `✅ ${tableHealth.historyRowCount} Runs` : '⚪ Idle'}</span>
            </div>
            <div className={`p-2 rounded-xl border flex flex-col ${tableHealth.tables.audit_logs ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-slate-900/60 border-slate-800 text-slate-400'}`}>
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Table: audit_logs</span>
              <span className="text-xs font-bold mt-0.5">{tableHealth.tables.audit_logs ? '✅ Active' : '⚪ Idle'}</span>
            </div>
          </div>
        )}

        {/* Database Table Setup SQL Accordion */}
        <div className="pt-2 border-t border-slate-900">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowSqlSchema((prev) => !prev)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Code className="w-4 h-4" />
              <span>{showSqlSchema ? 'Hide Database Setup SQL' : 'View & Copy 1-Click Database Setup SQL Script'}</span>
            </button>

            <a
              href="https://supabase.com/dashboard/project/_/sql"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <span>Open Supabase SQL Editor</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {showSqlSchema && (
            <div className="mt-3 p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs animate-in fade-in">
              <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
                <span className="font-mono text-[11px] text-slate-300 font-bold flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  Supabase PostgreSQL Migration Script (Creates tables & permissions)
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(SUPABASE_SQL_SCHEMA, 'schema')}
                  className="px-2.5 py-1 bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  {copiedKey === 'schema' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'schema' ? 'Copied!' : 'Copy SQL Script'}</span>
                </button>
              </div>

              <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 font-mono text-[11px] text-slate-300 max-h-60 overflow-y-auto select-all leading-relaxed">
                {SUPABASE_SQL_SCHEMA}
              </pre>

              <p className="text-[11px] text-slate-400">
                💡 <strong>Instructions:</strong> Open your Supabase Dashboard &gt; <strong>SQL Editor</strong> &gt; Click <strong>New Query</strong> &gt; Paste this script &gt; Click <strong>Run</strong>. Then click <strong>"Verify Table Health"</strong> above!
              </p>
            </div>
          )}
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

          {/* Prompt / Error Mismatch Warning Helper */}
          <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs space-y-2 text-amber-200">
            <h5 className="font-bold flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Resolving "Error 400: origin_mismatch" / policy compliance</span>
            </h5>
            <p className="text-[11px] leading-relaxed">
              Google blocks authentication if your current app URL is not listed as an <strong>Authorized JavaScript Origin</strong> in Google Cloud Console. To fix this:
            </p>
            <ol className="list-decimal pl-4 text-[11px] space-y-1 font-sans">
              <li>Go to the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300">Google Cloud Credentials Console</a>.</li>
              <li>Edit your OAuth 2.0 Client ID.</li>
              <li>Under <strong>Authorized JavaScript origins</strong>, add your current domain below:</li>
            </ol>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex items-center justify-between font-mono text-[10px] mt-1 text-slate-300 select-all">
              <span>{currentOrigin}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(currentOrigin, 'origin')}
                className="text-slate-400 hover:text-white shrink-0 ml-2 cursor-pointer"
                title="Copy current origin"
              >
                {copiedKey === 'origin' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
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
                type="button"
                onClick={() => copyToClipboard(currentOrigin, 'origin')}
                className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
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
                  type="button"
                  onClick={() => copyToClipboard(supabaseCallbackUrl, 'supabase')}
                  className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'supabase' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex items-center justify-between bg-slate-900 p-2 rounded-lg border border-slate-800">
                <code className="text-blue-300">{currentOrigin}</code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(currentOrigin, 'redirect')}
                  className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
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
