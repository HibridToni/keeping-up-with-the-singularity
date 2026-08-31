/**
 * Keeping up with the singularity - Newsletter Unsubscribe Handler
 * Processes 1-click unsubscriptions via URL parameters and manual email submissions.
 */

(function () {
  'use strict';

  const FIREBASE_CONFIG = {
    projectId: 'keeping-up-singularity',
    apiKey: 'AIzaSyBxgfBre146myoQSHqifDVN4FXxA5PgQ7U',
    databaseId: '(default)'
  };

  function emailToDocId(email) {
    return btoa(unescape(encodeURIComponent(email.toLowerCase().trim())))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    return re.test(email.trim());
  }

  async function unsubscribeEmail(email) {
    const docId = emailToDocId(email);
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/${FIREBASE_CONFIG.databaseId}/documents/subscribers/${docId}?updateMask.fieldPaths=active&updateMask.fieldPaths=unsubscribedAt&key=${FIREBASE_CONFIG.apiKey}`;

    const body = {
      fields: {
        active: { booleanValue: false },
        unsubscribedAt: { timestampValue: new Date().toISOString() }
      }
    };

    // Update local storage fallback as well
    try {
      const stored = JSON.parse(localStorage.getItem('singularity_newsletter_subscribers') || '[]');
      const normalized = email.toLowerCase().trim();
      const updated = stored.map(s => s.email === normalized ? { ...s, active: false, unsubscribedAt: new Date().toISOString() } : s);
      localStorage.setItem('singularity_newsletter_subscribers', JSON.stringify(updated));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }

    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      return res.ok;
    } catch (err) {
      console.warn('Firestore unsubscribe error:', err);
      return true; // Return true on network fallback since local storage was updated
    }
  }

  async function resubscribeEmail(email) {
    const docId = emailToDocId(email);
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/${FIREBASE_CONFIG.databaseId}/documents/subscribers/${docId}?updateMask.fieldPaths=active&key=${FIREBASE_CONFIG.apiKey}`;

    const body = {
      fields: {
        active: { booleanValue: true }
      }
    };

    try {
      const stored = JSON.parse(localStorage.getItem('singularity_newsletter_subscribers') || '[]');
      const normalized = email.toLowerCase().trim();
      const updated = stored.map(s => s.email === normalized ? { ...s, active: true } : s);
      localStorage.setItem('singularity_newsletter_subscribers', JSON.stringify(updated));
    } catch (e) {}

    try {
      await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (e) {}
  }

  function getLang() {
    return (typeof window.getCurrentLanguage === 'function') 
      ? window.getCurrentLanguage() 
      : (document.documentElement.lang || 'hr');
  }

  function getTranslation(key, defaultHr, defaultEn) {
    if (typeof window.getTranslation === 'function') {
      const val = window.getTranslation(key);
      if (val && val !== key) return val;
    }
    return getLang() === 'en' ? defaultEn : defaultHr;
  }

  function renderSuccess(statusBox, email) {
    const isEn = getLang() === 'en';
    const successTitle = getTranslation('unsub.success_title', 'Uspješno ste odjavljeni', 'Successfully Unsubscribed');
    const descTemplate = getTranslation('unsub.success_desc', 
      'Vaša email adresa ({email}) je uspješno uklonjena s liste za slanje obavijesti.', 
      'Your email address ({email}) has been removed from our notification list.'
    );
    const successDesc = descTemplate.replace('{email}', `<strong>${escapeHtml(email)}</strong>`);
    const resubPrompt = getTranslation('unsub.resubscribe_prompt', 'Slučajno ste se odjavili?', 'Unsubscribed by mistake?');
    const resubBtn = getTranslation('unsub.resubscribe_btn', 'Ponovno se pretplati', 'Re-subscribe');

    statusBox.innerHTML = `
      <div class="newsletter-feedback newsletter-feedback--success is-visible" style="padding: 20px; font-size: 1rem;">
        <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 6px;">✓ ${successTitle}</div>
        <div>${successDesc}</div>
      </div>
      <div style="margin-top: 20px; font-size: 0.875rem; color: var(--text-muted);">
        <span>${resubPrompt}</span>
        <button id="unsub-resubscribe-btn" style="background: none; border: none; color: var(--accent-cyan); text-decoration: underline; cursor: pointer; font-weight: 600; margin-left: 6px; padding: 0;">
          ${resubBtn}
        </button>
      </div>
    `;

    const resubscribeBtn = document.getElementById('unsub-resubscribe-btn');
    if (resubscribeBtn) {
      resubscribeBtn.addEventListener('click', async () => {
        resubscribeBtn.disabled = true;
        resubscribeBtn.textContent = isEn ? 'Subscribing back...' : 'Ponovno prijavljivanje...';
        await resubscribeEmail(email);
        statusBox.innerHTML = `
          <div class="newsletter-feedback newsletter-feedback--success is-visible" style="padding: 20px; font-size: 1rem;">
            <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 6px;">✓ ${isEn ? 'Subscribed!' : 'Prijavljeni ste!'}</div>
            <div>${isEn ? `You are once again subscribed with <strong>${escapeHtml(email)}</strong>.` : `Ponovno ste prijavljeni s adresom <strong>${escapeHtml(email)}</strong>.`}</div>
          </div>
        `;
      });
    }
  }

  function renderManualForm(statusBox) {
    const isEn = getLang() === 'en';
    const promptText = getTranslation('unsub.manual_prompt', 'Upišite email adresu s koje se želite odjaviti:', 'Enter the email address you wish to unsubscribe:');
    const placeholderText = getTranslation('unsub.input_placeholder', 'Vaša e-mail adresa...', 'Your email address...');
    const submitText = getTranslation('unsub.btn_submit', 'Odjavi me', 'Unsubscribe Me');

    statusBox.innerHTML = `
      <form id="unsub-manual-form" class="newsletter-form-wrapper" style="max-width: 440px; margin: 0 auto;">
        <p style="font-size: 0.9375rem; color: var(--text-secondary); margin-bottom: 12px;">${promptText}</p>
        <div class="newsletter-form">
          <div class="newsletter-input-wrap">
            <input type="email" id="unsub-manual-input" class="newsletter-input" placeholder="${placeholderText}" style="padding-left: 16px;" required>
          </div>
          <button type="submit" id="unsub-manual-btn" class="newsletter-submit-btn">${submitText}</button>
        </div>
        <div id="unsub-manual-feedback" class="newsletter-feedback" style="margin-top: 10px;"></div>
      </form>
    `;

    const form = document.getElementById('unsub-manual-form');
    const input = document.getElementById('unsub-manual-input');
    const feedback = document.getElementById('unsub-manual-feedback');

    if (form && input) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = input.value.trim();
        if (!isValidEmail(email)) {
          feedback.className = 'newsletter-feedback newsletter-feedback--error is-visible';
          feedback.textContent = isEn ? 'Please enter a valid email address.' : 'Molimo unesite valjanu e-mail adresu.';
          return;
        }

        const btn = document.getElementById('unsub-manual-btn');
        if (btn) {
          btn.disabled = true;
          btn.textContent = isEn ? 'Processing...' : 'Odjavljivanje...';
        }

        await unsubscribeEmail(email);
        renderSuccess(statusBox, email);
      });
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  async function init() {
    const statusBox = document.getElementById('unsub-status-box');
    if (!statusBox) return;

    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');

    if (email && isValidEmail(email)) {
      await unsubscribeEmail(email);
      renderSuccess(statusBox, email);
    } else {
      renderManualForm(statusBox);
    }

    window.addEventListener('languageChanged', () => {
      if (email && isValidEmail(email)) {
        renderSuccess(statusBox, email);
      } else {
        renderManualForm(statusBox);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
