/**
 * TechHorizons Blog - Internationalization (i18n) Module
 * Handles language switching (HRV / ENG), persistence in localStorage, and dynamic content updates.
 */

const translations = {
  hr: {
    // Navigation
    "nav.home": "Početna",
    "nav.ai": "AI i tehnologija",
    "nav.longevity": "Longevity",
    "nav.author": "O autoru",

    // Hero / Header
    "hero.overline": "ISTRAŽIVANJA I PUBLIKACIJE",
    "hero.title": "Granice fizike, umjetne inteligencije i biologije",
    "hero.description": "Pregled aktualnih događanja, istraživanja i napredaka na polju tehnologije, znanosti i longevitija.",

    // Category page hero defaults
    "category.meta_prefix": "Kategorija • ",
    "category.default_desc": "Pregled objavljenih sažetaka radova i analiza iz odabrane tematske kategorije.",

    // Section Headers
    "section.short_texts": "KRATKI TEKSTOVI",

    // Buttons & UI
    "btn.read_article": "Pročitaj rad →",
    "btn.back_home": "← Natrag na sve radove",
    "btn.back_summary": "← Povratak na popis sažetaka",
    "lang.toggle_label": "ENG",
    "lang.aria_label": "Promijeni jezik",

    // Article Meta & States
    "article.loading": "Učitavanje sadržaja rada...",
    "article.not_found": "Rad nije pronađen",
    "article.empty_title": "Trenutačno nema objavljenih radova",
    "article.empty_desc": "Datoteka \"articles.json\" ne sadrži niti jedan sažetak. Dodajte nove objave u JSON datoteku.",
    "article.category_empty_title": "U ovoj kategoriji trenutno nema objavljenih članaka",
    "article.category_empty_desc": "U kategoriji trenutno nema objavljenih članaka. Pratite nas uskoro za nove sadržaje.",
    "article.read_time_default": "3 min čitanja",

    // Count Badges
    "count.papers_zero": "0 Radova",
    "count.summary_single": "Sažetak",
    "count.summary_plural": "Sažetka",

    // Footer
    "footer.desc": "Minimalistička platforma inspirirana principima otvorene znanosti i arXiv.org pretpisa.",
    "footer.contact": "Kontakt:",
    "footer.sources": "Izvori i arhive",
    "footer.podcasts": "Podcasti & Mediji",
    "footer.podcast_moonshot": "Moonshot Podcast",
    "footer.podcast_allin": "All-In Podcast",
    "footer.podcast_twominute": "Two Minute Papers",
    "footer.podcast_kantrowitz": "Alex Kantrowitz",
    "footer.rights": "© 2026 Keeping up with the singularity. Sva prava pridržana.",
    "footer.arch": "Arhitektura: Vanilla HTML5 / CSS3 Grid / Vanilla JS",

    // About Page (O autoru)
    "about.meta": "Urednik • Inženjer • Istraživač",
    "about.title": "O autoru",
    "about.lead": "Dobrodošli na platformu <strong>Keeping up with the singularity</strong>, neovisnu platformu posvećenu dubinskoj analizi raskrižja inženjerstva, kvantne fizike, longevityja i razvoja umjetne opće inteligencije (AGI).",
    "about.p1": "Kao inženjer i istraživač primjene naprednih računalnih modela u fizikalnim i građevinskim sustavima, pokrenuo sam ovu publikaciju s ciljem premošćivanja jaza između teorijskih akademskih radova i njihove praktične primjene u modernoj industriji.",
    "about.p2": "Težište mog rada obuhvaća proučavanje termodinamike učenja dubokih arhitektura, B-Rep i parametarske algebarske barijere u CAD automatizaciji, te primjenu generativnih temeljnih modela u strukturnom inženjerstvu.",
    "about.h2": "Fokus istraživanja & Publikacije",
    "about.li1": "<strong>AI u CAD & AEC inženjerstvu:</strong> Automatizacija generiranja 3D geometrije i optimizacija BIM procesa.",
    "about.li2": "<strong>Kvantna fizika i neuromorfno računanje:</strong> Eksperimentalne analize koherencije i samoorganizirane kritičnosti.",
    "about.li3": "<strong>Longevity i modeliranje proteina:</strong> Primjena transformatora u dinamici savijanja proteina i mRNK terapijama.",
    "about.contact_title": "Kontakt & Suradnja",
    "about.contact_desc": "Za istraživačke upite, recenzije radova ili akademsku suradnju možete me kontaktirati putem:"
  },

  en: {
    // Navigation
    "nav.home": "Home",
    "nav.ai": "AI & Tech",
    "nav.longevity": "Longevity",
    "nav.author": "About Author",

    // Hero / Header
    "hero.overline": "RESEARCH & PUBLICATIONS",
    "hero.title": "Frontiers of Physics, Artificial Intelligence, and Biology",
    "hero.description": "A review of current developments, research, and breakthroughs in technology, science, and longevity.",

    // Category page hero defaults
    "category.meta_prefix": "Category • ",
    "category.default_desc": "An overview of published research summaries and analyses from the selected thematic category.",

    // Section Headers
    "section.short_texts": "SHORT ARTICLES",

    // Buttons & UI
    "btn.read_article": "Read article →",
    "btn.back_home": "← Back to all articles",
    "btn.back_summary": "← Back to summary list",
    "lang.toggle_label": "HRV",
    "lang.aria_label": "Change language",

    // Article Meta & States
    "article.loading": "Loading article content...",
    "article.not_found": "Article not found",
    "article.empty_title": "Currently no published articles",
    "article.empty_desc": "The \"articles.json\" file does not contain any summaries. Add new entries to the JSON file.",
    "article.category_empty_title": "No articles currently published in this category",
    "article.category_empty_desc": "There are currently no published articles in this category. Check back soon for new content.",
    "article.read_time_default": "3 min read",

    // Count Badges
    "count.papers_zero": "0 Papers",
    "count.summary_single": "Summary",
    "count.summary_plural": "Summaries",

    // Footer
    "footer.desc": "A minimalist platform inspired by open science principles and arXiv.org preprints.",
    "footer.contact": "Contact:",
    "footer.sources": "Sources & Archives",
    "footer.podcasts": "Podcasts & Media",
    "footer.podcast_moonshot": "Moonshot Podcast",
    "footer.podcast_allin": "All-In Podcast",
    "footer.podcast_twominute": "Two Minute Papers",
    "footer.podcast_kantrowitz": "Alex Kantrowitz",
    "footer.rights": "© 2026 Keeping up with the singularity. All rights reserved.",
    "footer.arch": "Architecture: Vanilla HTML5 / CSS3 Grid / Vanilla JS",

    // About Page (O autoru)
    "about.meta": "Editor • Engineer • Researcher",
    "about.title": "About the Author",
    "about.lead": "Welcome to <strong>Keeping up with the singularity</strong>, an independent platform dedicated to deep-dive analysis at the intersection of engineering, quantum physics, longevity, and artificial general intelligence (AGI).",
    "about.p1": "As an engineer and researcher applying advanced computational models to physical and structural systems, I launched this publication to bridge the gap between theoretical academic papers and their practical applications in modern industry.",
    "about.p2": "My work focuses on studying deep architecture learning thermodynamics, B-Rep and parametric algebraic barriers in CAD automation, and applying generative foundation models in structural engineering.",
    "about.h2": "Research Focus & Publications",
    "about.li1": "<strong>AI in CAD & AEC Engineering:</strong> 3D geometry generation automation and BIM process optimization.",
    "about.li2": "<strong>Quantum Physics & Neuromorphic Computing:</strong> Experimental coherence analysis and self-organized criticality.",
    "about.li3": "<strong>Longevity & Protein Modeling:</strong> Transformer applications in protein folding dynamics and mRNA therapies.",
    "about.contact_title": "Contact & Collaboration",
    "about.contact_desc": "For research inquiries, paper reviews, or academic collaboration, you can reach me via:"
  }
};

/**
 * Retrieves current site language from localStorage or defaults to 'hr'
 * @returns {string} Current language ('hr' or 'en')
 */
function getCurrentLanguage() {
  const saved = localStorage.getItem('site_lang');
  return (saved === 'en' || saved === 'hr') ? saved : 'hr';
}

/**
 * Updates UI and state for selected language
 * @param {string} lang - Target language ('hr' or 'en')
 */
function setLanguage(lang) {
  const currentLang = (lang === 'en' || lang === 'hr') ? lang : 'hr';
  localStorage.setItem('site_lang', currentLang);
  document.documentElement.lang = currentLang;

  // Update lang toggle button text (#lang-toggle displays "ENG" if current is 'hr', "HRV" if current is 'en')
  const langToggleBtn = document.getElementById('lang-toggle');
  if (langToggleBtn) {
    langToggleBtn.textContent = currentLang === 'hr' ? 'ENG' : 'HRV';
    langToggleBtn.setAttribute('aria-label', currentLang === 'hr' ? 'Promijeni jezik' : 'Change language');
  }

  // Update static text elements with data-i18n attribute
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[currentLang] && translations[currentLang][key] !== undefined) {
      const translation = translations[currentLang][key];
      if (translation.includes('<') && translation.includes('>')) {
        el.innerHTML = translation;
      } else {
        el.textContent = translation;
      }
    }
  });

  // Notify page scripts to re-render dynamic content
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: currentLang } }));
}

/**
 * Toggles language between 'hr' and 'en'
 */
function toggleLanguage() {
  const current = getCurrentLanguage();
  const nextLang = current === 'hr' ? 'en' : 'hr';
  setLanguage(nextLang);
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  const initialLang = getCurrentLanguage();
  setLanguage(initialLang);

  const langToggleBtn = document.getElementById('lang-toggle');
  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', () => {
      toggleLanguage();
    });
  }
});
