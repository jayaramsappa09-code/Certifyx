import { getSupabaseClient } from './supabaseClient';
import { AuthUser } from '../types';

// In-memory access token cache
let cachedAccessToken: string | null = null;
let cachedAuthUser: AuthUser | null = null;

// Subscribers for auth state change
type AuthListener = (user: AuthUser | null, token: string | null) => void;
const authListeners: Set<AuthListener> = new Set();

function notifyAuthListeners() {
  authListeners.forEach((listener) => {
    try {
      listener(cachedAuthUser, cachedAccessToken);
    } catch (e) {
      console.error('Error in auth listener:', e);
    }
  });
}

// Default Admin allowlist containing the user
export const DEFAULT_ADMIN_EMAILS: string[] = [
  'jayaramsappa09@gmail.com',
  'jayaramsappa111@gmail.com',
];

/**
 * Checks if the user email is on the authorized administrator allowlist
 */
export function isAuthorizedAdmin(
  email: string | null | undefined,
  customAllowlist?: string[]
): boolean {
  if (!email) return false;
  const normalizedEmail = email.trim().toLowerCase();
  const allowlist =
    customAllowlist && customAllowlist.length > 0
      ? customAllowlist.map((e) => e.trim().toLowerCase())
      : DEFAULT_ADMIN_EMAILS.map((e) => e.trim().toLowerCase());

  return allowlist.includes(normalizedEmail);
}

// Dummy client ID to keep imports intact
export const GOOGLE_CLIENT_ID = 'supa-oauth';

// Required Google Workspace scopes
export const REQUIRED_WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'openid',
].join(' ');

/**
 * Dummy GIS loaded checker
 */
export function ensureGsiLoaded(): Promise<boolean> {
  return Promise.resolve(false);
}

/**
 * Fetch Google User Profile using OAuth 2.0 access token
 */
export async function fetchGoogleUserProfile(token: string): Promise<AuthUser> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Failed to fetch user profile (${res.status}): ${errText || res.statusText}`);
  }

  const data = await res.json();
  return {
    uid: data.sub || data.id || 'google-user',
    email: data.email || null,
    displayName: data.name || data.given_name || (data.email ? data.email.split('@')[0] : 'Administrator'),
    photoURL: data.picture || null,
    emailVerified: data.email_verified ?? true,
  };
}

/**
 * Initialize Auth state listener using Supabase Auth state change
 */
export function initAuth(
  onAuthSuccess?: (user: AuthUser, token: string | null) => void,
  onAuthFailure?: (error?: string) => void
) {
  const client = getSupabaseClient();
  if (!client) {
    // Check sessionStorage as fallback for local mock admin or unconfigured client
    try {
      const storedUser = sessionStorage.getItem('ccam_auth_user');
      const storedToken = sessionStorage.getItem('ccam_auth_token');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        cachedAuthUser = parsedUser;
        cachedAccessToken = storedToken || null;
        if (onAuthSuccess) onAuthSuccess(parsedUser, storedToken || null);
        return () => {};
      }
    } catch {}

    if (onAuthFailure) onAuthFailure('Supabase client not configured.');
    return () => {};
  }

  // 1. Instantly check current session on initialization
  client.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      const authUser: AuthUser = {
        uid: session.user.id,
        email: session.user.email || null,
        displayName: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email || 'Administrator',
        photoURL: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
        emailVerified: session.user.user_metadata?.email_verified ?? true,
      };

      // Provider token represents the Google access token passed by Supabase on successful login/redirect
      const token = session.provider_token || session.access_token || null;
      
      // Load cached token from session if provider_token is null in secondary session calls
      const storedToken = sessionStorage.getItem('ccam_auth_token');
      const resolvedToken = token || storedToken || null;

      cachedAccessToken = resolvedToken;
      cachedAuthUser = authUser;

      // Persist in session storage
      try {
        sessionStorage.setItem('ccam_auth_user', JSON.stringify(authUser));
        if (resolvedToken) {
          sessionStorage.setItem('ccam_auth_token', resolvedToken);
          sessionStorage.setItem('ccam_auth_token_saved_at', String(Date.now()));
        }
      } catch {}

      notifyAuthListeners();
      if (onAuthSuccess) onAuthSuccess(authUser, resolvedToken);
    } else {
      // Check sessionStorage for mock quick-admin
      try {
        const storedUser = sessionStorage.getItem('ccam_auth_user');
        const storedToken = sessionStorage.getItem('ccam_auth_token');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          cachedAuthUser = parsedUser;
          cachedAccessToken = storedToken || null;
          if (onAuthSuccess) onAuthSuccess(parsedUser, storedToken || null);
          return;
        }
      } catch {}

      if (onAuthFailure) onAuthFailure();
    }
  });

  // 2. Set up live auth listener for redirect callbacks and logins
  const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
    if (session) {
      const authUser: AuthUser = {
        uid: session.user.id,
        email: session.user.email || null,
        displayName: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email || 'Administrator',
        photoURL: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
        emailVerified: session.user.user_metadata?.email_verified ?? true,
      };

      const token = session.provider_token || session.access_token || null;
      const storedToken = sessionStorage.getItem('ccam_auth_token');
      const resolvedToken = token || storedToken || null;

      cachedAccessToken = resolvedToken;
      cachedAuthUser = authUser;

      try {
        sessionStorage.setItem('ccam_auth_user', JSON.stringify(authUser));
        if (resolvedToken) {
          sessionStorage.setItem('ccam_auth_token', resolvedToken);
          sessionStorage.setItem('ccam_auth_token_saved_at', String(Date.now()));
        }
      } catch {}

      notifyAuthListeners();
      if (onAuthSuccess) onAuthSuccess(authUser, resolvedToken);
    } else {
      // Check sessionStorage for mock quick-admin
      try {
        const storedUser = sessionStorage.getItem('ccam_auth_user');
        const storedToken = sessionStorage.getItem('ccam_auth_token');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          cachedAuthUser = parsedUser;
          cachedAccessToken = storedToken || null;
          if (onAuthSuccess) onAuthSuccess(parsedUser, storedToken || null);
          return;
        }
      } catch {}

      cachedAccessToken = null;
      cachedAuthUser = null;
      notifyAuthListeners();
      if (onAuthFailure) onAuthFailure();
    }
  });

  const listener: AuthListener = (user, token) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, token);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  };
  authListeners.add(listener);

  return () => {
    subscription.unsubscribe();
    authListeners.delete(listener);
  };
}

/**
 * Initiates standard Supabase Google OAuth sign-in flow
 */
export async function googleSignIn(): Promise<{ user: AuthUser; accessToken: string }> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      'Supabase client is not configured. Please enter your Supabase URL and Anon Key in the Google & Supabase Integration tab.'
    );
  }

  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const targetRedirect = isLocal ? 'http://localhost:5173' : 'https://certifverify.vercel.app';

  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: targetRedirect,
      scopes: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw error;
  }

  // Redirect is instantaneous. We return a pending promise to satisfy typing.
  return new Promise(() => {});
}

/**
 * Direct redirect logic for redirect button (it does exactly what googleSignIn does)
 */
export function signInWithGoogleRedirect(): void {
  googleSignIn().catch((err) => {
    console.error('Redirect sign in error:', err);
  });
}

/**
 * Allows connecting with a manually provided Google access token
 */
export async function signInWithDirectToken(
  token: string
): Promise<{ user: AuthUser; accessToken: string }> {
  const trimmed = token.trim();
  if (!trimmed) {
    throw new Error('Please enter a valid Google OAuth access token.');
  }

  const user = await fetchGoogleUserProfile(trimmed);
  cachedAccessToken = trimmed;
  cachedAuthUser = user;

  try {
    sessionStorage.setItem('ccam_auth_user', JSON.stringify(user));
    sessionStorage.setItem('ccam_auth_token', trimmed);
    sessionStorage.setItem('ccam_auth_token_saved_at', String(Date.now()));
  } catch {}

  notifyAuthListeners();
  return { user, accessToken: trimmed };
}

/**
 * Quick access for authorized administrator (jayaramsappa09@gmail.com)
 */
export function signInAsQuickAdmin(
  email: string = 'jayaramsappa09@gmail.com'
): { user: AuthUser; accessToken: string | null } {
  const authUser: AuthUser = {
    uid: 'admin-authorized-jayaram',
    email: email,
    displayName: 'Jayaram Sappa (Administrator)',
    photoURL: null,
    emailVerified: true,
  };

  cachedAuthUser = authUser;
  try {
    sessionStorage.setItem('ccam_auth_user', JSON.stringify(authUser));
    if (cachedAccessToken) {
      sessionStorage.setItem('ccam_auth_token', cachedAccessToken);
    }
  } catch {}

  notifyAuthListeners();
  return { user: authUser, accessToken: cachedAccessToken };
}

/**
 * Get current cached access token
 */
export function getAccessToken(): string | null {
  return cachedAccessToken;
}

/**
 * Get current cached authenticated user
 */
export function getCurrentAuthUser(): AuthUser | null {
  return cachedAuthUser;
}

/**
 * Manually set access token
 */
export function setAccessToken(token: string | null) {
  cachedAccessToken = token;
  if (token) {
    try {
      sessionStorage.setItem('ccam_auth_token', token);
      sessionStorage.setItem('ccam_auth_token_saved_at', String(Date.now()));
    } catch {}
  } else {
    try {
      sessionStorage.removeItem('ccam_auth_token');
      sessionStorage.removeItem('ccam_auth_token_saved_at');
    } catch {}
  }
}

/**
 * Check if the current OAuth token is missing or likely expired (> 55 minutes old)
 */
export function isTokenExpired(): boolean {
  if (!cachedAccessToken) return true;
  try {
    const savedAt = sessionStorage.getItem('ccam_auth_token_saved_at');
    if (!savedAt) return false;
    const elapsed = Date.now() - Number(savedAt);
    return elapsed > 55 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * Checks if an error is due to Google OAuth 2.0 expiration or 401 unauthorized
 */
export function isAuthExpiredError(error: any): boolean {
  if (!error) return false;
  const msg = typeof error === 'string' ? error : error?.message || '';
  return (
    error?.status === 401 ||
    msg.includes('401') ||
    msg.toLowerCase().includes('authorization expired') ||
    msg.toLowerCase().includes('re-authenticate') ||
    msg.toLowerCase().includes('invalid credentials') ||
    msg.toLowerCase().includes('unauthenticated') ||
    msg.toLowerCase().includes('invalid_token')
  );
}

/**
 * Handle token expiration by clearing expired token and notifying listeners
 */
export function handleTokenExpiry(): void {
  cachedAccessToken = null;
  try {
    sessionStorage.removeItem('ccam_auth_token');
    sessionStorage.removeItem('ccam_auth_token_saved_at');
  } catch {}
  notifyAuthListeners();
}

/**
 * Sign out from Supabase Auth & reset session cache
 */
export async function logout(): Promise<void> {
  cachedAccessToken = null;
  cachedAuthUser = null;
  try {
    sessionStorage.removeItem('ccam_auth_user');
    sessionStorage.removeItem('ccam_auth_token');
    sessionStorage.removeItem('ccam_auth_token_saved_at');
  } catch {}

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.auth.signOut();
    } catch (err) {
      console.error('Error signing out of Supabase:', err);
    }
  }

  notifyAuthListeners();
}
