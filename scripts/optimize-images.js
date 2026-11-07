import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const IMG_DIR = path.join(ROOT_DIR, 'img');
const ARTICLES_JSON_PATH = path.join(ROOT_DIR, 'articles.json');

const MAX_ARTICLE_WIDTH = 1600;
const LOGO_WEBP_SIZE = 256;
const LOGO_PNG_SIZE = 512;
const WEBP_QUALITY = 82;

function toWebpFilename(filename) {
  return filename.replace(/\.(png|jpe?g)$/i, '.webp');
}

function formatKB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export async function optimizeImages(force = false) {
  console.log('======================================================');
  console.log('  OPTIMIZACIJA SLIKA U WEBP FORMAT (SHARP)');
  console.log('======================================================\n');

  if (!fs.existsSync(IMG_DIR)) {
    console.warn('⚠️ Mapa img/ nije pronađena.');
    return;
  }

  const allFiles = fs.readdirSync(IMG_DIR);
  const sourceImages = allFiles.filter(f => /\.(png|jpe?g)$/i.test(f));

  let totalOriginalBytes = 0;
  let totalWebpBytes = 0;
  let convertedCount = 0;
  let skippedCount = 0;

  for (const file of sourceImages) {
    const srcPath = path.join(IMG_DIR, file);
    const webpFile = toWebpFilename(file);
    const webpPath = path.join(IMG_DIR, webpFile);

    const srcStat = fs.statSync(srcPath);
    const originalSize = srcStat.size;
    totalOriginalBytes += originalSize;

    const isLogo = file.toLowerCase() === 'logo.png';

    // 1. Ako je izvorna slika (npr. logo.png od 4.4 MB) prevelika za OG/PWA/email fallback, optimiziraj i samu izvornu datoteku
    if (isLogo && originalSize > 150 * 1024) {
      const optimizedPngBuffer = await sharp(srcPath)
        .resize({ width: LOGO_PNG_SIZE, height: LOGO_PNG_SIZE, fit: 'inside', withoutEnlargement: true })
        .png({ quality: 85, compressionLevel: 9, palette: true })
        .toBuffer();

      if (optimizedPngBuffer.length < originalSize) {
        fs.writeFileSync(srcPath, optimizedPngBuffer);
        console.log(`🔧 Optimiziran izvorni ${file} (za PWA/OpenGraph): ${formatKB(originalSize)} -> ${formatKB(optimizedPngBuffer.length)}`);
      }
    }

    // 2. Provjeri postoji li već ažurna .webp verzija
    if (!force && fs.existsSync(webpPath)) {
      const webpStat = fs.statSync(webpPath);
      if (webpStat.mtimeMs >= srcStat.mtimeMs && webpStat.size > 0) {
        totalWebpBytes += webpStat.size;
        skippedCount++;
        continue;
      }
    }

    // 3. Generiraj .webp sliku
    const pipeline = sharp(srcPath);
    if (isLogo) {
      pipeline.resize({ width: LOGO_WEBP_SIZE, height: LOGO_WEBP_SIZE, fit: 'inside', withoutEnlargement: true });
    } else {
      pipeline.resize({ width: MAX_ARTICLE_WIDTH, withoutEnlargement: true });
    }

    const webpBuffer = await pipeline
      .webp({ quality: WEBP_QUALITY, effort: 6 })
      .toBuffer();

    fs.writeFileSync(webpPath, webpBuffer);
    totalWebpBytes += webpBuffer.length;
    convertedCount++;

    const savingPct = ((1 - webpBuffer.length / originalSize) * 100).toFixed(1);
    console.log(`✅ ${file} (${formatKB(originalSize)}) -> ${webpFile} (${formatKB(webpBuffer.length)}) [−${savingPct}%]`);
  }

  // 4. Automatski ažuriraj putanje slika u articles.json na .webp (ako .webp postoji na disku)
  if (fs.existsSync(ARTICLES_JSON_PATH)) {
    const rawJson = fs.readFileSync(ARTICLES_JSON_PATH, 'utf8');
    const articles = JSON.parse(rawJson);
    let updatedReferences = 0;

    const replaceImgExtWithWebp = (imgRef) => {
      if (!imgRef || typeof imgRef !== 'string') return imgRef;
      const match = imgRef.match(/^(?:\.\.\/)?img\/(.+\.(?:png|jpe?g))$/i);
      if (!match) return imgRef;
      const webpCandidate = toWebpFilename(match[1]);
      if (fs.existsSync(path.join(IMG_DIR, webpCandidate))) {
        const updated = imgRef.replace(/\.(png|jpe?g)$/i, '.webp');
        if (updated !== imgRef) updatedReferences++;
        return updated;
      }
      return imgRef;
    };

    const replaceInlineHtmlImages = (html) => {
      if (!html || typeof html !== 'string') return html;
      return html.replace(/(src=["'])((?:\.\.\/)?img\/[^"']+\.(?:png|jpe?g))(["'])/gi, (full, prefix, imgPath, suffix) => {
        const newPath = replaceImgExtWithWebp(imgPath);
        return `${prefix}${newPath}${suffix}`;
      });
    };

    articles.forEach(article => {
      if (article.image) {
        article.image = replaceImgExtWithWebp(article.image);
      }
      if (article.content) {
        article.content = replaceInlineHtmlImages(article.content);
      }
      if (article.content_en) {
        article.content_en = replaceInlineHtmlImages(article.content_en);
      }
    });

    if (updatedReferences > 0) {
      fs.writeFileSync(ARTICLES_JSON_PATH, JSON.stringify(articles, null, 2), 'utf8');
      console.log(`\n📝 Ažurirano ${updatedReferences} referenci slika u articles.json na .webp format.`);
    }
  }

  const totalSavedMB = ((totalOriginalBytes - totalWebpBytes) / (1024 * 1024)).toFixed(2);
  const totalRatioPct = totalOriginalBytes > 0
    ? ((1 - totalWebpBytes / totalOriginalBytes) * 100).toFixed(1)
    : '0.0';

  console.log(`\n📊 Sažetak WebP optimizacije:`);
  console.log(`   - Konvertirano novih slika: ${convertedCount}, preskočeno (već ažurno): ${skippedCount}`);
  console.log(`   - Izvorne slike ukupno: ${(totalOriginalBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`   - WebP slike ukupno:    ${(totalWebpBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`   - Ukupna ušteda:        ${totalSavedMB} MB (−${totalRatioPct}%)\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const force = process.argv.includes('--force');
  optimizeImages(force).catch(err => {
    console.error('❌ Greška pri optimizaciji slika:', err);
    process.exit(1);
  });
}
