import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { parse } from 'csv-parse/sync';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Check if processing single file or all files in directory
const csvDir = path.join(__dirname, 'finals', 'csv');
const apiUrl = process.argv[2] ?? 'http://localhost:4300/api/dispatch/feeds';

console.log(`📂 Scanning directory: ${csvDir}`);
console.log(`🎯 API endpoint: ${apiUrl}\n`);

// Get all CSV files
const files = fs
  .readdirSync(csvDir)
  .filter(f => f.startsWith('feedspot-feeds-') && f.endsWith('.csv'))
  .sort();

if (files.length === 0) {
  console.error('❌ No CSV files found matching pattern: feedspot-feeds-*.csv');
  process.exit(1);
}

console.log(`Found ${files.length} CSV files to process:\n`);
files.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
console.log('\n' + '='.repeat(60) + '\n');

let totalSuccess = 0;
let totalSkip = 0;
let totalFail = 0;

// Process each file
for (const file of files) {
  const filePath = path.join(csvDir, file);
  const categoryName = file
    .replace('feedspot-feeds-', '')
    .replace('.csv', '')
    .toLowerCase();

  console.log(`📄 Processing: ${file}`);
  console.log(`   Category: ${categoryName}\n`);

  const csvContent = fs.readFileSync(filePath, 'utf8');
  const feeds = parse(csvContent, {
    columns: true,
    relax_quotes: true,
    skip_empty_lines: true,
  });

  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;
  const errors = [];

  for (let i = 0; i < feeds.length; i++) {
    const feed = feeds[i];

    // Skip if no RSS URL
    if (!feed.rssUrl || feed.rssUrl.trim() === '') {
      console.log(`[${i + 1}/${feeds.length}] ⏭️  Skipping - no RSS URL`);
      skipCount++;
      continue;
    }

    // Default tier to 'outlier' if not set
    if (!feed.tier || feed.tier.trim() === '') {
      feed.tier = 'outlier';
    }

    // Use category from filename if not in CSV
    if (!feed.category || feed.category.trim() === '') {
      feed.category = categoryName;
    }

    if (!feed.category || feed.category.trim() === '') {
      console.log(
        `[${i + 1}/${feeds.length}] ⏭️  Skipping ${feed.name || feed.rssUrl} - category not set`
      );
      skipCount++;
      continue;
    }

    // Skip if error column has content
    if (feed.error && feed.error.trim() !== '') {
      console.log(
        `[${i + 1}/${feeds.length}] ⏭️  Skipping ${feed.name || feed.rssUrl} - had scraping error`
      );
      skipCount++;
      continue;
    }

    try {
      console.log(
        `[${i + 1}/${feeds.length}] 📤 Importing: ${feed.name || feed.rssUrl}`
      );

      const payload = {
        category: feed.category,
        dinner_score: parseInt(feed.dinner_score) || 10,
        enabled: feed.enabled === 'true',
        feedspot_feed_id: feed.feedspotFeedId || null,
        feedspot_folder_id: feed.feedspotFolderId || null,
        name: feed.name,
        notes: feed.notes,
        rss_url: feed.rssUrl,
        tier: feed.tier,
      };

      const response = await fetch(apiUrl, {
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok) {
        const action = result.created ? '✨ Created' : '🔄 Updated';
        console.log(`   ${action} successfully`);
        successCount++;
      } else {
        console.log(`   ❌ Failed: ${result.message || 'Unknown error'}`);
        errors.push({
          error: result.message,
          feed: feed.name || feed.rssUrl,
        });
        failCount++;
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      errors.push({
        error: error.message,
        feed: feed.name || feed.rssUrl,
      });
      failCount++;
    }

    // Polite throttle
    if (i < feeds.length - 1) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  totalSuccess += successCount;
  totalSkip += skipCount;
  totalFail += failCount;

  console.log(`\n   📊 ${file} Summary:`);
  console.log(`      ✅ Imported: ${successCount}`);
  console.log(`      ⏭️  Skipped: ${skipCount}`);
  console.log(`      ❌ Failed: ${failCount}`);
  console.log('\n' + '='.repeat(60) + '\n');

  if (errors.length > 0) {
    console.log(`   ❌ Errors in ${file}:\n`);
    errors.forEach(e => {
      console.log(`      ${e.feed}: ${e.error}`);
    });
    console.log('\n' + '='.repeat(60) + '\n');
  }
}

console.log('🎉 ALL FILES PROCESSED!\n');
console.log(`📊 GRAND TOTAL:`);
console.log(`   ✅ Imported: ${totalSuccess}`);
console.log(`   ⏭️  Skipped: ${totalSkip}`);
console.log(`   ❌ Failed: ${totalFail}`);
console.log('='.repeat(60));
