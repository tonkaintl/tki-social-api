import { describe, expect, it } from 'vitest';

import sampleData from '../sample_data/writers_room_sample.js';

// ----------------------------------------------------------------------------
// Writer's Room Content Webhook Test
// Tests the POST /api/webhooks/writers-room/content endpoint
// ----------------------------------------------------------------------------

const BASE_URL = 'http://localhost:8080';
const WEBHOOK_ENDPOINT = '/api/webhooks/writers-room/content';

// Get N8N secret from environment or use test default
const N8N_SECRET = process.env.N8N_INTERNAL_SECRET || 'test-n8n-secret';

describe('Writers Room Content Webhook', () => {
  it('should successfully process valid content from n8n', async () => {
    // Prepare test payload - use first item from sample data
    const testPayload = {
      ...sampleData[0],
      content_id: `test_wrc_${Date.now()}`,
      // Add required fields that might not be in sample
      notifier_email: 'test@tonkaintl.com',
      send_email: true,
    };

    console.log('\n========================================');
    console.log('TESTING WRITERS ROOM CONTENT WEBHOOK');
    console.log('========================================');
    console.log('Endpoint:', `${BASE_URL}${WEBHOOK_ENDPOINT}`);
    console.log('N8N Secret:', N8N_SECRET);
    console.log('Payload keys:', Object.keys(testPayload).join(', '));
    console.log('========================================\n');

    const response = await fetch(`${BASE_URL}${WEBHOOK_ENDPOINT}`, {
      body: JSON.stringify(testPayload),
      headers: {
        'Content-Type': 'application/json',
        'x-n8n-secret': N8N_SECRET,
      },
      method: 'POST',
    });

    const responseData = await response.json();

    console.log('\n========================================');
    console.log('RESPONSE RECEIVED');
    console.log('========================================');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(responseData, null, 2));
    console.log('========================================\n');

    // Assertions
    expect(response.status).toBe(200);
    expect(responseData).toHaveProperty('content_id');
    expect(responseData).toHaveProperty('documentId');
    expect(responseData).toHaveProperty('status');
    expect(responseData.status).toBe('sent');
  });

  it('should reject request without n8n secret', async () => {
    const testPayload = {
      ...sampleData[0],
      content_id: `test_wrc_${Date.now()}`,
      notifier_email: 'test@tonkaintl.com',
    };

    console.log('\n========================================');
    console.log('TESTING UNAUTHORIZED REQUEST');
    console.log('========================================');

    const response = await fetch(`${BASE_URL}${WEBHOOK_ENDPOINT}`, {
      body: JSON.stringify(testPayload),
      headers: {
        'Content-Type': 'application/json',
        // Missing x-n8n-secret header
      },
      method: 'POST',
    });

    const responseData = await response.json();

    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(responseData, null, 2));
    console.log('========================================\n');

    expect(response.status).toBe(403);
    expect(responseData).toHaveProperty('code');
    expect(responseData.code).toBe('UNAUTHORIZED');
  });

  it('should reject request with invalid n8n secret', async () => {
    const testPayload = {
      ...sampleData[0],
      content_id: `test_wrc_${Date.now()}`,
      notifier_email: 'test@tonkaintl.com',
    };

    console.log('\n========================================');
    console.log('TESTING INVALID SECRET');
    console.log('========================================');

    const response = await fetch(`${BASE_URL}${WEBHOOK_ENDPOINT}`, {
      body: JSON.stringify(testPayload),
      headers: {
        'Content-Type': 'application/json',
        'x-n8n-secret': 'wrong-secret',
      },
      method: 'POST',
    });

    const responseData = await response.json();

    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(responseData, null, 2));
    console.log('========================================\n');

    expect(response.status).toBe(403);
    expect(responseData).toHaveProperty('code');
    expect(responseData.code).toBe('UNAUTHORIZED');
  });

  it('should reject request without required notifier_email', async () => {
    const testPayload = {
      ...sampleData[0],
      content_id: `test_wrc_${Date.now()}`,
      // Missing notifier_email
    };
    delete testPayload.notifier_email;

    console.log('\n========================================');
    console.log('TESTING MISSING NOTIFIER EMAIL');
    console.log('========================================');

    const response = await fetch(`${BASE_URL}${WEBHOOK_ENDPOINT}`, {
      body: JSON.stringify(testPayload),
      headers: {
        'Content-Type': 'application/json',
        'x-n8n-secret': N8N_SECRET,
      },
      method: 'POST',
    });

    const responseData = await response.json();

    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(responseData, null, 2));
    console.log('========================================\n');

    expect(response.status).toBe(400);
    expect(responseData).toHaveProperty('code');
    expect(responseData.code).toBe('VALIDATION_ERROR');
    expect(responseData.error).toContain('notifier_email');
  });
});
