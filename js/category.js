/**
 * TechHorizons Blog - Category Filtering Script
 * Reads 'cat' parameter from URL, filters articles from articles.json, and renders matching cards or empty state.
 */

let cachedCategoryArticles = [];
let currentCategoryTitle = '';

document.addEventListener('DOMContentLoaded', () => {
  initCategoryPage();
  setupResponsiveNav();
  if (typeof updateActiveNavLink === 'function') {
    updateActiveNavLink();
  }

  window.addEventListener('languageChanged', () => {
    initCategoryPage();
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

async function initCategoryPage() {
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
  renderCategoryArticles(filteredArticles, catTitle);
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

function renderCategoryArticles(articles, categoryTitle) {
  const container = document.getElementById('articles-grid');
  const countBadge = document.getElementById('articles-count');
  if (!container) return;

  container.innerHTML = '';

  const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'hr';

  if (!articles || articles.length === 0) {
    if (countBadge) {
      countBadge.textContent = currentLang === 'en' ? '0 Papers' : '0 Radova';
    }
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
    return;
  }

  if (countBadge) {
    const summaryLabel = currentLang === 'en' 
      ? (articles.length === 1 ? 'Summary' : 'Summaries')
      : (articles.length === 1 ? 'Sažetak' : 'Sažetka');
    countBadge.textContent = `${articles.length} ${summaryLabel}`;
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
