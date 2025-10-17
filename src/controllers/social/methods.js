// Methods index for social controllers
import { createSocialCampaign } from './methods/social.controller.campaign.create.js';
import { getCampaignByStockNumber } from './methods/social.controller.campaign.detail.js';
import { getCampaignsList } from './methods/social.controller.campaign.list.js';
import { updatePlatformContent } from './methods/social.controller.campaign.platform-content.js';
import { getCampaignPreview } from './methods/social.controller.campaign.preview.js';
import { updateCampaign } from './methods/social.controller.campaign.update.js';
import { createSocialComment } from './methods/social.controller.comment.create.js';
import { fetchSocialPosts } from './methods/social.controller.fetch.posts.js';
import {
  addCampaignMedia,
  getCampaignMedia,
  removeCampaignMedia,
} from './methods/social.controller.media.js';
import { deleteMetricoolPost } from './methods/social.controller.metricool.delete.js';
import { createMetricoolDraft } from './methods/social.controller.metricool.draft.js';
import { getAllMetricoolPosts } from './methods/social.controller.metricool.list.js';
import { refreshMetricoolPosts } from './methods/social.controller.metricool.refresh.js';
import { scheduleMetricoolPost } from './methods/social.controller.metricool.schedule.js';
import { createSocialPost } from './methods/social.controller.post.create.js';
import { postItemToSocial } from './methods/social.controller.post.item.js';

// ----------------------------------------------------------------------------

export {
  addCampaignMedia,
  createMetricoolDraft,
  createSocialCampaign,
  createSocialComment,
  createSocialPost,
  deleteMetricoolPost,
  fetchSocialPosts,
  getAllMetricoolPosts,
  getCampaignByStockNumber,
  getCampaignMedia,
  getCampaignPreview,
  getCampaignsList,
  postItemToSocial,
  refreshMetricoolPosts,
  removeCampaignMedia,
  scheduleMetricoolPost,
  updateCampaign,
  updatePlatformContent,
};
