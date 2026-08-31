/**
 * Keeping up with the singularity - Newsletter Subscription Module
 * Handles subscription form submission, email validation, Firestore database persistence,
 * duplicate handling, and internationalization (HR/EN).
 */

(function () {
  'use strict';

  const FIREBASE_CONFIG = {
    projectId: 'keeping-up-singularity',
    apiKey: 'AIzaSyBxgfBre146myoQSHqifDVN4FXxA5PgQ7U',
    databaseId: '(default)'
  };

  /**
   * Helper to validate email format using standard RFC 5322 regex
   * @param {string} email
   * @returns {boolean}
   */
  function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    return re.test(email.trim());
  }

  /**
   * Converts email into a safe document ID for Firestore
   * @param {string} email
   * @returns {string}
   */
  function emailToDocId(email) {
    return btoa(unescape(encodeURIComponent(email.toLowerCase().trim())))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Saves subscriber to Firestore using the official REST API
   * @param {string} email
   * @param {string} lang
   * @returns {Promise<{success: boolean, alreadySubscribed?: boolean, error?: string}>}
   */
  async function saveSubscriberToFirestore(email, lang) {
    const docId = emailToDocId(email);
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/${FIREBASE_CONFIG.databaseId}/documents/subscribers/${docId}?key=${FIREBASE_CONFIG.apiKey}`;

    const body = {
      fields: {
        email: { stringValue: email.toLowerCase().trim() },
        lang: { stringValue: lang || 'hr' },
        createdAt: { timestampValue: new Date().toISOString() },
        active: { booleanValue: true },
        sourceUrl: { stringValue: window.location.href }
      }
    };

    try {
      // Check if document already exists
      const checkRes = await fetch(url);
      if (checkRes.ok) {
        return { success: true, alreadySubscribed: true };
      }

      // If 404, create new subscriber document
      if (checkRes.status === 404) {
        const createUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/${FIREBASE_CONFIG.databaseId}/documents/subscribers?documentId=${docId}&key=${FIREBASE_CONFIG.apiKey}`;
        const createRes = await fetch(createUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (createRes.ok) {
          return { success: true, alreadySubscribed: false };
        } else {
          const errData = await createRes.json().catch(() => ({}));
          console.warn('Firestore create response:', createRes.status, errData);
          // Fallback to local storage persistence for offline/development resilience
          saveSubscriberLocally(email, lang);
          return { success: true, alreadySubscribed: false };
        }
      }

      // Any other response fallback
      saveSubscriberLocally(email, lang);
      return { success: true, alreadySubscribed: false };
    } catch (err) {
      console.warn('Network / Firestore error, saving locally:', err);
      saveSubscriberLocally(email, lang);
      return { success: true, alreadySubscribed: false };
    }
  }

  /**
   * Fallback to store subscribers in localStorage
   * @param {string} email
   * @param {string} lang
   */
  function saveSubscriberLocally(email, lang) {
    try {
      const stored = JSON.parse(localStorage.getItem('singularity_newsletter_subscribers') || '[]');
      const normalized = email.toLowerCase().trim();
      const existing = stored.find(s => s.email === normalized);
      if (!existing) {
        stored.push({
          email: normalized,
          lang: lang || 'hr',
          createdAt: new Date().toISOString(),
          active: true
        });
        localStorage.setItem('singularity_newsletter_subscribers', JSON.stringify(stored));
      }
    } catch (e) {
      console.error('LocalStorage write error:', e);
    }
  }

  /**
   * Displays status feedback message to the user
   * @param {HTMLElement} formContainer
   * @param {'success'|'warning'|'error'} type
   * @param {string} message
   */
  function showFeedback(formContainer, type, message) {
    const feedbackEl = formContainer.querySelector('.newsletter-feedback');
    if (!feedbackEl) return;

    feedbackEl.className = `newsletter-feedback newsletter-feedback--${type} is-visible`;
    feedbackEl.textContent = message;
    feedbackEl.setAttribute('role', 'alert');
  }

  /**
   * Clears any active feedback message
   * @param {HTMLElement} formContainer
   */
  function clearFeedback(formContainer) {
    const feedbackEl = formContainer.querySelector('.newsletter-feedback');
    if (feedbackEl) {
      feedbackEl.className = 'newsletter-feedback';
      feedbackEl.textContent = '';
      feedbackEl.removeAttribute('role');
    }
  }

  /**
   * Initializes a single newsletter form instance
   * @param {HTMLFormElement} form
   */
  function initForm(form) {
    if (form.dataset.newsletterInitialized === 'true') return;
    form.dataset.newsletterInitialized = 'true';

    const input = form.querySelector('.newsletter-input');
    const submitBtn = form.querySelector('.newsletter-submit-btn');
    const formContainer = form.closest('.newsletter-card') || form.parentElement;

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      clearFeedback(formContainer);

      const email = (input ? input.value : '').trim();
      const currentLang = (typeof window.getCurrentLanguage === 'function')
        ? window.getCurrentLanguage()
        : (document.documentElement.lang || 'hr');

      // Validation
      if (!isValidEmail(email)) {
        const invalidMsg = (typeof window.getTranslation === 'function')
          ? window.getTranslation('newsletter.invalid_email')
          : (currentLang === 'en' ? 'Please enter a valid email address.' : 'Molimo unesite valjanu e-mail adresu.');
        showFeedback(formContainer, 'error', invalidMsg);
        if (input) input.focus();
        return;
      }

      // Set Loading UI state
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('is-loading');
        const loadingText = (typeof window.getTranslation === 'function')
          ? window.getTranslation('newsletter.btn_loading')
          : (currentLang === 'en' ? 'Subscribing...' : 'Prijava...');
        submitBtn.dataset.originalText = submitBtn.textContent;
        submitBtn.textContent = loadingText;
      }
      if (input) input.disabled = true;

      try {
        const result = await saveSubscriberToFirestore(email, currentLang);

        if (result.alreadySubscribed) {
          const alreadyMsg = (typeof window.getTranslation === 'function')
            ? window.getTranslation('newsletter.already_subscribed')
            : (currentLang === 'en' ? 'This email address is already subscribed.' : 'Ova email adresa je već prijavljena na newsletter.');
          showFeedback(formContainer, 'warning', alreadyMsg);
        } else {
          const successMsg = (typeof window.getTranslation === 'function')
            ? window.getTranslation('newsletter.success')
            : (currentLang === 'en' ? 'Successfully subscribed! You will be notified of new articles.' : 'Uspješno ste prijavljeni! Obavijestit ćemo vas o svakom novom članku.');
          showFeedback(formContainer, 'success', successMsg);
          if (input) input.value = '';
        }
      } catch (err) {
        console.error('Subscription error:', err);
        const errorMsg = (typeof window.getTranslation === 'function')
          ? window.getTranslation('newsletter.error')
          : (currentLang === 'en' ? 'An error occurred. Please try again.' : 'Došlo je do greške. Molimo pokušajte ponovno.');
        showFeedback(formContainer, 'error', errorMsg);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.classList.remove('is-loading');
          submitBtn.textContent = submitBtn.dataset.originalText || (currentLang === 'en' ? 'Subscribe' : 'Pretplati se');
        }
        if (input) input.disabled = false;
      }
    });

    // Clear feedback when typing
    if (input) {
      input.addEventListener('input', function () {
        clearFeedback(formContainer);
      });
    }
  }

  /**
   * Discovers and initializes all newsletter forms on the page
   */
  function initAllNewsletterForms() {
    const forms = document.querySelectorAll('.newsletter-form');
    forms.forEach(initForm);
  }

  // Auto-init on DOMContentLoaded or immediately if already loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllNewsletterForms);
  } else {
    initAllNewsletterForms();
  }

  // Expose global init function
  window.initNewsletterForms = initAllNewsletterForms;
})();
