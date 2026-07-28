/**
 * TechHorizons Blog - Article Detail Page Script
 * Reads the article ID from the URL, fetches articles.json, and renders full content.
 */

let cachedArticle = null;

document.addEventListener('DOMContentLoaded', () => {
  loadArticleDetail();
  setupResponsiveNav();

  window.addEventListener('languageChanged', () => {
    if (cachedArticle) {
      const container = document.getElementById('article-reader-container');
      if (container) {
        renderArticleContent(container, cachedArticle);
      }
    }
  });
});

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

    cachedArticle = article;
    renderArticleContent(container, article);
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
 */
function renderArticleContent(container, article) {
  const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'hr';

  // Pragmatic language fallback logic
  const title = (currentLang === 'en' && article.title_en) ? article.title_en : (article.title || 'Naslov rada nedostupan');
  const category = (currentLang === 'en' && article.category_en) ? article.category_en : (article.category || 'Općenito');
  const date = article.date || 'Nepoznat datum';
  
  let readTime = article.readTime || '5 min čitanja';
  if (currentLang === 'en') {
    readTime = article.readTime_en || readTime.replace('min čitanja', 'min read');
  }

  const doi = article.doi || '';
  const image = article.image || '';

  let contentHTML = article.content || `<p>${escapeHTML(article.excerpt || article.summary || 'Sadržaj rada nije dostupan.')}</p>`;
  if (currentLang === 'en' && article.content_en) {
    contentHTML = article.content_en;
  }

  const backLinkText = currentLang === 'en' ? '&larr; Back to all articles' : '&larr; Natrag na sve radove';
  const bottomBtnText = currentLang === 'en' ? '&larr; Back to summary list' : '&larr; Povratak na popis sažetaka';

  // Dynamic share URL generation
  const shareUrl = encodeURIComponent(window.location.href);
  const shareTitle = encodeURIComponent(title);

  const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareTitle}`;
  const xShareUrl = `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`;
  const linkedinShareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${shareUrl}&title=${shareTitle}&summary=${shareTitle}`;

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
          <a href="${fbShareUrl}" target="_blank" rel="noopener noreferrer" class="share-btn share-fb" aria-label="${escapeHTML(fbAria)}" title="${escapeHTML(fbAria)}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </a>
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
        </div>
      </div>

      ${coverHeroHTML}
    </header>

    <!-- Puni HTML Sadržaj Članka -->
    <article class="reader-body">
      ${contentHTML}
    </article>

    <!-- Fusnota i povratak -->
    <footer class="reader-footer">
      <a href="index.html" class="btn-read-article">${bottomBtnText}</a>
    </footer>
  `;
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
