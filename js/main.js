/**
 * TechHorizons Blog - Main Application Logic
 * Modular Vanilla JavaScript for fetching and dynamically rendering articles.
 */

let cachedArticles = [];

document.addEventListener('DOMContentLoaded', () => {
  initApp();
  setupResponsiveNav();
  if (typeof updateActiveNavLink === 'function') {
    updateActiveNavLink();
  }

  window.addEventListener('languageChanged', () => {
    if (cachedArticles && cachedArticles.length > 0) {
      renderArticles(cachedArticles);
    }
  });
});

/**
 * Initializes the application
 */
async function initApp() {
  cachedArticles = await fetchArticles('articles.json');
  renderArticles(cachedArticles);
  setupNavigation();
}

/**
 * Asynchronously fetches article data from JSON file
 * @param {string} url - Path to articles JSON file
 * @returns {Promise<Array>} List of article objects
 */
async function fetchArticles(url) {
  const container = document.getElementById('articles-grid');
  if (!container) return []; // Guard for pages without articles grid

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Mrežna pogreška pri učitavanju: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Pogreška pri učitavanju članaka:', error);
    if (container) {
      renderErrorState(container, 'Nije moguće učitati podatke iz "articles.json". Provjerite poslužitelj i datoteku.');
    }
    return [];
  }
}

/**
 * Dynamically renders article cards into the CSS Grid container
 * @param {Array} articles - Array of article objects
 */
function renderArticles(articles) {
  const container = document.getElementById('articles-grid');
  const countBadge = document.getElementById('articles-count');

  if (!container) return;

  // Clear existing static/loading content
  container.innerHTML = '';

  const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'hr';

  // Handle empty state
  if (!articles || articles.length === 0) {
    if (countBadge) {
      countBadge.textContent = currentLang === 'en' ? '0 Papers' : '0 Radova';
    }
    renderEmptyState(container);
    return;
  }

  // Update article counter badge
  if (countBadge) {
    const summaryLabel = currentLang === 'en' 
      ? (articles.length === 1 ? 'Summary' : 'Summaries')
      : (articles.length === 1 ? 'Sažetak' : 'Sažetka');
    countBadge.textContent = `${articles.length} ${summaryLabel}`;
  }

  // Create document fragment for optimal performance
  const fragment = document.createDocumentFragment();

  articles.forEach(article => {
    const cardElement = createArticleCard(article);
    fragment.appendChild(cardElement);
  });

  container.appendChild(fragment);
}

/**
 * Creates a single DOM element card for an article
 * @param {Object} article - Data object representing an article
 * @returns {HTMLElement} Article DOM node
 */
function createArticleCard(article) {
  const card = document.createElement('article');
  card.className = 'article-card';
  card.id = `card-${article.id}`;

  const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'hr';

  // Pragmatic language fallback logic
  const title = (currentLang === 'en' && article.title_en) ? article.title_en : (article.title || 'Naslov rada nedostupan');
  const category = (currentLang === 'en' && article.category_en) ? article.category_en : (article.category || 'Općenito');
  const excerpt = (currentLang === 'en' && (article.excerpt_en || article.summary_en)) 
    ? (article.excerpt_en || article.summary_en) 
    : (article.excerpt || article.summary || 'Kratki uvod i sažetak rada trenutačno nisu dostupni.');
  
  const date = article.date || 'Nepoznat datum';
  
  let readTime = article.readTime || '3 min čitanja';
  if (currentLang === 'en') {
    readTime = article.readTime_en || readTime.replace('min čitanja', 'min read');
  }

  const doi = article.doi || '';
  const articleUrl = `article.html?id=${article.id}`;
  const image = article.image || '';
  const readBtnText = currentLang === 'en' ? 'Read article &rarr;' : 'Pročitaj rad &rarr;';
  const readBtnAria = currentLang === 'en' ? `Read article: ${title}` : `Pročitaj rad: ${title}`;

  const mediaHTML = image ? `
    <div class="article-card-media">
      <a href="${articleUrl}" tabindex="-1" aria-hidden="true">
        <img src="${escapeHTML(image)}" alt="${escapeHTML(title)}" class="article-card-thumb" onerror="this.closest('.article-card-media').style.display='none'">
      </a>
    </div>
  ` : '';

  card.innerHTML = `
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
          ${readBtnText}
        </a>
      </div>
    </div>
  `;

  return card;
}

/**
 * Displays empty state message if JSON array is empty
 */
function renderEmptyState(container) {
  const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'hr';
  if (currentLang === 'en') {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Currently no published articles</h3>
        <p>The "articles.json" file does not contain any summaries. Add new entries to the JSON file.</p>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Trenutačno nema objavljenih radova</h3>
        <p>Datoteka "articles.json" ne sadrži niti jedan sažetak. Dodajte nove objave u JSON datoteku.</p>
      </div>
    `;
  }
}


/**
 * Displays error state message if fetching fails
 */
function renderErrorState(container, message) {
  container.innerHTML = `
    <div class="error-state">
      <h3>Pogreška pri učitavanju</h3>
      <p>${escapeHTML(message)}</p>
    </div>
  `;
}

/**
 * Handles navigation active state link switching
 */
function setupNavigation() {
  const links = document.querySelectorAll('.nav-link');
  links.forEach(link => {
    link.addEventListener('click', (e) => {
      links.forEach(l => l.classList.remove('active'));
      e.currentTarget.classList.add('active');
    });
  });
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

  // Close menu when clicking any navigation link
  const navLinks = navMenu.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeMenu();
    });
  });

  // Close menu when pressing ESC
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
 * Helper to escape HTML characters and guard against XSS
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
