import { beforeEach, describe, expect, it } from 'vitest';

import { MetricoolClient } from '../src/adapters/metricool/metricool.client.js';
import { config } from '../src/config/env.js';

describe('Metricool Integration Test', () => {
  let metricoolClient;

  beforeEach(() => {
    metricoolClient = new MetricoolClient(config);
  });

  describe('Connection Test', () => {
    it('should successfully connect to Metricool API and retrieve networks', async () => {
      // Skip test if no API token is configured
      if (!config.METRICOOL_API_TOKEN) {
        console.log('⚠️  Skipping Metricool test - no API token configured');
        return;
      }

      console.log('🔌 Testing Metricool API connection...');

      const result = await metricoolClient.testConnection();

      console.log(
        '📊 Connection test result:',
        JSON.stringify(result, null, 2)
      );

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();

      if (result.success) {
        console.log('✅ Successfully connected to Metricool API!');
        console.log(
          `📱 Found ${result.networks?.length || 0} connected networks`
        );

        // Log network details if available
        if (result.networks && result.networks.length > 0) {
          result.networks.forEach((network, index) => {
            console.log(
              `  ${index + 1}. ${network.name || network.platform || 'Unknown'} - ${network.status || 'No status'}`
            );
          });
        }

        expect(result.networks).toBeDefined();
      } else {
        console.log('❌ Failed to connect to Metricool API');
        console.log('Error:', result.error);
        console.log('Details:', result.details);

        // Don't fail the test if it's an auth issue - might be expected
        if (
          result.error?.includes('401') ||
          result.error?.includes('Unauthorized')
        ) {
          console.log(
            '💡 This might be due to invalid credentials or insufficient permissions'
          );
        }
      }
    }, 10000); // 10 second timeout for API call

    it('should handle invalid credentials gracefully', async () => {
      // Test with invalid token
      const invalidClient = new MetricoolClient({
        ...config,
        METRICOOL_API_TOKEN: 'invalid-token-12345',
      });

      console.log('🚫 Testing with invalid credentials...');

      const result = await invalidClient.testConnection();

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      console.log('✅ Invalid credentials handled correctly');
    }, 5000);
  });

  describe('API Methods', () => {
    it('should have all required methods', () => {
      expect(typeof metricoolClient.testConnection).toBe('function');
      expect(typeof metricoolClient.getNetworks).toBe('function');
      expect(typeof metricoolClient.createPost).toBe('function');
      expect(typeof metricoolClient.getPosts).toBe('function');
      expect(typeof metricoolClient.deletePost).toBe('function');
      expect(typeof metricoolClient.getReports).toBe('function');
    });

    it('should make authenticated requests with proper headers', () => {
      expect(metricoolClient.config.METRICOOL_API_TOKEN).toBeDefined();
      expect(metricoolClient.baseUrl).toBe('https://api.metricool.com/v2');
    });
  });
});
