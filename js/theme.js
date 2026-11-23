/**
 * TechHorizons Blog - Theme Toggle & Persistence Script
 * Handles dark/light mode toggle, applies saved theme before render, and persists selection in localStorage.
 */

const THEME_META_COLORS = {
  dark: '#070a10',
  light: '#f5f7fb'
};

const THEME_TOGGLE_SVG_HTML = `
  <svg class="theme-icon theme-icon-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4"></circle>
    <path d="M12 2v2"></path>
    <path d="M12 20v2"></path>
    <path d="m4.93 4.93 1.41 1.41"></path>
    <path d="m17.66 17.66 1.41 1.41"></path>
    <path d="M2 12h2"></path>
    <path d="M20 12h2"></path>
    <path d="m6.34 17.66-1.41 1.41"></path>
    <path d="m19.07 4.93-1.41 1.41"></path>
  </svg>
  <svg class="theme-icon theme-icon-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
  </svg>
`.trim();

/**
 * Updates the theme toggle button's accessibility attributes and localized label
 * @param {boolean} isLight
 */
function syncThemeToggleMeta(isLight) {
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (!themeToggleBtn) return;

  const lang = localStorage.getItem('site_lang') === 'en' ? 'en' : 'hr';
  const label = lang === 'en'
    ? (isLight ? 'Switch to dark mode' : 'Switch to light mode')
    : (isLight ? 'Prebaci na tamnu temu' : 'Prebaci na svijetlu temu');

  themeToggleBtn.setAttribute('aria-pressed', String(isLight));
  themeToggleBtn.setAttribute('aria-label', label);
  themeToggleBtn.setAttribute('title', label);
}

/**
 * Applies the selected theme ('light' or 'dark') consistently across root attributes, meta theme-color, and button state
 * @param {'light'|'dark'} theme
 * @returns {boolean} True if light theme is active
 */
function applyTheme(theme) {
  const isLight = theme === 'light';
  const root = document.documentElement;

  root.classList.toggle('light-theme', isLight);
  root.setAttribute('data-theme', isLight ? 'light' : 'dark');

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', isLight ? THEME_META_COLORS.light : THEME_META_COLORS.dark);
  }

  syncThemeToggleMeta(isLight);
  return isLight;
}

// Immediately check localStorage and apply saved theme before DOM paint (anti-FOUC)
(function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  applyTheme(savedTheme === 'light' ? 'light' : 'dark');
})();

// Attach event listener to theme toggle button & update active nav links once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const isLightCurrent = document.documentElement.classList.contains('light-theme');
  applyTheme(isLightCurrent ? 'light' : 'dark');

  const themeToggleBtn = document.getElementById('theme-toggle');
  if (themeToggleBtn) {
    if (!themeToggleBtn.querySelector('.theme-icon-sun') || !themeToggleBtn.querySelector('.theme-icon-moon')) {
      themeToggleBtn.innerHTML = THEME_TOGGLE_SVG_HTML;
    }

    themeToggleBtn.addEventListener('click', () => {
      const nextIsLight = !document.documentElement.classList.contains('light-theme');
      const nextTheme = nextIsLight ? 'light' : 'dark';
      applyTheme(nextTheme);
      localStorage.setItem('theme', nextTheme);
    });
  }

  window.addEventListener('languageChanged', () => {
    const isLight = document.documentElement.classList.contains('light-theme');
    syncThemeToggleMeta(isLight);
  });

  updateActiveNavLink();
});

/**
 * Dynamically highlights active navigation tab based on URL path and parameters
 */
function updateActiveNavLink() {
  const navLinks = document.querySelectorAll('.nav-link');
  if (!navLinks.length) return;

  const currentPath = window.location.pathname.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);
  const currentCat = searchParams.get('cat') ? searchParams.get('cat').toLowerCase().trim() : '';

  navLinks.forEach(link => {
    link.classList.remove('active');
    const href = link.getAttribute('href');
    if (!href) return;

    const hrefClean = href.split('#')[0].toLowerCase();

    if (currentPath.includes('category.html')) {
      if (hrefClean.includes('category.html') && currentCat && hrefClean.includes(`cat=${currentCat}`)) {
        link.classList.add('active');
      }
    } else if (currentPath.includes('o-autoru.html') || currentPath.includes('about.html')) {
      if (hrefClean.includes('o-autoru.html') || hrefClean.includes('about.html')) {
        link.classList.add('active');
      }
    } else if (currentPath.includes('index.html') || currentPath === '/' || currentPath.endsWith('/')) {
      if (hrefClean.includes('index.html') || hrefClean === 'index.html' || hrefClean === './') {
        link.classList.add('active');
      }
    }
  });
}
