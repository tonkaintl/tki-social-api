import { describe, expect, it, vi } from 'vitest';

import { createMetricoolDraft } from '../controllers/social/methods/social.controller.metricool.draft.js';

// Simple integration-style tests
describe('Metricool Integration Tests', () => {
  it('should have the createMetricoolDraft function', () => {
    expect(createMetricoolDraft).toBeDefined();
    expect(typeof createMetricoolDraft).toBe('function');
  });

  it('should require campaign ID in params', async () => {
    const mockReq = { body: {}, params: {} };
    const mockRes = { json: vi.fn(), status: vi.fn().mockReturnThis() };
    const mockNext = vi.fn();

    await createMetricoolDraft(mockReq, mockRes, mockNext);

    // Should call next with an error since campaignId is missing
    expect(mockNext).toHaveBeenCalled();
    expect(mockNext.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('should require request body', async () => {
    const mockReq = { params: { campaignId: 'TEST-001' } }; // No body
    const mockRes = { json: vi.fn(), status: vi.fn().mockReturnThis() };
    const mockNext = vi.fn();

    await createMetricoolDraft(mockReq, mockRes, mockNext);

    // Should call next with an error since body is missing
    expect(mockNext).toHaveBeenCalled();
    expect(mockNext.mock.calls[0][0]).toBeInstanceOf(Error);
  });
});
