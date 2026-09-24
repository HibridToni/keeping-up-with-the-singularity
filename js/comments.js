/**
 * Keeping up with the singularity - Article Comments Module
 * Features:
 * - Fetches & posts comments via Firebase Firestore REST API
 * - Subcollection path: /articles/{articleId}/comments/{commentId}
 * - LocalStorage offline resilience & saved commenter name
 * - Honeypot anti-spam protection & client rate limiting
 * - Colorful initial avatars with deterministic hashing
 * - Full Croatian and English i18n support with reactive languageChanged event
 * - XSS-safe text escaping
 */

(function () {
  'use strict';

  const FIREBASE_CONFIG = {
    projectId: 'keeping-up-singularity',
    apiKey: 'AIzaSyBxgfBre146myoQSHqifDVN4FXxA5PgQ7U',
    databaseId: '(default)'
  };

  const AVATAR_COLORS = [
    '#38bdf8', '#818cf8', '#a78bfa', '#f472b6',
    '#34d399', '#fbbf24', '#f87171', '#2dd4bf',
    '#60a5fa', '#c084fc'
  ];

  let currentArticleId = null;
  let commentsList = [];
  let isSubmitting = false;
  let lastSubmitTimestamp = 0;
  const RATE_LIMIT_MS = 8000; // 8 seconds cooldown between posts

  /**
   * Safe HTML escaping to prevent XSS
   */
  function escapeHTML(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, (tag) => {
      const chars = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return chars[tag] || tag;
    });
  }

  /**
   * Helper to get translation with fallback
   */
  function t(key, fallback, replacements = {}) {
    const lang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'hr';
    let text = (typeof translations !== 'undefined' && translations[lang] && translations[lang][key]) 
      ? translations[lang][key] 
      : fallback;

    if (replacements && typeof text === 'string') {
      Object.keys(replacements).forEach(k => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), replacements[k]);
      });
    }
    return text;
  }

  /**
   * Extracts initials from name (up to 2 characters)
   */
  function getInitials(name) {
    if (!name || typeof name !== 'string') return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /**
   * Generates a consistent pastel/accent color for a given name
   */
  function getAvatarColor(name) {
    if (!name || typeof name !== 'string') return AVATAR_COLORS[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
  }

  /**
   * Formats timestamp into friendly relative time or formatted date
   */
  function formatCommentTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) {
      return t('comments.just_now', 'upravo sada');
    }
    if (diffMin < 60) {
      return t('comments.minutes_ago', `prije ${diffMin} min`, { n: diffMin });
    }
    if (diffHour < 24) {
      return t('comments.hours_ago', `prije ${diffHour} h`, { n: diffHour });
    }
    if (diffDay < 7) {
      return t('comments.days_ago', `prije ${diffDay} d`, { n: diffDay });
    }

    const lang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'hr';
    try {
      return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'hr-HR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return date.toLocaleDateString();
    }
  }

  /**
   * Detects current article ID from preloaded global or URL
   */
  function detectArticleId() {
    if (typeof window !== 'undefined' && window.PRELOADED_ARTICLE_ID) {
      return String(window.PRELOADED_ARTICLE_ID);
    }
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) return String(id);

    const match = window.location.pathname.match(/\/articles\/([^\/\.]+)(?:\.html)?$/i);
    if (match) {
      return decodeURIComponent(match[1]);
    }
    return null;
  }

  /**
   * Fetches comments for article from Firestore REST API
   */
  async function fetchComments(articleId) {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/${FIREBASE_CONFIG.databaseId}/documents/articles/${encodeURIComponent(articleId)}/comments?key=${FIREBASE_CONFIG.apiKey}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      const docs = data.documents || [];

      const parsed = docs.map(doc => {
        const fields = doc.fields || {};
        return {
          id: doc.name.split('/').pop(),
          author: fields.author?.stringValue || 'Anonimno',
          content: fields.content?.stringValue || '',
          createdAt: fields.createdAt?.timestampValue || fields.createdAt?.stringValue || new Date().toISOString()
        };
      });

      // Sort newest first
      parsed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Cache locally
      try {
        localStorage.setItem(`kus_comments_${articleId}`, JSON.stringify(parsed));
      } catch (err) {
        // Storage quota or disabled
      }

      return parsed;
    } catch (error) {
      console.warn('Nemoguće dohvatiti komentare s Firestorea, provjera lokalne memorije:', error);
      try {
        const cached = localStorage.getItem(`kus_comments_${articleId}`);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (err) {}
      return [];
    }
  }

  /**
   * Posts a new comment to Firestore
   */
  async function postComment(articleId, author, content) {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/${FIREBASE_CONFIG.databaseId}/documents/articles/${encodeURIComponent(articleId)}/comments?key=${FIREBASE_CONFIG.apiKey}`;

    const nowIso = new Date().toISOString();
    const payload = {
      fields: {
        author: { stringValue: author.trim() },
        content: { stringValue: content.trim() },
        createdAt: { timestampValue: nowIso }
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Greška pri slanju: ${response.status} ${errText}`);
    }

    const createdDoc = await response.json();
    return {
      id: createdDoc.name.split('/').pop(),
      author: author.trim(),
      content: content.trim(),
      createdAt: nowIso
    };
  }

  /**
   * Renders the complete comments section
   */
  function renderCommentsUI() {
    const section = document.getElementById('comments-section');
    if (!section) return;

    const existingAuthorInput = document.getElementById('comment-author-input');
    const existingContentInput = document.getElementById('comment-content-input');
    const currentTypedAuthor = existingAuthorInput ? existingAuthorInput.value : '';
    const currentTypedContent = existingContentInput ? existingContentInput.value : '';

    const savedName = currentTypedAuthor || ((typeof localStorage !== 'undefined' && localStorage.getItem('kus_commenter_name')) || '');
    const totalCount = commentsList.length;

    let countBadgeText = '';
    if (totalCount === 0) {
      countBadgeText = t('comments.count_zero', '0 komentara');
    } else if (totalCount === 1) {
      countBadgeText = t('comments.count_single', '1 komentar');
    } else {
      countBadgeText = t('comments.count_few', `${totalCount} komentara`, { count: totalCount });
    }

    const title = t('comments.title', 'Komentari');
    const formTitle = t('comments.form_title', 'Ostavi komentar');
    const nameLabel = t('comments.name_label', 'Vaše ime ili nadimak');
    const namePlaceholder = t('comments.name_placeholder', 'Upišite vaše ime ili nadimak...');
    const contentLabel = t('comments.content_label', 'Vaš komentar');
    const contentPlaceholder = t('comments.content_placeholder', 'Napišite komentar ili postavite pitanje vezano uz rad...');
    const submitBtnText = isSubmitting 
      ? t('comments.submitting_btn', 'Objavljivanje...')
      : t('comments.submit_btn', 'Objavi komentar');

    let commentsHtml = '';
    if (commentsList.length === 0) {
      commentsHtml = `
        <div class="comments-empty-state">
          <div class="comments-empty-icon" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <h4 class="comments-empty-title">${escapeHTML(t('comments.empty_title', 'Budi prvi koji će ostaviti komentar'))}</h4>
          <p class="comments-empty-desc">${escapeHTML(t('comments.empty_desc', 'Podijelite svoja razmišljanja, pitanja ili analizu vezanu uz temu ovog rada.'))}</p>
        </div>
      `;
    } else {
      commentsHtml = `
        <div class="comments-list" id="comments-items-list" role="feed" aria-label="${escapeHTML(title)}">
          ${commentsList.map(c => renderCommentCard(c)).join('')}
        </div>
      `;
    }

    section.innerHTML = `
      <div class="comments-container">
        <!-- Zaglavlje sekcije komentara -->
        <div class="comments-header">
          <div class="comments-header-left">
            <span class="comments-badge-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </span>
            <h3 id="comments-title" class="comments-title">${escapeHTML(title)}</h3>
          </div>
          <span class="comments-count-pill">${escapeHTML(countBadgeText)}</span>
        </div>

        <!-- Forma za unos komentara -->
        <div class="comment-form-card">
          <h4 class="comment-form-heading">${escapeHTML(formTitle)}</h4>
          <form id="article-comment-form" class="comment-form" novalidate>
            <!-- Honeypot anti-spam field -->
            <input type="text" name="comment_hp_verify" class="comment-hp-field" tabindex="-1" autocomplete="off" aria-hidden="true" style="display:none!important;">

            <div class="comment-form-row">
              <div class="comment-field-group">
                <label for="comment-author-input" class="comment-field-label">${escapeHTML(nameLabel)} <span class="comment-required">*</span></label>
                <input 
                  type="text" 
                  id="comment-author-input" 
                  class="comment-input" 
                  placeholder="${escapeHTML(namePlaceholder)}" 
                  maxlength="60" 
                  value="${escapeHTML(savedName)}"
                  required 
                  autocomplete="name"
                >
              </div>
            </div>

            <div class="comment-field-group">
              <label for="comment-content-input" class="comment-field-label">${escapeHTML(contentLabel)} <span class="comment-required">*</span></label>
              <textarea 
                id="comment-content-input" 
                class="comment-textarea" 
                placeholder="${escapeHTML(contentPlaceholder)}" 
                rows="4" 
                maxlength="3000" 
                required
              >${escapeHTML(currentTypedContent)}</textarea>
            </div>

            <div class="comment-form-footer">
              <div id="comment-form-feedback" class="comment-feedback" aria-live="polite"></div>
              <button type="submit" id="comment-submit-btn" class="comment-submit-btn" ${isSubmitting ? 'disabled' : ''}>
                ${isSubmitting ? `
                  <svg class="comment-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                ` : `
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                `}
                <span id="comment-submit-btn-text">${escapeHTML(submitBtnText)}</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Lista komentara -->
        ${commentsHtml}
      </div>
    `;

    attachFormListeners();
  }

  /**
   * Renders a single comment card
   */
  function renderCommentCard(comment) {
    const author = comment.author || 'Anonimno';
    const initials = getInitials(author);
    const avatarColor = getAvatarColor(author);
    const formattedDate = formatCommentTime(comment.createdAt);

    return `
      <article class="comment-card" id="comment-${escapeHTML(comment.id)}">
        <div class="comment-header">
          <div class="comment-avatar" style="background-color: ${avatarColor};" aria-hidden="true">
            <span>${escapeHTML(initials)}</span>
          </div>
          <div class="comment-meta">
            <h5 class="comment-author-name">${escapeHTML(author)}</h5>
            <time class="comment-time" datetime="${escapeHTML(comment.createdAt)}" title="${escapeHTML(comment.createdAt)}">
              ${escapeHTML(formattedDate)}
            </time>
          </div>
        </div>
        <div class="comment-body">
          <p class="comment-text">${escapeHTML(comment.content)}</p>
        </div>
      </article>
    `;
  }

  /**
   * Attaches event listeners to the comment form
   */
  function attachFormListeners() {
    const form = document.getElementById('article-comment-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isSubmitting) return;

      const hpInput = form.querySelector('input[name="comment_hp_verify"]');
      if (hpInput && hpInput.value.trim() !== '') {
        // Silent rejection for spam bots
        form.reset();
        return;
      }

      const authorInput = document.getElementById('comment-author-input');
      const contentInput = document.getElementById('comment-content-input');
      const feedback = document.getElementById('comment-form-feedback');

      const author = (authorInput ? authorInput.value : '').trim();
      const content = (contentInput ? contentInput.value : '').trim();

      // Validation
      if (!author || author.length < 2) {
        showFeedback(feedback, t('comments.error_name_empty', 'Molimo unesite vaše ime ili nadimak (minimalno 2 znaka).'), 'error');
        if (authorInput) authorInput.focus();
        return;
      }

      if (!content || content.length < 2) {
        showFeedback(feedback, t('comments.error_content_empty', 'Molimo unesite tekst komentara (minimalno 2 znaka).'), 'error');
        if (contentInput) contentInput.focus();
        return;
      }

      // Rate limit check
      const now = Date.now();
      if (now - lastSubmitTimestamp < RATE_LIMIT_MS) {
        showFeedback(feedback, t('comments.error_rate_limit', 'Molimo pričekajte trenutak prije objave novog komentara.'), 'warning');
        return;
      }

      // Start submission
      isSubmitting = true;
      renderCommentsUI(); // updates button to loading state

      try {
        const newComment = await postComment(currentArticleId, author, content);
        lastSubmitTimestamp = Date.now();

        // Remember author name
        try {
          localStorage.setItem('kus_commenter_name', author);
        } catch (e) {}

        // Add to local array and re-render
        commentsList.unshift(newComment);
        isSubmitting = false;

        renderCommentsUI();

        const newFeedback = document.getElementById('comment-form-feedback');
        showFeedback(newFeedback, t('comments.success_msg', 'Vaš komentar je uspješno objavljen!'), 'success');

        // Scroll newly created comment card into view smoothly
        const newCard = document.getElementById(`comment-${newComment.id}`);
        if (newCard) {
          newCard.classList.add('comment-card-highlight');
          setTimeout(() => newCard.classList.remove('comment-card-highlight'), 3000);
        }
      } catch (error) {
        console.error('Pogreška pri objavi komentara:', error);
        isSubmitting = false;
        renderCommentsUI();
        const newFeedback = document.getElementById('comment-form-feedback');
        showFeedback(newFeedback, t('comments.error_generic', 'Došlo je do pogreške prilikom objave komentara. Molimo pokušajte ponovno.'), 'error');
      }
    });
  }

  /**
   * Helper to display feedback messages
   */
  function showFeedback(el, msg, type = 'info') {
    if (!el) return;
    el.className = `comment-feedback comment-feedback-${type}`;
    el.textContent = msg;
    el.style.display = 'block';

    if (type === 'success') {
      setTimeout(() => {
        if (el) {
          el.style.display = 'none';
          el.textContent = '';
        }
      }, 5000);
    }
  }

  /**
   * Main initializer function
   */
  async function initComments(articleId) {
    const id = articleId || detectArticleId();
    if (!id) return;

    currentArticleId = String(id);
    const section = document.getElementById('comments-section');
    if (!section) return;

    // Show initial skeleton or render state
    renderCommentsUI();

    // Fetch live comments
    commentsList = await fetchComments(currentArticleId);
    renderCommentsUI();
  }

  // Expose to global window
  window.initComments = initComments;

  // Listen to language change to update all labels and formatted dates
  window.addEventListener('languageChanged', () => {
    if (currentArticleId) {
      renderCommentsUI();
    }
  });

  // Auto initialize on DOM ready if article is detected
  document.addEventListener('DOMContentLoaded', () => {
    const id = detectArticleId();
    if (id) {
      initComments(id);
    }
  });
})();
