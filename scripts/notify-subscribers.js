#!/usr/bin/env node

/**
 * Keeping Up With The Singularity - Newsletter Dispatcher
 * Dispatches notification emails to all registered newsletter subscribers
 * whenever a new article is published in articles.json.
 *
 * Usage:
 *   node scripts/notify-subscribers.js                    # Send to all subscribers for latest article
 *   node scripts/notify-subscribers.js --dry-run          # Preview email and subscriber count without sending
 *   node scripts/notify-subscribers.js --test=me@mail.com # Send test email to a single recipient
 *   node scripts/notify-subscribers.js --id=alphafold-3   # Send notification for specific article ID
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateArticleNewsletterEmail } from './email-template.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// Load .env manually if exists
function loadEnv() {
  const envPath = path.join(ROOT_DIR, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const FIREBASE_CONFIG = {
  projectId: 'keeping-up-singularity',
  apiKey: 'AIzaSyBxgfBre146myoQSHqifDVN4FXxA5PgQ7U',
  databaseId: '(default)'
};

const BASE_URL = process.env.BASE_URL || 'https://keeping-up-singularity.web.app';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Keeping up with the singularity <newsletter@keeping-up-singularity.web.app>';

// Parse CLI flags
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || args.includes('-d');
const testArg = args.find(a => a.startsWith('--test='));
const testEmail = testArg ? testArg.split('=')[1] : null;
const idArg = args.find(a => a.startsWith('--id='));
const targetArticleId = idArg ? idArg.split('=')[1] : null;
const langArg = args.find(a => a.startsWith('--lang='));
const forcedLang = langArg ? langArg.split('=')[1] : null;

async function fetchSubscribersFromFirestore() {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/${FIREBASE_CONFIG.databaseId}/documents/subscribers?key=${FIREBASE_CONFIG.apiKey}&pageSize=1000`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[Firestore] HTTP ${res.status}: ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    if (!data.documents || !Array.isArray(data.documents)) {
      return [];
    }

    const subscribers = [];
    for (const doc of data.documents) {
      const fields = doc.fields || {};
      const email = fields.email?.stringValue;
      const lang = fields.lang?.stringValue || 'hr';
      const active = fields.active?.booleanValue !== false;

      if (email && active) {
        subscribers.push({ email, lang });
      }
    }
    return subscribers;
  } catch (err) {
    console.warn('[Firestore] Error fetching subscribers:', err.message);
    return [];
  }
}

async function sendEmailViaResend(apiKey, { to, subject, html, text }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text
    })
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Resend API error (${res.status}): ${errBody}`);
  }
  return await res.json();
}

async function sendEmailViaBrevo(apiKey, { to, subject, html, text }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sender: { name: 'Keeping up with the singularity', email: 'newsletter@keeping-up-singularity.web.app' },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text
    })
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Brevo API error (${res.status}): ${errBody}`);
  }
  return await res.json();
}

async function main() {
  console.log('\n======================================================');
  console.log('  KEEPING UP WITH THE SINGULARITY - NEWSLETTER ENGINE');
  console.log('======================================================\n');

  // 1. Read articles.json
  const articlesPath = path.join(ROOT_DIR, 'articles.json');
  if (!fs.existsSync(articlesPath)) {
    console.error('❌ Error: articles.json not found at', articlesPath);
    process.exit(1);
  }

  const articles = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));
  if (!Array.isArray(articles) || articles.length === 0) {
    console.error('❌ Error: No articles found in articles.json');
    process.exit(1);
  }

  // 2. Determine target article
  let targetArticle = null;
  if (targetArticleId) {
    targetArticle = articles.find(a => String(a.id) === String(targetArticleId));
    if (!targetArticle) {
      console.error(`❌ Error: Article with ID "${targetArticleId}" not found in articles.json`);
      process.exit(1);
    }
  } else {
    targetArticle = articles[0]; // Latest article
  }

  console.log(`📰 Article Selected: "${targetArticle.title}"`);
  console.log(`   ID:       ${targetArticle.id}`);
  console.log(`   Category: ${targetArticle.category}`);
  console.log(`   Date:     ${targetArticle.date || 'N/A'}`);
  console.log(`   URL:      ${BASE_URL}/article.html?id=${targetArticle.id}\n`);

  // 3. Determine recipients
  let recipients = [];
  if (testEmail) {
    console.log(`🧪 Test Mode: Single recipient specified -> ${testEmail}`);
    recipients = [{ email: testEmail, lang: forcedLang || 'hr' }];
  } else {
    console.log('🔍 Fetching subscriber list from Firestore...');
    recipients = await fetchSubscribersFromFirestore();

    if (recipients.length === 0) {
      console.log('ℹ️  No remote subscribers found in Firestore. Checking for local test list...');
      recipients = [
        { email: 'subscriber.hr@example.com', lang: 'hr' },
        { email: 'subscriber.en@example.com', lang: 'en' }
      ];
    }
  }

  console.log(`👥 Total recipients: ${recipients.length}\n`);

  // 4. Dry run check
  if (isDryRun) {
    console.log('------------------------------------------------------');
    console.log('⚡ DRY RUN MODE ACTIVE - No emails will be transmitted');
    console.log('------------------------------------------------------');

    const previewEmail = recipients.length > 0 ? recipients[0].email : '';
    const previewHr = generateArticleNewsletterEmail(targetArticle, 'hr', BASE_URL, previewEmail);
    const previewEn = generateArticleNewsletterEmail(targetArticle, 'en', BASE_URL, previewEmail);

    console.log('\n[Preview - HR Subject]:', previewHr.subject);
    console.log('[Preview - EN Subject]:', previewEn.subject);

    const previewFile = path.join(ROOT_DIR, 'scripts', 'preview-email.html');
    fs.writeFileSync(previewFile, previewHr.html, 'utf8');
    console.log(`\n💾 Saved sample HTML email preview to: ${previewFile}`);
    console.log('\nRecipients to receive:');
    recipients.forEach((r, idx) => console.log(`  ${idx + 1}. ${r.email} (${r.lang.toUpperCase()})`));
    console.log('\n✨ Dry run completed successfully.\n');
    return;
  }

  // 5. Check email provider keys
  const resendKey = process.env.RESEND_API_KEY;
  const brevoKey = process.env.BREVO_API_KEY;

  if (!resendKey && !brevoKey) {
    console.warn('⚠️  No active email provider API key found in .env (RESEND_API_KEY or BREVO_API_KEY).');
    console.warn('💡 To send live emails:');
    console.warn('   1. Copy .env.example to .env');
    console.warn('   2. Add your free Resend or Brevo API key');
    console.warn('   3. Re-run: npm run notify\n');
    console.log('Running dry-run preview instead...\n');

    const previewHr = generateArticleNewsletterEmail(targetArticle, 'hr', BASE_URL);
    const previewFile = path.join(ROOT_DIR, 'scripts', 'preview-email.html');
    fs.writeFileSync(previewFile, previewHr.html, 'utf8');
    console.log(`💾 Saved HTML email preview to: ${previewFile}\n`);
    return;
  }

  // 6. Send emails
  console.log('🚀 Dispatching emails...');
  let sentCount = 0;
  let errorCount = 0;

  for (const recipient of recipients) {
    const lang = forcedLang || recipient.lang || 'hr';
    const emailData = generateArticleNewsletterEmail(targetArticle, lang, BASE_URL, recipient.email);

    try {
      if (resendKey) {
        await sendEmailViaResend(resendKey, {
          to: recipient.email,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text
        });
      } else if (brevoKey) {
        await sendEmailViaBrevo(brevoKey, {
          to: recipient.email,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text
        });
      }

      sentCount++;
      console.log(`  ✅ Sent to: ${recipient.email} [${lang.toUpperCase()}]`);
    } catch (err) {
      errorCount++;
      console.error(`  ❌ Failed for: ${recipient.email} - ${err.message}`);
    }
  }

  console.log('\n======================================================');
  console.log(`📊 Dispatch Complete: ${sentCount} sent, ${errorCount} errors`);
  console.log('======================================================\n');
}

main().catch(err => {
  console.error('Fatal dispatch error:', err);
  process.exit(1);
});
