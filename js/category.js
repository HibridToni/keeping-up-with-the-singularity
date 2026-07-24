/**
 * TechHorizons Blog - Category Filtering Script
 * Reads 'cat' parameter from URL, filters articles from articles.json, and renders matching cards or empty state.
 */

document.addEventListener('DOMContentLoaded', () => {
  initCategoryPage();
  setupResponsiveNav();
  if (typeof updateActiveNavLink === 'function') {
    updateActiveNavLink();
  }
});

const CATEGORY_MAP = {
  'ai-tehnologija': {
    title: 'AI i tehnologija',
    description: 'Pregled stručnih radova, analiza i publikacija iz područja umjetne inteligencije, strojnog učenja i tehnoloških inovacija.'
  },
  'longevity': {
    title: 'Longevity',
    description: 'Najnovija istraživanja i teorijski radovi u području dugovječnosti, regenerativne medicine i inovacija na području longevityja.'
  }
};

async function initCategoryPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const catSlug = urlParams.get('cat') ? urlParams.get('cat').toLowerCase().trim() : '';

  const catMeta = CATEGORY_MAP[catSlug] || {
    title: catSlug ? (catSlug.charAt(0).toUpperCase() + catSlug.slice(1)) : 'Kategorija',
    description: 'Pregled objavljenih sažetaka radova i analiza iz odabrane tematske kategorije.'
  };

  // Update DOM elements for category details
  document.title = `${catMeta.title} - Keeping up with the singularity`;
  
  const titleEl = document.getElementById('category-title');
  if (titleEl) titleEl.textContent = catMeta.title;

  const descEl = document.getElementById('category-description');
  if (descEl) descEl.textContent = catMeta.description;

  const metaTagEl = document.getElementById('category-meta-tag');
  if (metaTagEl) metaTagEl.textContent = `Kategorija \u2022 ${catMeta.title}`;

  // Fetch articles and filter
  const articles = await fetchArticles('articles.json');
  const filteredArticles = articles.filter(art => {
    const slug = art.categorySlug ? art.categorySlug.toLowerCase().trim() : '';
    const catName = art.category ? art.category.toLowerCase().trim() : '';
    return slug === catSlug || catName === catMeta.title.toLowerCase();
  });

  renderCategoryArticles(filteredArticles, catMeta.title);
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
      container.innerHTML = `<div class="error-state"><h3>Pogreška pri učitavanju</h3><p>Nije moguće učitati podatke iz JSON datoteke.</p></div>`;
    }
    return [];
  }
}

function renderCategoryArticles(articles, categoryTitle) {
  const container = document.getElementById('articles-grid');
  const countBadge = document.getElementById('articles-count');
  if (!container) return;

  container.innerHTML = '';

  if (!articles || articles.length === 0) {
    if (countBadge) countBadge.textContent = '0 Radova';
    container.innerHTML = `
      <div class="empty-state">
        <h3>U ovoj kategoriji trenutno nema objavljenih članaka</h3>
        <p>U kategoriji "${escapeHTML(categoryTitle)}" trenutno nema objavljenih članaka. Pratite nas uskoro za nove sadržaje.</p>
      </div>
    `;
    return;
  }

  if (countBadge) {
    countBadge.textContent = `${articles.length} ${articles.length === 1 ? 'Sažetak' : 'Sažetka'}`;
  }

  const fragment = document.createDocumentFragment();
  articles.forEach(article => {
    const cardElement = createArticleCard(article);
    fragment.appendChild(cardElement);
  });

  container.appendChild(fragment);
}

function createArticleCard(article) {
  const card = document.createElement('article');
  card.className = 'article-card';
  card.id = `card-${article.id}`;

  const title = article.title || 'Naslov rada nedostupan';
  const category = article.category || 'Općenito';
  const excerpt = article.excerpt || article.summary || 'Kratki uvod i sažetak rada trenutačno nisu dostupni.';
  const date = article.date || 'Nepoznat datum';
  const readTime = article.readTime || '3 min čitanja';
  const doi = article.doi || '';
  const articleUrl = `article.html?id=${article.id}`;
  const image = article.image || '';

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

        <a href="${articleUrl}" class="btn-read-article" aria-label="Pročitaj rad: ${escapeHTML(title)}">
          Pročitaj rad &rarr;
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
