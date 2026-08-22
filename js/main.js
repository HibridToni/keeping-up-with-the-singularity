/**
 * TechHorizons Blog - Main Application Logic
 * Modular Vanilla JavaScript for fetching and dynamically rendering articles.
 */

let cachedArticles = [];
let currentSearchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
  initApp();
  setupResponsiveNav();
  setupSearch();
  if (typeof updateActiveNavLink === 'function') {
    updateActiveNavLink();
  }

  window.addEventListener('languageChanged', () => {
    if (cachedArticles && cachedArticles.length > 0) {
      if (currentSearchQuery && currentSearchQuery.trim()) {
        handleSearch(currentSearchQuery);
      } else {
        renderArticles(cachedArticles);
      }
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
 * @param {string} [query=''] - Search query if filtering is active
 */
function renderArticles(articles, query = '') {
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
    if (query && query.trim()) {
      renderEmptySearchState(container, query);
    } else {
      renderEmptyState(container);
    }
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
 * Displays empty state message when search returns no results
 * @param {HTMLElement} container
 * @param {string} query
 */
function renderEmptySearchState(container, query) {
  const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'hr';
  const title = currentLang === 'en' ? 'No matching papers found' : 'Nema pronađenih radova';
  const desc = currentLang === 'en'
    ? `No papers match your search for "${escapeHTML(query)}". Try using different keywords.`
    : `Niti jedan rad ne odgovara vašem upitu "${escapeHTML(query)}". Pokušajte s drugim ključnim riječima.`;
  const resetBtnText = currentLang === 'en' ? 'Show all papers' : 'Prikaži sve radove';

  container.innerHTML = `
    <div class="empty-state search-empty-state">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 12px; display: block; opacity: 0.5; color: var(--accent-cyan);">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        <line x1="8" y1="11" x2="14" y2="11"></line>
      </svg>
      <h3>${escapeHTML(title)}</h3>
      <p>${desc}</p>
      <button type="button" class="btn-reset-search" id="reset-search-btn">
        <span>&larr;</span> ${escapeHTML(resetBtnText)}
      </button>
    </div>
  `;

  const resetBtn = document.getElementById('reset-search-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const searchInput = document.getElementById('article-search');
      const clearBtn = document.getElementById('search-clear-btn');
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      if (clearBtn) {
        clearBtn.style.display = 'none';
      }
      handleSearch('');
    });
  }
}

/**
 * Normalizes text for search: removes accents/diacritics, converts to lowercase, trims whitespace
 * @param {string} text
 * @returns {string}
 */
function normalizeSearchText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .trim();
}

/**
 * Checks if article matches search query
 * @param {Object} article
 * @param {string} normalizedQuery
 * @returns {boolean}
 */
function matchesSearchQuery(article, normalizedQuery) {
  if (!normalizedQuery) return true;

  const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);

  const searchableFields = [
    article.title,
    article.title_en,
    article.category,
    article.category_en,
    article.categorySlug,
    article.summary,
    article.summary_en,
    article.excerpt,
    article.excerpt_en,
    article.readTime,
    article.doi
  ];

  const combinedSearchableText = normalizeSearchText(searchableFields.filter(Boolean).join(' '));

  return queryTerms.every(term => combinedSearchableText.includes(term));
}

/**
 * Handles search query execution
 * @param {string} query
 */
function handleSearch(query) {
  currentSearchQuery = query;
  const normalized = normalizeSearchText(query);
  if (!normalized) {
    renderArticles(cachedArticles);
    return;
  }

  const filtered = cachedArticles.filter(article => matchesSearchQuery(article, normalized));
  renderArticles(filtered, query);
}

/**
 * Attaches search input and clear button listeners
 */
function setupSearch() {
  const searchInput = document.getElementById('article-search');
  const clearBtn = document.getElementById('search-clear-btn');

  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value;
    if (clearBtn) {
      clearBtn.style.display = query.trim() ? 'block' : 'none';
    }
    handleSearch(query);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      if (clearBtn) clearBtn.style.display = 'none';
      handleSearch('');
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearBtn.style.display = 'none';
      searchInput.focus();
      handleSearch('');
    });
  }
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
