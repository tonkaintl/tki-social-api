// Methods index for webhook controllers
import { handleFacebookCallback } from './methods/webhooks.controller.facebook.callback.js';
import { handleLinkedInWebhook } from './methods/webhooks.controller.linkedin.handle.js';
import { verifyLinkedInWebhook } from './methods/webhooks.controller.linkedin.verify.js';
import { handleMetaWebhook } from './methods/webhooks.controller.meta.handle.js';
import { verifyMetaWebhook } from './methods/webhooks.controller.meta.verify.js';

// ----------------------------------------------------------------------------

export {
  handleFacebookCallback,
  handleLinkedInWebhook,
  handleMetaWebhook,
  verifyLinkedInWebhook,
  verifyMetaWebhook,
};
