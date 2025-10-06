import fetch from 'node-fetch';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../constants/errors.js';
import { portalService } from '../services/portal.service.js';

// Mock node-fetch
vi.mock('node-fetch');

describe('Portal Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('generatePortalLink', () => {
    it('should generate portal link successfully', async () => {
      const mockResponse = {
        expiresAt: '2024-12-31T23:59:59Z',
        id: 'link_123',
        url: 'https://portal.example.com/customer/123',
      };

      fetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
        ok: true,
      });

      const result = await portalService.generatePortalLink('customer_123', {
        expiresIn: 3600,
      });

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/integrations/portal/generate-link'),
        expect.objectContaining({
          body: JSON.stringify({
            customerId: 'customer_123',
            expiresIn: 3600,
          }),
          headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': expect.any(String),
          },
          method: 'POST',
        })
      );
    });

    it('should handle API errors', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad Request'),
      });

      await expect(
        portalService.generatePortalLink('customer_123')
      ).rejects.toThrow(ApiError);
    });
  });

  describe('validatePortalToken', () => {
    it('should validate token successfully', async () => {
      const mockResponse = {
        tokenId: 'token_123',
        valid: true,
      };

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
        ok: true,
        status: 200,
      });

      const result = await portalService.validatePortalToken('valid_token');

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/integrations/portal/validate-token'),
        expect.objectContaining({
          body: JSON.stringify({ token: 'valid_token' }),
          method: 'POST',
        })
      );
    });

    it('should handle invalid tokens', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Invalid token'),
      });

      await expect(
        portalService.validatePortalToken('invalid_token')
      ).rejects.toThrow(ApiError);
    });
  });

  describe('logActivity', () => {
    it('should log activity successfully', async () => {
      const mockResponse = {
        id: 'activity_123',
        status: 'logged',
      };

      const activityData = {
        customerId: 'customer_123',
        timestamp: new Date().toISOString(),
        type: 'login',
      };

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
        ok: true,
        status: 200,
      });

      const result = await portalService.logActivity(activityData);

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/integrations/portal/activity'),
        expect.objectContaining({
          body: JSON.stringify(activityData),
          method: 'POST',
        })
      );
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const mockResponse = {
        service: 'portal-api',
        status: 'healthy',
        timestamp: new Date().toISOString(),
      };

      fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
        ok: true,
        status: 200,
      });

      const result = await portalService.healthCheck();

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should handle service unavailable', async () => {
      fetch.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(portalService.healthCheck()).rejects.toThrow(ApiError);
    });
  });
});
