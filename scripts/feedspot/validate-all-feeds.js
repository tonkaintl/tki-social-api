import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { parse } from 'csv-parse/sync';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const csvDir = path.join(__dirname, 'finals', 'csv');

console.log(`📂 Scanning directory: ${csvDir}\n`);

// Get all CSV files
const files = fs
  .readdirSync(csvDir)
  .filter(f => f.startsWith('feedspot-feeds-') && f.endsWith('.csv'))
  .sort();

if (files.length === 0) {
  console.error('❌ No CSV files found matching pattern: feedspot-feeds-*.csv');
  process.exit(1);
}

console.log(`Found ${files.length} CSV files:\n`);
files.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
console.log('\n' + '='.repeat(60) + '\n');

const allFeeds = [];
const categoryStats = {};
const issues = [];
const seenUrls = new Set();

// Process each file
for (const file of files) {
  const filePath = path.join(csvDir, file);
  const categoryName = file
    .replace('feedspot-feeds-', '')
    .replace('.csv', '')
    .toLowerCase();

  console.log(`📄 Processing: ${file}`);
  console.log(`   Category: ${categoryName}`);

  const content = fs.readFileSync(filePath, 'utf8');
  const feeds = parse(content, {
    columns: true,
    relax_quotes: true,
    skip_empty_lines: true,
  });

  let validCount = 0;
  let skipCount = 0;

  for (const feed of feeds) {
    // Skip if error
    if (feed.error && feed.error.trim() !== '') {
      skipCount++;
      issues.push({
        category: categoryName,
        file,
        issue: `Has error: ${feed.error}`,
        name: feed.name || feed.rssUrl || '(unknown)',
      });
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

    // Check required fields
    if (!feed.rssUrl || feed.rssUrl.trim() === '') {
      skipCount++;
      // Try to get IDs from columns first, otherwise parse from feedspotPage URL
      let feedspotLink = feed.feedspotPage || '(no FeedSpot link available)';

      // If we don't have direct IDs but have the page URL, use it
      if (
        (!feed.feedspotFolderId || !feed.feedspotFeedId) &&
        feed.feedspotPage
      ) {
        const folderMatch = feed.feedspotPage.match(/\/fo\/(\d+)/);
        const feedMatch = feed.feedspotPage.match(/\/fe\/(\d+)/);
        if (folderMatch && feedMatch) {
          feedspotLink = `https://www.feedspot.com/reader/fo/${folderMatch[1]}/fe/${feedMatch[1]}`;
        }
      } else if (feed.feedspotFolderId && feed.feedspotFeedId) {
        feedspotLink = `https://www.feedspot.com/reader/fo/${feed.feedspotFolderId}/fe/${feed.feedspotFeedId}`;
      }

      issues.push({
        category: categoryName,
        feedspotLink,
        file,
        issue: 'Missing RSS URL',
        name: feed.name || '(unknown)',
      });
      continue;
    }

    if (!feed.tier || feed.tier.trim() === '') {
      skipCount++;
      issues.push({
        category: categoryName,
        file,
        issue: 'Missing tier',
        name: feed.name || feed.rssUrl,
      });
      continue;
    }

    if (!feed.category || feed.category.trim() === '') {
      skipCount++;
      issues.push({
        category: categoryName,
        file,
        issue: 'Missing category',
        name: feed.name || feed.rssUrl,
      });
      continue;
    }

    // Check for duplicates
    const normalizedUrl = feed.rssUrl.trim().toLowerCase();
    if (seenUrls.has(normalizedUrl)) {
      issues.push({
        category: categoryName,
        file,
        issue: 'Duplicate RSS URL (will be updated, not created)',
        name: feed.name || feed.rssUrl,
      });
    } else {
      seenUrls.add(normalizedUrl);
    }

    // Build feed object matching model schema
    const feedObject = {
      category: feed.category,
      enabled: feed.enabled === 'true',
      feedspot_feed_id: feed.feedspotFeedId || null,
      feedspot_folder_id: feed.feedspotFolderId || null,
      name: feed.name,
      notes: feed.notes,
      rejected_reason: feed.rejected_reason || '',
      rss_url: feed.rssUrl,
      tier: feed.tier,
    };

    allFeeds.push({
      ...feedObject,
      _sourceCategory: categoryName,
      _sourceFile: file,
    });

    validCount++;
  }

  // Track stats
  categoryStats[categoryName] = {
    file,
    skip: skipCount,
    total: feeds.length,
    valid: validCount,
  };

  console.log(`   ✅ Valid: ${validCount}`);
  console.log(`   ⏭️  Skipped: ${skipCount}`);
  console.log(`   📊 Total: ${feeds.length}\n`);
}

console.log('='.repeat(60));
console.log('📊 SUMMARY\n');

// Category breakdown
console.log('By Category:');
Object.entries(categoryStats).forEach(([cat, stats]) => {
  console.log(
    `  ${cat.padEnd(25)} → ${stats.valid} valid / ${stats.total} total`
  );
});

console.log(
  `\n${'Total across all categories:'.padEnd(27)} → ${allFeeds.length} feeds`
);
console.log(`${'Unique RSS URLs:'.padEnd(27)} → ${seenUrls.size} unique`);

// Issues
if (issues.length > 0) {
  console.log('\n⚠️  ISSUES FOUND:\n');
  issues.forEach((issue, i) => {
    console.log(`  ${i + 1}. [${issue.category}] ${issue.name}`);
    console.log(`     ${issue.issue}`);
    if (issue.feedspotLink) {
      console.log(`     FeedSpot: ${issue.feedspotLink}`);
    }
    console.log(`     File: ${issue.file}\n`);
  });
}

console.log('\n' + '='.repeat(60));

// Show sample feeds from each category
console.log('\n🔍 SAMPLE DATA (first feed from each category):\n');
const samplesByCategory = {};
allFeeds.forEach(feed => {
  if (!samplesByCategory[feed._sourceCategory]) {
    samplesByCategory[feed._sourceCategory] = feed;
  }
});

Object.entries(samplesByCategory).forEach(([cat, feed]) => {
  console.log(`📌 ${cat}:`);
  console.log(`   Name: ${feed.name}`);
  console.log(`   RSS URL: ${feed.rss_url}`);
  console.log(`   Tier: ${feed.tier}`);
  console.log(`   Category: ${feed.category}`);
  console.log(`   Enabled: ${feed.enabled}`);
  console.log(
    `   FeedSpot IDs: ${feed.feedspot_feed_id} / ${feed.feedspot_folder_id}`
  );
  console.log(
    `   Notes: ${feed.notes ? feed.notes.substring(0, 80) + '...' : '(none)'}\n`
  );
});

console.log('='.repeat(60));
console.log('\n✅ Validation complete!');
console.log(`   Ready to import: ${allFeeds.length} feeds`);
console.log(`   Issues to review: ${issues.length}`);
console.log(
  '\n💡 Next step: Run the import script to POST to /api/feeds/upsert'
);
