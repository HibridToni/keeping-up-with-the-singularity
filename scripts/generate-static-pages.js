import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const BASE_URL = 'https://keeping-up-singularity.web.app';
const DEFAULT_IMAGE = `${BASE_URL}/img/logo.png`;

function escapeHTML(str) {
  if (typeof str !== 'string') return '';
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

function stripHTML(html) {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function calculateReadingTime(content, lang = 'hr') {
  const plainText = stripHTML(content);
  const wordCount = plainText ? plainText.split(/\s+/).length : 0;
  const minutes = Math.max(1, Math.ceil(wordCount / 200));
  return lang === 'en' ? `${minutes} min read` : `${minutes} min čitanja`;
}

function resolveImageUrl(imagePath) {
  if (!imagePath || !imagePath.trim()) return DEFAULT_IMAGE;
  const trimmed = imagePath.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  const cleanPath = trimmed.replace(/^\.?\//, '');
  return `${BASE_URL}/${cleanPath}`;
}

export function generateStaticPages() {
  console.log('======================================================');
  console.log('  GENERIRANJE STATIČKIH STRANICA ČLANAKA (SSG)');
  console.log('======================================================\n');

  const articlesJsonPath = path.join(ROOT_DIR, 'articles.json');
  const templatePath = path.join(ROOT_DIR, 'article.html');
  const outputDir = path.join(ROOT_DIR, 'articles');
  const sitemapPath = path.join(ROOT_DIR, 'sitemap.xml');

  if (!fs.existsSync(articlesJsonPath)) {
    console.error('❌ Greška: Datoteka articles.json nije pronađena.');
    process.exit(1);
  }

  if (!fs.existsSync(templatePath)) {
    console.error('❌ Greška: Predložak article.html nije pronađen.');
    process.exit(1);
  }

  const articles = JSON.parse(fs.readFileSync(articlesJsonPath, 'utf8'));
  const templateHtml = fs.readFileSync(templatePath, 'utf8');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Kreirana mapa: ${outputDir}`);
  }

  const metaPattern = /<meta\s+name="description"[\s\S]*?<link\s+rel="canonical"\s+href="[^"]*">/i;

  let generatedCount = 0;

  articles.forEach((article, index) => {
    const id = article.id;
    const title = article.title || 'Članak';
    const excerpt = article.excerpt || article.summary || stripHTML(article.content || '').substring(0, 200);
    const category = article.category || 'Znanost';
    const date = article.date || '2026';
    const imageUrl = resolveImageUrl(article.image);
    const articleUrl = `${BASE_URL}/articles/${id}.html`;
    const readTime = calculateReadingTime(article.content || excerpt, 'hr');

    const metaBlock = `  <title>${escapeHTML(title)} - Keeping up with the singularity</title>
  <meta name="description" content="${escapeHTML(excerpt)}">
  <meta name="author" content="Keeping up with the singularity">

  <!-- Open Graph / Facebook / LinkedIn / WhatsApp -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Keeping up with the singularity">
  <meta property="og:title" content="${escapeHTML(title)}">
  <meta property="og:description" content="${escapeHTML(excerpt)}">
  <meta property="og:image" content="${escapeHTML(imageUrl)}">
  <meta property="og:image:alt" content="${escapeHTML(title)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:url" content="${escapeHTML(articleUrl)}">
  <meta property="og:locale" content="hr_HR">
  <meta property="og:locale:alternate" content="en_US">
  <meta property="article:section" content="${escapeHTML(category)}">
  <meta property="article:published_time" content="${escapeHTML(date)}">

  <!-- Twitter / X Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHTML(title)}">
  <meta name="twitter:description" content="${escapeHTML(excerpt)}">
  <meta name="twitter:image" content="${escapeHTML(imageUrl)}">
  <meta name="twitter:image:alt" content="${escapeHTML(title)}">

  <!-- Canonical Link -->
  <link rel="canonical" href="${escapeHTML(articleUrl)}">

  <!-- Schema.org JSON-LD Structured Data for Crawlers & Rich Search Results -->
  <script type="application/ld+json" id="jsonld-article-schema">
  {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "headline": ${JSON.stringify(title)},
    "description": ${JSON.stringify(excerpt)},
    "image": ${JSON.stringify(imageUrl)},
    "url": ${JSON.stringify(articleUrl)},
    "datePublished": ${JSON.stringify(date)},
    "articleSection": ${JSON.stringify(category)},
    "inLanguage": "hr",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": ${JSON.stringify(articleUrl)}
    },
    "author": {
      "@type": "Person",
      "name": "Keeping up with the singularity",
      "url": "https://keeping-up-singularity.web.app/o-autoru.html"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Keeping up with the singularity",
      "url": "https://keeping-up-singularity.web.app",
      "logo": {
        "@type": "ImageObject",
        "url": "https://keeping-up-singularity.web.app/img/logo.png"
      }
    }
  }
  </script>`;

    let pageHtml = templateHtml;

    if (metaPattern.test(pageHtml)) {
      pageHtml = pageHtml.replace(metaPattern, metaBlock);
    } else {
      pageHtml = pageHtml.replace('</head>', `${metaBlock}\n</head>`);
    }

    // Prilagodi relativne putanje resursa za podmapu articles/
    pageHtml = pageHtml
      .replace(/href="style\.css/g, 'href="../style.css')
      .replace(/src="js\//g, 'src="../js/')
      .replace(/href="img\//g, 'href="../img/')
      .replace(/src="img\//g, 'src="../img/')
      .replace(/href="manifest\.json"/g, 'href="../manifest.json"')
      .replace(/href="index\.html"/g, 'href="../index.html"')
      .replace(/href="category\.html/g, 'href="../category.html')
      .replace(/href="o-autoru\.html"/g, 'href="../o-autoru.html"');

    // Umetni PRELOADED_ARTICLE_ID prije skripte article.js
    const preloadScript = `<script>window.PRELOADED_ARTICLE_ID = ${JSON.stringify(id)};</script>\n  <script src="../js/article.js`;
    pageHtml = pageHtml.replace('<script src="../js/article.js', preloadScript);

    const targetFilePath = path.join(outputDir, `${id}.html`);
    fs.writeFileSync(targetFilePath, pageHtml, 'utf8');
    generatedCount++;
    console.log(`✅ [${generatedCount}/${articles.length}] articles/${id}.html`);
  });

  console.log(`\n🎉 Uspješno generirano ${generatedCount} statičkih članaka u mapi "articles/".`);

  // Ažuriraj sitemap.xml
  updateSitemap(articles, sitemapPath);
}

function updateSitemap(articles, sitemapPath) {
  console.log('\n📄 Ažuriranje sitemap.xml...');

  const today = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Statičke osnovne rute
  xml += `  <url>\n    <loc>${BASE_URL}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
  xml += `  <url>\n    <loc>${BASE_URL}/index.html</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
  xml += `  <url>\n    <loc>${BASE_URL}/category.html?cat=ai-tehnologija</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  xml += `  <url>\n    <loc>${BASE_URL}/category.html?cat=longevity</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  xml += `  <url>\n    <loc>${BASE_URL}/o-autoru.html</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;

  // Statički članci
  articles.forEach(article => {
    xml += `  <url>\n    <loc>${BASE_URL}/articles/${article.id}.html</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
  });

  xml += `</urlset>\n`;

  fs.writeFileSync(sitemapPath, xml, 'utf8');
  console.log(`✅ sitemap.xml je uspješno osvježen s ${articles.length} statičkih članaka.`);
}

// Pokreni ako se poziva izravno iz terminala
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateStaticPages();
}
