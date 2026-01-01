import connectToDb from '../src/config/database.js';
import { config } from '../src/config/env.js';
import TonkaDispatchRanking from '../src/models/tonkaDispatchRankings.model.js';

// Connect to database
await connectToDb(config.MONGODB_TKISOCIAL_URI);

// Get all rankings
const rankings = await TonkaDispatchRanking.find({})
  .sort({ created_at: -1, rank: 1 })
  .lean();

console.log(`\n📊 Total rankings in database: ${rankings.length}\n`);

if (rankings.length === 0) {
  console.log('No rankings found.');
  process.exit(0);
}

// Group by batch_id
const batches = {};
rankings.forEach(ranking => {
  if (!batches[ranking.batch_id]) {
    batches[ranking.batch_id] = [];
  }
  batches[ranking.batch_id].push(ranking);
});

console.log(`📦 Total batches: ${Object.keys(batches).length}\n`);

// Display each batch
Object.keys(batches).forEach((batch_id, index) => {
  const batchRankings = batches[batch_id];
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Batch ${index + 1}: ${batch_id}`);
  console.log(`Created: ${batchRankings[0].created_at}`);
  console.log(`Count: ${batchRankings.length} rankings`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  batchRankings
    .sort((a, b) => a.rank - b.rank)
    .forEach(ranking => {
      console.log(`Rank ${ranking.rank}: ${ranking.title || 'No title'}`);
      console.log(`  URL: ${ranking.link || 'No link'}`);
      console.log(`  Canonical: ${ranking.canonical_id}`);
      console.log(`  Category: ${ranking.category || 'N/A'}`);
      console.log(`  Source: ${ranking.source_name || 'N/A'}`);
      console.log(`  Match Status: ${ranking.feed_match_status || 'N/A'}`);
      if (ranking.tonka_dispatch_rss_links_id) {
        console.log(`  Feed ID: ${ranking.tonka_dispatch_rss_links_id}`);
      }
      console.log('');
    });
});

process.exit(0);
