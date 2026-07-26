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

  document.title = `${title} - Keeping up with the singularity`;

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
        <time class="card-date" datetime="${escapeHTML(date)}">${escapeHTML(date)}</time>
      </div>

      <h1 class="reader-title">${escapeHTML(title)}</h1>

      <div class="reader-submeta">
        <span class="card-read-time">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          ${escapeHTML(readTime)}
        </span>
        ${doi ? `<span class="card-doi">${escapeHTML(doi)}</span>` : ''}
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
