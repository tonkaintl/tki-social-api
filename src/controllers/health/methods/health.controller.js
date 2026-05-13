import { config } from '../../../config/env.js';
import { HEALTH_STATUS, SERVICE_INFO } from '../../../constants/service.js';

// ----------------------------------------------------------------------------
// GET /health
// Health check endpoint for load balancers and monitoring
// Returns service status, metadata, and dependency checks
// ----------------------------------------------------------------------------

/**
 * Health check controller
 * Returns service status and metadata
 * Verifies that critical dependencies are configured
 */
export const getHealth = (req, res) => {
  // Check if ANTHROPIC_API_KEY is configured
  const anthropicConfigured = !!config.ANTHROPIC_API_KEY;
  const status = anthropicConfigured
    ? HEALTH_STATUS.HEALTHY
    : HEALTH_STATUS.UNHEALTHY;

  return res.status(anthropicConfigured ? 200 : 503).json({
    anthropic_configured: anthropicConfigured,
    service: SERVICE_INFO.NAME,
    status,
    timestamp: new Date().toISOString(),
    version: SERVICE_INFO.VERSION,
  });
};
