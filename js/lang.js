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
    "btn.load_more": "Učitaj više radova",
    "btn.back_home": "← Natrag na sve radove",
    "btn.back_summary": "← Povratak na popis sažetaka",
    "lang.toggle_label": "ENG",
    "lang.aria_label": "Promijeni jezik",

    // Pagination
    "pagination.showing": "Prikazano {count} od {total} radova",
    "pagination.all_loaded": "Prikazani su svi radovi ({total})",

    // Search UI
    "search.placeholder": "Pretraži radove (npr. Yamanaka, peptidi, AI...)",
    "search.aria_label": "Pretraži radove",
    "search.clear": "Očisti pretragu",
    "search.no_results_title": "Nema pronađenih radova",
    "search.no_results_desc": "Niti jedan rad ne odgovara vašem upitu \"{query}\". Pokušajte s drugim ključnim riječima.",
    "search.reset_btn": "Prikaži sve radove",

    // Share & Social
    "share.copy_link": "Kopiraj poveznicu",
    "share.copied": "Poveznica kopirana!",
    "share.share_article": "Podijeli ovaj rad",
    "share.fb_aria": "Podijeli na Facebooku",
    "share.x_aria": "Podijeli na X-u (Twitter)",
    "share.linkedin_aria": "Podijeli na LinkedInu",

    // Related Articles
    "related.overline": "PREPORUČENO ČITANJE",
    "related.title": "Povezani radovi i publikacije",
    "related.read_more": "Pročitaj rad →",
    "related.empty": "Nema drugih radova u ovoj kategoriji.",

    // Article Meta & States
    "article.loading": "Učitavanje sadržaja rada...",
    "article.not_found": "Rad nije pronađen",
    "article.empty_title": "Trenutačno nema objavljenih radova",
    "article.empty_desc": "Datoteka \"articles.json\" ne sadrži niti jedan sažetak. Dodajte nove objave u JSON datoteku.",
    "article.category_empty_title": "U ovoj kategoriji trenutno nema objavljenih članaka",
    "article.category_empty_desc": "U kategoriji trenutno nema objavljenih članaka. Pratite nas uskoro za nove sadržaje.",
    "article.read_time_default": "3 min čitanja",

    // Text to Speech
    "tts.listen": "Slušaj članak",
    "tts.reading": "Čitanje u tijeku...",
    "tts.paused": "Pauzirano",
    "tts.speed": "Brzina:",
    "tts.play": "Pokreni čitanje",
    "tts.pause": "Pauziraj",
    "tts.stop": "Zaustavi",
    "tts.speed_label": "Brzina govora",

    // Table of Contents (Sadržaj rada)
    "toc.title": "Sadržaj rada",
    "toc.toggle_hide": "Sakrij",
    "toc.toggle_show": "Prikaži",
    "toc.aria_label": "Sadržaj članka",

    // Reading Experience & Floating Toolbar
    "reader.progress_aria": "Napredak čitanja",
    "reader.back_to_top": "Vrh stranice",
    "reader.toc_jump": "Sadržaj rada",
    "reader.font_size": "Veličina teksta",

    // Count Badges
    "count.papers_zero": "0 Radova",
    "count.summary_single": "Sažetak",
    "count.summary_plural": "Sažetka",

    // Newsletter
    "newsletter.section_title": "Budite u tijeku sa singularnošću",
    "newsletter.section_desc": "Prijavite se na newsletter i primite obavijest sa sažetkom i poveznicom izravno u inbox čim objavimo novu analizu.",
    "newsletter.input_placeholder": "Upišite vašu e-mail adresu...",
    "newsletter.btn_subscribe": "Pretplati se",
    "newsletter.btn_loading": "Prijava...",
    "newsletter.success": "Uspješno ste prijavljeni! Obavijestit ćemo vas o svakom novom članku.",
    "newsletter.already_subscribed": "Ova email adresa je već prijavljena na newsletter.",
    "newsletter.invalid_email": "Molimo unesite valjanu e-mail adresu (npr. ime@domena.com).",
    "newsletter.privacy_note": "Bez spama. Možete se odjaviti u bilo kojem trenutku.",
    "newsletter.error": "Došlo je do greške prilikom prijave. Pokušajte ponovno.",

    // Unsubscribe
    "unsub.title": "Odjava s newslettera",
    "unsub.desc": "Upravljajte svojim pretplatama na obavijesti časopisa.",
    "unsub.processing": "Odjavljivanje u tijeku...",
    "unsub.success_title": "Uspješno ste odjavljeni",
    "unsub.success_desc": "Vaša email adresa ({email}) je uspješno uklonjena s liste za slanje obavijesti.",
    "unsub.resubscribe_prompt": "Slučajno ste se odjavili?",
    "unsub.resubscribe_btn": "Ponovno se pretplati",
    "unsub.manual_prompt": "Upišite email adresu s koje se želite odjaviti:",
    "unsub.input_placeholder": "Vaša e-mail adresa...",
    "unsub.btn_submit": "Odjavi me",
    "unsub.back_home": "← Povratak na početnu stranicu",

    // Footer
    "footer.desc": "Platforma inspirirana tehnološkim napretkom i eksponencijalnim tehnologijama, u pokušaju držanja koraka za istim",
    "footer.contact": "Kontakt:",
    "footer.sources": "Izvori i arhive",
    "footer.podcasts": "Podcasti & Mediji",
    "footer.podcast_moonshot": "Moonshot Podcast",
    "footer.podcast_allin": "All-In Podcast",
    "footer.podcast_twominute": "Two Minute Papers",
    "footer.podcast_kantrowitz": "Alex Kantrowitz",
    "footer.newsletters": "NEWSLETTERI",
    "footer.newsletter_innermostloop": "The Innermost Loop",
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
    "about.contact_desc": "Za istraživačke upite, recenzije radova ili akademsku suradnju možete me kontaktirati putem:",

    // Comments (Komentari)
    "comments.title": "Komentari",
    "comments.count_zero": "0 komentara",
    "comments.count_single": "1 komentar",
    "comments.count_few": "{count} komentara",
    "comments.empty_title": "Budi prvi koji će ostaviti komentar",
    "comments.empty_desc": "Podijelite svoja razmišljanja, pitanja ili analizu vezanu uz temu ovog rada.",
    "comments.form_title": "Ostavi komentar",
    "comments.name_label": "Vaše ime ili nadimak",
    "comments.name_placeholder": "Upišite vaše ime ili nadimak...",
    "comments.content_label": "Vaš komentar",
    "comments.content_placeholder": "Napišite komentar ili postavite pitanje vezano uz rad...",
    "comments.submit_btn": "Objavi komentar",
    "comments.submitting_btn": "Objavljivanje...",
    "comments.success_msg": "Vaš komentar je uspješno objavljen!",
    "comments.error_name_empty": "Molimo unesite vaše ime ili nadimak (minimalno 2 znaka).",
    "comments.error_content_empty": "Molimo unesite tekst komentara (minimalno 2 znaka).",
    "comments.error_generic": "Došlo je do pogreške prilikom objave komentara. Molimo pokušajte ponovno.",
    "comments.error_rate_limit": "Molimo pričekajte trenutak prije objave novog komentara.",
    "comments.just_now": "upravo sada",
    "comments.minutes_ago": "prije {n} min",
    "comments.hours_ago": "prije {n} h",
    "comments.days_ago": "prije {n} d"
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
    "btn.load_more": "Load more papers",
    "btn.back_home": "← Back to all articles",
    "btn.back_summary": "← Back to summary list",
    "lang.toggle_label": "HRV",
    "lang.aria_label": "Change language",

    // Pagination
    "pagination.showing": "Showing {count} of {total} papers",
    "pagination.all_loaded": "All papers loaded ({total})",

    // Search UI
    "search.placeholder": "Search papers (e.g. Yamanaka, peptides, AI...)",
    "search.aria_label": "Search papers",
    "search.clear": "Clear search",
    "search.no_results_title": "No matching papers found",
    "search.no_results_desc": "No papers match your search for \"{query}\". Try using different keywords.",
    "search.reset_btn": "Show all papers",

    // Share & Social
    "share.copy_link": "Copy link",
    "share.copied": "Link copied!",
    "share.share_article": "Share this paper",
    "share.fb_aria": "Share on Facebook",
    "share.x_aria": "Share on X (Twitter)",
    "share.linkedin_aria": "Share on LinkedIn",

    // Related Articles
    "related.overline": "RECOMMENDED READING",
    "related.title": "Related Papers & Publications",
    "related.read_more": "Read article →",
    "related.empty": "No other articles in this category.",

    // Article Meta & States
    "article.loading": "Loading article content...",
    "article.not_found": "Article not found",
    "article.empty_title": "Currently no published articles",
    "article.empty_desc": "The \"articles.json\" file does not contain any summaries. Add new entries to the JSON file.",
    "article.category_empty_title": "No articles currently published in this category",
    "article.category_empty_desc": "There are currently no published articles in this category. Check back soon for new content.",
    "article.read_time_default": "3 min read",

    // Text to Speech
    "tts.listen": "Listen to article",
    "tts.reading": "Reading in progress...",
    "tts.paused": "Paused",
    "tts.speed": "Speed:",
    "tts.play": "Play reading",
    "tts.pause": "Pause reading",
    "tts.stop": "Stop reading",

    // Table of Contents
    "toc.title": "Table of Contents",
    "toc.toggle_hide": "Hide",
    "toc.toggle_show": "Show",
    "toc.aria_label": "Table of contents",

    // Reading Experience & Floating Toolbar
    "reader.progress_aria": "Reading progress",
    "reader.back_to_top": "Back to top",
    "reader.toc_jump": "Table of Contents",
    "reader.font_size": "Text size",

    // Count Badges
    "count.papers_zero": "0 Papers",
    "count.summary_single": "Summary",
    "count.summary_plural": "Summaries",

    // Newsletter
    "newsletter.section_title": "Keep Up with the Singularity",
    "newsletter.section_desc": "Subscribe to our newsletter and receive summaries and links directly to your inbox whenever a new research paper or article is published.",
    "newsletter.input_placeholder": "Enter your email address...",
    "newsletter.btn_subscribe": "Subscribe",
    "newsletter.btn_loading": "Subscribing...",
    "newsletter.success": "Successfully subscribed! You will be notified whenever a new article is published.",
    "newsletter.already_subscribed": "This email address is already subscribed to the newsletter.",
    "newsletter.invalid_email": "Please enter a valid email address (e.g. name@domain.com).",
    "newsletter.privacy_note": "No spam. You can unsubscribe at any time.",
    "newsletter.error": "An error occurred while subscribing. Please try again.",

    // Unsubscribe
    "unsub.title": "Newsletter Unsubscribe",
    "unsub.desc": "Manage your publication notification preferences.",
    "unsub.processing": "Processing your unsubscribe request...",
    "unsub.success_title": "Successfully Unsubscribed",
    "unsub.success_desc": "Your email address ({email}) has been removed from our notification list.",
    "unsub.resubscribe_prompt": "Unsubscribed by mistake?",
    "unsub.resubscribe_btn": "Re-subscribe",
    "unsub.manual_prompt": "Enter the email address you wish to unsubscribe:",
    "unsub.input_placeholder": "Your email address...",
    "unsub.btn_submit": "Unsubscribe Me",
    "unsub.back_home": "← Back to Homepage",

    // Footer
    "footer.desc": "A platform inspired by technological progress and exponential technologies, in an attempt to keep up with them",
    "footer.contact": "Contact:",
    "footer.sources": "Sources & Archives",
    "footer.podcasts": "Podcasts & Media",
    "footer.podcast_moonshot": "Moonshot Podcast",
    "footer.podcast_allin": "All-In Podcast",
    "footer.podcast_twominute": "Two Minute Papers",
    "footer.podcast_kantrowitz": "Alex Kantrowitz",
    "footer.newsletters": "NEWSLETTERS",
    "footer.newsletter_innermostloop": "The Innermost Loop",
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
    "about.contact_desc": "For research inquiries, paper reviews, or academic collaboration, you can reach me via:",

    // Comments
    "comments.title": "Comments",
    "comments.count_zero": "0 comments",
    "comments.count_single": "1 comment",
    "comments.count_few": "{count} comments",
    "comments.empty_title": "Be the first to leave a comment",
    "comments.empty_desc": "Share your thoughts, questions, or analysis regarding this publication.",
    "comments.form_title": "Leave a comment",
    "comments.name_label": "Your name or alias",
    "comments.name_placeholder": "Enter your name or alias...",
    "comments.content_label": "Your comment",
    "comments.content_placeholder": "Write your comment or question about this paper...",
    "comments.submit_btn": "Post comment",
    "comments.submitting_btn": "Posting...",
    "comments.success_msg": "Your comment was successfully posted!",
    "comments.error_name_empty": "Please enter your name or alias (at least 2 characters).",
    "comments.error_content_empty": "Please enter comment text (at least 2 characters).",
    "comments.error_generic": "An error occurred while posting your comment. Please try again.",
    "comments.error_rate_limit": "Please wait a moment before posting another comment.",
    "comments.just_now": "just now",
    "comments.minutes_ago": "{n} min ago",
    "comments.hours_ago": "{n} h ago",
    "comments.days_ago": "{n} d ago"
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

  // Update placeholder attributes with data-i18n-placeholder
  const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
  placeholderElements.forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (translations[currentLang] && translations[currentLang][key] !== undefined) {
      el.setAttribute('placeholder', translations[currentLang][key]);
    }
  });

  // Update aria-label attributes with data-i18n-aria-label
  const ariaElements = document.querySelectorAll('[data-i18n-aria-label]');
  ariaElements.forEach(el => {
    const key = el.getAttribute('data-i18n-aria-label');
    if (translations[currentLang] && translations[currentLang][key] !== undefined) {
      el.setAttribute('aria-label', translations[currentLang][key]);
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
