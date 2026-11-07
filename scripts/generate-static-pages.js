import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const BASE_URL = 'https://keeping-up-singularity.web.app';
const DEFAULT_IMAGE = `${BASE_URL}/img/logo.png`;
const HOME_PAGE_SIZE = 6;

function escapeHTML(str) {
  if (typeof str !== 'string') return '';
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

function stripHTML(html) {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function countWords(html) {
  const plainText = stripHTML(html);
  return plainText ? plainText.split(/\s+/).length : 0;
}

function calculateReadingTime(content, lang = 'hr') {
  const wordCount = countWords(content);
  const minutes = Math.max(1, Math.ceil(wordCount / 200));
  return lang === 'en' ? `⏱ ${minutes} min read` : `⏱ ${minutes} min čitanja`;
}

function extractHeadingsText(html) {
  if (!html || typeof html !== 'string') return '';
  const matches = html.match(/<h[2-3][^>]*>([\s\S]*?)<\/h[2-3]>/gi) || [];
  return matches.map(m => stripHTML(m)).filter(Boolean).join(' ');
}

function resolveImageUrl(imagePath) {
  if (!imagePath || !imagePath.trim()) return DEFAULT_IMAGE;
  const trimmed = imagePath.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const cleanPath = trimmed.replace(/^\.?\//, '');
  return `${BASE_URL}/${cleanPath}`;
}

function safeJsonForScript(data) {
  return JSON.stringify(data).replace(/<\//g, '<\\/').replace(/<!--/g, '<\\!--');
}

/**
 * Adds IDs to h2, h3, h4 headings in article HTML and returns both updated HTML and TOC items
 */
function processHeadingsAndBuildTOC(contentHTML, lang = 'hr') {
  if (!contentHTML || typeof contentHTML !== 'string') {
    return { html: contentHTML || '', tocHTML: '' };
  }

  const usedIds = new Set();
  const tocItems = [];
  let headingCounter = 0;

  const updatedHTML = contentHTML.replace(/<(h[2-4])([^>]*)>([\s\S]*?)<\/\1>/gi, (fullMatch, tag, attrs, inner) => {
    headingCounter++;
    const level = tag.toLowerCase();
    const rawText = stripHTML(inner);
    if (!rawText) return fullMatch;

    let idMatch = attrs.match(/\bid=["']([^"']+)["']/i);
    let finalId = idMatch ? idMatch[1].trim() : '';

    if (!finalId) {
      let slug = rawText
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\u00C0-\u024F\u1E00-\u1EFF-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (!slug) slug = `section-${headingCounter}`;
      finalId = slug;
      let counter = 2;
      while (usedIds.has(finalId)) {
        finalId = `${slug}-${counter++}`;
      }
      attrs = `${attrs} id="${escapeHTML(finalId)}"`;
    }

    usedIds.add(finalId);
    tocItems.push({
      id: finalId,
      text: rawText,
      level
    });

    return `<${tag}${attrs}>${inner}</${tag}>`;
  });

  if (tocItems.length < 2) {
    return { html: updatedHTML, tocHTML: '' };
  }

  const title = lang === 'en' ? 'Table of Contents' : 'Sadržaj rada';
  const toggleHideText = lang === 'en' ? 'Hide' : 'Sakrij';
  const ariaLabel = lang === 'en' ? 'Table of contents' : 'Sadržaj članka';

  const itemsHTML = tocItems.map(item => {
    const isSub = item.level === 'h4' ? 'toc-sub-item' : 'toc-main-item';
    return `
      <li class="article-toc-item ${isSub}" data-level="${item.level}">
        <a href="#${escapeHTML(item.id)}" class="article-toc-link" data-toc-target="${escapeHTML(item.id)}">
          <span class="toc-link-text">${escapeHTML(item.text)}</span>
        </a>
      </li>`;
  }).join('');

  const tocHTML = `
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
    </nav>`;

  return { html: updatedHTML, tocHTML };
}

/**
 * Generates related articles HTML for SSG inside articles/{id}.html
 */
function buildRelatedArticlesHTML(currentArticle, allArticlesIndex) {
  if (!allArticlesIndex || allArticlesIndex.length <= 1) return '';

  const currentCatSlug = (currentArticle.categorySlug || '').toLowerCase().trim();
  const currentCat = (currentArticle.category || '').toLowerCase().trim();

  const otherArticles = allArticlesIndex.filter(item => String(item.id) !== String(currentArticle.id));

  const sameCategory = otherArticles.filter(item => {
    const slug = (item.categorySlug || '').toLowerCase().trim();
    const cat = (item.category || '').toLowerCase().trim();
    return (currentCatSlug && slug === currentCatSlug) || (currentCat && cat === currentCat);
  });

  const differentCategory = otherArticles.filter(item => !sameCategory.includes(item));
  const relatedList = [...sameCategory, ...differentCategory].slice(0, 3);
  if (relatedList.length === 0) return '';

  const cardsHTML = relatedList.map(item => {
    const title = item.title || 'Naslov';
    const category = item.category || 'Općenito';
    const excerpt = item.excerpt || item.summary || '';
    const readTime = item.readTime || '⏱ 3 min čitanja';
    const itemUrl = `${encodeURIComponent(item.id)}.html`;
    let relatedImage = item.image || '';
    if (relatedImage && !relatedImage.startsWith('http') && !relatedImage.startsWith('/') && !relatedImage.startsWith('../')) {
      relatedImage = `../${relatedImage}`;
    }

    const mediaHTML = relatedImage ? `
      <div class="related-card-media">
        <img src="${escapeHTML(relatedImage)}" alt="${escapeHTML(title)}" class="related-card-thumb" loading="lazy" decoding="async" onerror="this.parentElement.style.display='none'">
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
            <span>Pročitaj rad &rarr;</span>
          </div>
        </div>
      </a>`;
  }).join('');

  return `
    <section class="related-articles-section" aria-labelledby="related-heading">
      <div class="related-header">
        <span class="related-overline">PREPORUČENO ČITANJE</span>
        <h3 id="related-heading" class="related-title">Povezani radovi i publikacije</h3>
      </div>
      <div class="related-grid">
        ${cardsHTML}
      </div>
    </section>`;
}

/**
 * Generates the complete pre-rendered innerHTML for #article-reader-container in articles/{id}.html
 */
function buildStaticArticleBodyHTML(article, allArticlesIndex) {
  const title = article.title || 'Naslov rada nedostupan';
  const category = article.category || 'Općenito';
  const date = article.date || 'Nepoznat datum';
  const doi = article.doi || '';
  const image = article.image || '';
  const articleUrl = `${BASE_URL}/articles/${encodeURIComponent(article.id)}.html`;

  let contentHTML = article.content || `<p>${escapeHTML(article.excerpt || article.summary || 'Sadržaj rada nije dostupan.')}</p>`;
  const readTime = calculateReadingTime(contentHTML, 'hr');

  // Adjust relative paths for articles/ subdirectory and add lazy loading to inline content images
  contentHTML = contentHTML
    .replace(/src="img\//g, 'src="../img/')
    .replace(/<img\s+(?![^>]*\bloading=)/gi, '<img loading="lazy" decoding="async" ');

  let resolvedImage = image;
  if (resolvedImage && !resolvedImage.startsWith('http') && !resolvedImage.startsWith('/') && !resolvedImage.startsWith('../')) {
    resolvedImage = `../${resolvedImage}`;
  }

  let resolvedVideo = (article.video && article.video.trim()) ? article.video.trim() : '';
  if (resolvedVideo && !resolvedVideo.startsWith('http') && !resolvedVideo.startsWith('/') && !resolvedVideo.startsWith('../')) {
    resolvedVideo = `../${resolvedVideo}`;
  }

  const videoHTML = resolvedVideo ? `
    <div class="article-video-container">
      <video controls preload="metadata">
        <source src="${escapeHTML(resolvedVideo)}" type="video/mp4">
        Vaš preglednik ne podržava HTML5 video element.
      </video>
    </div>
  ` : '';

  if (videoHTML && !contentHTML.includes('article-video-container')) {
    if (contentHTML.includes('</p>')) {
      contentHTML = contentHTML.replace('</p>', `</p>${videoHTML}`);
    } else {
      contentHTML += videoHTML;
    }
  }

  const { html: processedContentHTML, tocHTML } = processHeadingsAndBuildTOC(contentHTML, 'hr');

  const shareUrl = encodeURIComponent(articleUrl);
  const shareTitle = encodeURIComponent(title);
  const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareTitle}`;
  const xShareUrl = `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`;
  const linkedinShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`;

  const coverHeroHTML = resolvedImage ? `
    <div class="article-cover-wrapper">
      <img src="${escapeHTML(resolvedImage)}" alt="${escapeHTML(title)}" class="article-cover-hero" fetchpriority="high" decoding="async" onerror="this.closest('.article-cover-wrapper').style.display='none'">
    </div>
  ` : '';

  const relatedArticlesHTML = buildRelatedArticlesHTML(article, allArticlesIndex);

  return `
    <!-- Link za povratak -->
    <a href="../index.html" class="back-link">&larr; Natrag na sve radove</a>

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
          <button type="button" class="share-btn share-copy btn-trigger-copy" aria-label="Kopiraj poveznicu na rad" title="Kopiraj poveznicu na rad">
            <span class="copy-tooltip">Poveznica kopirana!</span>
            <svg class="icon-link" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            <svg class="icon-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: none; color: #10b981;">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </button>
          <a href="${xShareUrl}" target="_blank" rel="noopener noreferrer" class="share-btn share-x" aria-label="Podijeli na X-u (Twitter)" title="Podijeli na X-u (Twitter)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          <a href="${linkedinShareUrl}" target="_blank" rel="noopener noreferrer" class="share-btn share-linkedin" aria-label="Podijeli na LinkedInu" title="Podijeli na LinkedInu">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-1.13.72-1.8 1.63-1.8.84 0 1.33.56 1.33 1.8v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
            </svg>
          </a>
          <a href="${fbShareUrl}" target="_blank" rel="noopener noreferrer" class="share-btn share-fb" aria-label="Podijeli na Facebooku" title="Podijeli na Facebooku">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </a>
        </div>
      </div>

      ${coverHeroHTML}
    </header>

    <!-- Audio Player Bar (Preslušavanje članka) -->
    <div class="audio-player-bar" id="audio-player-bar" aria-label="Slušaj članak">
      <div class="audio-controls-left">
        <button id="tts-play-btn" class="audio-btn audio-btn-play" aria-label="Pokreni čitanje" title="Pokreni čitanje">
          <svg class="icon-play" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="6,4 20,12 6,20"></polygon>
          </svg>
          <svg class="icon-pause" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display:none;">
            <rect x="6" y="4" width="4" height="16" rx="1"></rect>
            <rect x="14" y="4" width="4" height="16" rx="1"></rect>
          </svg>
        </button>
        <button id="tts-stop-btn" class="audio-btn audio-btn-stop" aria-label="Zaustavi čitanje" title="Zaustavi čitanje" disabled>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="4" y="4" width="16" height="16" rx="2"></rect>
          </svg>
        </button>
      </div>

      <div class="audio-status-container">
        <span class="audio-status-pulse" id="tts-status-pulse"></span>
        <span id="tts-status-text" class="audio-status-text">Slušaj članak</span>
      </div>

      <div class="audio-right-controls">
        <div class="audio-voice-controls" id="audio-voice-controls">
          <label for="tts-voice-select" class="voice-label" title="Odabir glasa za čitanje">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
            <span class="voice-label-text">Glas:</span>
          </label>
          <select id="tts-voice-select" class="audio-voice-select" aria-label="Odabir glasa za čitanje">
            <option value="">Najbolji prirodni glas</option>
          </select>
        </div>

        <div class="audio-speed-controls">
          <span class="speed-label">Brzina:</span>
          <div class="speed-options">
            <button class="speed-btn active" data-speed="1.0">1x</button>
            <button class="speed-btn" data-speed="1.25">1.25x</button>
            <button class="speed-btn" data-speed="1.5">1.5x</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Table of Contents (Sadržaj rada) Container -->
    <div id="article-toc-container" class="article-toc-wrapper">${tocHTML}</div>

    <!-- Puni HTML Sadržaj Članka -->
    <article class="reader-body" id="reader-body">
      ${processedContentHTML}
    </article>

    <!-- Donji Share Blok -->
    <div class="reader-share-box">
      <div class="reader-share-info">
        <span class="reader-share-label">Podijeli ovaj rad:</span>
      </div>
      <div class="reader-share-actions">
        <button type="button" class="btn-copy-link btn-trigger-copy" aria-label="Kopiraj poveznicu na rad">
          <span class="copy-tooltip">Poveznica kopirana!</span>
          <svg class="icon-link" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
          <svg class="icon-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: none; color: #10b981;">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span class="copy-btn-text">Kopiraj poveznicu</span>
        </button>
        <a href="${xShareUrl}" target="_blank" rel="noopener noreferrer" class="share-btn share-x" aria-label="Podijeli na X-u (Twitter)" title="Podijeli na X-u (Twitter)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </a>
        <a href="${linkedinShareUrl}" target="_blank" rel="noopener noreferrer" class="share-btn share-linkedin" aria-label="Podijeli na LinkedInu" title="Podijeli na LinkedInu">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-1.13.72-1.8 1.63-1.8.84 0 1.33.56 1.33 1.8v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
          </svg>
        </a>
        <a href="${fbShareUrl}" target="_blank" rel="noopener noreferrer" class="share-btn share-fb" aria-label="Podijeli na Facebooku" title="Podijeli na Facebooku">
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
      <a href="../index.html" class="btn-read-article">&larr; Povratak na popis sažetaka</a>
    </footer>`;
}

/**
 * Generates Featured / Hero HTML card for the latest article on index.html
 */
function buildFeaturedHeroCardHTML(article) {
  if (!article) return '';
  const title = article.title || 'Naslov rada nedostupan';
  const category = article.category || 'Općenito';
  const excerpt = article.excerpt || article.summary || 'Kratki uvod i sažetak rada trenutačno nisu dostupni.';
  const date = article.date || 'Nepoznat datum';
  const readTime = article.readTime || '⏱ 3 min čitanja';
  const doi = article.doi || '';
  const articleUrl = `articles/${encodeURIComponent(article.id)}.html`;
  const image = article.image || '';
  const ctaAria = `Pročitaj istaknuti rad: ${title}`;

  const mediaHTML = image ? `
          <div class="featured-hero-media">
            <a href="${articleUrl}" tabindex="-1" aria-hidden="true">
              <img src="${escapeHTML(image)}" alt="${escapeHTML(title)}" class="featured-hero-img" fetchpriority="high" decoding="async" onerror="this.closest('.featured-hero-media').style.display='none'">
            </a>
          </div>` : '';

  return `
        <article class="featured-hero-card" id="featured-card-${escapeHTML(String(article.id))}">
          ${mediaHTML}
          <div class="featured-hero-content">
            <div class="featured-hero-top">
              <div class="featured-badges-row">
                <span class="featured-pulse-badge">
                  <span class="featured-pulse-dot"></span>
                  <span>NAJNOVIJI RAD</span>
                </span>
                <span class="card-category">${escapeHTML(category)}</span>
                <time class="card-date" datetime="${escapeHTML(date)}">${escapeHTML(date)}</time>
              </div>
              <h2 class="featured-hero-title">
                <a href="${articleUrl}">${escapeHTML(title)}</a>
              </h2>
              <p class="featured-hero-excerpt">${escapeHTML(excerpt)}</p>
            </div>
            <div class="featured-hero-footer">
              <div class="card-info">
                <span class="card-read-time">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  ${escapeHTML(readTime)}
                </span>
                ${doi ? `<span class="card-doi">${escapeHTML(doi)}</span>` : ''}
              </div>
              <a href="${articleUrl}" class="btn-featured-read" aria-label="${escapeHTML(ctaAria)}">
                Pročitaj istaknuti rad &rarr;
              </a>
            </div>
          </div>
        </article>`;
}

/**
 * Generates HTML card for index.html pre-rendering
 */
function buildHomeArticleCardHTML(article, index) {
  const title = article.title || 'Naslov rada nedostupan';
  const category = article.category || 'Općenito';
  const excerpt = article.excerpt || article.summary || 'Kratki uvod i sažetak rada trenutačno nisu dostupni.';
  const date = article.date || 'Nepoznat datum';
  const readTime = article.readTime || '⏱ 3 min čitanja';
  const doi = article.doi || '';
  const articleUrl = `articles/${encodeURIComponent(article.id)}.html`;
  const image = article.image || '';
  const readBtnAria = `Pročitaj rad: ${title}`;

  // First 2 cards above the fold load eagerly; others lazy-load
  const imgLoadingAttr = index < 2 ? 'decoding="async"' : 'loading="lazy" decoding="async"';

  const mediaHTML = image ? `
    <div class="article-card-media">
      <a href="${articleUrl}" tabindex="-1" aria-hidden="true">
        <img src="${escapeHTML(image)}" alt="${escapeHTML(title)}" class="article-card-thumb" ${imgLoadingAttr} onerror="this.closest('.article-card-media').style.display='none'">
      </a>
    </div>` : '';

  return `
        <article class="article-card" id="card-${escapeHTML(String(article.id))}">
          ${mediaHTML}
          <div class="article-card-content">
            <div class="card-body">
              <div class="card-header">
                <div class="card-meta">
                  <span class="card-category">${escapeHTML(category)}</span>
                  <time class="card-date" datetime="${escapeHTML(date)}">${escapeHTML(date)}</time>
                </div>
                <h3 class="card-title">
                  <a href="${articleUrl}">${escapeHTML(title)}</a>
                </h3>
              </div>
              <p class="card-excerpt">${escapeHTML(excerpt)}</p>
            </div>
            <div class="card-footer">
              <div class="card-info">
                <span class="card-read-time">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  ${escapeHTML(readTime)}
                </span>
                ${doi ? `<span class="card-doi">${escapeHTML(doi)}</span>` : ''}
              </div>
              <a href="${articleUrl}" class="btn-read-article" aria-label="${escapeHTML(readBtnAria)}">
                Pročitaj rad &rarr;
              </a>
            </div>
          </div>
        </article>`;
}

export function generateStaticPages() {
  console.log('======================================================');
  console.log('  GENERIRANJE STATIČKIH STRANICA ČLANAKA & INDEKSA (SSG)');
  console.log('======================================================\n');

  const articlesJsonPath = path.join(ROOT_DIR, 'articles.json');
  const articlesIndexJsonPath = path.join(ROOT_DIR, 'articles-index.json');
  const templatePath = path.join(ROOT_DIR, 'article.html');
  const indexHtmlPath = path.join(ROOT_DIR, 'index.html');
  const outputDir = path.join(ROOT_DIR, 'articles');
  const sitemapPath = path.join(ROOT_DIR, 'sitemap.xml');

  if (!fs.existsSync(articlesJsonPath)) {
    console.error('❌ Greška: Datoteka articles.json nije pronađena.');
    process.exit(1);
  }

  if (!fs.existsSync(templatePath)) {
    console.error('❌ Greška: Predložak article.html nije pronađen.');
    process.exit(1);
  }

  const rawJsonBuffer = fs.readFileSync(articlesJsonPath);
  const articles = JSON.parse(rawJsonBuffer.toString('utf8'));
  const templateHtml = fs.readFileSync(templatePath, 'utf8');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Kreirana mapa: ${outputDir}`);
  }

  // 1. Izgradi lagani articles-index.json (bez punog content/content_en teksta)
  const articlesIndex = articles.map(article => {
    const rawContentHR = article.content || article.excerpt || article.summary || '';
    const rawContentEN = article.content_en || article.content || article.excerpt_en || article.summary_en || '';
    const wordCount = countWords(rawContentHR);
    const wordCount_en = countWords(rawContentEN);
    const calcReadTimeHR = calculateReadingTime(rawContentHR, 'hr');
    const calcReadTimeEN = calculateReadingTime(rawContentEN, 'en');
    const headingsText = [
      extractHeadingsText(article.content),
      extractHeadingsText(article.content_en)
    ].filter(Boolean).join(' ');

    const indexItem = {
      id: article.id,
      title: article.title,
      title_en: article.title_en,
      category: article.category,
      category_en: article.category_en,
      categorySlug: article.categorySlug,
      date: article.date,
      readTime: calcReadTimeHR,
      readTime_en: calcReadTimeEN,
      wordCount,
      wordCount_en,
      image: article.image,
      video: article.video,
      doi: article.doi,
      excerpt: article.excerpt || article.summary,
      excerpt_en: article.excerpt_en || article.summary_en,
      headingsText: headingsText || undefined
    };

    // Ukloni undefined polja radi minimalne veličine
    Object.keys(indexItem).forEach(key => {
      if (indexItem[key] === undefined) {
        delete indexItem[key];
      }
    });

    return indexItem;
  });

  const indexJsonString = JSON.stringify(articlesIndex);
  fs.writeFileSync(articlesIndexJsonPath, indexJsonString, 'utf8');
  const fullSizeKB = (rawJsonBuffer.length / 1024).toFixed(1);
  const indexSizeKB = (Buffer.byteLength(indexJsonString, 'utf8') / 1024).toFixed(1);
  const savingsPct = ((1 - Buffer.byteLength(indexJsonString, 'utf8') / rawJsonBuffer.length) * 100).toFixed(1);
  console.log(`⚡ Generiran articles-index.json: ${indexSizeKB} KB (umjesto ${fullSizeKB} KB — ušteda ${savingsPct}%)\n`);

  const metaPattern = /<meta\s+name="description"[\s\S]*?<link\s+rel="canonical"\s+href="[^"]*">/i;
  const readerContainerPattern = /<div\s+class="article-reader-container"\s+id="article-reader-container"[^>]*>[\s\S]*?<\/div>\s*(?=\n\s*<!--\s*Sekcija komentara)/i;

  let generatedCount = 0;

  // 2. Generiraj statičke HTML stranice s ugrađenim sadržajem i pojedinačne JSON datoteke
  articles.forEach((article) => {
    const id = article.id;
    const title = article.title || 'Članak';
    const excerpt = article.excerpt || article.summary || stripHTML(article.content || '').substring(0, 200);
    const category = article.category || 'Znanost';
    const date = article.date || '2026';
    const imageUrl = resolveImageUrl(article.image);
    const articleUrl = `${BASE_URL}/articles/${id}.html`;

    // Spremi pojedinačni JSON za članak (za brzi dohvat ako zatreba izvan SSG-a)
    const singleArticleJsonPath = path.join(outputDir, `${id}.json`);
    fs.writeFileSync(singleArticleJsonPath, JSON.stringify(article), 'utf8');

    const metaBlock = `  <title>${escapeHTML(title)} - Keeping up with the singularity</title>
  <meta name="description" content="${escapeHTML(excerpt)}">
  <meta name="author" content="Keeping up with the singularity">

  <!-- Open Graph / Facebook / LinkedIn / WhatsApp -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Keeping up with the singularity">
  <meta property="og:title" content="${escapeHTML(title)}">
  <meta property="og:description" content="${escapeHTML(excerpt)}">
  <meta property="og:image" content="${escapeHTML(imageUrl)}">
  <meta property="og:image:alt" content="${escapeHTML(title)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${escapeHTML(articleUrl)}">
  <meta property="og:locale" content="hr_HR">
  <meta property="og:locale:alternate" content="en_US">
  <meta property="article:section" content="${escapeHTML(category)}">
  <meta property="article:published_time" content="${escapeHTML(date)}">

  <!-- Twitter / X Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHTML(title)}">
  <meta name="twitter:description" content="${escapeHTML(excerpt)}">
  <meta name="twitter:image" content="${escapeHTML(imageUrl)}">
  <meta name="twitter:image:alt" content="${escapeHTML(title)}">

  <!-- Canonical Link -->
  <link rel="canonical" href="${escapeHTML(articleUrl)}">

  <!-- Schema.org JSON-LD Structured Data for Crawlers & Rich Search Results -->
  <script type="application/ld+json" id="jsonld-article-schema">
  {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "headline": ${JSON.stringify(title)},
    "description": ${JSON.stringify(excerpt)},
    "image": ${JSON.stringify(imageUrl)},
    "url": ${JSON.stringify(articleUrl)},
    "datePublished": ${JSON.stringify(date)},
    "articleSection": ${JSON.stringify(category)},
    "inLanguage": "hr",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": ${JSON.stringify(articleUrl)}
    },
    "author": {
      "@type": "Person",
      "name": "Keeping up with the singularity",
      "url": "https://keeping-up-singularity.web.app/o-autoru.html"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Keeping up with the singularity",
      "url": "https://keeping-up-singularity.web.app",
      "logo": {
        "@type": "ImageObject",
        "url": "https://keeping-up-singularity.web.app/img/logo.png"
      }
    }
  }
  </script>`;

    let pageHtml = templateHtml;

    if (metaPattern.test(pageHtml)) {
      pageHtml = pageHtml.replace(metaPattern, metaBlock);
    } else {
      pageHtml = pageHtml.replace('</head>', `${metaBlock}\n</head>`);
    }

    // Prilagodi relativne putanje resursa za podmapu articles/
    pageHtml = pageHtml
      .replace(/href="style\.css/g, 'href="../style.css')
      .replace(/src="js\//g, 'src="../js/')
      .replace(/href="img\//g, 'href="../img/')
      .replace(/src="img\//g, 'src="../img/')
      .replace(/href="manifest\.json"/g, 'href="../manifest.json"')
      .replace(/href="index\.html"/g, 'href="../index.html"')
      .replace(/href="category\.html/g, 'href="../category.html')
      .replace(/href="o-autoru\.html"/g, 'href="../o-autoru.html"');

    // Ugradi kompletan HTML sadržaj članka (SSG) u #article-reader-container
    const staticArticleInnerHtml = buildStaticArticleBodyHTML(article, articlesIndex);
    const ssgContainerHtml = `<div class="article-reader-container" id="article-reader-container" data-ssg-rendered="true" data-ssg-lang="hr">${staticArticleInnerHtml}\n    </div>`;

    if (readerContainerPattern.test(pageHtml)) {
      pageHtml = pageHtml.replace(readerContainerPattern, ssgContainerHtml);
    }

    // Pripremi pred-učitane metapodatke za klijentski JS (bez dupliciranja HR/EN teksta u samom HTML-u)
    const { content: _c, content_en: _ce, ...preloadedArticleData } = article;
    preloadedArticleData.wordCount = countWords(article.content || '');
    preloadedArticleData.wordCount_en = countWords(article.content_en || article.content || '');

    // Uključi samo do 3 povezana članka (bez headingsText) radi minimalne veličine HTML-a
    const currentCatSlug = (article.categorySlug || '').toLowerCase().trim();
    const currentCat = (article.category || '').toLowerCase().trim();
    const otherIdx = articlesIndex.filter(item => String(item.id) !== String(article.id));
    const sameCatIdx = otherIdx.filter(item => {
      const slug = (item.categorySlug || '').toLowerCase().trim();
      const cat = (item.category || '').toLowerCase().trim();
      return (currentCatSlug && slug === currentCatSlug) || (currentCat && cat === currentCat);
    });
    const diffCatIdx = otherIdx.filter(item => !sameCatIdx.includes(item));
    const relatedCompact = [...sameCatIdx, ...diffCatIdx].slice(0, 3).map(({ headingsText, ...rest }) => rest);

    const preloadScript = `<script>window.PRELOADED_ARTICLE_ID = ${safeJsonForScript(id)};window.PRELOADED_ARTICLE_DATA = ${safeJsonForScript(preloadedArticleData)};window.PRELOADED_ARTICLES_INDEX = ${safeJsonForScript(relatedCompact)};</script>\n  <script src="../js/article.js`;
    pageHtml = pageHtml.replace('<script src="../js/article.js', preloadScript);

    const targetFilePath = path.join(outputDir, `${id}.html`);
    fs.writeFileSync(targetFilePath, pageHtml, 'utf8');
    generatedCount++;
    console.log(`✅ [${generatedCount}/${articles.length}] articles/${id}.html (+ articles/${id}.json)`);
  });

  // 3. Ugradi Featured Hero karticu i inicijalnih 6 kartica u index.html za trenutni prikaz (SSG)
  if (fs.existsSync(indexHtmlPath)) {
    let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

    const featuredHeroHtml = articlesIndex.length > 0 ? buildFeaturedHeroCardHTML(articlesIndex[0]) : '';
    const featuredPattern = /(<div\s+id="featured-article-container"\s+class="featured-article-container"[^>]*>)[\s\S]*?(<\/div>\s*\n\s*<\/section>)/i;
    if (featuredPattern.test(indexHtml)) {
      indexHtml = indexHtml.replace(
        featuredPattern,
        `$1\n        <!-- Istaknuti Hero rad pred-renderiran putem SSG-a (scripts/generate-static-pages.js) -->${featuredHeroHtml}\n      $2`
      );
    }

    const initialCards = articlesIndex
      .slice(1, 1 + HOME_PAGE_SIZE)
      .map((art, idx) => buildHomeArticleCardHTML(art, idx))
      .join('\n');

    const gridPattern = /(<div\s+id="articles-grid"\s+class="articles-grid"[^>]*>)[\s\S]*?(<\/div>\s*\n\s*<!--\s*Load More Container\s*-->)/i;
    if (gridPattern.test(indexHtml)) {
      indexHtml = indexHtml.replace(
        gridPattern,
        `$1\n        <!-- Kartice članaka pred-renderirane putem SSG-a (scripts/generate-static-pages.js) -->${initialCards}\n      $2`
      );
    }

    const summaryLabel = articlesIndex.length === 1 ? 'Sažetak' : 'Sažetka';
    indexHtml = indexHtml.replace(
      /<span\s+id="articles-count"\s+class="articles-count">[^<]*<\/span>/i,
      `<span id="articles-count" class="articles-count">${articlesIndex.length} ${summaryLabel}</span>`
    );

    const aiCount = articlesIndex.filter(a => {
      const slug = (a.categorySlug || '').toLowerCase();
      const cat = (a.category || '').toLowerCase();
      return slug === 'ai-tehnologija' || slug === 'ai-tech' || cat.includes('ai');
    }).length;
    const lonCount = articlesIndex.filter(a => {
      const slug = (a.categorySlug || '').toLowerCase();
      const cat = (a.category || '').toLowerCase();
      return slug === 'longevity' || cat.includes('longevity');
    }).length;

    indexHtml = indexHtml
      .replace(/<span\s+class="filter-pill-count"\s+id="count-filter-all">[^<]*<\/span>/i, `<span class="filter-pill-count" id="count-filter-all">${articlesIndex.length}</span>`)
      .replace(/<span\s+class="filter-pill-count"\s+id="count-filter-ai">[^<]*<\/span>/i, `<span class="filter-pill-count" id="count-filter-ai">${aiCount}</span>`)
      .replace(/<span\s+class="filter-pill-count"\s+id="count-filter-longevity">[^<]*<\/span>/i, `<span class="filter-pill-count" id="count-filter-longevity">${lonCount}</span>`);

    fs.writeFileSync(indexHtmlPath, indexHtml, 'utf8');
    console.log(`\n🏠 Ažuriran index.html s pred-renderiranim Hero člankom i ${Math.min(HOME_PAGE_SIZE, Math.max(0, articlesIndex.length - 1))} SSG kartica u mreži.`);
  }

  console.log(`\n🎉 Uspješno generirano ${generatedCount} statičkih članaka u mapi "articles/".`);

  // 4. Ažuriraj sitemap.xml
  updateSitemap(articles, sitemapPath);
}

function updateSitemap(articles, sitemapPath) {
  console.log('\n📄 Ažuriranje sitemap.xml...');

  const today = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Statičke osnovne rute
  xml += `  <url>\n    <loc>${BASE_URL}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
  xml += `  <url>\n    <loc>${BASE_URL}/index.html</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
  xml += `  <url>\n    <loc>${BASE_URL}/category.html?cat=ai-tehnologija</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  xml += `  <url>\n    <loc>${BASE_URL}/category.html?cat=longevity</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  xml += `  <url>\n    <loc>${BASE_URL}/o-autoru.html</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;

  // Statički članci
  articles.forEach(article => {
    xml += `  <url>\n    <loc>${BASE_URL}/articles/${article.id}.html</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
  });

  xml += `</urlset>\n`;

  fs.writeFileSync(sitemapPath, xml, 'utf8');
  console.log(`✅ sitemap.xml je uspješno osvježen s ${articles.length} statičkih članaka.`);
}

// Pokreni ako se poziva izravno iz terminala
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateStaticPages();
}
