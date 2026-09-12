/**
 * TechHorizons Blog - Article Detail Page Script
 * Reads the article ID from the URL, fetches articles.json, and renders full content.
 */

let cachedArticle = null;
let cachedAllArticles = [];
let currentUtterance = null;
let ttsSpeed = 1.0;
let ttsState = 'stopped'; // 'stopped' | 'speaking' | 'paused'
let currentTOCScrollspyObserver = null;

document.addEventListener('DOMContentLoaded', () => {
  loadArticleDetail();
  setupResponsiveNav();
  setupReadingProgressBar();
  setupFloatingReaderToolbar(typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'hr');

  window.addEventListener('languageChanged', () => {
    stopSpeechSynthesis();
    const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'hr';
    setupFloatingReaderToolbar(currentLang);
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
  let articleId = (typeof window !== 'undefined' && window.PRELOADED_ARTICLE_ID) ? window.PRELOADED_ARTICLE_ID : urlParams.get('id');
  if (!articleId) {
    const match = window.location.pathname.match(/\/articles\/([^\/\.]+)(?:\.html)?$/i);
    if (match) {
      articleId = decodeURIComponent(match[1]);
    }
  }

  const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'hr';

  if (!articleId) {
    const msg = currentLang === 'en' ? 'No article identifier provided in URL.' : 'Nije naveden identifikator rada u URL adresi.';
    renderNotFound(container, msg);
    return;
  }

  try {
    const jsonPath = window.location.pathname.includes('/articles/') ? '../articles.json' : 'articles.json';
    const response = await fetch(jsonPath);
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

  // Update document title, Open Graph, Twitter Cards and Schema.org JSON-LD for crawlers
  const summaryText = article.excerpt || article.summary || title;
  updateOpenGraphMeta(article, title, summaryText, currentLang);

  const isInsideArticlesDir = window.location.pathname.includes('/articles/');
  const homeUrl = isInsideArticlesDir ? '../index.html' : 'index.html';

  let resolvedImage = image;
  if (resolvedImage && isInsideArticlesDir && !resolvedImage.startsWith('http') && !resolvedImage.startsWith('/') && !resolvedImage.startsWith('../')) {
    resolvedImage = `../${resolvedImage}`;
  }

  let resolvedVideo = (article.video && article.video.trim()) ? article.video.trim() : '';
  if (resolvedVideo && isInsideArticlesDir && !resolvedVideo.startsWith('http') && !resolvedVideo.startsWith('/') && !resolvedVideo.startsWith('../')) {
    resolvedVideo = `../${resolvedVideo}`;
  }

  if (isInsideArticlesDir && contentHTML) {
    contentHTML = contentHTML.replace(/src="img\//g, 'src="../img/');
  }

  const coverHeroHTML = resolvedImage ? `
    <div class="article-cover-wrapper">
      <img src="${escapeHTML(resolvedImage)}" alt="${escapeHTML(title)}" class="article-cover-hero" onerror="this.closest('.article-cover-wrapper').style.display='none'">
    </div>
  ` : '';

  const videoHTML = (resolvedVideo && resolvedVideo.trim()) ? `
    <div class="article-video-container">
      <video controls preload="metadata">
        <source src="${escapeHTML(resolvedVideo.trim())}" type="video/mp4">
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
    <a href="${homeUrl}" class="back-link">${backLinkText}</a>

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

    <!-- Table of Contents (Sadržaj rada) Container -->
    <div id="article-toc-container" class="article-toc-wrapper"></div>

    <!-- Puni HTML Sadržaj Članka -->
    <article class="reader-body" id="reader-body">
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
      <a href="${homeUrl}" class="btn-read-article">${bottomBtnText}</a>
    </footer>
  `;

  // Attach Audio Controller events & Copy link listeners
  setupTTSController(article, currentLang);
  setupCopyLinkListeners(currentLang);

  // Render KaTeX math formulas if present
  renderMathInContainer(container);

  // Initialize Table of Contents (TOC)
  initTableOfContents(currentLang);

  // Setup / update Reading Progress Bar & Floating Toolbar
  setupReadingProgressBar();
  setupFloatingReaderToolbar(currentLang);
}

/**
 * Safely renders LaTeX equations using KaTeX if available
 * @param {HTMLElement} element
 */
function renderMathInContainer(element) {
  if (!element) return;
  const doRender = () => {
    if (typeof renderMathInElement === 'function') {
      try {
        renderMathInElement(element, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ],
          throwOnError: false
        });
      } catch (err) {
        console.warn('KaTeX rendering error:', err);
      }
    }
  };

  if (typeof renderMathInElement === 'function') {
    doRender();
  } else {
    // Retry once KaTeX finishes loading
    window.addEventListener('load', doRender, { once: true });
  }
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
    const isInsideArticlesDir = window.location.pathname.includes('/articles/');
    const itemUrl = isInsideArticlesDir ? `${encodeURIComponent(item.id)}.html` : `articles/${encodeURIComponent(item.id)}.html`;
    let relatedImage = item.image || '';
    if (relatedImage && isInsideArticlesDir && !relatedImage.startsWith('http') && !relatedImage.startsWith('/') && !relatedImage.startsWith('../')) {
      relatedImage = `../${relatedImage}`;
    }

    const mediaHTML = relatedImage ? `
      <div class="related-card-media">
        <img src="${escapeHTML(relatedImage)}" alt="${escapeHTML(title)}" class="related-card-thumb" onerror="this.parentElement.style.display='none'">
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
 * Dynamically updates or inserts Open Graph, Twitter Card, and Schema.org JSON-LD structured metadata
 * @param {Object} article
 * @param {string} title
 * @param {string} description
 * @param {string} [currentLang='hr']
 */
function updateOpenGraphMeta(article, title, description, currentLang = 'hr') {
  const currentUrl = window.location.href;
  const baseUrl = window.location.origin || 'https://keeping-up-singularity.web.app';
  
  // Resolve absolute image URL for external social scrapers
  let fullImageUrl = 'https://keeping-up-singularity.web.app/img/logo.png';
  if (article && article.image && article.image.trim()) {
    const rawImage = article.image.trim();
    if (rawImage.startsWith('http://') || rawImage.startsWith('https://')) {
      fullImageUrl = rawImage;
    } else {
      fullImageUrl = `${baseUrl}/${rawImage.replace(/^\.?\//, '')}`;
    }
  }

  // Update Page Title and Meta Description
  document.title = `${title} - Keeping up with the singularity`;
  setMetaTag('name', 'description', description);
  setMetaTag('name', 'author', 'Keeping up with the singularity');

  // Open Graph
  setMetaTag('property', 'og:type', 'article');
  setMetaTag('property', 'og:site_name', 'Keeping up with the singularity');
  setMetaTag('property', 'og:title', title);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:url', currentUrl);
  setMetaTag('property', 'og:image', fullImageUrl);
  setMetaTag('property', 'og:image:alt', title);
  setMetaTag('property', 'og:locale', currentLang === 'en' ? 'en_US' : 'hr_HR');
  if (article && article.category) {
    setMetaTag('property', 'article:section', article.category);
  }
  if (article && article.date) {
    setMetaTag('property', 'article:published_time', article.date);
  }

  // Twitter Cards
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', title);
  setMetaTag('name', 'twitter:description', description);
  setMetaTag('name', 'twitter:image', fullImageUrl);
  setMetaTag('name', 'twitter:image:alt', title);

  // Canonical Link
  let canonicalEl = document.querySelector('link[rel="canonical"]');
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute('href', currentUrl);

  // Schema.org JSON-LD Structured Data
  updateJsonLdSchema(article, title, description, fullImageUrl, currentUrl);
}

/**
 * Injects or updates Schema.org JSON-LD script for rich search snippets
 */
function updateJsonLdSchema(article, title, description, imageUrl, currentUrl) {
  let scriptEl = document.getElementById('jsonld-article-schema');
  if (!scriptEl) {
    scriptEl = document.createElement('script');
    scriptEl.id = 'jsonld-article-schema';
    scriptEl.type = 'application/ld+json';
    document.head.appendChild(scriptEl);
  }

  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    'headline': title,
    'description': description,
    'image': [imageUrl],
    'datePublished': article && article.date ? article.date : undefined,
    'author': {
      '@type': 'Person',
      'name': 'Toni',
      'jobTitle': 'Editor & Researcher',
      'url': 'https://keeping-up-singularity.web.app/o-autoru.html'
    },
    'publisher': {
      '@type': 'Organization',
      'name': 'Keeping up with the singularity',
      'url': 'https://keeping-up-singularity.web.app',
      'logo': {
        '@type': 'ImageObject',
        'url': 'https://keeping-up-singularity.web.app/img/logo.png'
      }
    },
    'mainEntityOfPage': {
      '@type': 'WebPage',
      '@id': currentUrl
    },
    'articleSection': article && article.category ? article.category : 'Science & Technology'
  };

  scriptEl.textContent = JSON.stringify(schemaData, null, 2);
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
 * Retrieves localized text for UI strings
 */
function getTranslation(key, fallback) {
  const lang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'hr';
  if (typeof translations !== 'undefined' && translations[lang] && translations[lang][key]) {
    return translations[lang][key];
  }
  return fallback;
}
const getTTSTranslation = getTranslation;

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

/**
 * Generates and initializes the Table of Contents (TOC) for the article
 * @param {string} currentLang
 */
function initTableOfContents(currentLang) {
  const tocContainer = document.getElementById('article-toc-container');
  const readerBody = document.getElementById('reader-body');
  if (!tocContainer || !readerBody) return;

  // Disconnect any existing scrollspy observer
  if (currentTOCScrollspyObserver) {
    currentTOCScrollspyObserver.disconnect();
    currentTOCScrollspyObserver = null;
  }

  // Find all headings within the article content
  const headings = Array.from(readerBody.querySelectorAll('h2, h3, h4'));

  // If there are fewer than 2 headings, don't show TOC
  if (headings.length < 2) {
    tocContainer.innerHTML = '';
    return;
  }

  const usedIds = new Set();
  const tocItems = [];

  headings.forEach((heading, index) => {
    let id = heading.id;
    if (!id || !id.trim()) {
      const rawText = heading.textContent.trim();
      let slug = rawText
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\u00C0-\u024F\u1E00-\u1EFF-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (!slug) slug = `section-${index + 1}`;
      let finalId = slug;
      let counter = 2;
      while (usedIds.has(finalId) || document.getElementById(finalId)) {
        finalId = `${slug}-${counter++}`;
      }
      heading.id = finalId;
      id = finalId;
    }
    usedIds.add(id);

    const level = heading.tagName.toLowerCase();
    tocItems.push({
      id,
      text: heading.textContent.trim(),
      level
    });
  });

  const title = getTranslation('toc.title', currentLang === 'en' ? 'Table of Contents' : 'Sadržaj rada');
  const toggleHideText = getTranslation('toc.toggle_hide', currentLang === 'en' ? 'Hide' : 'Sakrij');
  const toggleShowText = getTranslation('toc.toggle_show', currentLang === 'en' ? 'Show' : 'Prikaži');
  const ariaLabel = getTranslation('toc.aria_label', currentLang === 'en' ? 'Table of contents' : 'Sadržaj članka');

  const itemsHTML = tocItems.map(item => {
    const isSub = item.level === 'h4' ? 'toc-sub-item' : 'toc-main-item';
    return `
      <li class="article-toc-item ${isSub}" data-level="${item.level}">
        <a href="#${escapeHTML(item.id)}" class="article-toc-link" data-toc-target="${escapeHTML(item.id)}">
          <span class="toc-link-text">${escapeHTML(item.text)}</span>
        </a>
      </li>
    `;
  }).join('');

  tocContainer.innerHTML = `
    <nav class="article-toc-card" aria-label="${escapeHTML(ariaLabel)}">
      <div class="article-toc-header">
        <div class="article-toc-title-group">
          <svg class="article-toc-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
          <h2 class="article-toc-title">${escapeHTML(title)}</h2>
          <span class="article-toc-badge">${tocItems.length}</span>
        </div>
        <button type="button" class="article-toc-toggle-btn" id="toc-toggle-btn" aria-expanded="true" aria-controls="article-toc-body" aria-label="${escapeHTML(toggleHideText)}">
          <span class="toc-toggle-text">${escapeHTML(toggleHideText)}</span>
          <svg class="toc-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>
      <div class="article-toc-body" id="article-toc-body">
        <ol class="article-toc-list">
          ${itemsHTML}
        </ol>
      </div>
    </nav>
  `;

  // Toggle Collapse/Expand listener
  const toggleBtn = document.getElementById('toc-toggle-btn');
  const tocCard = tocContainer.querySelector('.article-toc-card');
  const toggleText = toggleBtn ? toggleBtn.querySelector('.toc-toggle-text') : null;

  if (toggleBtn && tocCard) {
    toggleBtn.addEventListener('click', () => {
      const isCollapsed = tocCard.classList.toggle('collapsed');
      toggleBtn.setAttribute('aria-expanded', !isCollapsed);
      if (toggleText) {
        toggleText.textContent = isCollapsed ? toggleShowText : toggleHideText;
      }
      toggleBtn.setAttribute('aria-label', isCollapsed ? toggleShowText : toggleHideText);
    });
  }

  // Smooth Scroll Click Handlers
  const tocLinks = tocContainer.querySelectorAll('.article-toc-link');
  tocLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('data-toc-target');
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (history.pushState) {
          history.pushState(null, null, `#${targetId}`);
        } else {
          location.hash = targetId;
        }
      }
    });
  });

  // Setup Scrollspy
  setupTOCScrollspy(headings, tocLinks);

  // If page loaded with a hash in URL, smooth scroll to it
  if (window.location.hash) {
    const hashId = decodeURIComponent(window.location.hash.substring(1));
    const targetEl = document.getElementById(hashId);
    if (targetEl) {
      setTimeout(() => {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }
}

/**
 * Sets up IntersectionObserver for highlighting the active TOC link while scrolling
 * @param {Array<HTMLElement>} headings
 * @param {NodeList} tocLinks
 */
function setupTOCScrollspy(headings, tocLinks) {
  if (!window.IntersectionObserver || headings.length === 0 || tocLinks.length === 0) return;

  const visibleHeadings = new Map();

  currentTOCScrollspyObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      visibleHeadings.set(entry.target.id, entry.isIntersecting);
    });

    // Find the first heading that is currently intersecting
    let activeId = null;
    for (const h of headings) {
      if (visibleHeadings.get(h.id)) {
        activeId = h.id;
        break;
      }
    }

    // If none are currently intersecting, check which one was last passed above the viewport
    if (!activeId) {
      const scrollY = window.scrollY || window.pageYOffset;
      for (let i = headings.length - 1; i >= 0; i--) {
        const top = headings[i].getBoundingClientRect().top + scrollY;
        if (scrollY >= top - 120) {
          activeId = headings[i].id;
          break;
        }
      }
    }

    if (activeId) {
      tocLinks.forEach(link => {
        if (link.getAttribute('data-toc-target') === activeId) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }
  }, {
    rootMargin: '-70px 0px -60% 0px',
    threshold: 0
  });

  headings.forEach(h => currentTOCScrollspyObserver.observe(h));
}

/* ==========================================================================
   Reading Progress Bar & Floating Toolbar Controllers
   ========================================================================== */

let isProgressBarTicking = false;
let isToolbarTicking = false;

const FONT_SIZES = [
  { id: 'normal', size: '1.05rem', label: 'Aa' },
  { id: 'large', size: '1.18rem', label: 'A+' },
  { id: 'xlarge', size: '1.30rem', label: 'A++' }
];
let currentFontSizeIndex = 0;

/**
 * Initializes saved font size preference from localStorage
 */
function initReaderFontSize() {
  try {
    const saved = localStorage.getItem('reader-font-size');
    if (saved) {
      const foundIdx = FONT_SIZES.findIndex(f => f.id === saved);
      if (foundIdx !== -1) {
        currentFontSizeIndex = foundIdx;
      }
    }
    applyReaderFontSize();
  } catch (e) {
    // localStorage might be unavailable in some private contexts
  }
}

/**
 * Applies the current font size to the reader body
 */
function applyReaderFontSize() {
  const current = FONT_SIZES[currentFontSizeIndex];
  document.documentElement.style.setProperty('--reader-font-size', current.size);
  const indicator = document.getElementById('floating-font-indicator');
  if (indicator) {
    indicator.textContent = current.label;
  }
  try {
    localStorage.setItem('reader-font-size', current.id);
  } catch (e) {}
}

/**
 * Cycles through available font sizes (Standard -> Large -> Extra Large -> Standard)
 */
function cycleReaderFontSize() {
  currentFontSizeIndex = (currentFontSizeIndex + 1) % FONT_SIZES.length;
  applyReaderFontSize();
}

/**
 * Sets up and manages the reading progress bar at the bottom of the navigation bar
 */
function setupReadingProgressBar() {
  const progressBar = document.getElementById('reading-progress-bar');
  if (!progressBar) return;

  const updateProgress = () => {
    const readerBody = document.getElementById('reader-body');
    if (!readerBody) {
      progressBar.style.width = '0%';
      isProgressBarTicking = false;
      return;
    }

    const rect = readerBody.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const bodyHeight = readerBody.offsetHeight;
    const navHeight = 64;

    const startOffset = rect.top - navHeight;
    const totalDistance = bodyHeight - (windowHeight - navHeight);

    if (totalDistance <= 0) {
      progressBar.style.width = '100%';
      progressBar.setAttribute('aria-valuenow', 100);
      isProgressBarTicking = false;
      return;
    }

    let progress = (-startOffset / totalDistance) * 100;
    progress = Math.max(0, Math.min(100, progress));

    progressBar.style.width = `${progress.toFixed(1)}%`;
    progressBar.setAttribute('aria-valuenow', Math.round(progress));

    isProgressBarTicking = false;
  };

  window.addEventListener('scroll', () => {
    if (!isProgressBarTicking) {
      window.requestAnimationFrame(updateProgress);
      isProgressBarTicking = true;
    }
  }, { passive: true });

  window.addEventListener('resize', () => {
    if (!isProgressBarTicking) {
      window.requestAnimationFrame(updateProgress);
      isProgressBarTicking = true;
    }
  }, { passive: true });

  updateProgress();
}

/**
 * Sets up the floating quick navigation toolbar (Scroll-to-top, TOC Jump, Font Size)
 * @param {string} [currentLang='hr']
 */
function setupFloatingReaderToolbar(currentLang = 'hr') {
  const toolbar = document.getElementById('reader-floating-toolbar');
  const topBtn = document.getElementById('floating-top-btn');
  const tocBtn = document.getElementById('floating-toc-btn');
  const fontBtn = document.getElementById('floating-font-btn');

  if (!toolbar) return;

  // Localized tooltips and aria-labels
  const topText = getTranslation('reader.back_to_top', currentLang === 'en' ? 'Back to top' : 'Vrh stranice');
  const tocText = getTranslation('reader.toc_jump', currentLang === 'en' ? 'Table of Contents' : 'Sadržaj rada');
  const fontText = getTranslation('reader.font_size', currentLang === 'en' ? 'Text size' : 'Veličina teksta');
  const progressAria = getTranslation('reader.progress_aria', currentLang === 'en' ? 'Reading progress' : 'Napredak čitanja');

  const progressBar = document.getElementById('reading-progress-bar');
  if (progressBar) {
    progressBar.setAttribute('aria-label', progressAria);
  }

  if (topBtn) {
    topBtn.setAttribute('aria-label', topText);
    const tip = document.getElementById('floating-top-tooltip');
    if (tip) tip.textContent = topText;
  }
  if (tocBtn) {
    tocBtn.setAttribute('aria-label', tocText);
    const tip = document.getElementById('floating-toc-tooltip');
    if (tip) tip.textContent = tocText;
  }
  if (fontBtn) {
    fontBtn.setAttribute('aria-label', fontText);
    const tip = document.getElementById('floating-font-tooltip');
    if (tip) tip.textContent = fontText;
  }

  // Scroll listener for showing/hiding floating toolbar
  const checkToolbarVisibility = () => {
    const scrollY = window.scrollY || window.pageYOffset;
    if (scrollY > 350) {
      toolbar.classList.add('visible');
    } else {
      toolbar.classList.remove('visible');
    }
    isToolbarTicking = false;
  };

  window.addEventListener('scroll', () => {
    if (!isToolbarTicking) {
      window.requestAnimationFrame(checkToolbarVisibility);
      isToolbarTicking = true;
    }
  }, { passive: true });

  checkToolbarVisibility();

  // Scroll to top click action
  if (topBtn) {
    topBtn.onclick = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  }

  // Jump to Table of Contents click action
  if (tocBtn) {
    tocBtn.onclick = () => {
      const tocContainer = document.getElementById('article-toc-container');
      if (tocContainer) {
        const tocCard = tocContainer.querySelector('.article-toc-card');
        const toggleBtn = document.getElementById('toc-toggle-btn');
        if (tocCard && tocCard.classList.contains('collapsed')) {
          tocCard.classList.remove('collapsed');
          if (toggleBtn) {
            toggleBtn.setAttribute('aria-expanded', 'true');
            const toggleText = toggleBtn.querySelector('.toc-toggle-text');
            if (toggleText) {
              toggleText.textContent = getTranslation('toc.toggle_hide', currentLang === 'en' ? 'Hide' : 'Sakrij');
            }
          }
        }
        tocContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
  }

  // Font size toggle click action
  if (fontBtn) {
    fontBtn.onclick = () => {
      cycleReaderFontSize();
    };
  }

  initReaderFontSize();
}


