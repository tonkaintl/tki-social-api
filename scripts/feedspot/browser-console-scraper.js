// ===================================================================
// FeedSpot Feed Scraper - Browser Console Version
// ===================================================================
// 1. Log into FeedSpot and navigate to a feed page
// 2. Open browser DevTools (F12)
// 3. Go to Console tab
// 4. Paste this entire script and press Enter
// 5. Copy the JSON output
// ===================================================================

/* eslint-disable no-undef */
(() => {
  const txt = el => (el ? (el.textContent || '').trim() : '');
  const attr = (el, name) => (el ? el.getAttribute(name) : null);

  // Extract FeedSpot IDs from URL
  const feedspotFolderId = (() => {
    const match = location.href.match(/\/fo\/(\d+)/i);
    return match ? match[1] : '';
  })();

  const feedspotFeedId = (() => {
    const match = location.href.match(/\/fe\/(\d+)/i);
    return match ? match[1] : '';
  })();

  // Extract feed data
  const name = txt(document.querySelector('.feed-title')) || '';
  const rssUrl =
    attr(document.querySelector('.feed-url a[href]'), 'href') || '';
  const websiteUrl =
    attr(document.querySelector('.feed-domain a[href]'), 'href') || '';

  // Get full description (click "See more" first if needed)
  const notes = txt(document.querySelector('.feed-desc')) || '';

  const result = {
    category: '', // Fill in manually
    dinner_score: 10,
    enabled: true,
    feedspotFeedId,
    feedspotFolderId,
    feedspotPage: location.href,
    name,
    notes,
    rssUrl,
    tier: '', // Fill in manually
    websiteUrl,
  };

  console.log('='.repeat(60));
  console.log('✅ Feed data extracted!');
  console.log('='.repeat(60));
  console.table(result);
  console.log('\n📋 Copy this JSON:\n');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n' + '='.repeat(60));

  return result;
})();
/* eslint-enable no-undef */
