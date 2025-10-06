// ----------------------------------------------------------------------------
// GET /webhooks/linkedin
// LinkedIn webhook verification handler
// ----------------------------------------------------------------------------

import { logger } from '../../../utils/logger.js';

export const verifyLinkedInWebhook = async (req, res) => {
  try {
    // ------------------------------------------------------------------------
    // LOG VERIFICATION REQUEST
    // ------------------------------------------------------------------------
    logger.info('LinkedIn webhook verification request received');

    // ------------------------------------------------------------------------
    // STUB: LINKEDIN VERIFICATION NOT IMPLEMENTED
    // ------------------------------------------------------------------------
    return res.status(501).json({
      error: 'LinkedIn webhook verification not implemented yet',
    });
  } catch (error) {
    logger.error('LinkedIn webhook verification failed', {
      error: error.message,
    });

    return res.status(500).json({
      error: error.message,
    });
  }
};
