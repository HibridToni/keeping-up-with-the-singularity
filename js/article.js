/**
 * TechHorizons Blog - Article Detail Page Script
 * Reads the article ID from the URL, fetches articles.json, and renders full content.
 */

let cachedArticle = null;
let cachedAllArticles = [];
let currentUtterance = null;
let ttsSpeed = 1.0;
let ttsState = 'stopped'; // 'stopped' | 'speaking' | 'paused'

document.addEventListener('DOMContentLoaded', () => {
  loadArticleDetail();
  setupResponsiveNav();

  window.addEventListener('languageChanged', () => {
    stopSpeechSynthesis();
    if (cachedArticle) {
      const container = document.getElementById('article-reader-container');
      if (container) {
        renderArticleContent(container, cachedArticle, cachedAllArticles);
      }
    }
  });

  window.addEventListener('beforeunload', () => stopSpeechSynthesis());
  window.addEventListener('pagehide', () => stopSpeechSynthesis());
});

/**
 * Calculates estimated reading time based on actual content word count
 * (standard 200 words per minute for scientific/technical articles)
 * @param {string} content
 * @param {string} lang
 * @returns {string} Formatted reading time string
 */
function calculateReadingTime(content, lang = 'hr') {
  if (!content || typeof content !== 'string') {
    return lang === 'en' ? '⏱ 3 min read' : '⏱ 3 min čitanja';
  }
  const plainText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = plainText ? plainText.split(/\s+/).length : 0;
  const minutes = Math.max(1, Math.ceil(wordCount / 200));
  return lang === 'en' ? `⏱ ${minutes} min read` : `⏱ ${minutes} min čitanja`;
}

/**
 * Main function to load and render article details
 */
async function loadArticleDetail() {
  const container = document.getElementById('article-reader-container');
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const articleId = urlParams.get('id');

  const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'hr';

  if (!articleId) {
    const msg = currentLang === 'en' ? 'No article identifier provided in URL.' : 'Nije naveden identifikator rada u URL adresi.';
    renderNotFound(container, msg);
    return;
  }

  try {
    const response = await fetch('articles.json');
    if (!response.ok) {
      throw new Error(`Pogreška pri učitavanju: ${response.status} ${response.statusText}`);
    }

    const articles = await response.json();
    const article = articles.find(item => String(item.id) === String(articleId));

    if (!article) {
      const msg = currentLang === 'en' ? `Article with ID "${articleId}" was not found.` : `Članak s ID oznakom "${articleId}" nije pronađen.`;
      renderNotFound(container, msg);
      return;
    }

    cachedAllArticles = articles;
    cachedArticle = article;
    renderArticleContent(container, article, articles);
  } catch (error) {
    console.error('Pogreška pri dohvaćanju članka:', error);
    const msg = currentLang === 'en' ? 'Unable to load article data. Please check "articles.json".' : 'Nije moguće učitati podatke rada. Provjerite datoteku "articles.json".';
    renderNotFound(container, msg);
  }
}

/**
 * Renders the full article details into the reading container
 * @param {HTMLElement} container - Target DOM node
 * @param {Object} article - Article data object
 * @param {Array} [allArticles=[]] - All available articles for related recommendations
 */
function renderArticleContent(container, article, allArticles = []) {
  const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'hr';

  // Pragmatic language fallback logic
  const title = (currentLang === 'en' && article.title_en) ? article.title_en : (article.title || 'Naslov rada nedostupan');
  const category = (currentLang === 'en' && article.category_en) ? article.category_en : (article.category || 'Općenito');
  const date = article.date || 'Nepoznat datum';
  
  let contentHTML = article.content || `<p>${escapeHTML(article.excerpt || article.summary || 'Sadržaj rada nije dostupan.')}</p>`;
  if (currentLang === 'en' && article.content_en) {
    contentHTML = article.content_en;
  }

  // Dynamic calculated reading time based on full content
  const readTime = calculateReadingTime(contentHTML, currentLang);
  const doi = article.doi || '';
  const image = article.image || '';

  const backLinkText = currentLang === 'en' ? '&larr; Back to all articles' : '&larr; Natrag na sve radove';
  const bottomBtnText = currentLang === 'en' ? '&larr; Back to summary list' : '&larr; Povratak na popis sažetaka';

  // Dynamic share URL generation
  const shareUrl = encodeURIComponent(window.location.href);
  const shareTitle = encodeURIComponent(title);

  const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareTitle}`;
  const xShareUrl = `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`;
  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`;

  const copyAria = currentLang === 'en' ? 'Copy article link' : 'Kopiraj poveznicu na rad';
  const copyTooltipText = currentLang === 'en' ? 'Link copied!' : 'Poveznica kopirana!';
  const copyBtnLabel = currentLang === 'en' ? 'Copy link' : 'Kopiraj poveznicu';
  const shareBoxLabel = currentLang === 'en' ? 'Share this paper:' : 'Podijeli ovaj rad:';
  const fbAria = currentLang === 'en' ? 'Share on Facebook' : 'Podijeli na Facebooku';
  const xAria = currentLang === 'en' ? 'Share on X (Twitter)' : 'Podijeli na X-u (Twitter)';
  const linkedinAria = currentLang === 'en' ? 'Share on LinkedIn' : 'Podijeli na LinkedInu';

  // Update document title and Open Graph meta tags for social crawlers
  document.title = `${title} - Keeping up with the singularity`;
  const summaryText = article.excerpt || article.summary || title;
  updateOpenGraphMeta(title, summaryText, window.location.href, image);

  const coverHeroHTML = image ? `
    <div class="article-cover-wrapper">
      <img src="${escapeHTML(image)}" alt="${escapeHTML(title)}" class="article-cover-hero" onerror="this.closest('.article-cover-wrapper').style.display='none'">
    </div>
  ` : '';

  const videoHTML = (article.video && article.video.trim()) ? `
    <div class="article-video-container">
      <video controls preload="metadata">
        <source src="${escapeHTML(article.video.trim())}" type="video/mp4">
        Vaš preglednik ne podržava HTML5 video element.
      </video>
    </div>
  ` : '';

  if (videoHTML) {
    if (contentHTML.includes('</p>')) {
      contentHTML = contentHTML.replace('</p>', `</p>${videoHTML}`);
    } else {
      contentHTML += videoHTML;
    }
  }

  // Related articles section HTML
  const relatedArticlesHTML = renderRelatedArticles(article, allArticles.length > 0 ? allArticles : cachedAllArticles, currentLang);

  container.innerHTML = `
    <!-- Link za povratak -->
    <a href="index.html" class="back-link">${backLinkText}</a>

    <!-- Zaglavlje rada -->
    <header class="reader-header">
      <div class="reader-meta">
        <span class="card-category">${escapeHTML(category)}</span>
      </div>

      <h1 class="reader-title">${escapeHTML(title)}</h1>

      <div class="reader-submeta">
        <div class="reader-submeta-info">
          <time class="card-date" datetime="${escapeHTML(date)}">${escapeHTML(date)}</time>
          <span class="card-read-time">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            ${escapeHTML(readTime)}
          </span>
          ${doi ? `<span class="card-doi">${escapeHTML(doi)}</span>` : ''}
        </div>

        <div class="share-buttons">
          <button type="button" class="share-btn share-copy btn-trigger-copy" aria-label="${escapeHTML(copyAria)}" title="${escapeHTML(copyAria)}">
            <span class="copy-tooltip">${escapeHTML(copyTooltipText)}</span>
            <svg class="icon-link" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            <svg class="icon-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: none; color: #10b981;">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
          <a href="${xShareUrl}" target="_blank" rel="noopener noreferrer" class="share-btn share-x" aria-label="${escapeHTML(xAria)}" title="${escapeHTML(xAria)}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          <a href="${linkedinShareUrl}" target="_blank" rel="noopener noreferrer" class="share-btn share-linkedin" aria-label="${escapeHTML(linkedinAria)}" title="${escapeHTML(linkedinAria)}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-1.13.72-1.8 1.63-1.8.84 0 1.33.56 1.33 1.8v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
            </svg>
          </a>
          <a href="${fbShareUrl}" target="_blank" rel="noopener noreferrer" class="share-btn share-fb" aria-label="${escapeHTML(fbAria)}" title="${escapeHTML(fbAria)}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </a>
        </div>
      </div>

      ${coverHeroHTML}
    </header>

    <!-- Audio Player Bar (Preslušavanje članka) -->
    <div class="audio-player-bar" id="audio-player-bar" aria-label="${getTTSTranslation('tts.listen', 'Slušaj članak')}">
      <div class="audio-controls-left">
        <button id="tts-play-btn" class="audio-btn audio-btn-play" aria-label="${getTTSTranslation('tts.play', 'Pokreni čitanje')}" title="${getTTSTranslation('tts.play', 'Pokreni čitanje')}">
          <svg class="icon-play" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="6,4 20,12 6,20"></polygon>
          </svg>
          <svg class="icon-pause" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display:none;">
            <rect x="6" y="4" width="4" height="16" rx="1"></rect>
            <rect x="14" y="4" width="4" height="16" rx="1"></rect>
          </svg>
        </button>
        <button id="tts-stop-btn" class="audio-btn audio-btn-stop" aria-label="${getTTSTranslation('tts.stop', 'Zaustavi čitanje')}" title="${getTTSTranslation('tts.stop', 'Zaustavi čitanje')}" disabled>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="4" y="4" width="16" height="16" rx="2"></rect>
          </svg>
        </button>
      </div>

      <div class="audio-status-container">
        <span class="audio-status-pulse" id="tts-status-pulse"></span>
        <span id="tts-status-text" class="audio-status-text">${getTTSTranslation('tts.listen', 'Slušaj članak')}</span>
      </div>

      <div class="audio-speed-controls">
        <span class="speed-label">${getTTSTranslation('tts.speed', 'Brzina:')}</span>
        <div class="speed-options">
          <button class="speed-btn ${ttsSpeed === 1.0 ? 'active' : ''}" data-speed="1.0">1x</button>
          <button class="speed-btn ${ttsSpeed === 1.25 ? 'active' : ''}" data-speed="1.25">1.25x</button>
          <button class="speed-btn ${ttsSpeed === 1.5 ? 'active' : ''}" data-speed="1.5">1.5x</button>
        </div>
      </div>
    </div>

    <!-- Puni HTML Sadržaj Članka -->
    <article class="reader-body">
      ${contentHTML}
    </article>

    <!-- Donji Share Blok -->
    <div class="reader-share-box">
      <div class="reader-share-info">
        <span class="reader-share-label">${escapeHTML(shareBoxLabel)}</span>
      </div>
      <div class="reader-share-actions">
        <button type="button" class="btn-copy-link btn-trigger-copy" aria-label="${escapeHTML(copyAria)}">
          <span class="copy-tooltip">${escapeHTML(copyTooltipText)}</span>
          <svg class="icon-link" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
          <svg class="icon-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: none; color: #10b981;">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span class="copy-btn-text">${escapeHTML(copyBtnLabel)}</span>
        </button>
        <a href="${xShareUrl}" target="_blank" rel="noopener noreferrer" class="share-btn share-x" aria-label="${escapeHTML(xAria)}" title="${escapeHTML(xAria)}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </a>
        <a href="${linkedinShareUrl}" target="_blank" rel="noopener noreferrer" class="share-btn share-linkedin" aria-label="${escapeHTML(linkedinAria)}" title="${escapeHTML(linkedinAria)}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-1.13.72-1.8 1.63-1.8.84 0 1.33.56 1.33 1.8v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
          </svg>
        </a>
        <a href="${fbShareUrl}" target="_blank" rel="noopener noreferrer" class="share-btn share-fb" aria-label="${escapeHTML(fbAria)}" title="${escapeHTML(fbAria)}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        </a>
      </div>
    </div>

    <!-- Povezani članci sekcija -->
    ${relatedArticlesHTML}

    <!-- Fusnota i povratak -->
    <footer class="reader-footer">
      <a href="index.html" class="btn-read-article">${bottomBtnText}</a>
    </footer>
  `;

  // Attach Audio Controller events & Copy link listeners
  setupTTSController(article, currentLang);
  setupCopyLinkListeners(currentLang);
}

/**
 * Generates HTML for related articles recommendation section
 * @param {Object} currentArticle
 * @param {Array} allArticles
 * @param {string} currentLang
 * @returns {string}
 */
function renderRelatedArticles(currentArticle, allArticles, currentLang) {
  if (!allArticles || allArticles.length <= 1) return '';

  const currentCatSlug = (currentArticle.categorySlug || '').toLowerCase().trim();
  const currentCat = (currentArticle.category || '').toLowerCase().trim();

  // Filter out current article
  const otherArticles = allArticles.filter(item => String(item.id) !== String(currentArticle.id));

  // Prioritize articles from the same category
  const sameCategory = otherArticles.filter(item => {
    const slug = (item.categorySlug || '').toLowerCase().trim();
    const cat = (item.category || '').toLowerCase().trim();
    return (currentCatSlug && slug === currentCatSlug) || (currentCat && cat === currentCat);
  });

  const differentCategory = otherArticles.filter(item => !sameCategory.includes(item));

  // Pick up to 3 related articles
  const relatedList = [...sameCategory, ...differentCategory].slice(0, 3);
  if (relatedList.length === 0) return '';

  const overline = currentLang === 'en' ? 'RECOMMENDED READING' : 'PREPORUČENO ČITANJE';
  const heading = currentLang === 'en' ? 'Related Papers & Publications' : 'Povezani radovi i publikacije';
  const readMoreText = currentLang === 'en' ? 'Read article &rarr;' : 'Pročitaj rad &rarr;';

  const cardsHTML = relatedList.map(item => {
    const title = (currentLang === 'en' && item.title_en) ? item.title_en : (item.title || 'Naslov');
    const category = (currentLang === 'en' && item.category_en) ? item.category_en : (item.category || 'Općenito');
    const excerpt = (currentLang === 'en' && (item.excerpt_en || item.summary_en)) 
      ? (item.excerpt_en || item.summary_en) 
      : (item.excerpt || item.summary || '');
    const rawContent = (currentLang === 'en' && item.content_en) ? item.content_en : (item.content || excerpt);
    const readTime = calculateReadingTime(rawContent, currentLang);
    const itemUrl = `article.html?id=${item.id}`;
    const image = item.image || '';

    const mediaHTML = image ? `
      <div class="related-card-media">
        <img src="${escapeHTML(image)}" alt="${escapeHTML(title)}" class="related-card-thumb" onerror="this.parentElement.style.display='none'">
      </div>
    ` : '';

    return `
      <a href="${itemUrl}" class="related-card">
        ${mediaHTML}
        <div class="related-card-content">
          <div class="related-card-meta">
            <span class="related-category">${escapeHTML(category)}</span>
            <span class="related-read-time">${escapeHTML(readTime)}</span>
          </div>
          <h4 class="related-card-title">${escapeHTML(title)}</h4>
          <p class="related-card-excerpt">${escapeHTML(excerpt)}</p>
          <div class="related-card-footer">
            <span>${readMoreText}</span>
          </div>
        </div>
      </a>
    `;
  }).join('');

  return `
    <section class="related-articles-section" aria-labelledby="related-heading">
      <div class="related-header">
        <span class="related-overline">${escapeHTML(overline)}</span>
        <h3 id="related-heading" class="related-title">${escapeHTML(heading)}</h3>
      </div>
      <div class="related-grid">
        ${cardsHTML}
      </div>
    </section>
  `;
}

/**
 * Attaches event listeners for 1-click URL copying with visual tooltip feedback
 */
function setupCopyLinkListeners(currentLang) {
  const copyButtons = document.querySelectorAll('.btn-trigger-copy');
  copyButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await navigator.clipboard.writeText(window.location.href);
        
        btn.classList.add('copied');
        const tooltip = btn.querySelector('.copy-tooltip');
        if (tooltip) tooltip.classList.add('show');

        const linkIcon = btn.querySelector('.icon-link');
        const checkIcon = btn.querySelector('.icon-check');
        if (linkIcon) linkIcon.style.display = 'none';
        if (checkIcon) checkIcon.style.display = 'block';

        setTimeout(() => {
          btn.classList.remove('copied');
          if (tooltip) tooltip.classList.remove('show');
          if (linkIcon) linkIcon.style.display = 'block';
          if (checkIcon) checkIcon.style.display = 'none';
        }, 2000);
      } catch (err) {
        console.error('Kopiranje poveznice nije uspjelo:', err);
      }
    });
  });
}

/**
 * Displays fall-back message when article is not found
 */
function renderNotFound(container, message) {
  const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'hr';
  const backLinkText = currentLang === 'en' ? '&larr; Back to all articles' : '&larr; Natrag na sve radove';
  const headingText = currentLang === 'en' ? 'Article not found' : 'Rad nije pronađen';

  container.innerHTML = `
    <a href="index.html" class="back-link">${backLinkText}</a>
    <div class="error-state" style="margin-top: 24px;">
      <h3>${headingText}</h3>
      <p>${escapeHTML(message)}</p>
    </div>
  `;
}


/**
 * Responsive Hamburger Menu Handler for Mobile Devices
 */
function setupResponsiveNav() {
  const toggleBtn = document.getElementById('hamburger-toggle');
  const navMenu = document.getElementById('nav-menu');
  if (!toggleBtn || !navMenu) return;

  toggleBtn.addEventListener('click', () => {
    const isOpen = navMenu.classList.contains('active');
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  const navLinks = navMenu.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeMenu();
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  function openMenu() {
    toggleBtn.classList.add('active');
    navMenu.classList.add('active');
    toggleBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    toggleBtn.classList.remove('active');
    navMenu.classList.remove('active');
    toggleBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
}

/**
 * Helper to escape plain text inputs
 */
function escapeHTML(str) {
  if (typeof str !== 'string') return str;
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
 * Dynamically updates or inserts Open Graph and Twitter Card meta tags
 */
function updateOpenGraphMeta(title, description, url, image) {
  setMetaTag('property', 'og:title', title);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:url', url);
  setMetaTag('property', 'og:type', 'article');
  if (image) {
    try {
      const fullImageUrl = new URL(image, window.location.href).href;
      setMetaTag('property', 'og:image', fullImageUrl);
    } catch (e) {
      setMetaTag('property', 'og:image', image);
    }
  }
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', title);
  setMetaTag('name', 'twitter:description', description);
}

/**
 * Helper to set or create a meta tag in document head
 */
function setMetaTag(attrName, attrValue, content) {
  let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content || '');
}

/* ==========================================================================
   Text-to-Speech (TTS) Controller Functions
   ========================================================================== */

/**
 * Strips HTML tags and Markdown formatting to produce clean text for SpeechSynthesis.
 * @param {string} title - Article title
 * @param {string} rawContent - Raw HTML/Markdown content of the article
 * @returns {string} Clean plain text suitable for TTS
 */
function cleanArticleText(title, rawContent) {
  let text = rawContent || '';

  // 1. Create a temporary element to strip HTML tags
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = text;
  text = tempDiv.textContent || tempDiv.innerText || '';

  // 2. Strip common Markdown syntax markers
  text = text
    .replace(/^#+\s+/gm, '')                  // Headings (# Heading)
    .replace(/(\*\*|__)(.*?)\1/g, '$2')      // Bold
    .replace(/(\*|_)(.*?)\1/g, '$2')         // Italics
    .replace(/~~(.*?)~~/g, '$1')             // Strikethrough
    .replace(/```[\s\S]*?```/g, '')          // Multi-line code blocks
    .replace(/`([^`]+)`/g, '$1')             // Inline code
    .replace(/^[\s]*[-\*\+]\s+/gm, '')        // Unordered list items
    .replace(/^[\s]*\d+\.\s+/gm, '')         // Ordered list items
    .replace(/^>\s+/gm, '')                  // Blockquotes
    .replace(/^[-*_]{3,}\s*$/gm, '');        // Horizontal rules

  // 3. Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // Combine title and article body text
  return title ? `${title}. ${text}` : text;
}

/**
 * Retrieves localized text for TTS UI strings
 */
function getTTSTranslation(key, fallback) {
  const lang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'hr';
  if (typeof translations !== 'undefined' && translations[lang] && translations[lang][key]) {
    return translations[lang][key];
  }
  return fallback;
}

/**
 * Initializes listeners for Audio Player Bar buttons and controls
 */
function setupTTSController(article, currentLang) {
  const playBtn = document.getElementById('tts-play-btn');
  const stopBtn = document.getElementById('tts-stop-btn');
  const statusText = document.getElementById('tts-status-text');
  const speedBtns = document.querySelectorAll('.speed-btn');

  if (!playBtn || !stopBtn) return;

  if (!('speechSynthesis' in window)) {
    if (statusText) statusText.textContent = getTTSTranslation('tts.unsupported', 'Govorna sinteza nije podržana');
    playBtn.disabled = true;
    return;
  }

  updateTTSUIState(ttsState);

  playBtn.addEventListener('click', () => {
    if (ttsState === 'speaking') {
      window.speechSynthesis.pause();
      ttsState = 'paused';
      updateTTSUIState('paused');
    } else if (ttsState === 'paused') {
      window.speechSynthesis.resume();
      ttsState = 'speaking';
      updateTTSUIState('speaking');
    } else {
      startSpeechSynthesis(article, currentLang);
    }
  });

  stopBtn.addEventListener('click', () => {
    stopSpeechSynthesis();
  });

  speedBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const newSpeed = parseFloat(e.currentTarget.dataset.speed);
      if (isNaN(newSpeed)) return;

      ttsSpeed = newSpeed;
      speedBtns.forEach(b => b.classList.toggle('active', parseFloat(b.dataset.speed) === ttsSpeed));

      if (ttsState === 'speaking' || ttsState === 'paused') {
        window.speechSynthesis.cancel();
        startSpeechSynthesis(article, currentLang);
      }
    });
  });
}

/**
 * Starts SpeechSynthesis with clean article text in specified language
 */
function startSpeechSynthesis(article, currentLang) {
  if (!('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();

  const title = (currentLang === 'en' && article.title_en) ? article.title_en : (article.title || '');
  let rawContent = article.content || article.excerpt || article.summary || '';
  if (currentLang === 'en' && article.content_en) {
    rawContent = article.content_en;
  }

  const cleanText = cleanArticleText(title, rawContent);
  if (!cleanText) return;

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = currentLang === 'en' ? 'en-US' : 'hr-HR';
  utterance.rate = ttsSpeed;

  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    const targetPrefix = currentLang === 'en' ? 'en' : 'hr';
    const matchingVoice = voices.find(v => v.lang.toLowerCase().startsWith(targetPrefix));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }
  }

  utterance.onstart = () => {
    ttsState = 'speaking';
    updateTTSUIState('speaking');
  };

  utterance.onpause = () => {
    ttsState = 'paused';
    updateTTSUIState('paused');
  };

  utterance.onresume = () => {
    ttsState = 'speaking';
    updateTTSUIState('speaking');
  };

  utterance.onend = () => {
    ttsState = 'stopped';
    currentUtterance = null;
    updateTTSUIState('stopped');
  };

  utterance.onerror = (e) => {
    console.warn('SpeechSynthesis event error:', e);
    ttsState = 'stopped';
    currentUtterance = null;
    updateTTSUIState('stopped');
  };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}

/**
 * Cancels active SpeechSynthesis and resets state
 */
function stopSpeechSynthesis() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  ttsState = 'stopped';
  currentUtterance = null;
  updateTTSUIState('stopped');
}

/**
 * Updates UI elements in player bar based on current playback state
 */
function updateTTSUIState(state) {
  const playBtn = document.getElementById('tts-play-btn');
  const stopBtn = document.getElementById('tts-stop-btn');
  const statusText = document.getElementById('tts-status-text');
  const pulseDot = document.getElementById('tts-status-pulse');

  if (!playBtn || !stopBtn) return;

  const playIcon = playBtn.querySelector('.icon-play');
  const pauseIcon = playBtn.querySelector('.icon-pause');

  if (state === 'speaking') {
    if (playIcon) playIcon.style.display = 'none';
    if (pauseIcon) pauseIcon.style.display = 'block';
    stopBtn.disabled = false;
    if (statusText) statusText.textContent = getTTSTranslation('tts.reading', 'Čitanje u tijeku...');
    if (pulseDot) {
      pulseDot.classList.add('active');
      pulseDot.classList.remove('paused');
    }
    playBtn.setAttribute('aria-label', getTTSTranslation('tts.pause', 'Pauziraj čitanje'));
    playBtn.setAttribute('title', getTTSTranslation('tts.pause', 'Pauziraj čitanje'));
  } else if (state === 'paused') {
    if (playIcon) playIcon.style.display = 'block';
    if (pauseIcon) pauseIcon.style.display = 'none';
    stopBtn.disabled = false;
    if (statusText) statusText.textContent = getTTSTranslation('tts.paused', 'Pauzirano');
    if (pulseDot) {
      pulseDot.classList.add('active', 'paused');
    }
    playBtn.setAttribute('aria-label', getTTSTranslation('tts.play', 'Pokreni čitanje'));
    playBtn.setAttribute('title', getTTSTranslation('tts.play', 'Pokreni čitanje'));
  } else {
    // stopped
    if (playIcon) playIcon.style.display = 'block';
    if (pauseIcon) pauseIcon.style.display = 'none';
    stopBtn.disabled = true;
    if (statusText) statusText.textContent = getTTSTranslation('tts.listen', 'Slušaj članak');
    if (pulseDot) {
      pulseDot.classList.remove('active', 'paused');
    }
    playBtn.setAttribute('aria-label', getTTSTranslation('tts.play', 'Pokreni čitanje'));
    playBtn.setAttribute('title', getTTSTranslation('tts.play', 'Pokreni čitanje'));
  }
}
