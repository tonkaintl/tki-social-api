import { HEALTH_STATUS, SERVICE_INFO } from '../../../constants/service.js';

// ----------------------------------------------------------------------------
// GET /health
// Health check endpoint for load balancers and monitoring
// ----------------------------------------------------------------------------

/**
 * Health check controller
 * Returns service status and metadata
 */
export const getHealth = (req, res) => {
  res.json({
    service: SERVICE_INFO.NAME,
    status: HEALTH_STATUS.HEALTHY,
    timestamp: new Date().toISOString(),
    version: SERVICE_INFO.VERSION,
  });
};
