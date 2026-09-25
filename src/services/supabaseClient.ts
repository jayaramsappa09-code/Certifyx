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

  const storedUrl = typeof localStorage !== 'undefined' ? localStorage.getItem(SUPABASE_URL_STORAGE_KEY) || '' : '';
  const storedKey = typeof localStorage !== 'undefined' ? localStorage.getItem(SUPABASE_ANON_KEY_STORAGE_KEY) || '' : '';

  return {
    url: storedUrl || envUrl || '',
    anonKey: storedKey || envKey || '',
  };
}

/**
 * Save custom Supabase credentials to localStorage
 */
export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (typeof localStorage !== 'undefined') {
    if (url) localStorage.setItem(SUPABASE_URL_STORAGE_KEY, url.trim());
    else localStorage.removeItem(SUPABASE_URL_STORAGE_KEY);

    if (anonKey) localStorage.setItem(SUPABASE_ANON_KEY_STORAGE_KEY, anonKey.trim());
    else localStorage.removeItem(SUPABASE_ANON_KEY_STORAGE_KEY);
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
  overallStatus?: 'COMPLETED' | 'PENDING' | 'NOT STARTED';
  updatedBy?: string;
  updatedAt?: string;
}

/**
 * Broadcast student status update to all connected administrators via Supabase Realtime Broadcast & Postgres Upsert
 */
export async function broadcastStudentStatusUpdate(
  payload: StudentStatusRealtimePayload
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    // 1. Broadcast via Realtime WebSocket Channel
    const channel = client.channel('student_records_realtime');
    await channel.subscribe();
    await channel.send({
      type: 'broadcast',
      event: 'STUDENT_STATUS_MUTATED',
      payload,
    });

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

