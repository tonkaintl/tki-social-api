// Methods index for webhook controllers
import { handleTonkaDispatchDraft } from './methods/webhooks.controller.dispatch.handle.js';
import { handleFacebookCallback } from './methods/webhooks.controller.facebook.callback.js';
import { handleInstagramWebhook } from './methods/webhooks.controller.instagram.handle.js';
import { verifyInstagramWebhook } from './methods/webhooks.controller.instagram.verify.js';
import { handleLinkedInWebhook } from './methods/webhooks.controller.linkedin.handle.js';
import { verifyLinkedInWebhook } from './methods/webhooks.controller.linkedin.verify.js';
import { handleMetaWebhook } from './methods/webhooks.controller.meta.handle.js';
import { verifyMetaWebhook } from './methods/webhooks.controller.meta.verify.js';
import { handleRedditWebhook } from './methods/webhooks.controller.reddit.handle.js';
import { verifyRedditWebhook } from './methods/webhooks.controller.reddit.verify.js';
import { handleThreadsWebhook } from './methods/webhooks.controller.threads.handle.js';
import { verifyThreadsWebhook } from './methods/webhooks.controller.threads.verify.js';
import { handleTikTokBusinessWebhook } from './methods/webhooks.controller.tiktok_business.handle.js';
import { verifyTikTokBusinessWebhook } from './methods/webhooks.controller.tiktok_business.verify.js';
import { handleTikTokPersonalWebhook } from './methods/webhooks.controller.tiktok_personal.handle.js';
import { verifyTikTokPersonalWebhook } from './methods/webhooks.controller.tiktok_personal.verify.js';
import { handleWritersRoomAds } from './methods/webhooks.controller.writersroom.handle.js';
import { handleXWebhook } from './methods/webhooks.controller.x.handle.js';
import { verifyXWebhook } from './methods/webhooks.controller.x.verify.js';
import { handleYouTubeWebhook } from './methods/webhooks.controller.youtube.handle.js';
import { verifyYouTubeWebhook } from './methods/webhooks.controller.youtube.verify.js';

// ----------------------------------------------------------------------------

export {
  handleFacebookCallback,
  handleInstagramWebhook,
  handleLinkedInWebhook,
  handleMetaWebhook,
  handleRedditWebhook,
  handleThreadsWebhook,
  handleTikTokBusinessWebhook,
  handleTikTokPersonalWebhook,
  handleTonkaDispatchDraft,
  handleWritersRoomAds,
  handleXWebhook,
  handleYouTubeWebhook,
  verifyInstagramWebhook,
  verifyLinkedInWebhook,
  verifyMetaWebhook,
  verifyRedditWebhook,
  verifyThreadsWebhook,
  verifyTikTokBusinessWebhook,
  verifyTikTokPersonalWebhook,
  verifyXWebhook,
  verifyYouTubeWebhook,
};
