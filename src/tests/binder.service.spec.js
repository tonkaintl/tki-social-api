import fetch from 'node-fetch';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../constants/errors.js';
import { binderService } from '../services/binder.service.js';

// Mock node-fetch
vi.mock('node-fetch');

describe('BinderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('makeRequest', () => {
    it('should make successful GET request', async () => {
      const mockResponse = { id: 'test-123', status: 'success' };
      fetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
        ok: true,
      });

      const result = await binderService.makeRequest('GET', '/test-endpoint');

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:4100/test-endpoint',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-internal-secret': expect.any(String),
          }),
          method: 'GET',
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should make successful POST request with data', async () => {
      const mockResponse = { created: true, id: 'test-456' };
      const requestData = { email: 'test@example.com', name: 'Test Lead' };

      fetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
        ok: true,
      });

      const result = await binderService.makeRequest(
        'POST',
        '/leads',
        requestData
      );

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:4100/leads',
        expect.objectContaining({
          body: JSON.stringify(requestData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-internal-secret': expect.any(String),
          }),
          method: 'POST',
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should throw ApiError on HTTP error response', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad Request'),
      });

      await expect(
        binderService.makeRequest('GET', '/invalid-endpoint')
      ).rejects.toThrow(ApiError);
    });

    it('should throw ApiError on network error', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      await expect(
        binderService.makeRequest('GET', '/test-endpoint')
      ).rejects.toThrow(ApiError);
    });
  });

  describe('upsertLead', () => {
    it('should upsert lead successfully', async () => {
      const leadData = {
        email: 'lead@example.com',
        name: 'Test Lead',
        phone: '+1234567890',
        source: 'meta',
      };

      const mockResponse = { id: 'lead-123', status: 'created' };

      fetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
        ok: true,
      });

      const result = await binderService.upsertLead(leadData);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:4100/integrations/leads/upsert',
        expect.objectContaining({
          body: JSON.stringify(leadData),
          method: 'POST',
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle lead upsert failure', async () => {
      const leadData = { email: 'invalid@example.com', source: 'meta' };

      fetch.mockResolvedValue({
        ok: false,
        status: 422,
        text: () => Promise.resolve('Validation failed'),
      });

      await expect(binderService.upsertLead(leadData)).rejects.toThrow(
        ApiError
      );
    });
  });

  describe('upsertConversation', () => {
    it('should upsert conversation successfully', async () => {
      const conversationData = {
        externalId: 'conv-123',
        messages: [
          {
            content: 'Hello from Meta',
            direction: 'inbound',
            timestamp: new Date().toISOString(),
          },
        ],
        participantId: 'user-456',
        provider: 'meta',
      };

      const mockResponse = { id: 'conversation-789', status: 'updated' };

      fetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
        ok: true,
      });

      const result = await binderService.upsertConversation(conversationData);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:4100/integrations/conversations/upsert',
        expect.objectContaining({
          body: JSON.stringify(conversationData),
          method: 'POST',
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('logPost', () => {
    it('should log post successfully', async () => {
      const postData = {
        content: 'Test post content',
        externalPostId: 'post-123',
        pageId: 'page-456',
        permalink: 'https://facebook.com/posts/123',
        provider: 'meta',
      };

      const mockResponse = { id: 'log-789', logged: true };

      fetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
        ok: true,
      });

      const result = await binderService.logPost(postData);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:4100/integrations/social/posts',
        expect.objectContaining({
          body: JSON.stringify(postData),
          method: 'POST',
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('sendMessageThroughBinder', () => {
    it('should send message through Binder successfully', async () => {
      const messageData = {
        context: {
          postId: 'post-123',
          threadId: 'thread-456',
        },
        message: 'Hello from TKI Social API',
        provider: 'meta',
        to: '+1234567890',
      };

      const mockResponse = { id: 'message-999', sent: true };

      fetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
        ok: true,
      });

      const result = await binderService.sendMessageThroughBinder(messageData);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:4100/integrations/messages/send',
        expect.objectContaining({
          body: JSON.stringify(messageData),
          method: 'POST',
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('healthCheck', () => {
    it('should return health status successfully', async () => {
      const mockResponse = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      };

      fetch.mockResolvedValue({
        json: () => Promise.resolve(mockResponse),
        ok: true,
      });

      const result = await binderService.healthCheck();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:4100/health',
        expect.objectContaining({
          method: 'GET',
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle health check failure', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 503,
        text: () => Promise.resolve('Service Unavailable'),
      });

      await expect(binderService.healthCheck()).rejects.toThrow(ApiError);
    });
  });
});
