import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const inputFile =
  process.argv[2] ?? path.join(__dirname, 'feedspot', 'feedspot-urls.txt');
const outFile =
  process.argv[3] ?? path.join(__dirname, 'feedspot', 'feedspot-feeds.csv');
const sessionDir = path.join(__dirname, 'feedspot', '.browser-session');

console.log(`📖 Reading URLs from: ${inputFile}`);
console.log(`📝 Output will be written to: ${outFile}`);

const urls = fs
  .readFileSync(inputFile, 'utf8')
  .split(/\r?\n/)
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('#'));

if (!urls.length) {
  console.error(`❌ No URLs found in ${inputFile}`);
  console.error(
    'Create a file with one FeedSpot URL per line, e.g.:\n' +
      '  https://www.feedspot.com/infiniterss.php?_src=feed_title&followfeedid=...\n' +
      '  https://www.feedspot.com/infiniterss.php?_src=feed_title&followfeedid=...'
  );
  process.exit(1);
}

console.log(`🔍 Found ${urls.length} URLs to process\n`);

const toCsv = (rows, headers) => {
  const esc = v => `"${String(v ?? '').replaceAll('"', '""')}"`;
  return [
    headers.join(','),
    ...rows.map(r => headers.map(h => esc(r[h])).join(',')),
  ].join('\n');
};

// Check if we have a saved browser session
const hasSession = fs.existsSync(sessionDir);

if (!hasSession) {
  console.log('\n🔐 No saved session found.');
  console.log('👉 Browser will open - please log in to FeedSpot with Google');
  console.log('⏱️  Session will be saved for future use\n');
}

// Launch browser with persistent session
const browser = await chromium.launch({
  headless: hasSession, // Show browser only for first login
});

const context = await browser.newContext({
  storageState: hasSession ? path.join(sessionDir, 'state.json') : undefined,
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
});

// If no session, give user time to log in
if (!hasSession) {
  const loginPage = await context.newPage();
  await loginPage.goto('https://www.feedspot.com/reader');
  console.log('🌐 Browser opened. Please:');
  console.log('   1. Log in with Google');
  console.log('   2. Wait for FeedSpot reader to load');
  console.log('   3. Press Enter in this terminal when ready...\n');

  // Wait for user input
  await new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question('Press Enter when logged in... ', () => {
      rl.close();
      resolve();
    });
  });

  // Save session
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
  await context.storageState({ path: path.join(sessionDir, 'state.json') });
  console.log('✅ Session saved!\n');

  await loginPage.close();
}

const results = [];
let successCount = 0;
let failCount = 0;

for (let i = 0; i < urls.length; i++) {
  const url = urls[i];
  const page = await context.newPage();

  try {
    console.log(`[${i + 1}/${urls.length}] Processing: ${url}`);

    await page.goto(url, { timeout: 60000, waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // Allow dynamic content and any redirects to complete

    // Take screenshot for debugging
    // await page.screenshot({
    //   path: path.join(__dirname, 'feedspot', `screenshot-${i + 1}.png`),
    // });

    // Click "See more" if available to expand description
    try {
      const seeMoreBtn = await page.$('text="See more"');
      if (seeMoreBtn) {
        await seeMoreBtn.click();
        await page.waitForTimeout(500);
      }
    } catch {
      // Ignore if "See more" not found
    }

    const data = await page.evaluate(() => {
      /* eslint-disable no-undef */
      const txt = el => (el ? (el.textContent || '').trim() : '');
      const attr = (el, name) => (el ? el.getAttribute(name) : null);

      // Extract FeedSpot IDs from URL (e.g., /fo/7955632/fe/5362118)
      const feedspotFolderId = (() => {
        const match = location.href.match(/\/fo\/(\d+)/i);
        return match ? match[1] : '';
      })();

      const feedspotFeedId = (() => {
        const match = location.href.match(/\/fe\/(\d+)/i);
        return match ? match[1] : '';
      })();

      const feedspotPage = location.href;

      // Extract feed name from .feed-title
      const name = txt(document.querySelector('.feed-title')) || '';

      // Extract RSS URL from .feed-url anchor
      const rssUrl =
        attr(document.querySelector('.feed-url a[href]'), 'href') || '';

      // Extract website URL from .feed-domain anchor
      const websiteUrl =
        attr(document.querySelector('.feed-domain a[href]'), 'href') || '';

      // Extract full description from .feed-desc
      const notes = txt(document.querySelector('.feed-desc')) || '';

      return {
        feedspotFeedId,
        feedspotFolderId,
        feedspotPage,
        name,
        notes,
        rssUrl,
        websiteUrl,
      };
      /* eslint-enable no-undef */
    });

    results.push({
      category: '', // To be filled in manually
      dinner_score: 10,
      enabled: true,
      error: '',
      feedspotFeedId: data.feedspotFeedId || '',
      feedspotFolderId: data.feedspotFolderId || '',
      feedspotPage: data.feedspotPage,
      name: data.name || '',
      notes: data.notes || '',
      rssUrl: data.rssUrl || '',
      tier: '', // To be filled in manually
      websiteUrl: data.websiteUrl || '',
    });

    successCount++;
    console.log(`  ✅ Success - Found: ${data.name || '(no name)'}`);
    if (data.rssUrl) {
      console.log(`     RSS: ${data.rssUrl}`);
    }
  } catch (e) {
    failCount++;
    results.push({
      category: '',
      dinner_score: 10,
      enabled: true,
      error: String(e?.message || e),
      feedspotFeedId: '',
      feedspotFolderId: '',
      feedspotPage: url,
      name: '',
      notes: '',
      rssUrl: '',
      tier: '',
      websiteUrl: '',
    });
    console.log(`  ❌ Failed - ${e.message}`);
  } finally {
    await page.close();
  }

  // Polite throttle to avoid rate limiting
  if (i < urls.length - 1) {
    await new Promise(r => setTimeout(r, 1200));
  }
}

await browser.close();

// Define CSV headers (matching your MongoDB schema)
const headers = [
  'feedspotPage',
  'feedspotFeedId',
  'feedspotFolderId',
  'name',
  'rssUrl',
  'websiteUrl',
  'notes',
  'tier',
  'category',
  'dinner_score',
  'enabled',
  'error',
];

fs.writeFileSync(outFile, toCsv(results, headers), 'utf8');

console.log('\n' + '='.repeat(60));
console.log(`✅ Complete! Processed ${urls.length} URLs`);
console.log(`   Success: ${successCount}`);
console.log(`   Failed: ${failCount}`);
console.log(`📄 Output written to: ${outFile}`);
console.log('='.repeat(60));
console.log(
  '\n💡 Next steps:\n' +
    '   1. Open the CSV and fill in tier and category columns\n' +
    '   2. Review and verify all RSS URLs\n' +
    '   3. Import to database using your feed upsert API'
);
