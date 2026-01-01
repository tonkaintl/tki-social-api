import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import connectToDb from '../src/config/database.js';
import { config } from '../src/config/env.js';
import { handleTonkaDispatchRankings } from '../src/controllers/webhooks/methods/webhooks.controller.tonkadispatch.rankings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to database
await connectToDb(config.MONGODB_TKISOCIAL_URI);

// Load sample data
const sampleDataPath = path.join(
  __dirname,
  '../src/sample_data/ranking-sample.json'
);
const rankingsData = JSON.parse(fs.readFileSync(sampleDataPath, 'utf-8'));

console.log('📊 Loaded sample data:', {
  is_array: Array.isArray(rankingsData),
  length: rankingsData.length,
});

// Mock request and response objects
const mockReq = {
  body: rankingsData,
  get: () => 'application/json',
  id: 'test-request-' + Date.now(),
  method: 'POST',
  url: '/api/webhooks/tonka-dispatch/rankings',
};

const mockRes = {
  json: function (data) {
    console.log('\n✅ Response:');
    console.log(JSON.stringify(data, null, 2));

    if (data.batch_id) {
      console.log('\n💾 Rankings saved with batch_id:', data.batch_id);
      console.log(
        `   Query in MongoDB: db.tonka_dispatch_rankings.find({ batch_id: "${data.batch_id}" })`
      );
    }

    if (data.errors && data.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      data.errors.forEach(err => {
        console.log(`   - Rank ${err.rank}: ${err.error}`);
      });
    }

    return this;
  },
  status: function (code) {
    this.statusCode = code;
    console.log('\n📡 Response status:', code);
    return this;
  },
  statusCode: 200,
};

// Run the webhook handler
console.log('\n🚀 Running webhook handler...\n');

handleTonkaDispatchRankings(mockReq, mockRes)
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
