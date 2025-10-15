/**
 * Campaign Endpoints Test Script
 * Manual test script to verify campaign management endpoints
 */

// Test campaign creation
const testCreateCampaign = async () => {
  console.log('\n=== Testing Campaign Creation ===');

  const campaignData = {
    platforms: ['facebook', 'instagram'],
    stock_number: 'TEST001',
  };

  try {
    const response = await fetch('http://localhost:4300/api/social/post', {
      body: JSON.stringify(campaignData),
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': 'development-secret-key',
      },
      method: 'POST',
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));

    return result.campaign?.campaign_id;
  } catch (error) {
    console.error('Error:', error.message);
    return null;
  }
};

// Test campaign retrieval (list)
const testFetchCampaigns = async () => {
  console.log('\n=== Testing Campaign List ===');

  try {
    const response = await fetch(
      'http://localhost:4300/api/social/campaigns?limit=5',
      {
        headers: {
          'x-internal-secret': 'development-secret-key',
        },
        method: 'GET',
      }
    );

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
};

// Test campaign detail retrieval
const testGetCampaignDetail = async (stockNumber = 'TEST001') => {
  console.log('\n=== Testing Campaign Detail ===');

  try {
    const response = await fetch(
      `http://localhost:4300/api/social/campaigns/${stockNumber}`,
      {
        headers: {
          'x-internal-secret': 'development-secret-key',
        },
        method: 'GET',
      }
    );

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
};

// Test campaign update
const testUpdateCampaign = async (stockNumber = 'TEST001') => {
  console.log('\n=== Testing Campaign Update ===');

  const updateData = {
    platform_content: {
      facebook: {
        text: 'Updated Facebook post content',
      },
      instagram: {
        caption: 'Updated Instagram caption',
      },
    },
    status: 'queued',
  };

  try {
    const response = await fetch(
      `http://localhost:4300/api/social/campaigns/${stockNumber}`,
      {
        body: JSON.stringify(updateData),
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': 'development-secret-key',
        },
        method: 'PUT',
      }
    );

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
};

// Run all tests
const runTests = async () => {
  console.log('🚀 Testing TKI Social API Campaign Endpoints\n');

  // Test campaign creation
  const campaignId = await testCreateCampaign();

  // Wait a moment for database consistency
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test campaign listing
  await testFetchCampaigns();

  // Test campaign detail
  await testGetCampaignDetail();

  // Test campaign update
  await testUpdateCampaign();

  // Test campaign detail again to see updates
  console.log('\n=== Testing Updated Campaign Detail ===');
  await testGetCampaignDetail();

  console.log('\n✅ All tests completed!');
};

// Run the tests
runTests().catch(console.error);
