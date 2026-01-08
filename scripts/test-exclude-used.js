import connectToDb from '../src/config/database.js';
import { config } from '../src/config/env.js';
import { listArticles } from '../src/controllers/tonkaDispatchArticles/methods/articles.controller.get.list.js';
import TonkaDispatchRanking from '../src/models/tonkaDispatchRankings.model.js';
import '../src/models/tonkaDispatchRssLinks.model.js'; // Register schema for populate

await connectToDb(config.MONGODB_TKISOCIAL_URI);

console.log('=== TESTING ACTUAL ENDPOINT FUNCTION ===\n');

// First, check what articles are currently ranked
const rankedArticleIds = await TonkaDispatchRanking.distinct(
  'dispatch_article_id'
);
const validRankedIds = rankedArticleIds.filter(id => id !== null);

console.log('📊 Currently Ranked Articles (should be excluded):');
console.log(`  Total: ${validRankedIds.length}`);
if (validRankedIds.length > 0) {
  console.log(
    `  IDs: ${validRankedIds
      .slice(0, 5)
      .map(id => id.toString())
      .join(', ')}${validRankedIds.length > 5 ? '...' : ''}`
  );
}
console.log('');

// Mock req/res objects
const mockReq = {
  id: 'test-request',
  query: {
    exclude_used: 'true',
    limit: '10',
    score_min: '95',
    sort: '-relevance.score',
  },
};

let responseData = null;
const mockRes = {
  json: function (data) {
    responseData = data;
    return this;
  },
  status: function (code) {
    this.statusCode = code;
    return this;
  },
};

console.log('📞 Calling actual listArticles() function...');
console.log(`   Query params: ${JSON.stringify(mockReq.query, null, 2)}\n`);

await listArticles(mockReq, mockRes);

if (!responseData || !responseData.articles) {
  console.log('🚨 ERROR: Function did not return articles');
  process.exit(1);
}

const apiArticles = responseData.articles;

console.log(`📋 Endpoint returned ${apiArticles.length} articles:\n`);
apiArticles.forEach((a, i) => {
  console.log(
    `  ${i + 1}. ${a._id} - ${a.category} - Score: ${a.relevance.score}`
  );
});
console.log('');

// Check if any returned articles were already ranked
console.log('🔍 Checking if returned articles were ALREADY ranked...\n');

let problemCount = 0;
for (const article of apiArticles) {
  const existingRankings = await TonkaDispatchRanking.find({
    dispatch_article_id: article._id,
  }).select('batch_id rank created_at');

  if (existingRankings.length > 0) {
    problemCount++;
    console.log(`🚨 PROBLEM: Article ${article._id} was already ranked!`);
    console.log(`   Title: ${article.title}`);
    console.log(`   Times ranked: ${existingRankings.length}`);
    existingRankings.forEach((r, i) => {
      console.log(
        `     ${i + 1}. Batch: ${r.batch_id}, Rank: ${r.rank}, Date: ${r.created_at}`
      );
    });
    console.log('');
  }
}

if (problemCount === 0) {
  console.log(
    '✅ SUCCESS: None of the returned articles were previously ranked'
  );
} else {
  console.log(
    `\n🚨 FAILURE: ${problemCount}/${apiArticles.length} articles were already ranked before!`
  );
}

process.exit(0);
