// Test script: article enrichment (fetch + OG parse + Claude summary)
// Run: node test-article-enrichment.js

import './src/config/env.js'; // loads dotenv + validates env
import {
  extractBodyText,
  fetchPage,
  generateSummary,
  parsePageMetadata,
} from './src/services/articleEnrichment.service.js';

const TEST_ARTICLES = [
  {
    label: 'DAT Blog — Flatbed/Housing Starts',
    title:
      "Flatbed Report: March housing starts rebound, but flatbed's real signal is in the permits",
    url: 'https://www.dat.com/blog/flatbed-report-march-housing-starts-rebound-but-flatbeds-real-signal-is-in-the-permits',
  },
  {
    label: 'FreightWaves — SONAR Carrier Safety Dashboard',
    title:
      'SONAR launches carrier safety dashboard right on time for International Roadcheck Week',
    url: 'https://www.freightwaves.com/news/sonar-launches-carrier-safety-dashboard-right-on-time-for-international-roadcheck-week',
  },
];

function hr() {
  console.log('\n' + '─'.repeat(72) + '\n');
}

async function testArticle({ label, title, url }) {
  console.log(`📰  ${label}`);
  console.log(`    ${url}\n`);

  // 1. Fetch
  process.stdout.write('  [1/3] Fetching page ... ');
  const html = await fetchPage(url);
  console.log(`done  (${(html.length / 1024).toFixed(1)} KB)`);

  // 2. Parse OG / JSON-LD
  process.stdout.write('  [2/3] Parsing metadata ... ');
  const { ogDescription, ogImage, ogTitle } = parsePageMetadata(html);
  console.log('done');
  console.log(`       og:title       → ${ogTitle ?? '(none)'}`);
  console.log(`       og:description → ${ogDescription ? ogDescription.slice(0, 100) + '…' : '(none)'}`);
  console.log(`       og:image       → ${ogImage ?? '(none)'}`);

  // 3. Generate summary
  const bodyText = extractBodyText(html);
  process.stdout.write('  [3/3] Generating AI summary ... ');
  const { model, summary } = await generateSummary({
    bodyText,
    ogDescription,
    title,
  });
  console.log(`done  (model: ${model})\n`);
  console.log('  Summary:');
  console.log(`  "${summary}"`);

  return { ogDescription, ogImage, ogTitle, summary, url };
}

async function main() {
  hr();
  console.log('Article Enrichment Test');
  console.log(`${'─'.repeat(72)}`);

  const results = [];

  for (const article of TEST_ARTICLES) {
    hr();
    try {
      const result = await testArticle(article);
      results.push({ ...article, ...result, status: 'success' });
    } catch (err) {
      console.error(`  ❌  Failed: ${err.message}`);
      results.push({ ...article, error: err.message, status: 'failed' });
    }
  }

  hr();
  console.log('Results Summary');
  console.log('─'.repeat(72));
  for (const r of results) {
    const icon = r.status === 'success' ? '✅' : '❌';
    console.log(`${icon}  ${r.label}`);
    if (r.status === 'success') {
      console.log(`       Image found : ${r.ogImage ? 'yes' : 'no'}`);
      console.log(`       Summary len : ${r.summary?.length ?? 0} chars`);
    } else {
      console.log(`       Error       : ${r.error}`);
    }
  }
  hr();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
