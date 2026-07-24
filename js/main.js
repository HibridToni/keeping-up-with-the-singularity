/**
 * TechHorizons Blog - Main Application Logic
 * Modular Vanilla JavaScript for fetching and dynamically rendering articles.
 */

document.addEventListener('DOMContentLoaded', () => {
  initApp();
  setupResponsiveNav();
});

/**
 * Initializes the application
 */
async function initApp() {
  const articles = await fetchArticles('articles.json');
  renderArticles(articles);
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

  // Handle empty state
  if (!articles || articles.length === 0) {
    if (countBadge) countBadge.textContent = '0 Radova';
    renderEmptyState(container);
    return;
  }

  // Update article counter badge
  if (countBadge) {
    countBadge.textContent = `${articles.length} ${articles.length === 1 ? 'Sažetak' : 'Sažetka'}`;
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

/**
 * Displays empty state message if JSON array is empty
 */
function renderEmptyState(container) {
  container.innerHTML = `
    <div class="empty-state">
      <h3>Trenutačno nema objavljenih radova</h3>
      <p>Datoteka "articles.json" ne sadrži niti jedan sažetak. Dodajte nove objave u JSON datoteku.</p>
    </div>
  `;
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
