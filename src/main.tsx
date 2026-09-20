import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { VentureApp } from './venture/VentureApp';
import './styles.css';
import './lab/labs.css';
import './venture/venture.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VentureApp />
  </StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => { /* Online play remains available when offline storage is unavailable. */ }); });
}
