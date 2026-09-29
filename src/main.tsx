import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

// Register PWA service worker safely to prevent blocking React mount on restricted mobile browsers
try {
  registerSW({ immediate: true });
} catch (e) {
  console.warn('PWA service worker registration skipped or blocked:', e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary sectionName="Application Root">
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

