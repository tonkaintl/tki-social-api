#!/usr/bin/env node

/**
 * Manual test script for Writers Room Content webhook
 * Usage: node scripts/test-writersroom-webhook.js [--no-email]
 *
 * Prerequisites:
 * 1. Server must be running (npm start or npm run dev)
 * 2. MongoDB must be connected
 * 3. N8N_INTERNAL_SECRET must be set in .env
 */

import { config } from '../src/config/env.js';
import sampleData from '../src/sample_data/writers_room_sample.js';

// ----------------------------------------------------------------------------
// Configuration
// ----------------------------------------------------------------------------
const BASE_URL = process.env.BASE_URL || 'http://localhost:4300';
const WEBHOOK_ENDPOINT = '/api/webhooks/writers-room/content';
const N8N_SECRET = config.N8N_INTERNAL_SECRET;
const NOTIFIER_EMAIL = process.env.NOTIFIER_EMAIL || 'test@tonkaintl.com';

// Check for --no-email flag
const sendEmail = !process.argv.includes('--no-email');

// ----------------------------------------------------------------------------
// Test Function
// ----------------------------------------------------------------------------
async function testWebhook() {
  console.log(
    '\n╔════════════════════════════════════════════════════════════════╗'
  );
  console.log(
    '║       WRITERS ROOM CONTENT WEBHOOK TEST SCRIPT                ║'
  );
  console.log(
    '╚════════════════════════════════════════════════════════════════╝\n'
  );

  console.log('Configuration:');
  console.log('  • Base URL:', BASE_URL);
  console.log('  • Endpoint:', WEBHOOK_ENDPOINT);
  console.log('  • N8N Secret:', N8N_SECRET.substring(0, 8) + '...');
  console.log('  • Notifier Email:', NOTIFIER_EMAIL);
  console.log('  • Send Email:', sendEmail ? 'Yes' : 'No (--no-email flag)');
  console.log('');

  // Prepare test payload
  const testPayload = {
    ...sampleData[0],
    content_id: `test_wrc_${Date.now()}`,
    notifier_email: NOTIFIER_EMAIL,
    send_email: sendEmail,
  };

  console.log('Payload Summary:');
  console.log('  • Content ID:', testPayload.content_id);
  console.log('  • Project Mode:', testPayload.project_mode || 'N/A');
  console.log('  • Brand:', testPayload.project?.brand || 'N/A');
  console.log('  • Target Audience:', testPayload.target_audience || 'N/A');
  console.log('  • Title:', testPayload.final_draft?.title || 'N/A');
  console.log(
    '  • Writer Panel:',
    testPayload.writer_panel?.length || 0,
    'writers'
  );
  console.log(
    '  • Visual Prompts:',
    testPayload.visual_prompts?.length || 0,
    'prompts'
  );
  console.log(
    '  • Research Enabled:',
    testPayload.research?.enable_research ? 'Yes' : 'No'
  );
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SENDING REQUEST...\n');

  try {
    const startTime = Date.now();
    const response = await fetch(`${BASE_URL}${WEBHOOK_ENDPOINT}`, {
      body: JSON.stringify(testPayload),
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': N8N_SECRET,
      },
      method: 'POST',
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    const responseData = await response.json();

    console.log('✓ Response received in', duration, 'ms\n');
    console.log(
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    );
    console.log('RESPONSE DETAILS\n');
    console.log(
      '  Status Code:',
      response.status,
      getStatusEmoji(response.status)
    );
    console.log('  Status Text:', response.statusText);
    console.log('');

    if (response.ok) {
      console.log('  ✓ Content ID:', responseData.content_id);
      console.log('  ✓ Document ID:', responseData.documentId);
      console.log('  ✓ Status:', responseData.status);
      console.log('  ✓ Notifier Email:', responseData.notifier_email);

      if (responseData.email_sent) {
        console.log('  ✓ Email Status:', 'Sent successfully');
      }

      console.log('');
      console.log('Full Response:');
      console.log(JSON.stringify(responseData, null, 2));
    } else {
      console.log('  ✗ Error Code:', responseData.code);
      console.log('  ✗ Error Message:', responseData.error);
      console.log('');
      console.log('Full Response:');
      console.log(JSON.stringify(responseData, null, 2));
    }

    console.log('');
    console.log(
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    );

    if (response.ok) {
      console.log('\n✓ TEST PASSED\n');
      process.exit(0);
    } else {
      console.log('\n✗ TEST FAILED\n');
      process.exit(1);
    }
  } catch (error) {
    console.log('');
    console.log(
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    );
    console.log('✗ REQUEST FAILED\n');
    console.error('Error:', error.message);

    if (error.cause) {
      console.error('Cause:', error.cause);
    }

    console.log('');
    console.log('Common issues:');
    console.log('  • Is the server running? (npm start or npm run dev)');
    console.log('  • Is MongoDB connected?');
    console.log('  • Check N8N_INTERNAL_SECRET in .env');
    console.log('  • Verify the BASE_URL:', BASE_URL);
    console.log('');
    console.log(
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'
    );

    process.exit(1);
  }
}

// ----------------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------------
function getStatusEmoji(status) {
  if (status >= 200 && status < 300) return '✓';
  if (status >= 400 && status < 500) return '⚠';
  if (status >= 500) return '✗';
  return '';
}

// ----------------------------------------------------------------------------
// Run Test
// ----------------------------------------------------------------------------
testWebhook();
