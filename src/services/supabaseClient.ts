import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

const SUPABASE_URL_STORAGE_KEY = 'ccam_supabase_url';
const SUPABASE_ANON_KEY_STORAGE_KEY = 'ccam_supabase_anon_key';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/**
 * Get current Supabase credentials (from environment variables or localStorage overrides)
 */
export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  let storedUrl = '';
  let storedKey = '';

  try {
    if (typeof localStorage !== 'undefined') {
      storedUrl = localStorage.getItem(SUPABASE_URL_STORAGE_KEY) || '';
      storedKey = localStorage.getItem(SUPABASE_ANON_KEY_STORAGE_KEY) || '';
    }
  } catch (e) {
    console.warn('localStorage is not available for reading Supabase config:', e);
  }

  return {
    url: storedUrl || envUrl || '',
    anonKey: storedKey || envKey || '',
  };
}

/**
 * Save custom Supabase credentials to localStorage
 */
export function saveSupabaseConfig(url: string, anonKey: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      if (url) localStorage.setItem(SUPABASE_URL_STORAGE_KEY, url.trim());
      else localStorage.removeItem(SUPABASE_URL_STORAGE_KEY);

      if (anonKey) localStorage.setItem(SUPABASE_ANON_KEY_STORAGE_KEY, anonKey.trim());
      else localStorage.removeItem(SUPABASE_ANON_KEY_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Failed to save Supabase config to localStorage:', e);
  }
  // Reset singleton client
  supabaseInstance = null;
}

let supabaseInstance: SupabaseClient | null = null;

/**
 * Get active Supabase client instance (or null if unconfigured)
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseInstance) return supabaseInstance;

  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  try {
    supabaseInstance = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return supabaseInstance;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Initiate Google OAuth login via Supabase (for deployment outside AI Studio)
 */
export async function signInWithSupabaseGoogle(redirectTo?: string): Promise<{ error: Error | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      error: new Error(
        'Supabase client is not configured. Please enter your Supabase URL and Anon Key in the Google & Supabase Integration tab.'
      ),
    };
  }

  try {
    const targetRedirect = redirectTo || (typeof window !== 'undefined' ? window.location.origin : '');
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: targetRedirect,
        scopes: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets.readonly',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) return { error };
    return { error: null };
  } catch (err: any) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Get current active session from Supabase
 */
export async function getSupabaseSession(): Promise<Session | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data } = await client.auth.getSession();
    return data.session;
  } catch {
    return null;
  }
}

/**
 * Get current user from Supabase
 */
export async function getSupabaseUser(): Promise<User | null> {
  const session = await getSupabaseSession();
  return session?.user || null;
}

/**
 * Sign out from Supabase
 */
export async function signOutSupabase(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    await client.auth.signOut();
  } catch (err) {
    console.error('Error signing out of Supabase:', err);
  }
}

/**
 * Listen for Supabase authentication state changes
 */
export function onSupabaseAuthStateChange(
  callback: (event: string, session: Session | null) => void
): () => void {
  const client = getSupabaseClient();
  if (!client) return () => {};

  const { data } = client.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}

/**
 * Realtime Student Status Payload Interface
 */
export interface StudentStatusRealtimePayload {
  rollNo: string;
  name?: string;
  driveUploaded?: boolean;
  sheetUpdated?: boolean;
  submitted?: boolean;
  overallStatus?: 'COMPLETED' | 'PENDING' | 'NOT STARTED' | 'UNSUBMITTED_MATCH';
  updatedBy?: string;
  updatedAt?: string;
}

/**
 * Debounce options for student status realtime broadcast & upsert
 */
export interface BroadcastDebounceOptions {
  delayMs?: number;
  immediate?: boolean;
}

const DEFAULT_STATUS_DEBOUNCE_MS = 400;

interface PendingBroadcastEntry {
  payload: StudentStatusRealtimePayload;
  timer: any;
  resolvers: Array<() => void>;
  rejecters: Array<(err: any) => void>;
}

// Map of roll number -> debounced pending broadcast entry
const pendingStatusBroadcasts = new Map<string, PendingBroadcastEntry>();

// Cached channel instance to prevent multiple channel subscriptions
let cachedBroadcastChannel: any = null;

/**
 * Low-level execution of broadcast and upsert to Supabase
 */
async function executeStudentStatusBroadcast(
  payload: StudentStatusRealtimePayload
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    // 1. Broadcast via Realtime WebSocket Channel
    let channel = cachedBroadcastChannel;
    if (!channel) {
      const existingChannels = typeof client.getChannels === 'function' ? client.getChannels() : [];
      const found = existingChannels.find((ch: any) => ch.topic === 'realtime:student_records_realtime');
      if (found) {
        channel = found;
      } else {
        channel = client.channel('student_records_realtime');
        await channel.subscribe();
      }
      cachedBroadcastChannel = channel;
    }

    try {
      await channel.send({
        type: 'broadcast',
        event: 'STUDENT_STATUS_MUTATED',
        payload,
      });
    } catch (sendErr) {
      // If channel is stale, retry once with fresh channel
      cachedBroadcastChannel = null;
      const freshChannel = client.channel('student_records_realtime');
      await freshChannel.subscribe();
      cachedBroadcastChannel = freshChannel;
      await freshChannel.send({
        type: 'broadcast',
        event: 'STUDENT_STATUS_MUTATED',
        payload,
      });
    }

    // 2. Persist/Upsert to Supabase Postgres database if table exists
    await client.from('student_statuses').upsert(
      {
        roll_no: payload.rollNo,
        name: payload.name,
        drive_uploaded: payload.driveUploaded,
        sheet_updated: payload.sheetUpdated,
        submitted: payload.submitted,
        overall_status: payload.overallStatus,
        updated_by: payload.updatedBy || 'admin',
        updated_at: payload.updatedAt || new Date().toISOString(),
      },
      { onConflict: 'roll_no' }
    );
  } catch (err) {
    // Non-blocking catch for fallback
    console.warn('Realtime broadcast/upsert warning:', err);
  }
}

/**
 * Flush all currently pending debounced broadcasts immediately
 */
export async function flushPendingStudentStatusBroadcasts(): Promise<void> {
  if (pendingStatusBroadcasts.size === 0) return;

  const entriesToFlush = Array.from(pendingStatusBroadcasts.entries());
  pendingStatusBroadcasts.clear();

  for (const [, entry] of entriesToFlush) {
    clearTimeout(entry.timer);
    try {
      await executeStudentStatusBroadcast(entry.payload);
      entry.resolvers.forEach((r) => r());
    } catch (err) {
      entry.rejecters.forEach((rej) => rej(err));
    }
  }
}

/**
 * Cancel all pending debounced broadcasts
 */
export function cancelPendingStudentStatusBroadcasts(): void {
  for (const entry of pendingStatusBroadcasts.values()) {
    clearTimeout(entry.timer);
    entry.resolvers.forEach((r) => r());
  }
  pendingStatusBroadcasts.clear();
}

/**
 * Get count of currently pending debounced broadcasts
 */
export function getPendingBroadcastCount(): number {
  return pendingStatusBroadcasts.size;
}

// Flush pending updates when window/tab is closed or refreshed
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    // Flush synchronously or best-effort
    flushPendingStudentStatusBroadcasts();
  });
}

/**
 * Broadcast student status update to all connected administrators via Supabase Realtime Broadcast & Postgres Upsert.
 * Features an intelligent per-student debouncing mechanism that merges rapid manual status toggles
 * (submitted, driveUploaded, sheetUpdated) to minimize Supabase API consumption and database upserts.
 */
export async function broadcastStudentStatusUpdate(
  payload: StudentStatusRealtimePayload,
  options?: BroadcastDebounceOptions
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  const key = (payload.rollNo || '').toUpperCase().trim();
  if (!key) return;

  // Immediate mode bypasses debounce delay
  if (options?.immediate) {
    const existing = pendingStatusBroadcasts.get(key);
    if (existing) {
      clearTimeout(existing.timer);
      pendingStatusBroadcasts.delete(key);
      payload = {
        ...existing.payload,
        ...payload,
        updatedAt: payload.updatedAt || new Date().toISOString(),
      };
      existing.resolvers.forEach((r) => r());
    }
    return executeStudentStatusBroadcast(payload);
  }

  const delayMs = options?.delayMs ?? DEFAULT_STATUS_DEBOUNCE_MS;

  return new Promise<void>((resolve, reject) => {
    const existing = pendingStatusBroadcasts.get(key);

    if (existing) {
      // Clear previous timeout and merge payloads
      clearTimeout(existing.timer);

      const mergedPayload: StudentStatusRealtimePayload = {
        ...existing.payload,
        ...payload,
        driveUploaded: payload.driveUploaded !== undefined ? payload.driveUploaded : existing.payload.driveUploaded,
        sheetUpdated: payload.sheetUpdated !== undefined ? payload.sheetUpdated : existing.payload.sheetUpdated,
        submitted: payload.submitted !== undefined ? payload.submitted : existing.payload.submitted,
        overallStatus: payload.overallStatus !== undefined ? payload.overallStatus : existing.payload.overallStatus,
        name: payload.name || existing.payload.name,
        updatedBy: payload.updatedBy || existing.payload.updatedBy,
        updatedAt: payload.updatedAt || new Date().toISOString(),
      };

      existing.payload = mergedPayload;
      existing.resolvers.push(resolve);
      existing.rejecters.push(reject);

      existing.timer = setTimeout(async () => {
        pendingStatusBroadcasts.delete(key);
        try {
          await executeStudentStatusBroadcast(existing.payload);
          existing.resolvers.forEach((r) => r());
        } catch (err) {
          existing.rejecters.forEach((rej) => rej(err));
        }
      }, delayMs);
    } else {
      const entry: PendingBroadcastEntry = {
        payload,
        resolvers: [resolve],
        rejecters: [reject],
        timer: null,
      };

      entry.timer = setTimeout(async () => {
        pendingStatusBroadcasts.delete(key);
        try {
          await executeStudentStatusBroadcast(entry.payload);
          entry.resolvers.forEach((r) => r());
        } catch (err) {
          entry.rejecters.forEach((rej) => rej(err));
        }
      }, delayMs);

      pendingStatusBroadcasts.set(key, entry);
    }
  });
}

/**
 * Generic promise timeout helper to prevent hanging requests on slow internet
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Network request timed out')), timeoutMs)
    ),
  ]);
}

/**
 * Fetch all class roster records from Supabase database
 */
export async function fetchClassRosterFromSupabase(): Promise<Array<{ rollNo: string; name: string; email?: string; phone?: string }> | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = (await withTimeout(
      client
        .from('class_roster')
        .select('*')
        .order('roll_no', { ascending: true }) as any,
      2500
    )) as any;
    if (error) {
      // Try fallback to 'students' table if class_roster isn't created yet
      try {
        const fallback = (await withTimeout(
          client.from('students').select('*').order('roll_no', { ascending: true }) as any,
          2000
        )) as any;
        if (!fallback.error && fallback.data && fallback.data.length > 0) {
          return fallback.data.map((rec: any) => ({
            rollNo: rec.roll_no || rec.rollNo,
            name: rec.name || '',
            email: rec.email,
            phone: rec.phone,
          }));
        }
      } catch {}
      return null;
    }
    return (data || []).map((rec: any) => ({
      rollNo: rec.roll_no || rec.rollNo,
      name: rec.name || '',
      email: rec.email,
      phone: rec.phone,
    }));
  } catch (err) {
    console.warn('Failed to fetch class roster from Supabase:', err);
    return null;
  }
}

/**
 * Fetch all student statuses from Supabase database
 */
export async function fetchStudentStatusesFromSupabase(): Promise<StudentStatusRealtimePayload[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = (await withTimeout(
      client
        .from('student_statuses')
        .select('*')
        .order('roll_no', { ascending: true }) as any,
      2500
    )) as any;
    if (error) {
      console.warn('Error fetching student statuses from Supabase:', error);
      return null;
    }
    return (data || []).map((rec: any) => ({
      rollNo: rec.roll_no || rec.rollNo,
      name: rec.name,
      driveUploaded: typeof rec.drive_uploaded !== 'undefined' ? rec.drive_uploaded : rec.driveUploaded,
      sheetUpdated: typeof rec.sheet_updated !== 'undefined' ? rec.sheet_updated : rec.sheetUpdated,
      submitted: typeof rec.submitted !== 'undefined' ? rec.submitted : rec.submitted,
      overallStatus: rec.overall_status || rec.overallStatus,
      updatedBy: rec.updated_by || rec.updatedBy,
      updatedAt: rec.updated_at || rec.updatedAt,
    }));
  } catch (err) {
    console.warn('Failed to fetch from Supabase:', err);
    return null;
  }
}

export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- CCAM Database Schema Setup for Supabase (Full Schema with 67-Student Seed)
-- Copy and run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. Create class_roster table (stores student roster metadata and numbers)
CREATE TABLE IF NOT EXISTS public.class_roster (
  roll_no TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create student_statuses table (stores live sync, submission and audit status)
CREATE TABLE IF NOT EXISTS public.student_statuses (
  roll_no TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  drive_uploaded BOOLEAN DEFAULT false,
  sheet_updated BOOLEAN DEFAULT false,
  submitted BOOLEAN DEFAULT false,
  overall_status TEXT DEFAULT 'NOT STARTED',
  updated_by TEXT DEFAULT 'admin',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Backward-compatibility views / aliases if needed
CREATE TABLE IF NOT EXISTS public.students (
  roll_no TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_status (
  roll_no TEXT PRIMARY KEY,
  drive_uploaded BOOLEAN DEFAULT false,
  sheet_updated BOOLEAN DEFAULT false,
  submitted BOOLEAN DEFAULT false,
  overall_status TEXT DEFAULT 'NOT STARTED',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create sync_history table
CREATE TABLE IF NOT EXISTS public.sync_history (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT now(),
  duration_ms INTEGER DEFAULT 0,
  students_checked INTEGER DEFAULT 67,
  matched_certificates INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  error_messages TEXT[]
);

-- 4. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT now(),
  action TEXT NOT NULL,
  user_email TEXT,
  details TEXT,
  category TEXT
);

-- 5. Seed exact 67-student roster and roll numbers into class_roster and student_statuses
INSERT INTO public.class_roster (roll_no, name) VALUES
('25A31A05DV', 'ADABALA NAVYA RAMYA SREE'),
('25A31A05DW', 'BEVARA PRASANTHI'),
('25A31A05DX', 'CHILLA DEEPTHI'),
('25A31A05DY', 'DORA JERIYA'),
('25A31A05DZ', 'EELI HEMA VENKATA LALITHA'),
('25A31A05EA', 'ESARAPU SATYAVENI'),
('25A31A05EB', 'GUBBALA YASASWI DEVI'),
('25A31A05EC', 'GUTTA THRAITHESHWARI'),
('25A31A05ED', 'INAKOTI BHANU CHANDINI'),
('25A31A05EE', 'KAKILETI SHINY HADASSAH'),
('25A31A05EF', 'KOTHAPALLI SWARNA MADHURI'),
('25A31A05EG', 'MADDALA LEELA RAMYA VANI'),
('25A31A05EH', 'MANGARA ELIJIBETH ROJA'),
('25A31A05EI', 'MOHAMMAD ZAHURUNNISA BEGUM'),
('25A31A05EJ', 'MORUKURTHI GOWTHAMI'),
('25A31A05EK', 'MULLAPUDI MAITRI NARMADA DEVI'),
('25A31A05EL', 'OBILISETTI VENNELA'),
('25A31A05EM', 'PATAN FATHIMA'),
('25A31A05EN', 'PEMMANABOIDI KEERTHANA'),
('25A31A05EO', 'PEMMIREDDY MOUNIKA SURYA'),
('25A31A05EP', 'PENUGONDA MOUNIKA'),
('25A31A05EQ', 'RAMIREDDY DEVI KEERTHANA'),
('25A31A05ER', 'REDNAM LAKSHMI SATHVIKA'),
('25A31A05ES', 'TALLURI JAHNAVI'),
('25A31A05ET', 'VASAMSETTI JAHNAVI DEVI'),
('25A31A05EU', 'VASAMSETTI RAMA LAKSHMI'),
('25A31A05EV', 'VELUGUBANTLA SOWMYA VIJAYA VIGNESWARI'),
('25A31A05EW', 'YANDAPALLI MOHANA LAKSHMI'),
('25A31A05EX', 'ATTULURI MANIKANTA'),
('25A31A05EY', 'CHALLA BARGAVA SATYA SAI RAKESH'),
('25A31A05EZ', 'CHETTI SURYA PAUL'),
('25A31A05FA', 'DASARI MOHITH SUBHASH'),
('25A31A05FB', 'DEVISETTI VENKATA RISHI RAJ'),
('25A31A05FC', 'DUGGIRALA HEMANTH'),
('25A31A05FD', 'GANAPABATHULA SUPRADEEP'),
('25A31A05FE', 'GANNI VENKAT'),
('25A31A05FF', 'GONELA MOHAN SAI KIRAN'),
('25A31A05FG', 'GOPALADASU DURGA AJAY KUMAR'),
('25A31A05FH', 'GUDURI HARI NAGA CHANDRA HANISH'),
('25A31A05FI', 'GUMMADI PRUDVIRAJ'),
('25A31A05FJ', 'GUMMALLA VEERA MANIKANTA VIVEK'),
('25A31A05FK', 'JETTY ASHER JOSEPH'),
('25A31A05FL', 'JYOTHULA MANIDEEP'),
('25A31A05FM', 'KALLA TEJOMAYA'),
('25A31A05FN', 'KATARI DATTA PAVAN SAI KRISHNA'),
('25A31A05FO', 'KONDETI SATYA BHIMA SANKARA SAINADH'),
('25A31A05FP', 'KOPPANATHI BABI'),
('25A31A05FQ', 'LELLA BHARGAV'),
('25A31A05FR', 'MADAKAM LAKSHMAN LOKESH'),
('25A31A05FS', 'MANDELA VENKATESH'),
('25A31A05FT', 'MUMMIDI PAVAN SURYA CHAITANYA'),
('25A31A05FU', 'MUMMIDI VENKATA BAPANNA SATYA PAVAN'),
('25A31A05FV', 'NATHIPAM SRINIVAS'),
('25A31A05FW', 'NEELAPALA SATYA SUDHEER'),
('25A31A05FX', 'PEDAPATI SAI MALLIKHARJUN'),
('25A31A05FY', 'PERURI SAI NIKHIL'),
('25A31A05FZ', 'ROHITH S S SURYANARAYANA DEVUNI'),
('25A31A05GA', 'SALADI G S NAGA VENKATA RATNA SAIRAM'),
('25A31A05GB', 'SAPPA JAYARAM SIVA PRASAD'),
('25A31A05GC', 'SASUBILLI SASANK MANINDHAR'),
('25A31A05GD', 'TAVVA KISHORE'),
('25A31A05GE', 'TELU MALLIKARJUN'),
('25A31A05GF', 'VADDI SHAUN AJIT'),
('25A31A05GG', 'VANAMALI SIVA NAGA SATYA NARASIMHA'),
('25A31A05GH', 'VASAMSETTI PRUDHVI'),
('25A31A05GI', 'YALLA ARYA')
ON CONFLICT (roll_no) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO public.student_statuses (roll_no, name, submitted, drive_uploaded, sheet_updated, overall_status)
SELECT roll_no, name, false, false, false, 'NOT STARTED'
FROM public.class_roster
ON CONFLICT (roll_no) DO NOTHING;

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.class_roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 7. Configure Permissive RLS Policies for Anon & Authenticated Access
DROP POLICY IF EXISTS "Public access on class_roster" ON public.class_roster;
CREATE POLICY "Public access on class_roster" ON public.class_roster FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on student_statuses" ON public.student_statuses;
CREATE POLICY "Public access on student_statuses" ON public.student_statuses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on students" ON public.students;
CREATE POLICY "Public access on students" ON public.students FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on student_status" ON public.student_status;
CREATE POLICY "Public access on student_status" ON public.student_status FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on sync_history" ON public.sync_history;
CREATE POLICY "Public access on sync_history" ON public.sync_history FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on audit_logs" ON public.audit_logs;
CREATE POLICY "Public access on audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- 8. Enable Realtime Publications for live cross-admin syncing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'student_statuses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.student_statuses;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'class_roster'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.class_roster;
  END IF;
END $$;
`;

export interface SupabaseHealthReport {
  configured: boolean;
  tableExists: boolean;
  statusRowCount: number;
  rosterRowCount: number;
  historyRowCount: number;
  tables: {
    student_statuses: boolean;
    class_roster: boolean;
    sync_history: boolean;
    audit_logs: boolean;
  };
  error: string | null;
}

/**
 * Check if the Supabase Postgres tables are configured and queryable
 */
export async function checkSupabaseTableHealth(): Promise<SupabaseHealthReport> {
  const client = getSupabaseClient();
  if (!client) {
    return {
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
      error: 'Supabase URL or Anon Key is not configured. Please enter them in Google & Supabase Integration.',
    };
  }

  const report: SupabaseHealthReport = {
    configured: true,
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
  };

  try {
    // Check student_statuses
    const { count: statusCount, error: statusErr } = await client
      .from('student_statuses')
      .select('*', { count: 'exact', head: true });
    
    if (!statusErr) {
      report.tables.student_statuses = true;
      report.statusRowCount = statusCount || 0;
    }

    // Check class_roster
    const { count: rosterCount, error: rosterErr } = await client
      .from('class_roster')
      .select('*', { count: 'exact', head: true });
    
    if (!rosterErr) {
      report.tables.class_roster = true;
      report.rosterRowCount = rosterCount || 0;
    }

    // Check sync_history
    const { count: historyCount, error: historyErr } = await client
      .from('sync_history')
      .select('*', { count: 'exact', head: true });
    
    if (!historyErr) {
      report.tables.sync_history = true;
      report.historyRowCount = historyCount || 0;
    }

    // Check audit_logs
    const { error: logsErr } = await client
      .from('audit_logs')
      .select('*', { count: 'exact', head: true });
    
    if (!logsErr) {
      report.tables.audit_logs = true;
    }

    if (report.tables.student_statuses || report.tables.class_roster) {
      report.tableExists = true;
    } else {
      report.tableExists = false;
      report.error =
        'Tables not found in Supabase. Please copy and execute the SQL Schema in your Supabase SQL Editor to create tables and seed 67 student numbers.';
    }

    return report;
  } catch (err: any) {
    return {
      ...report,
      error: err.message || 'Failed to connect to Supabase database',
    };
  }
}

/**
 * Save / Upsert Class Roster numbers and students to Supabase Postgres database
 */
export async function saveClassRosterToSupabase(
  students: Array<{ rollNo: string; name: string; email?: string; phone?: string; isActive?: boolean }>
): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, count: 0, error: 'Supabase is not configured' };
  }
  if (!students || students.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    const rows = students.map((s) => ({
      roll_no: s.rollNo.toUpperCase().trim(),
      name: s.name.trim(),
      email: s.email || null,
      phone: s.phone || null,
      is_active: s.isActive !== undefined ? s.isActive : true,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await client.from('class_roster').upsert(rows, { onConflict: 'roll_no' });
    if (error) {
      // Also attempt fallback to students table
      try {
        await client.from('students').upsert(
          rows.map((r) => ({ roll_no: r.roll_no, name: r.name })),
          { onConflict: 'roll_no' }
        );
      } catch {}

      if (error.code === '42P01') {
        return {
          success: false,
          count: 0,
          error: 'Table "class_roster" does not exist in Supabase. Please run the SQL schema script in Supabase SQL Editor.',
        };
      }
      return { success: false, count: 0, error: error.message };
    }

    return { success: true, count: rows.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || 'Failed to save class roster to Supabase' };
  }
}

/**
 * Batch save student statuses to Supabase Postgres database with detailed result report
 */
export async function saveStudentStatusesToSupabase(
  statuses: StudentStatusRealtimePayload[]
): Promise<{ success: boolean; count: number; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, count: 0, error: 'Supabase is not configured' };
  }
  if (!statuses || statuses.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    const rows = statuses.map((s) => ({
      roll_no: s.rollNo.toUpperCase().trim(),
      name: s.name || '',
      drive_uploaded: Boolean(s.driveUploaded),
      sheet_updated: Boolean(s.sheetUpdated),
      submitted: Boolean(s.submitted),
      overall_status: s.overallStatus || 'NOT STARTED',
      updated_by: s.updatedBy || 'admin',
      updated_at: s.updatedAt || new Date().toISOString(),
    }));

    const { error } = await client.from('student_statuses').upsert(rows, { onConflict: 'roll_no' });
    if (error) {
      // Fallback try student_status
      try {
        await client.from('student_status').upsert(
          rows.map((r) => ({
            roll_no: r.roll_no,
            drive_uploaded: r.drive_uploaded,
            sheet_updated: r.sheet_updated,
            submitted: r.submitted,
            overall_status: r.overall_status,
          })),
          { onConflict: 'roll_no' }
        );
      } catch {}

      if (error.code === '42P01') {
        return {
          success: false,
          count: 0,
          error: 'Table "student_statuses" does not exist in Supabase. Please run the SQL setup script in Supabase SQL Editor.',
        };
      }
      return { success: false, count: 0, error: error.message };
    }
    return { success: true, count: rows.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || 'Failed to save to Supabase' };
  }
}

/**
 * Save complete application state (roster numbers, statuses, logs, history) to Supabase in one comprehensive operation
 */
export async function pushFullDatabaseToSupabase(options: {
  roster: Array<{ rollNo: string; name: string }>;
  statuses: StudentStatusRealtimePayload[];
  userEmail?: string;
}): Promise<{
  success: boolean;
  rosterCount: number;
  statusCount: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let rosterCount = 0;
  let statusCount = 0;

  // 1. Save Roster
  const rosterRes = await saveClassRosterToSupabase(options.roster);
  if (rosterRes.success) {
    rosterCount = rosterRes.count;
  } else if (rosterRes.error) {
    errors.push(`Roster: ${rosterRes.error}`);
  }

  // 2. Save Statuses
  const statusRes = await saveStudentStatusesToSupabase(options.statuses);
  if (statusRes.success) {
    statusCount = statusRes.count;
  } else if (statusRes.error) {
    errors.push(`Statuses: ${statusRes.error}`);
  }

  return {
    success: errors.length === 0,
    rosterCount,
    statusCount,
    errors,
  };
}

export const supabase = getSupabaseClient();

/**
 * Subscribe to Supabase Realtime Postgres Changes & Realtime Channel Broadcasts
 * Automatically updates dashboard statuses whenever another administrator modifies student record data.
 */
export function subscribeToStudentStatusesRealtime(
  onUpdateReceived: (payload: StudentStatusRealtimePayload) => void,
  onStatusChange?: (status: string) => void
): { unsubscribe: () => void; broadcast: (payload: StudentStatusRealtimePayload) => void } {
  const client = getSupabaseClient();

  if (!client) {
    onStatusChange?.('UNCONFIGURED');
    return {
      unsubscribe: () => {},
      broadcast: () => {},
    };
  }

  const channel = client
    .channel('student_records_realtime', {
      config: {
        broadcast: { ack: true, self: false },
      },
    })
    // 1. Listen for Postgres DB Table Modifications (INSERT / UPDATE)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'student_statuses',
      },
      (payload: any) => {
        if (payload.new) {
          const rec = payload.new;
          onUpdateReceived({
            rollNo: rec.roll_no || rec.rollNo,
            name: rec.name,
            driveUploaded: typeof rec.drive_uploaded !== 'undefined' ? rec.drive_uploaded : rec.driveUploaded,
            sheetUpdated: typeof rec.sheet_updated !== 'undefined' ? rec.sheet_updated : rec.sheetUpdated,
            submitted: typeof rec.submitted !== 'undefined' ? rec.submitted : rec.submitted,
            overallStatus: rec.overall_status || rec.overallStatus,
            updatedBy: rec.updated_by || rec.updatedBy,
            updatedAt: rec.updated_at || rec.updatedAt,
          });
        }
      }
    )
    // 2. Listen for Realtime Broadcast Events sent by other admins
    .on('broadcast', { event: 'STUDENT_STATUS_MUTATED' }, (res: any) => {
      if (res.payload?.rollNo) {
        onUpdateReceived(res.payload);
      }
    })
    .subscribe((status) => {
      onStatusChange?.(status);
    });

  return {
    unsubscribe: () => {
      try {
        client.removeChannel(channel);
      } catch (e) {
        console.error('Error removing channel:', e);
      }
    },
    broadcast: (payload: StudentStatusRealtimePayload) => {
      channel.send({
        type: 'broadcast',
        event: 'STUDENT_STATUS_MUTATED',
        payload,
      });
    },
  };
}

/**
 * Upload certificate file to Supabase Storage bucket 'student-certificates'
 * Custom paths are organized per student roll number.
 */
export async function uploadCertificateFileToSupabase(
  file: File,
  rollNo: string,
  certType: string
): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) {
    console.warn('Supabase is not configured; skipping storage upload.');
    return null;
  }

  const cleanRollNo = rollNo.toUpperCase().trim();
  const cleanCertType = certType.replace(/[^a-zA-Z0-9]/g, '_');
  const timestamp = Date.now();
  const fileExtension = file.name.split('.').pop() || 'pdf';
  const filePath = `${cleanRollNo}/${cleanCertType}_${timestamp}.${fileExtension}`;

  try {
    // 1. Check or initialize bucket (ignore if already exists or fails)
    try {
      await client.storage.createBucket('student-certificates', {
        public: true,
        allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        fileSizeLimit: 10485760, // 10MB
      });
    } catch {
      // Bucket likely already exists, swallow
    }

    // 2. Upload file
    const { error: uploadError } = await client.storage
      .from('student-certificates')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return null;
    }

    // 3. Retrieve public URL
    const { data } = client.storage
      .from('student-certificates')
      .getPublicUrl(filePath);

    return data?.publicUrl || null;
  } catch (err) {
    console.error('Failed to upload file to Supabase Storage:', err);
    return null;
  }
}

/**
 * List all uploaded files for a specific student's roll number from Supabase Storage
 */
export async function listUploadedCertificatesForStudent(
  rollNo: string
): Promise<Array<{ name: string; url: string; size: number; uploadedAt: string }> | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const cleanRollNo = rollNo.toUpperCase().trim();

  try {
    const { data: files, error } = await client.storage
      .from('student-certificates')
      .list(cleanRollNo, {
        limit: 100,
        sortBy: { column: 'name', order: 'desc' },
      });

    if (error) {
      console.warn('Failed to list files from Supabase Storage:', error);
      return null;
    }

    if (!files) return [];

    return files.map((file) => {
      const { data } = client.storage
        .from('student-certificates')
        .getPublicUrl(`${cleanRollNo}/${file.name}`);

      return {
        name: file.name,
        url: data?.publicUrl || '',
        size: file.metadata?.size || 0,
        uploadedAt: file.created_at || new Date().toISOString(),
      };
    });
  } catch (err) {
    console.error('Error listing files from Supabase:', err);
    return null;
  }
}

/**
 * Delete student status from Supabase database 'student_statuses' table
 */
export async function deleteStudentStatusFromSupabase(rollNo: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const cleanRollNo = rollNo.toUpperCase().trim();
    await client.from('student_statuses').delete().eq('roll_no', cleanRollNo);
  } catch (err) {
    console.warn('Failed to delete student status from Supabase:', err);
  }
}

