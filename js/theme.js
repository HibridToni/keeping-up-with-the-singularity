/**
 * TechHorizons Blog - Theme Toggle & Persistence Script
 * Handles dark/light mode toggle, applies saved theme before render, and persists selection in localStorage.
 */

// Immediately check localStorage and apply saved theme before DOM paint (anti-FOUC)
(function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') {
    document.documentElement.classList.add('light-theme');
  } else {
    document.documentElement.classList.remove('light-theme');
  }
})();

// Attach event listener to theme toggle button & update active nav links once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isLight = document.documentElement.classList.toggle('light-theme');
      localStorage.setItem('theme', isLight ? 'light' : 'dark');
    });
  }

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
    } else if (currentPath.includes('about.html')) {
      if (hrefClean.includes('about.html')) {
        link.classList.add('active');
      }
    } else if (currentPath.includes('index.html') || currentPath === '/' || currentPath.endsWith('/')) {
      if (hrefClean.includes('index.html') || hrefClean === 'index.html' || hrefClean === './') {
        link.classList.add('active');
      }
    }
  });
}
