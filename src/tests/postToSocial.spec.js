import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { app } from '../app.js';
import { HEALTH_STATUS, SERVICE_INFO } from '../constants/service.js';

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

describe('Health Check', () => {
  it('should return healthy status', async () => {
    const response = await request(app).get('/api/health').expect(200);

    expect(response.body).toMatchObject({
      service: SERVICE_INFO.NAME,
      status: HEALTH_STATUS.HEALTHY,
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
