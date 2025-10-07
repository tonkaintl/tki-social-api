import { MetaAdapter } from '../../../adapters/meta/meta.adapter.js';
import { config } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';

const metaAdapter = new MetaAdapter(config);

// ----------------------------------------------------------------------------
// GET /webhooks/facebook/callback
// Facebook OAuth callback handler
// ----------------------------------------------------------------------------
export const handleFacebookCallback = async (req, res) => {
  try {
    // ------------------------------------------------------------------------
    // EXTRACT OAUTH PARAMETERS
    // ------------------------------------------------------------------------
    const { code, error, error_description } = req.query;

    if (error) {
      logger.error('Facebook OAuth error', {
        error,
        error_description,
      });

      return res.status(400).json({
        details: error_description || error,
        error: 'Facebook OAuth failed',
      });
    }

    if (!code) {
      return res.status(400).json({
        error: 'Missing authorization code from Facebook',
      });
    }

    // ------------------------------------------------------------------------
    // USE META ADAPTER TO HANDLE OAUTH CALLBACK
    // ------------------------------------------------------------------------
    const result = await metaAdapter.handleOAuthCallback({ code }, req);

    logger.info('Facebook OAuth callback completed', {
      pages_count: result.pages?.length || 0,
    });

    res.json(result);
  } catch (error) {
    logger.error('Facebook callback handler error', {
      error: error.message,
    });

    res.status(500).json({
      error: 'Internal server error processing Facebook callback',
    });
  }
};
