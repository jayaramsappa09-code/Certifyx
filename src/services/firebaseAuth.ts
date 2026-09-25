import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
  signInWithCredential,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { AuthUser } from '../types';

// Initialize Firebase App only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Configure Google Auth Provider with the required Google Workspace scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
provider.addScope('openid');
provider.setCustomParameters({
  prompt: 'select_account',
});

// OAuth Client ID from provisioned Google Cloud project
export const GOOGLE_CLIENT_ID =
  (firebaseConfig as any).oAuthClientId ||
  '1039573653911-ar03stubu70k4kunt97hk0j1c40nelmf.apps.googleusercontent.com';

// Required Google Workspace scopes
export const REQUIRED_WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'openid',
].join(' ');

// In-memory access token cache (CRITICAL: never stored in insecure public cookies)
let cachedAccessToken: string | null = null;
let cachedAuthUser: AuthUser | null = null;
let isSigningIn = false;

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

/**
 * Ensure Google Identity Services (GSI) script is loaded
 */
export function ensureGsiLoaded(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if ((window as any).google?.accounts?.oauth2) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const existing = document.querySelector(
      'script[src*="accounts.google.com/gsi/client"]'
    ) as HTMLScriptElement;

    if (existing) {
      const interval = setInterval(() => {
        if ((window as any).google?.accounts?.oauth2) {
          clearInterval(interval);
          resolve(true);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(interval);
        resolve(Boolean((window as any).google?.accounts?.oauth2));
      }, 4000);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const interval = setInterval(() => {
        if ((window as any).google?.accounts?.oauth2) {
          clearInterval(interval);
          resolve(true);
        }
      }, 100);
      setTimeout(() => {
        clearInterval(interval);
        resolve(Boolean((window as any).google?.accounts?.oauth2));
      }, 4000);
    };
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
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
 * Check if the current URL hash contains an OAuth 2.0 access token (from redirect flow)
 */
export async function checkUrlHashForOAuthToken(): Promise<{ user: AuthUser; accessToken: string } | null> {
  if (typeof window === 'undefined' || !window.location.hash) return null;

  try {
    const hash = window.location.hash.substring(1);
    if (!hash.includes('access_token=')) return null;

    const params = new URLSearchParams(hash);
    const token = params.get('access_token');

    if (!token) return null;

    // Clean hash from browser address bar without reload
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

    const user = await fetchGoogleUserProfile(token);
    cachedAccessToken = token;
    cachedAuthUser = user;

    // Save in sessionStorage for page refreshes
    try {
      sessionStorage.setItem('ccam_auth_user', JSON.stringify(user));
      sessionStorage.setItem('ccam_auth_token', token);
      sessionStorage.setItem('ccam_auth_token_saved_at', String(Date.now()));
    } catch {}

    notifyAuthListeners();
    return { user, accessToken: token };
  } catch (e) {
    console.error('Error parsing OAuth token from URL hash:', e);
    return null;
  }
}

/**
 * Initialize Auth state listener
 */
export function initAuth(
  onAuthSuccess?: (user: AuthUser, token: string | null) => void,
  onAuthFailure?: (error?: string) => void
) {
  let hasHandledInitial = false;

  const listener: AuthListener = (user, token) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, token);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  };

  authListeners.add(listener);

  // 1. First check if returning from OAuth redirect with hash
  checkUrlHashForOAuthToken()
    .then((result) => {
      if (result) {
        hasHandledInitial = true;
        if (onAuthSuccess) onAuthSuccess(result.user, result.accessToken);
        return;
      }

      // 2. Check sessionStorage for active session
      try {
        const storedUser = sessionStorage.getItem('ccam_auth_user');
        const storedToken = sessionStorage.getItem('ccam_auth_token');
        if (storedUser && storedToken) {
          const parsedUser: AuthUser = JSON.parse(storedUser);
          cachedAuthUser = parsedUser;
          cachedAccessToken = storedToken;
          hasHandledInitial = true;
          if (onAuthSuccess) onAuthSuccess(parsedUser, storedToken);
          return;
        }
      } catch {}

      // 3. Fallback to Firebase Auth state
      onAuthStateChanged(auth, async (fbUser: User | null) => {
        if (hasHandledInitial && cachedAuthUser) return;

        if (fbUser) {
          const authUser: AuthUser = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName,
            photoURL: fbUser.photoURL,
            emailVerified: fbUser.emailVerified,
          };
          cachedAuthUser = authUser;
          if (onAuthSuccess) onAuthSuccess(authUser, cachedAccessToken);
        } else if (!cachedAuthUser) {
          cachedAccessToken = null;
          if (onAuthFailure) onAuthFailure();
        }
      });
    })
    .catch(() => {
      if (onAuthFailure && !cachedAuthUser) onAuthFailure();
    });

  return () => {
    authListeners.delete(listener);
  };
}

/**
 * Google Sign-in with official Google Identity Services (GIS) or Firebase fallback
 */
export async function googleSignIn(): Promise<{ user: AuthUser; accessToken: string }> {
  isSigningIn = true;

  try {
    // 1. Primary: Use Google Identity Services (GIS) Token Client
    // This connects directly using official Google OAuth 2.0 Web Client without Firebase unauthorized-domain blocks
    const gsiReady = await ensureGsiLoaded();

    if (gsiReady && (window as any).google?.accounts?.oauth2) {
      const result = await new Promise<{ user: AuthUser; accessToken: string }>((resolve, reject) => {
        let isSettled = false;

        try {
          const client = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: REQUIRED_WORKSPACE_SCOPES,
            callback: async (tokenResponse: any) => {
              if (isSettled) return;
              isSettled = true;

              if (tokenResponse.error) {
                console.error('GIS OAuth error response:', tokenResponse);
                if (tokenResponse.error === 'popup_closed_by_user') {
                  reject(new Error('Google sign-in popup was closed before completion.'));
                  return;
                }
                reject(
                  new Error(
                    tokenResponse.error_description ||
                      `Google authorization error: ${tokenResponse.error}`
                  )
                );
                return;
              }

              const accessToken = tokenResponse.access_token;
              if (!accessToken) {
                reject(new Error('No access token received from Google.'));
                return;
              }

              try {
                const user = await fetchGoogleUserProfile(accessToken);
                cachedAccessToken = accessToken;
                cachedAuthUser = user;

                // Cache in sessionStorage
                try {
                  sessionStorage.setItem('ccam_auth_user', JSON.stringify(user));
                  sessionStorage.setItem('ccam_auth_token', accessToken);
                  sessionStorage.setItem('ccam_auth_token_saved_at', String(Date.now()));
                } catch {}

                // Optionally sync with Firebase Auth if possible (ignore errors if restricted domain)
                try {
                  const credential = GoogleAuthProvider.credential(null, accessToken);
                  await signInWithCredential(auth, credential).catch(() => {});
                } catch {}

                notifyAuthListeners();
                resolve({ user, accessToken });
              } catch (profileError: any) {
                reject(new Error(`Failed to load Google profile: ${profileError.message}`));
              }
            },
            error_callback: (err: any) => {
              if (isSettled) return;
              isSettled = true;
              console.warn('GIS error callback:', err);
              if (err?.type === 'popup_blocked') {
                reject(
                  new Error(
                    'Popup blocked: Please allow popups for this site, or use the direct sign-in button below.'
                  )
                );
              } else {
                reject(new Error(err?.message || 'Google Sign-in failed to open.'));
              }
            },
          });

          client.requestAccessToken({ prompt: 'select_account' });
        } catch (initErr: any) {
          if (!isSettled) {
            isSettled = true;
            reject(initErr);
          }
        }
      });

      return result;
    }

    // 2. Secondary: Fallback to Firebase signInWithPopup if GIS is somehow completely unavailable
    console.log('Falling back to Firebase signInWithPopup...');
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    const token = credential?.accessToken || null;
    if (!token) {
      throw new Error(
        'Could not obtain Google Workspace access token. Please grant drive and spreadsheets scopes.'
      );
    }

    const authUser: AuthUser = {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL,
      emailVerified: result.user.emailVerified,
    };

    cachedAccessToken = token;
    cachedAuthUser = authUser;
    try {
      sessionStorage.setItem('ccam_auth_user', JSON.stringify(authUser));
      sessionStorage.setItem('ccam_auth_token', token);
    } catch {}

    notifyAuthListeners();
    return { user: authUser, accessToken: token };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
}

/**
 * Direct OAuth redirect for environments where window.open popups are blocked by browser/iframe
 */
export function signInWithGoogleRedirect(): void {
  if (typeof window === 'undefined') return;

  const currentUrl = window.location.origin + window.location.pathname;
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    GOOGLE_CLIENT_ID
  )}&redirect_uri=${encodeURIComponent(
    currentUrl
  )}&response_type=token&scope=${encodeURIComponent(
    REQUIRED_WORKSPACE_SCOPES
  )}&prompt=select_account`;

  window.location.href = authUrl;
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
    return elapsed > 55 * 60 * 1000; // 55 mins in ms
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
 * Connect with a direct Google OAuth Access Token
 * Useful when running in heavily restricted iframes or when token is generated from Google OAuth Playground
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
 * Enables viewing the 67-student roster, stats, logs, and settings immediately
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
  // If we already had a token, keep it; otherwise null
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
 * Get current in-memory cached access token
 */
export function getAccessToken(): string | null {
  return cachedAccessToken;
}

/**
 * Get current in-memory authenticated user
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
 * Log out
 */
export async function logout(): Promise<void> {
  cachedAccessToken = null;
  cachedAuthUser = null;
  try {
    sessionStorage.removeItem('ccam_auth_user');
    sessionStorage.removeItem('ccam_auth_token');
  } catch {}

  try {
    await signOut(auth);
  } catch {}

  notifyAuthListeners();
}
