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
    service: 'tki-social-api',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
};
