import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Configure Google Auth Provider with the required Google Workspace scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');
// Prompt user to select an account
provider.setCustomParameters({
  prompt: 'select_account',
});

// In-memory access token cache (CRITICAL: never in localStorage/sessionStorage as required)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Default Admin allowlist containing the user
export const DEFAULT_ADMIN_EMAILS: string[] = [
  'jayaramsappa09@gmail.com',
];

/**
 * Checks if the user email is on the authorized administrator allowlist
 */
export function isAuthorizedAdmin(email: string | null | undefined, customAllowlist?: string[]): boolean {
  if (!email) return false;
  const normalizedEmail = email.trim().toLowerCase();
  const allowlist = (customAllowlist && customAllowlist.length > 0)
    ? customAllowlist.map((e) => e.trim().toLowerCase())
    : DEFAULT_ADMIN_EMAILS.map((e) => e.trim().toLowerCase());

  return allowlist.includes(normalizedEmail);
}

/**
 * Initialize Firebase Auth state listener
 */
export function initAuth(
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: (error?: string) => void
) {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token might have expired or needs user interaction to refresh popup credential
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
}

/**
 * Google Sign-in with Workspace scopes
 */
export async function googleSignIn(): Promise<{ user: User; accessToken: string }> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve OAuth access token from Google.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
}

/**
 * Get current in-memory cached access token
 */
export function getAccessToken(): string | null {
  return cachedAccessToken;
}

/**
 * Manually set access token (useful if refreshed or reconnecting)
 */
export function setAccessToken(token: string | null) {
  cachedAccessToken = token;
}

/**
 * Log out
 */
export async function logout(): Promise<void> {
  cachedAccessToken = null;
  await signOut(auth);
}
