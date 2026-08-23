/**
 * PWA Controller: Registers Service Worker & manages offline state notification
 */

(function () {
  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] Service Worker registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.error('[PWA] Service Worker registration failed:', error);
        });
    });
  }

  // Setup offline / online detection toast
  function createOfflineToast() {
    if (document.getElementById('offline-toast')) return;

    const toast = document.createElement('div');
    toast.id = 'offline-toast';
    toast.className = 'offline-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
      <div class="offline-toast-content">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="1" y1="1" x2="23" y2="23"></line>
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
          <line x1="12" y1="20" x2="12.01" y2="20"></line>
        </svg>
        <span id="offline-toast-text">Izvanmrežni rad (Offline) – Spremljeni članci su dostupni za čitanje.</span>
      </div>
    `;
    document.body.appendChild(toast);
  }

  function updateOnlineStatus() {
    const toast = document.getElementById('offline-toast');
    const currentLang = (typeof getCurrentLanguage === 'function') ? getCurrentLanguage() : (localStorage.getItem('site_lang') || 'hr');
    const toastText = document.getElementById('offline-toast-text');

    if (!navigator.onLine) {
      if (!toast) createOfflineToast();
      const el = document.getElementById('offline-toast');
      const textEl = document.getElementById('offline-toast-text');
      if (textEl) {
        textEl.textContent = currentLang === 'en'
          ? 'You are offline – Cached articles remain available to read.'
          : 'Izvanmrežni rad (Offline) – Spremljeni članci su dostupni za čitanje.';
      }
      if (el) el.classList.add('visible');
    } else {
      if (toast) {
        toast.classList.remove('visible');
      }
    }
  }

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  window.addEventListener('DOMContentLoaded', () => {
    if (!navigator.onLine) {
      updateOnlineStatus();
    }
  });
})();
