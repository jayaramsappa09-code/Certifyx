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
 * Fetch all student statuses from Supabase database
 */
export async function fetchStudentStatusesFromSupabase(): Promise<StudentStatusRealtimePayload[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  try {
    const { data, error } = await client
      .from('student_statuses')
      .select('*')
      .order('roll_no', { ascending: true });
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

/**
 * Batch save student statuses to Supabase Postgres database
 */
export async function saveStudentStatusesToSupabase(
  statuses: StudentStatusRealtimePayload[]
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const rows = statuses.map((s) => ({
      roll_no: s.rollNo,
      name: s.name,
      drive_uploaded: s.driveUploaded,
      sheet_updated: s.sheetUpdated,
      submitted: s.submitted,
      overall_status: s.overallStatus,
      updated_by: s.updatedBy || 'admin',
      updated_at: s.updatedAt || new Date().toISOString(),
    }));

    const { error } = await client.from('student_statuses').upsert(rows, { onConflict: 'roll_no' });
    if (error) {
      console.warn('Failed to batch upsert to Supabase student_statuses table:', error);
    }
  } catch (err) {
    console.warn('Error saving to Supabase:', err);
  }
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

