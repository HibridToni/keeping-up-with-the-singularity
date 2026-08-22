const PAGE_SIZE = 6;
let cachedCategoryArticles = [];
let currentCategoryArticlesList = [];
let displayedCategoryCount = 0;
let currentCategoryTitle = '';
let currentCategorySearchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
  initCategoryPage();
  setupResponsiveNav();
  setupSearch();
  setupPagination();
  if (typeof updateActiveNavLink === 'function') {
    updateActiveNavLink();
  }

  window.addEventListener('languageChanged', () => {
    initCategoryPage(false);
  });
});

const CATEGORY_MAP = {
  'ai-tehnologija': {
    title: { hr: 'AI i tehnologija', en: 'AI & Tech' },
    description: {
      hr: 'Pregled stručnih radova, analiza i publikacija iz područja umjetne inteligencije, strojnog učenja i tehnoloških inovacija.',
      en: 'Overview of research papers, analyses, and publications in artificial intelligence, machine learning, and technological innovations.'
    }
  },
  'longevity': {
    title: { hr: 'Longevity', en: 'Longevity' },
    description: {
      hr: 'Najnovija istraživanja i teorijski radovi u području dugovječnosti, regenerativne medicine i inovacija na području longevityja.',
      en: 'Latest research and theoretical papers in longevity, regenerative medicine, and longevity innovations.'
    }
  }
};

async function initCategoryPage(resetPagination = true) {
  const urlParams = new URLSearchParams(window.location.search);
  const catSlug = urlParams.get('cat') ? urlParams.get('cat').toLowerCase().trim() : '';
  const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'hr';

  const mappedCat = CATEGORY_MAP[catSlug];
  let catTitle = '';
  let catDesc = '';

  if (mappedCat) {
    catTitle = mappedCat.title[currentLang] || mappedCat.title.hr;
    catDesc = mappedCat.description[currentLang] || mappedCat.description.hr;
  } else {
    catTitle = catSlug ? (catSlug.charAt(0).toUpperCase() + catSlug.slice(1)) : (currentLang === 'en' ? 'Category' : 'Kategorija');
    catDesc = currentLang === 'en' 
      ? 'An overview of published research summaries and analyses from the selected thematic category.'
      : 'Pregled objavljenih sažetaka radova i analiza iz odabrane tematske kategorije.';
  }

  currentCategoryTitle = catTitle;

  // Update DOM elements for category details
  document.title = `${catTitle} - Keeping up with the singularity`;
  
  const titleEl = document.getElementById('category-title');
  if (titleEl) titleEl.textContent = catTitle;

  const descEl = document.getElementById('category-description');
  if (descEl) descEl.textContent = catDesc;

  const metaTagEl = document.getElementById('category-meta-tag');
  if (metaTagEl) {
    const metaPrefix = currentLang === 'en' ? 'Category \u2022 ' : 'Kategorija \u2022 ';
    metaTagEl.textContent = `${metaPrefix}${catTitle}`;
  }

  // Fetch articles and filter
  const articles = await fetchArticles('articles.json');
  const filteredArticles = articles.filter(art => {
    const slug = art.categorySlug ? art.categorySlug.toLowerCase().trim() : '';
    const catNameHR = (art.category || '').toLowerCase().trim();
    const catNameEN = (art.category_en || '').toLowerCase().trim();
    const mapTitleHR = mappedCat ? mappedCat.title.hr.toLowerCase() : '';
    const mapTitleEN = mappedCat ? mappedCat.title.en.toLowerCase() : '';
    
    return slug === catSlug || catNameHR === mapTitleHR || catNameEN === mapTitleEN || catNameHR === catTitle.toLowerCase();
  });

  cachedCategoryArticles = filteredArticles;
  if (currentCategorySearchQuery && currentCategorySearchQuery.trim()) {
    handleSearch(currentCategorySearchQuery, resetPagination);
  } else {
    renderCategoryArticles(filteredArticles, catTitle, '', resetPagination);
  }
}

async function fetchArticles(url) {
  const container = document.getElementById('articles-grid');
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Mrežna pogreška pri učitavanju: ${response.status}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Pogreška pri učitavanju članaka:', error);
    if (container) {
      const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'hr';
      const errorMsg = currentLang === 'en' ? 'Failed to load JSON data.' : 'Nije moguće učitati podatke iz JSON datoteke.';
      container.innerHTML = `<div class="error-state"><h3>Pogreška / Error</h3><p>${errorMsg}</p></div>`;
    }
    return [];
  }
}

function renderCategoryArticles(articles, categoryTitle, query = '', resetPagination = true) {
  const container = document.getElementById('articles-grid');
  const countBadge = document.getElementById('articles-count');
  const loadMoreContainer = document.getElementById('load-more-container');

  if (!container) return;

  currentCategoryArticlesList = Array.isArray(articles) ? articles : [];

  if (resetPagination) {
    displayedCategoryCount = Math.min(PAGE_SIZE, currentCategoryArticlesList.length);
  } else {
    displayedCategoryCount = Math.min(
      Math.max(displayedCategoryCount, Math.min(PAGE_SIZE, currentCategoryArticlesList.length)),
      currentCategoryArticlesList.length
    );
  }

  container.innerHTML = '';

  const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'hr';

  if (currentCategoryArticlesList.length === 0) {
    if (countBadge) {
      countBadge.textContent = currentLang === 'en' ? '0 Papers' : '0 Radova';
    }
    if (loadMoreContainer) {
      loadMoreContainer.style.display = 'none';
    }
    if (query && query.trim()) {
      renderEmptySearchState(container, query);
    } else {
      if (currentLang === 'en') {
        container.innerHTML = `
          <div class="empty-state">
            <h3>No published articles in this category currently</h3>
            <p>There are currently no published articles in "${escapeHTML(categoryTitle)}". Stay tuned for upcoming content.</p>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="empty-state">
            <h3>U ovoj kategoriji trenutno nema objavljenih članaka</h3>
            <p>U kategoriji "${escapeHTML(categoryTitle)}" trenutno nema objavljenih članaka. Pratite nas uskoro za nove sadržaje.</p>
          </div>
        `;
      }
    }
    return;
  }

  if (countBadge) {
    const summaryLabel = currentLang === 'en' 
      ? (currentCategoryArticlesList.length === 1 ? 'Summary' : 'Summaries')
      : (currentCategoryArticlesList.length === 1 ? 'Sažetak' : 'Sažetka');
    countBadge.textContent = `${currentCategoryArticlesList.length} ${summaryLabel}`;
  }

  const fragment = document.createDocumentFragment();
  const visibleArticles = currentCategoryArticlesList.slice(0, displayedCategoryCount);

  visibleArticles.forEach(article => {
    const cardElement = createArticleCard(article);
    fragment.appendChild(cardElement);
  });

  container.appendChild(fragment);
  updateCategoryPaginationUI();
}

/**
 * Loads the next batch of category articles
 */
function loadMoreCategoryArticles() {
  const container = document.getElementById('articles-grid');
  if (!container || displayedCategoryCount >= currentCategoryArticlesList.length) return;

  const nextCount = Math.min(displayedCategoryCount + PAGE_SIZE, currentCategoryArticlesList.length);
  const newArticles = currentCategoryArticlesList.slice(displayedCategoryCount, nextCount);

  const fragment = document.createDocumentFragment();
  newArticles.forEach(article => {
    const cardElement = createArticleCard(article);
    cardElement.classList.add('anim-fade-in');
    fragment.appendChild(cardElement);
  });

  container.appendChild(fragment);
  displayedCategoryCount = nextCount;
  updateCategoryPaginationUI();
}

/**
 * Updates the Load More button visibility and status text on category page
 */
function updateCategoryPaginationUI() {
  const loadMoreContainer = document.getElementById('load-more-container');
  const loadMoreBtn = document.getElementById('load-more-btn');
  const statusEl = document.getElementById('pagination-status');

  if (!loadMoreContainer || !loadMoreBtn || !statusEl) return;

  const total = currentCategoryArticlesList.length;
  const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'hr';

  if (total <= PAGE_SIZE) {
    loadMoreContainer.style.display = 'none';
    return;
  }

  loadMoreContainer.style.display = 'flex';

  if (displayedCategoryCount < total) {
    loadMoreBtn.style.display = 'inline-flex';
    const statusTemplate = currentLang === 'en'
      ? `Showing ${displayedCategoryCount} of ${total} papers`
      : `Prikazano ${displayedCategoryCount} od ${total} radova`;
    statusEl.textContent = statusTemplate;
  } else {
    loadMoreBtn.style.display = 'none';
    const statusTemplate = currentLang === 'en'
      ? `All papers loaded (${total})`
      : `Prikazani su svi radovi (${total})`;
    statusEl.textContent = statusTemplate;
  }
}

/**
 * Attaches pagination event listeners on category page
 */
function setupPagination() {
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (!loadMoreBtn) return;

  loadMoreBtn.addEventListener('click', () => {
    loadMoreCategoryArticles();
  });
}

function createArticleCard(article) {
  const card = document.createElement('article');
  card.className = 'article-card';
  card.id = `card-${article.id}`;

  const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'hr';

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
 * @param {boolean} [resetPagination=true]
 */
function handleSearch(query, resetPagination = true) {
  currentCategorySearchQuery = query;
  const normalized = normalizeSearchText(query);
  if (!normalized) {
    renderCategoryArticles(cachedCategoryArticles, currentCategoryTitle, '', resetPagination);
    return;
  }

  const filtered = cachedCategoryArticles.filter(article => matchesSearchQuery(article, normalized));
  renderCategoryArticles(filtered, currentCategoryTitle, query, resetPagination);
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
