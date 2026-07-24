/**
 * TechHorizons Blog - Article Detail Page Script
 * Reads the article ID from the URL, fetches articles.json, and renders full content.
 */

document.addEventListener('DOMContentLoaded', () => {
  loadArticleDetail();
  setupResponsiveNav();
});

/**
 * Main function to load and render article details
 */
async function loadArticleDetail() {
  const container = document.getElementById('article-reader-container');
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const articleId = urlParams.get('id');

  if (!articleId) {
    renderNotFound(container, 'Nije naveden identifikator rada u URL adresi.');
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
      renderNotFound(container, `Članak s ID oznakom "${articleId}" nije pronađen.`);
      return;
    }

    renderArticleContent(container, article);
  } catch (error) {
    console.error('Pogreška pri dohvaćanju članka:', error);
    renderNotFound(container, 'Nije moguće učitati podatke rada. Provjerite datoteku "articles.json".');
  }
}

/**
 * Renders the full article details into the reading container
 * @param {HTMLElement} container - Target DOM node
 * @param {Object} article - Article data object
 */
function renderArticleContent(container, article) {
  document.title = `${article.title} - Keeping up with the singularity`;

  const category = article.category || 'Općenito';
  const date = article.date || 'Nepoznat datum';
  const readTime = article.readTime || '5 min čitanja';
  const doi = article.doi || '';
  const image = article.image || '';
  const contentHTML = article.content || `<p>${escapeHTML(article.excerpt || article.summary || 'Sadržaj rada nije dostupan.')}</p>`;

  const coverHeroHTML = image ? `
    <div class="article-cover-wrapper">
      <img src="${escapeHTML(image)}" alt="${escapeHTML(article.title)}" class="article-cover-hero" onerror="this.closest('.article-cover-wrapper').style.display='none'">
    </div>
  ` : '';

  container.innerHTML = `
    <!-- Link za povratak -->
    <a href="index.html" class="back-link">&larr; Natrag na sve radove</a>

    <!-- Zaglavlje rada -->
    <header class="reader-header">
      <div class="reader-meta">
        <span class="card-category">${escapeHTML(category)}</span>
        <time class="card-date" datetime="${escapeHTML(date)}">${escapeHTML(date)}</time>
      </div>

      <h1 class="reader-title">${escapeHTML(article.title)}</h1>

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
      <a href="index.html" class="btn-read-article">&larr; Povratak na popis sažetaka</a>
    </footer>
  `;
}

/**
 * Displays fall-back message when article is not found
 */
function renderNotFound(container, message) {
  container.innerHTML = `
    <a href="index.html" class="back-link">&larr; Natrag na sve radove</a>
    <div class="error-state" style="margin-top: 24px;">
      <h3>Rad nije pronađen</h3>
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
