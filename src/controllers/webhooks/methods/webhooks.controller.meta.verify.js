// ----------------------------------------------------------------------------
// GET /webhooks/meta
// Meta webhook verification handler
// ----------------------------------------------------------------------------

import { MetaAdapter } from '../../../adapters/meta/meta.adapter.js';
import { config } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';

const metaAdapter = new MetaAdapter(config);

export const verifyMetaWebhook = async (req, res) => {
  try {
    // ------------------------------------------------------------------------
    // LOG VERIFICATION REQUEST
    // ------------------------------------------------------------------------
    logger.info('Meta webhook verification request received', {
      mode: req.query['hub.mode'],
      token: req.query['hub.verify_token'] ? 'present' : 'missing',
    });

    // ------------------------------------------------------------------------
    // HANDLE VERIFICATION
    // ------------------------------------------------------------------------
    const result = await metaAdapter.handleWebhook(req);

    if (result.challenge) {
      return res.status(200).send(result.challenge);
    } else {
      return res.status(403).json({
        error: 'Webhook verification failed',
      });
    }
  } catch (error) {
    logger.error('Meta webhook verification failed', {
      error: error.message,
    });

    return res.status(403).json({
      error: error.message,
    });
  }
};
