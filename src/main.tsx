import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

console.info('[Certifyx Init] Starting application initialization sequence...');

// Global startup error listener to display visual diagnostics if pre-mount error occurs
window.addEventListener('error', (event) => {
  console.error('[Certifyx Startup Error]:', event.error || event.message);
  const rootEl = document.getElementById('root');
  if (rootEl && !rootEl.getAttribute('data-app-mounted')) {
    rootEl.innerHTML = `
      <div style="display:flex;min-height:100vh;align-items:center;justify-content:center;background:#090d16;color:#f1f5f9;font-family:system-ui,-apple-system,sans-serif;padding:1.5rem;">
        <div style="max-width:32rem;width:100%;background:#111827;border:1px solid rgba(239, 68, 68, 0.4);border-radius:1rem;padding:1.75rem;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);">
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;color:#f87171;">
            <svg style="width:1.5rem;height:1.5rem;flex-shrink:0;" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <h2 style="font-size:1.1rem;font-weight:700;margin:0;color:#fff;">Startup Diagnostic: Initialization Error</h2>
          </div>
          <p style="font-size:0.875rem;color:#94a3b8;margin:0 0 1rem 0;line-height:1.5;">The application encountered an unexpected error while initializing. You can try reloading or resetting local application storage.</p>
          <div style="background:#030712;border:1px solid #1f2937;border-radius:0.75rem;padding:0.875rem;font-family:ui-monospace,monospace;font-size:0.75rem;color:#fca5a5;max-height:8rem;overflow-y:auto;margin-bottom:1.25rem;word-break:break-all;">
            ${escapeHtml(event.error?.message || event.message || 'Unknown initialization error')}
          </div>
          <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
            <button onclick="window.location.reload()" style="background:#3b82f6;color:#fff;border:none;border-radius:0.625rem;padding:0.625rem 1.25rem;font-size:0.875rem;font-weight:600;cursor:pointer;">Reload Application</button>
            <button onclick="localStorage.clear(); sessionStorage.clear(); window.location.reload();" style="background:#1f2937;color:#94a3b8;border:1px solid #374151;border-radius:0.625rem;padding:0.625rem 1.25rem;font-size:0.875rem;font-weight:600;cursor:pointer;">Clear Data &amp; Reset</button>
          </div>
        </div>
      </div>
    `;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.warn('[Certifyx Unhandled Rejection]:', event.reason);
});

function escapeHtml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Register PWA service worker safely
try {
  registerSW({ immediate: false });
  console.info('[Certifyx Init] PWA service worker registered.');
} catch (e) {
  console.warn('[Certifyx Init] PWA service worker registration skipped:', e);
}

try {
  console.info('[Certifyx Init] Mounting React root...');
  const rootEl = document.getElementById('root')!;
  rootEl.setAttribute('data-app-mounted', 'true');
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary sectionName="Application Root">
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
  console.info('[Certifyx Init] React root mounted successfully.');
} catch (mountErr) {
  console.error('[Certifyx Init Fatal] Failed to mount React application:', mountErr);
  const rootEl = document.getElementById('root');
  if (rootEl) {
    rootEl.innerHTML = `
      <div style="display:flex;min-height:100vh;align-items:center;justify-content:center;background:#090d16;color:#f1f5f9;font-family:system-ui,-apple-system,sans-serif;padding:1.5rem;">
        <div style="max-width:32rem;width:100%;background:#111827;border:1px solid rgba(239, 68, 68, 0.4);border-radius:1rem;padding:1.75rem;box-shadow:0 20px 25px -5px rgba(0,0,0,0.5);">
          <h2 style="font-size:1.1rem;font-weight:700;margin:0 0 0.5rem 0;color:#fff;">Fatal Mount Error</h2>
          <p style="font-size:0.875rem;color:#94a3b8;margin:0 0 1rem 0;">Failed to mount React application root.</p>
          <pre style="background:#030712;padding:0.75rem;border-radius:0.5rem;font-size:0.75rem;color:#fca5a5;overflow:auto;">${escapeHtml(String(mountErr))}</pre>
          <button onclick="window.location.reload()" style="background:#3b82f6;color:#fff;border:none;border-radius:0.5rem;padding:0.5rem 1rem;font-weight:600;cursor:pointer;margin-top:1rem;">Reload</button>
        </div>
      </div>
    `;
  }
}


