// ----------------------------------------------------------------------------
// POST /webhooks/linkedin
// LinkedIn webhook event handler
// ----------------------------------------------------------------------------

import { logger } from '../../../utils/logger.js';

export const handleLinkedInWebhook = async (req, res) => {
  try {
    // ------------------------------------------------------------------------
    // VERIFY WEBHOOK SIGNATURE (when LinkedIn adapter is implemented)
    // ------------------------------------------------------------------------
    const signature = req.headers['x-li-signature-sha256'];
    if (!signature) {
      logger.warn('LinkedIn webhook missing signature header');
      return res.status(401).json({
        error: 'Missing LinkedIn webhook signature',
      });
    }

    // ------------------------------------------------------------------------
    // LOG INCOMING EVENT
    // ------------------------------------------------------------------------
    logger.info('LinkedIn webhook event received', {
      body: req.body,
      hasSignature: !!signature,
    });

    // ------------------------------------------------------------------------
    // STUB: LINKEDIN PROCESSING NOT IMPLEMENTED
    // ------------------------------------------------------------------------
    return res.status(501).json({
      error: 'LinkedIn webhook processing not implemented yet',
    });
  } catch (error) {
    logger.error('LinkedIn webhook processing failed', {
      error: error.message,
    });

    return res.status(500).json({
      error: error.message,
    });
  }
};
