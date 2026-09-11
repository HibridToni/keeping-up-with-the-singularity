/**
 * Generates responsive, high-compatibility HTML emails for newsletter subscribers
 * @param {Object} article - The article object from articles.json
 * @param {string} lang - Subscriber's preferred language ('hr' | 'en')
 * @param {string} baseUrl - Base portal domain (e.g. 'https://keeping-up-singularity.web.app')
 * @returns {{ subject: string, html: string, text: string }}
 */
export function generateArticleNewsletterEmail(article, lang = 'hr', baseUrl = 'https://keeping-up-singularity.web.app', recipientEmail = '') {
  const isEn = lang === 'en';

  const title = (isEn && article.title_en) ? article.title_en : article.title;
  const category = (isEn && article.category_en) ? article.category_en : article.category;
  const readTime = (isEn && article.readTime_en) ? article.readTime_en : (article.readTime || '3 min čitanja');
  const summary = (isEn && article.summary_en) ? article.summary_en : (article.summary || article.excerpt || '');
  const articleUrl = `${baseUrl.replace(/\/$/, '')}/articles/${article.id}.html`;
  
  const unsubscribeUrl = recipientEmail 
    ? `${baseUrl.replace(/\/$/, '')}/unsubscribe.html?email=${encodeURIComponent(recipientEmail)}`
    : `${baseUrl.replace(/\/$/, '')}/unsubscribe.html`;

  // Format full image URL
  const imageUrl = article.image 
    ? (article.image.startsWith('http') ? article.image : `${baseUrl.replace(/\/$/, '')}/${article.image.replace(/^\//, '')}`)
    : `${baseUrl.replace(/\/$/, '')}/img/logo.png`;

  const subject = isEn
    ? `[New Article] ${title} - Keeping up with the singularity`
    : `[Novi rad] ${title} - Keeping up with the singularity`;

  const overline = isEn ? 'NEW RESEARCH SUMMARY' : 'NOVI SAŽETAK ISTRAŽIVANJA';
  const ctaText = isEn ? 'Read Full Article →' : 'Pročitaj cijeli rad →';
  const unsubscribeHtml = isEn 
    ? `You are receiving this because you subscribed to updates. <a href="${escapeHtml(unsubscribeUrl)}" class="footer-link" style="color: #38bdf8; text-decoration: underline;">Unsubscribe here</a>.` 
    : `Ovu poruku primate jer ste se prijavili za obavijesti. <a href="${escapeHtml(unsubscribeUrl)}" class="footer-link" style="color: #38bdf8; text-decoration: underline;">Odjavite se ovdje</a>.`;
  const unsubscribePlain = isEn
    ? `To unsubscribe: ${unsubscribeUrl}`
    : `Za odjavu: ${unsubscribeUrl}`;

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #0a0c0e; color: #f0f3f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #111418; border: 1px solid #242a36; border-radius: 8px; overflow: hidden; }
    .email-header { padding: 32px 28px 20px; text-align: center; border-bottom: 1px solid #242a36; background-color: #0e1115; }
    .brand-title { font-size: 16px; font-weight: 700; color: #f0f3f8; letter-spacing: 0.05em; text-transform: uppercase; margin: 0; }
    .brand-subtitle { font-size: 11px; font-weight: 500; color: #38bdf8; letter-spacing: 0.12em; text-transform: uppercase; margin-top: 4px; }
    .email-body { padding: 32px 28px; }
    .article-badge { display: inline-block; font-size: 11px; font-weight: 600; color: #38bdf8; background-color: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); padding: 4px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }
    .article-title { font-size: 22px; font-weight: 700; line-height: 1.35; color: #ffffff; margin: 0 0 16px; }
    .article-meta { font-size: 12px; color: #9aa5b5; margin-bottom: 24px; font-family: monospace; }
    .article-image { width: 100%; border-radius: 6px; margin-bottom: 24px; display: block; border: 1px solid #242a36; }
    .article-summary { font-size: 15px; line-height: 1.65; color: #9aa5b5; margin-bottom: 32px; }
    .cta-button { display: inline-block; background-color: #38bdf8; color: #030712 !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 14px 28px; border-radius: 6px; text-align: center; }
    .email-footer { padding: 24px 28px; background-color: #0a0c0e; border-top: 1px solid #242a36; text-align: center; font-size: 12px; color: #626e82; line-height: 1.5; }
    .footer-link { color: #38bdf8; text-decoration: none; }
  </style>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #0a0c0e;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center">
        <div class="email-container" style="max-width: 600px; margin: 0 auto; background-color: #111418; border: 1px solid #242a36; border-radius: 8px; text-align: left;">
          
          <!-- Header -->
          <div class="email-header" style="padding: 28px 28px 20px; text-align: center; border-bottom: 1px solid #242a36; background-color: #0e1115;">
            <p class="brand-title" style="font-size: 15px; font-weight: 700; color: #f0f3f8; letter-spacing: 0.05em; text-transform: uppercase; margin: 0;">KEEPING UP WITH THE SINGULARITY</p>
            <p class="brand-subtitle" style="font-size: 11px; font-weight: 600; color: #38bdf8; letter-spacing: 0.1em; text-transform: uppercase; margin: 4px 0 0;">PHYSICS &amp; TECH JOURNAL</p>
          </div>

          <!-- Body -->
          <div class="email-body" style="padding: 32px 28px;">
            <span class="article-badge" style="display: inline-block; font-size: 11px; font-weight: 600; color: #38bdf8; background-color: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); padding: 4px 10px; border-radius: 4px; text-transform: uppercase; margin-bottom: 16px;">
              ${escapeHtml(category)} • ${escapeHtml(readTime)}
            </span>
            <h1 class="article-title" style="font-size: 22px; font-weight: 700; line-height: 1.35; color: #ffffff; margin: 0 0 12px;">
              ${escapeHtml(title)}
            </h1>
            <p class="article-meta" style="font-size: 12px; color: #626e82; margin: 0 0 20px; font-family: monospace;">
              ${escapeHtml(article.date || '')}
            </p>

            ${article.image ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" class="article-image" style="width: 100%; border-radius: 6px; margin: 0 0 20px; border: 1px solid #242a36; max-height: 300px; object-fit: cover;">` : ''}

            <p class="article-summary" style="font-size: 15px; line-height: 1.65; color: #9aa5b5; margin: 0 0 28px;">
              ${escapeHtml(summary)}
            </p>

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center">
                  <a href="${escapeHtml(articleUrl)}" class="cta-button" target="_blank" style="display: inline-block; background: #38bdf8; color: #030712; text-decoration: none; font-weight: 600; font-size: 14px; padding: 13px 28px; border-radius: 6px; text-align: center;">
                    ${escapeHtml(ctaText)}
                  </a>
                </td>
              </tr>
            </table>
          </div>

          <!-- Footer -->
          <div class="email-footer" style="padding: 24px 28px; background-color: #0a0c0e; border-top: 1px solid #242a36; text-align: center; font-size: 12px; color: #626e82; line-height: 1.6;">
            <p style="margin: 0 0 8px;">${unsubscribeHtml}</p>
            <p style="margin: 0;">
              <a href="${escapeHtml(baseUrl)}" class="footer-link" style="color: #38bdf8; text-decoration: none;">Keeping up with the singularity</a> • Scientific Insights &amp; Physics Journal
            </p>
          </div>

        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${title}
${category} | ${readTime} | ${article.date || ''}

${summary}

${ctaText}
${articleUrl}

---
${unsubscribePlain}
${baseUrl}
`;

  return { subject, html, text };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
