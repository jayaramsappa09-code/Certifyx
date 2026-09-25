const GOOGLE_CLIENT_ID_STORAGE_KEY = 'ccam_google_client_id';

export interface GoogleOAuthConfig {
  clientId: string;
}

/**
 * Retrieve Google OAuth Client ID (from environment or localStorage override)
 */
export function getGoogleOAuthConfig(): GoogleOAuthConfig {
  const envClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const storedClientId = typeof localStorage !== 'undefined' ? localStorage.getItem(GOOGLE_CLIENT_ID_STORAGE_KEY) || '' : '';

  return {
    clientId: storedClientId || envClientId || '',
  };
}

/**
 * Save Google Client ID to localStorage
 */
export function saveGoogleOAuthConfig(clientId: string): void {
  if (typeof localStorage !== 'undefined') {
    if (clientId) {
      localStorage.setItem(GOOGLE_CLIENT_ID_STORAGE_KEY, clientId.trim());
    } else {
      localStorage.removeItem(GOOGLE_CLIENT_ID_STORAGE_KEY);
    }
  }
}

/**
 * Dynamically load Google Identity Services (GIS) script
 */
export function loadGoogleGisScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();

    // Check if script is already present
    if ((window as any).google?.accounts?.id || (window as any).google?.accounts?.oauth2) {
      return resolve();
    }

    const scriptId = 'google-gis-script';
    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

/**
 * Request Google OAuth Access Token via GIS Token Client (for standalone Drive & Sheets access)
 */
export function requestGoogleAccessTokenStandalone(
  scopes: string[] = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/spreadsheets.readonly',
  ],
  onSuccess: (accessToken: string) => void,
  onError: (error: any) => void
): void {
  const { clientId } = getGoogleOAuthConfig();
  if (!clientId) {
    onError(
      new Error(
        'Google Client ID is missing. Please configure VITE_GOOGLE_CLIENT_ID or save your OAuth Client ID in settings.'
      )
    );
    return;
  }

  loadGoogleGisScript()
    .then(() => {
      const google = (window as any).google;
      if (!google?.accounts?.oauth2) {
        onError(new Error('Google Identity Services SDK failed to load.'));
        return;
      }

      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: scopes.join(' '),
        callback: (response: any) => {
          if (response.error) {
            onError(new Error(`OAuth Error: ${response.error_description || response.error}`));
            return;
          }
          if (response.access_token) {
            onSuccess(response.access_token);
          } else {
            onError(new Error('No access token returned from Google.'));
          }
        },
        error_callback: (err: any) => {
          onError(err);
        },
      });

      client.requestAccessToken();
    })
    .catch((err) => {
      onError(err);
    });
}
