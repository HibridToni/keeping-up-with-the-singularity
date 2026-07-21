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

// Attach event listener to theme toggle button once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (!themeToggleBtn) return;

  themeToggleBtn.addEventListener('click', () => {
    const isLight = document.documentElement.classList.toggle('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
  });
});
