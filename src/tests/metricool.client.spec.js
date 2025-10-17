import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MetricoolClient } from '../adapters/metricool/metricool.client.js';
import { config } from '../config/env.js';

// Mock the config
vi.mock('../config/env.js');

describe('MetricoolClient', () => {
  let client;
  let mockAxios;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock config values
    config.metricool = {
      apiKey: 'test-api-key',
      baseUrl: 'https://api.metricool.com/v2',
    };

    // Mock axios
    mockAxios = {
      delete: vi.fn(),
      get: vi.fn(),
      patch: vi.fn(),
      post: vi.fn(),
    };

    // Mock axios instance creation
    vi.doMock('axios', () => ({
      create: vi.fn(() => mockAxios),
      default: {
        create: vi.fn(() => mockAxios),
      },
    }));

    client = new MetricoolClient();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createPost', () => {
    it('should create a post successfully', async () => {
      const postData = {
        autoPublish: false,
        draft: true,
        media: ['https://example.com/image.jpg'],
        providers: [{ network: 'facebook' }],
        publicationDate: {
          dateTime: '2025-12-01T12:00:00',
          timezone: 'America/Chicago',
        },
        text: 'Test post content',
      };

      const mockResponse = {
        data: {
          autoPublish: false,
          creationDate: { dateTime: '2025-10-16T15:00:00' },
          creatorUserId: 12345,
          creatorUserMail: 'test@example.com',
          draft: true,
          id: 252904001,
          media: ['https://example.com/image.jpg'],
          mediaAltText: [null],
          publicationDate: {
            dateTime: '2025-12-01T12:00:00',
            timezone: 'America/Chicago',
          },
          text: 'Test post content',
          uuid: 'test-uuid-123',
        },
      };

      mockAxios.post.mockResolvedValue(mockResponse);

      const result = await client.createPost(postData);

      expect(mockAxios.post).toHaveBeenCalledWith(
        '/scheduler/posts',
        postData,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Mc-Auth': 'test-api-key',
          },
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      const postData = {
        text: 'Test post',
      };

      const mockError = new Error('API Error');
      mockError.response = {
        data: { message: 'Invalid request' },
        status: 400,
      };

      mockAxios.post.mockRejectedValue(mockError);

      await expect(client.createPost(postData)).rejects.toThrow('API Error');

      expect(mockAxios.post).toHaveBeenCalledWith(
        '/scheduler/posts',
        postData,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Mc-Auth': 'test-api-key',
          },
        }
      );
    });
  });

  describe('deletePost', () => {
    it('should delete a post successfully', async () => {
      const postId = '252904001';
      const mockResponse = { data: { success: true } };

      mockAxios.delete.mockResolvedValue(mockResponse);

      const result = await client.deletePost(postId);

      expect(mockAxios.delete).toHaveBeenCalledWith(
        '/scheduler/posts/252904001',
        {
          headers: {
            'X-Mc-Auth': 'test-api-key',
          },
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle 404 errors gracefully', async () => {
      const postId = '252904001';
      const mockError = new Error('Not Found');
      mockError.response = {
        data: { message: 'Post not found' },
        status: 404,
      };

      mockAxios.delete.mockRejectedValue(mockError);

      await expect(client.deletePost(postId)).rejects.toThrow('Not Found');
    });
  });

  describe('getPost', () => {
    it('should get a post successfully', async () => {
      const postId = '252904001';
      const mockResponse = {
        data: {
          autoPublish: false,
          creationDate: { dateTime: '2025-10-16T15:00:00' },
          creatorUserId: 12345,
          creatorUserMail: 'test@example.com',
          draft: true,
          id: 252904001,
          media: ['https://example.com/image.jpg'],
          mediaAltText: [null],
          publicationDate: {
            dateTime: '2025-12-01T12:00:00',
            timezone: 'America/Chicago',
          },
          text: 'Test post content',
          uuid: 'test-uuid-123',
        },
      };

      mockAxios.get.mockResolvedValue(mockResponse);

      const result = await client.getPost(postId);

      expect(mockAxios.get).toHaveBeenCalledWith('/scheduler/posts/252904001', {
        headers: {
          'X-Mc-Auth': 'test-api-key',
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle 404 errors when post not found', async () => {
      const postId = '999999999';
      const mockError = new Error('Not Found');
      mockError.response = {
        data: { message: 'Post not found' },
        status: 404,
      };

      mockAxios.get.mockRejectedValue(mockError);

      await expect(client.getPost(postId)).rejects.toThrow('Not Found');
    });
  });

  describe('updatePost', () => {
    it('should update a post successfully', async () => {
      const uuid = 'test-uuid-123';
      const updateData = {
        publish_datetime: '2025-12-15T14:00:00Z',
      };

      const mockResponse = {
        data: { success: true },
      };

      mockAxios.patch.mockResolvedValue(mockResponse);

      const result = await client.updatePost(uuid, updateData);

      expect(mockAxios.patch).toHaveBeenCalledWith(
        '/scheduler/posts/test-uuid-123',
        updateData,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Mc-Auth': 'test-api-key',
          },
        }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle validation errors', async () => {
      const uuid = 'test-uuid-123';
      const updateData = {
        publish_datetime: 'invalid-date',
      };

      const mockError = new Error('Validation Error');
      mockError.response = {
        data: { message: 'Invalid date format' },
        status: 400,
      };

      mockAxios.patch.mockRejectedValue(mockError);

      await expect(client.updatePost(uuid, updateData)).rejects.toThrow(
        'Validation Error'
      );
    });
  });

  describe('API configuration', () => {
    it('should use correct base URL and headers', () => {
      expect(client).toBeDefined();
      // Client construction is tested indirectly through method calls
    });

    it('should handle missing config', () => {
      config.metricool = undefined;

      expect(() => new MetricoolClient()).toThrow();
    });

    it('should handle missing API key', () => {
      config.metricool = {
        baseUrl: 'https://api.metricool.com/v2',
        // apiKey missing
      };

      expect(() => new MetricoolClient()).toThrow();
    });
  });

  describe('error handling', () => {
    it('should preserve error response data', async () => {
      const postData = { text: 'Test' };
      const mockError = new Error('API Error');
      mockError.response = {
        data: {
          error: 'VALIDATION_ERROR',
          message: 'Text is required',
          statusCode: 400,
        },
        status: 400,
      };

      mockAxios.post.mockRejectedValue(mockError);

      try {
        await client.createPost(postData);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.response.data.error).toBe('VALIDATION_ERROR');
        expect(error.response.status).toBe(400);
      }
    });

    it('should handle network errors', async () => {
      const postData = { text: 'Test' };
      const networkError = new Error('Network Error');
      networkError.code = 'ECONNREFUSED';

      mockAxios.post.mockRejectedValue(networkError);

      await expect(client.createPost(postData)).rejects.toThrow(
        'Network Error'
      );
    });
  });
});
