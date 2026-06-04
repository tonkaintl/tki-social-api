import mongoose from 'mongoose';
import connectToDb from './src/config/database.js';
import { config } from './src/config/env.js';
await connectToDb(config.MONGODB_TKISOCIAL_URI);
const db = mongoose.connection.db;
const run = await db.collection('writers_room_runs').findOne({ _id: new mongoose.Types.ObjectId('6a21e1f3530daba1b1c67500') });
console.log('top-level keys:', Object.keys(run).join(', '));
// find ai_tells wherever it lives
const blob = JSON.stringify(run);
const idx = blob.indexOf('tells_found');
console.log('\nai_tells region:');
console.log(idx >= 0 ? blob.slice(idx - 40, idx + 500) : 'tells_found not found in run doc');
