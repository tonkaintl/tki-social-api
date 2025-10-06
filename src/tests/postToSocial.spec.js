import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { app } from '../app.js';

// Mock the Meta adapter
vi.mock('../adapters/meta/meta.adapter.js', () => {
  return {
    MetaAdapter: vi.fn().mockImplementation(() => ({
      createPost: vi.fn().mockResolvedValue({
        externalPostId: 'mock_post_123',
        permalink: 'https://www.facebook.com/mock_post_123',
        raw: { id: 'mock_post_123' },
        status: 'success',
      }),
      validateConfig: vi.fn().mockResolvedValue(true),
    })),
  };
});

// Mock the Binder service
vi.mock('../services/binder.service.js', () => {
  return {
    binderService: {
      logPost: vi.fn().mockResolvedValue({ id: 'mock_log_123' }),
    },
  };
});

describe('POST /social/post', () => {
  const validSecret = 'test-secret-key';

  it('should create a post successfully with valid Meta request', async () => {
    const postData = {
      message: 'Hello from TKI Social API test!',
      pageIdOrHandle: 'test_page_123',
      provider: 'meta',
    };

    const response = await request(app)
      .post('/social/post')
      .set('x-internal-secret', validSecret)
      .send(postData)
      .expect(200);

    expect(response.body).toMatchObject({
      results: {
        externalPostId: 'mock_post_123',
        permalink: 'https://www.facebook.com/mock_post_123',
        status: 'success',
      },
      success: true,
    });

    expect(response.body.requestId).toBeDefined();
  });

  it('should handle multi-provider requests', async () => {
    const postData = {
      message: 'Multi-provider test post',
      pageIdOrHandle: 'test_page_123',
      providers: ['meta', 'linkedin'],
    };

    const response = await request(app)
      .post('/social/post')
      .set('x-internal-secret', validSecret)
      .send(postData)
      .expect(207); // Multi-status expected due to LinkedIn stub

    expect(response.body.success).toBe(true);
    expect(response.body.results).toHaveProperty('meta');
    expect(response.body.results).toHaveProperty('linkedin');
    expect(response.body.results.meta.status).toBe('success');
    expect(response.body.results.linkedin.status).toBe('failed');
  });

  it('should reject requests without authentication', async () => {
    const postData = {
      message: 'Test post',
      pageIdOrHandle: 'test_page_123',
      provider: 'meta',
    };

    const response = await request(app)
      .post('/social/post')
      .send(postData)
      .expect(401);

    expect(response.body.code).toBe('MISSING_AUTH_HEADER');
  });

  it('should reject requests with invalid authentication', async () => {
    const postData = {
      message: 'Test post',
      pageIdOrHandle: 'test_page_123',
      provider: 'meta',
    };

    const response = await request(app)
      .post('/social/post')
      .set('x-internal-secret', 'invalid_secret')
      .send(postData)
      .expect(401);

    expect(response.body.code).toBe('INVALID_AUTH_HEADER');
  });

  it('should validate request data', async () => {
    const invalidPostData = {
      // Missing required fields
      provider: 'meta',
    };

    const response = await request(app)
      .post('/social/post')
      .set('x-internal-secret', validSecret)
      .send(invalidPostData)
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.errors).toBeDefined();
  });

  it('should reject unsupported providers', async () => {
    const postData = {
      message: 'Test post',
      pageIdOrHandle: 'test_page_123',
      provider: 'unsupported_provider',
    };

    const response = await request(app)
      .post('/social/post')
      .set('x-internal-secret', validSecret)
      .send(postData)
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_ERROR');
  });

  it('should handle posts with additional parameters', async () => {
    const postData = {
      linkUrl: 'https://tonkaintl.com',
      mediaUrls: ['https://example.com/image.jpg'],
      message: 'Test post with link and media',
      pageIdOrHandle: 'test_page_123',
      provider: 'meta',
      tags: ['#test', '#api'],
      utm: {
        utm_campaign: 'test_campaign',
        utm_source: 'api',
      },
    };

    const response = await request(app)
      .post('/social/post')
      .set('x-internal-secret', validSecret)
      .send(postData)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.results.status).toBe('success');
  });
});

describe('Health Check', () => {
  it('should return healthy status', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.body).toMatchObject({
      service: 'tki-social-api',
      status: 'healthy',
    });

    expect(response.body.timestamp).toBeDefined();
  });
});

describe('404 Handler', () => {
  it('should return 404 for unknown endpoints', async () => {
    const response = await request(app).get('/unknown-endpoint').expect(404);

    expect(response.body.code).toBe('NOT_FOUND');
    expect(response.body.path).toBe('/unknown-endpoint');
  });
});
