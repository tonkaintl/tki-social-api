// Quick test to debug the POST response
import request from 'supertest';

import { app } from './src/app.js';
import { config } from './src/config/env.js';

const test = async () => {
  const postData = {
    message: 'Hello from debug test!',
    pageIdOrHandle: 'test_page_123',
    provider: 'meta',
  };

  try {
    const response = await request(app)
      .post('/api/social/post')
      .set('x-internal-secret', config.INTERNAL_SECRET_KEY)
      .send(postData);

    console.log('Status:', response.status);
    console.log('Body:', JSON.stringify(response.body, null, 2));
  } catch (error) {
    console.error('Test error:', error.message);
  }
};

test();
