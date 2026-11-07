const PAGE_SIZE = 6;
let cachedArticles = [];
let currentArticlesList = [];
let displayedArticlesCount = 0;
let currentSearchQuery = '';
let currentCategoryFilter = 'all';
let currentSortOrder = 'newest';

document.addEventListener('DOMContentLoaded', () => {
  initApp();
  setupResponsiveNav();
  setupSearch();
  setupFiltersAndSort();
  setupPagination();
  if (typeof updateActiveNavLink === 'function') {
    updateActiveNavLink();
  }

  window.addEventListener('languageChanged', () => {
    if (cachedArticles && cachedArticles.length > 0) {
      applyFiltersAndRender(false);
    }
  });
});

/**
 * Initializes the application
 */
async function initApp() {
  cachedArticles = await fetchArticles('articles-index.json', 'articles.json');
  updateFilterCounts(cachedArticles);
  applyFiltersAndRender(true);
  setupNavigation();
}

/**
 * Asynchronously fetches article data from lightweight index JSON file (with fallback to full articles.json)
 * @param {string} url - Path to lightweight articles index JSON file
 * @param {string} [fallbackUrl='articles.json'] - Fallback path to full articles JSON file
 * @returns {Promise<Array>} List of article objects
 */
async function fetchArticles(url, fallbackUrl = 'articles.json') {
  const container = document.getElementById('articles-grid');
  if (!container) return []; // Guard for pages without articles grid

  try {
    let response = await fetch(url);
    if (!response.ok && fallbackUrl && fallbackUrl !== url) {
      response = await fetch(fallbackUrl);
    }
    if (!response.ok) {
      throw new Error(`Mrežna pogreška pri učitavanju: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Pogreška pri učitavanju članaka:', error);
    if (container && !container.children.length) {
      renderErrorState(container, 'Nije moguće učitati podatke iz "articles-index.json". Provjerite poslužitelj i datoteku.');
    }
    return [];
  }
}

/**
 * Checks whether an article belongs to the selected category filter slug
 * @param {Object} article
 * @param {string} filterSlug - 'all' | 'ai-tehnologija' | 'longevity'
 * @returns {boolean}
 */
function matchesCategoryFilter(article, filterSlug) {
  if (!filterSlug || filterSlug === 'all') return true;

  const slug = (article.categorySlug || '').toLowerCase().trim();
  const catHR = (article.category || '').toLowerCase().trim();
  const catEN = (article.category_en || '').toLowerCase().trim();

  if (filterSlug === 'ai-tehnologija') {
    return (
      slug === 'ai-tehnologija' ||
      slug === 'ai-tech' ||
      catHR.includes('ai') ||
      catEN.includes('ai')
    );
  }

  if (filterSlug === 'longevity') {
    return (
      slug === 'longevity' ||
      catHR.includes('longevity') ||
      catEN.includes('longevity')
    );
  }

  return slug === filterSlug;
}

/**
 * Updates the count badges inside the category filter pills
 * @param {Array} articles
 */
function updateFilterCounts(articles) {
  if (!Array.isArray(articles)) return;
  const allCountEl = document.getElementById('count-filter-all');
  const aiCountEl = document.getElementById('count-filter-ai');
  const longevityCountEl = document.getElementById('count-filter-longevity');

  if (allCountEl) allCountEl.textContent = String(articles.length);
  if (aiCountEl) {
    const aiCount = articles.filter(a => matchesCategoryFilter(a, 'ai-tehnologija')).length;
    aiCountEl.textContent = String(aiCount);
  }
  if (longevityCountEl) {
    const lonCount = articles.filter(a => matchesCategoryFilter(a, 'longevity')).length;
    longevityCountEl.textContent = String(lonCount);
  }
}

/**
 * Returns numeric word count for sorting articles by length
 * @param {Object} article
 * @param {string} lang
 * @returns {number}
 */
function getArticleWordCount(article, lang = 'hr') {
  if (!article) return 0;
  if (lang === 'en' && typeof article.wordCount_en === 'number' && article.wordCount_en > 0) {
    return article.wordCount_en;
  }
  if (typeof article.wordCount === 'number' && article.wordCount > 0) {
    return article.wordCount;
  }
  const readTimeStr = (lang === 'en' && article.readTime_en) ? article.readTime_en : (article.readTime || '');
  const match = String(readTimeStr).match(/(\d+)/);
  if (match) {
    return parseInt(match[1], 10) * 200;
  }
  return 0;
}

/**
 * Sorts an array of articles without mutating the original array
 * @param {Array} articles
 * @param {string} sortOrder - 'newest' | 'longest' | 'shortest'
 * @returns {Array}
 */
function sortArticlesList(articles, sortOrder) {
  if (!Array.isArray(articles)) return [];
  if (!sortOrder || sortOrder === 'newest') {
    return [...articles];
  }
  const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'hr';
  return [...articles].sort((a, b) => {
    const wordsA = getArticleWordCount(a, currentLang);
    const wordsB = getArticleWordCount(b, currentLang);
    return sortOrder === 'longest' ? (wordsB - wordsA) : (wordsA - wordsB);
  });
}

/**
 * Renders the Featured / Hero article card at the top of the homepage
 * @param {Object|null} article
 * @param {boolean} visible
 */
function renderFeaturedArticle(article, visible = true) {
  const section = document.getElementById('featured-article-section');
  const container = document.getElementById('featured-article-container');
  if (!section || !container) return;

  if (!visible || !article) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'hr';
  const title = (currentLang === 'en' && article.title_en) ? article.title_en : (article.title || 'Naslov rada nedostupan');
  const category = (currentLang === 'en' && article.category_en) ? article.category_en : (article.category || 'Općenito');
  const excerpt = (currentLang === 'en' && (article.excerpt_en || article.summary_en))
    ? (article.excerpt_en || article.summary_en)
    : (article.excerpt || article.summary || 'Kratki uvod i sažetak rada trenutačno nisu dostupni.');
  const date = article.date || 'Nepoznat datum';
  const rawContent = (currentLang === 'en' && article.content_en) ? article.content_en : (article.content || '');
  const readTime = calculateReadingTime(rawContent, currentLang, article);
  const doi = article.doi || '';
  const articleUrl = `articles/${encodeURIComponent(article.id)}.html`;
  const image = article.image || '';

  const badgeLabel = currentLang === 'en' ? 'LATEST PAPER' : 'NAJNOVIJI RAD';
  const ctaText = currentLang === 'en' ? 'Read featured analysis &rarr;' : 'Pročitaj istaknuti rad &rarr;';
  const ctaAria = currentLang === 'en' ? `Read featured article: ${title}` : `Pročitaj istaknuti rad: ${title}`;

  const mediaHTML = image ? `
    <div class="featured-hero-media">
      <a href="${articleUrl}" tabindex="-1" aria-hidden="true">
        <img src="${escapeHTML(image)}" alt="${escapeHTML(title)}" class="featured-hero-img" fetchpriority="high" decoding="async" onerror="this.closest('.featured-hero-media').style.display='none'">
      </a>
    </div>
  ` : '';

  container.innerHTML = `
    <article class="featured-hero-card" id="featured-card-${escapeHTML(String(article.id))}">
      ${mediaHTML}
      <div class="featured-hero-content">
        <div class="featured-hero-top">
          <div class="featured-badges-row">
            <span class="featured-pulse-badge">
              <span class="featured-pulse-dot"></span>
              <span>${escapeHTML(badgeLabel)}</span>
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
            ${ctaText}
          </a>
        </div>
      </div>
    </article>
  `;
}

/**
 * Applies active category filter, search query, and sort order, then renders Hero and Grid
 * @param {boolean} [resetPagination=true]
 */
function applyFiltersAndRender(resetPagination = true) {
  const normalizedQuery = normalizeSearchText(currentSearchQuery);
  const isDefaultView = (
    currentCategoryFilter === 'all' &&
    currentSortOrder === 'newest' &&
    !normalizedQuery &&
    cachedArticles.length > 0
  );

  // 1. Filter by category and search query
  const filtered = cachedArticles.filter(article => {
    const matchesCat = matchesCategoryFilter(article, currentCategoryFilter);
    const matchesSearch = !normalizedQuery || matchesSearchQuery(article, normalizedQuery);
    return matchesCat && matchesSearch;
  });

  // 2. Sort filtered list
  const sorted = sortArticlesList(filtered, currentSortOrder);

  // 3. Render Featured Hero only in default unfiltered view; exclude Hero item from grid below to prevent duplication
  if (isDefaultView) {
    renderFeaturedArticle(cachedArticles[0], true);
    renderArticles(sorted.slice(1), '', resetPagination, cachedArticles.length);
  } else {
    renderFeaturedArticle(null, false);
    renderArticles(sorted, currentSearchQuery, resetPagination, sorted.length);
  }
}

/**
 * Attaches event listeners for instant category filter pills and sort dropdown
 */
function setupFiltersAndSort() {
  const pillsContainer = document.getElementById('category-filter-pills');
  const sortSelect = document.getElementById('article-sort-select');

  if (pillsContainer) {
    const pills = pillsContainer.querySelectorAll('.filter-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        const filterVal = pill.getAttribute('data-filter') || 'all';
        if (currentCategoryFilter === filterVal) return;

        currentCategoryFilter = filterVal;
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        applyFiltersAndRender(true);
      });
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSortOrder = e.target.value || 'newest';
      applyFiltersAndRender(true);
    });
  }
}

/**
 * Dynamically renders article cards into the CSS Grid container with pagination support
 * @param {Array} articles - Array of article objects for the grid
 * @param {string} [query=''] - Search query if filtering is active
 * @param {boolean} [resetPagination=true] - Whether to reset pagination to initial page size
 * @param {number|null} [totalBadgeCount=null] - Optional override for total articles count badge
 */
function renderArticles(articles, query = '', resetPagination = true, totalBadgeCount = null) {
  const container = document.getElementById('articles-grid');
  const countBadge = document.getElementById('articles-count');
  const loadMoreContainer = document.getElementById('load-more-container');

  if (!container) return;

  currentArticlesList = Array.isArray(articles) ? articles : [];
  const badgeTotal = typeof totalBadgeCount === 'number' ? totalBadgeCount : currentArticlesList.length;

  if (resetPagination) {
    displayedArticlesCount = Math.min(PAGE_SIZE, currentArticlesList.length);
  } else {
    displayedArticlesCount = Math.min(
      Math.max(displayedArticlesCount, Math.min(PAGE_SIZE, currentArticlesList.length)),
      currentArticlesList.length
    );
  }

  // Clear existing static/loading content
  container.innerHTML = '';

  const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'hr';

  // Handle empty state
  if (currentArticlesList.length === 0 && badgeTotal === 0) {
    if (countBadge) {
      countBadge.textContent = currentLang === 'en' ? '0 Papers' : '0 Radova';
    }
    if (loadMoreContainer) {
      loadMoreContainer.style.display = 'none';
    }
    if ((query && query.trim()) || currentCategoryFilter !== 'all') {
      renderEmptySearchState(container, query);
    } else {
      renderEmptyState(container);
    }
    return;
  }

  // Update article counter badge
  if (countBadge) {
    const summaryLabel = currentLang === 'en' 
      ? (badgeTotal === 1 ? 'Summary' : 'Summaries')
      : (badgeTotal === 1 ? 'Sažetak' : 'Sažetka');
    countBadge.textContent = `${badgeTotal} ${summaryLabel}`;
  }

  // Create document fragment for optimal performance
  const fragment = document.createDocumentFragment();
  const visibleArticles = currentArticlesList.slice(0, displayedArticlesCount);

  visibleArticles.forEach(article => {
    const cardElement = createArticleCard(article);
    fragment.appendChild(cardElement);
  });

  container.appendChild(fragment);
  updatePaginationUI();
}

/**
 * Loads the next batch of articles
 */
function loadMoreArticles() {
  const container = document.getElementById('articles-grid');
  if (!container || displayedArticlesCount >= currentArticlesList.length) return;

  const nextCount = Math.min(displayedArticlesCount + PAGE_SIZE, currentArticlesList.length);
  const newArticles = currentArticlesList.slice(displayedArticlesCount, nextCount);

  const fragment = document.createDocumentFragment();
  newArticles.forEach(article => {
    const cardElement = createArticleCard(article);
    cardElement.classList.add('anim-fade-in');
    fragment.appendChild(cardElement);
  });

  container.appendChild(fragment);
  displayedArticlesCount = nextCount;
  updatePaginationUI();
}

/**
 * Updates the Load More button visibility and status text
 */
function updatePaginationUI() {
  const loadMoreContainer = document.getElementById('load-more-container');
  const loadMoreBtn = document.getElementById('load-more-btn');
  const statusEl = document.getElementById('pagination-status');

  if (!loadMoreContainer || !loadMoreBtn || !statusEl) return;

  const total = currentArticlesList.length;
  const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'hr';

  if (total <= PAGE_SIZE) {
    loadMoreContainer.style.display = 'none';
    return;
  }

  loadMoreContainer.style.display = 'flex';

  if (displayedArticlesCount < total) {
    loadMoreBtn.style.display = 'inline-flex';
    const statusTemplate = currentLang === 'en'
      ? `Showing ${displayedArticlesCount} of ${total} papers`
      : `Prikazano ${displayedArticlesCount} od ${total} radova`;
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
 * Attaches pagination event listeners
 */
function setupPagination() {
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (!loadMoreBtn) return;

  loadMoreBtn.addEventListener('click', () => {
    loadMoreArticles();
  });
}

/**
 * Calculates estimated reading time based on actual content word count or precomputed index metadata
 * @param {string} content
 * @param {string} lang
 * @param {Object} [article=null]
 * @returns {string} Formatted reading time string
 */
function calculateReadingTime(content, lang = 'hr', article = null) {
  if (article) {
    if (lang === 'en') {
      if (article.content_en && typeof article.content_en === 'string') {
        content = article.content_en;
      } else if (typeof article.wordCount_en === 'number' && article.wordCount_en > 0) {
        const mins = Math.max(1, Math.ceil(article.wordCount_en / 200));
        return `⏱ ${mins} min read`;
      } else if (article.readTime_en) {
        return article.readTime_en.startsWith('⏱') ? article.readTime_en : `⏱ ${article.readTime_en}`;
      }
    } else {
      if (article.content && typeof article.content === 'string') {
        content = article.content;
      } else if (typeof article.wordCount === 'number' && article.wordCount > 0) {
        const mins = Math.max(1, Math.ceil(article.wordCount / 200));
        return `⏱ ${mins} min čitanja`;
      } else if (article.readTime) {
        return article.readTime.startsWith('⏱') ? article.readTime : `⏱ ${article.readTime}`;
      }
    }
  }

  if (!content || typeof content !== 'string') {
    return lang === 'en' ? '⏱ 3 min read' : '⏱ 3 min čitanja';
  }
  const plainText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = plainText ? plainText.split(/\s+/).length : 0;
  const minutes = Math.max(1, Math.ceil(wordCount / 200));
  return lang === 'en' ? `⏱ ${minutes} min read` : `⏱ ${minutes} min čitanja`;
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
  
  const rawContent = (currentLang === 'en' && article.content_en) ? article.content_en : (article.content || '');
  const readTime = calculateReadingTime(rawContent, currentLang, article);

  const doi = article.doi || '';
  const articleUrl = `articles/${encodeURIComponent(article.id)}.html`;
  const image = article.image || '';
  const readBtnText = currentLang === 'en' ? 'Read article &rarr;' : 'Pročitaj rad &rarr;';
  const readBtnAria = currentLang === 'en' ? `Read article: ${title}` : `Pročitaj rad: ${title}`;

  const mediaHTML = image ? `
    <div class="article-card-media">
      <a href="${articleUrl}" tabindex="-1" aria-hidden="true">
        <img src="${escapeHTML(image)}" alt="${escapeHTML(title)}" class="article-card-thumb" loading="lazy" decoding="async" onerror="this.closest('.article-card-media').style.display='none'">
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
  const desc = query && query.trim()
    ? (currentLang === 'en'
        ? `No papers match your search for "${escapeHTML(query)}". Try using different keywords.`
        : `Niti jedan rad ne odgovara vašem upitu "${escapeHTML(query)}". Pokušajte s drugim ključnim riječima.`)
    : (currentLang === 'en'
        ? 'No papers match the selected filter criteria.'
        : 'Niti jedan rad ne odgovara odabranom filtru.');
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
      const kbdHint = document.getElementById('search-kbd-hint');
      const pillsContainer = document.getElementById('category-filter-pills');
      const sortSelect = document.getElementById('article-sort-select');

      currentCategoryFilter = 'all';
      currentSortOrder = 'newest';

      if (pillsContainer) {
        pillsContainer.querySelectorAll('.filter-pill').forEach(p => {
          p.classList.toggle('active', p.getAttribute('data-filter') === 'all');
        });
      }
      if (sortSelect) {
        sortSelect.value = 'newest';
      }
      if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
      }
      if (clearBtn) {
        clearBtn.style.display = 'none';
      }
      if (kbdHint) {
        kbdHint.style.display = '';
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
    article.headingsText,
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
  currentSearchQuery = query;
  applyFiltersAndRender(resetPagination);
}

/**
 * Attaches search input, clear button, and keyboard shortcut ('/' or Ctrl+K) listeners
 */
function setupSearch() {
  const searchInput = document.getElementById('article-search');
  const clearBtn = document.getElementById('search-clear-btn');
  const kbdHint = document.getElementById('search-kbd-hint');

  if (!searchInput) return;

  const updateSearchUi = (val) => {
    const hasText = Boolean(val && val.trim());
    if (clearBtn) {
      clearBtn.style.display = hasText ? 'block' : 'none';
    }
    if (kbdHint) {
      kbdHint.style.display = hasText ? 'none' : '';
    }
  };

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value;
    updateSearchUi(query);
    handleSearch(query);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      updateSearchUi('');
      handleSearch('');
      searchInput.blur();
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      updateSearchUi('');
      searchInput.focus();
      handleSearch('');
    });
  }

  // Global keyboard shortcut: '/' or Ctrl+K / Cmd+K to focus search bar
  document.addEventListener('keydown', (e) => {
    const activeTag = document.activeElement ? document.activeElement.tagName : '';
    const isInputFocused = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT' || (document.activeElement && document.activeElement.isContentEditable);

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
      return;
    }

    if (e.key === '/' && !isInputFocused && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });
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
