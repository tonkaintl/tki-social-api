# FeedSpot Feed Scraper

This script scrapes FeedSpot feed pages to extract RSS feed information for bulk import into the TKI Social API feed registry.

## Prerequisites

Install Playwright if not already installed:

```bash
npm install -D playwright
npx playwright install chromium
```

## Usage

### 1. Prepare URL List

Create or edit `feedspot-urls.txt` with one FeedSpot URL per line:

```
https://www.feedspot.com/infiniterss.php?_src=feed_title&followfeedid=5473611
https://www.feedspot.com/infiniterss.php?_src=feed_title&followfeedid=1234567
```

### 2. Run the Scraper

```bash
node scripts/scrape-feedspot-feeds.js
```

Or specify custom input/output files:

```bash
node scripts/scrape-feedspot-feeds.js my-urls.txt my-output.csv
```

### 3. Review Output

The script generates a CSV file (`feedspot-feeds.csv` by default) with these columns:

- **feedspotPage** - Original FeedSpot URL
- **feedspotId** - Extracted FeedSpot feed ID
- **name** - Feed title/name
- **category** - Feed category (if available)
- **websiteUrl** - Main website URL
- **rssFeeds** - RSS feed URLs (pipe-separated if multiple)
- **description** - Feed description
- **emailOrContact** - Contact info found on page
- **error** - Any error messages

## Data Extracted

The scraper attempts to find:

1. **Feed Title** - From h1.feed-title or page title
2. **Category** - From category tags/labels
3. **Website URL** - From "Visit Website" links
4. **RSS Feeds** - From:
   - `<link rel="alternate">` tags
   - Links containing "rss", "atom", "feed", ".xml"
5. **Contact Info** - Email addresses or contact links

## Import to Database

After reviewing the CSV, you can:

1. **Manual Review** - Open in Excel/Sheets, verify RSS URLs are valid
2. **Bulk Import** - Use the CSV data to call your `/api/feeds/upsert` endpoint
3. **Selective Import** - Cherry-pick feeds with valid RSS URLs

### Example: Bulk Import Script

```javascript
import fs from 'fs';
import csv from 'csv-parser';

const results = [];
fs.createReadStream('feedspot-feeds.csv')
  .pipe(csv())
  .on('data', data => results.push(data))
  .on('end', async () => {
    for (const row of results) {
      if (!row.rssFeeds || row.error) continue;

      const feeds = row.rssFeeds.split(' | ');
      for (const rss_url of feeds) {
        await fetch('http://localhost:3000/api/feeds/upsert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': process.env.INTERNAL_SECRET,
          },
          body: JSON.stringify({
            rss_url: rss_url.trim(),
            name: row.name,
            category: row.category,
            feedspot_feed_id: row.feedspotId,
            notes: `Scraped from FeedSpot: ${row.feedspotPage}`,
          }),
        });
      }
    }
  });
```

## Tips

- **Rate Limiting** - Script includes 1.2s delay between requests
- **Batch Processing** - Process 20-30 URLs at a time for best results
- **Verify RSS URLs** - Always test RSS URLs before importing
- **Multiple Feeds** - Some pages may return multiple RSS URLs (variations like /feed and /rss)

## Troubleshooting

**No RSS feeds found:**

- FeedSpot page may not expose RSS links directly
- Try visiting the actual website URL and looking for RSS there
- Check description/notes for clues

**Browser timeout:**

- Increase timeout in script (line with `timeout: 60000`)
- Check your internet connection
- FeedSpot may be blocking automated access

**Missing data:**

- FeedSpot pages vary in structure
- Some fields may be empty if not present on page
- Manual verification recommended for important feeds
