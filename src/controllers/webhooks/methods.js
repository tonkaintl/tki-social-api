// Methods index for webhook controllers
import { handleLinkedInWebhook } from './methods/webhooks.controller.linkedin.handle.js';
import { verifyLinkedInWebhook } from './methods/webhooks.controller.linkedin.verify.js';
import { handleMetaWebhook } from './methods/webhooks.controller.meta.handle.js';
import { verifyMetaWebhook } from './methods/webhooks.controller.meta.verify.js';

// ----------------------------------------------------------------------------

export {
  handleLinkedInWebhook,
  handleMetaWebhook,
  verifyLinkedInWebhook,
  verifyMetaWebhook,
};
