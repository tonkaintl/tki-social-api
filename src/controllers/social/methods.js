// Methods index for social controllers
import { createSocialCampaign } from './methods/social.controller.campaign.create.js';
import { getCampaignByStockNumber } from './methods/social.controller.campaign.detail.js';
import { fetchCampaigns } from './methods/social.controller.campaign.fetch.js';
import { getCampaignsList } from './methods/social.controller.campaign.list.js';
import {
  addCampaignMedia,
  getCampaignMedia,
  removeCampaignMedia,
} from './methods/social.controller.campaign.media.js';
import { postItemToSocial as postCampaignToSocial } from './methods/social.controller.campaign.post.js';
import { getCampaignPreview } from './methods/social.controller.campaign.preview.js';
import { updateProposedPosts } from './methods/social.controller.campaign.proposed.posts.js';
import { updateCampaign } from './methods/social.controller.campaign.update.js';
import { updateCampaignText } from './methods/social.controller.campaign.update.text.js';
import { deleteMetricoolPost } from './methods/social.controller.metricool.delete.js';
import { createMetricoolDraft } from './methods/social.controller.metricool.draft.js';
import { getAllMetricoolPosts } from './methods/social.controller.metricool.list.js';
import { refreshMetricoolPosts } from './methods/social.controller.metricool.refresh.js';
import { scheduleMetricoolPost } from './methods/social.controller.metricool.schedule.js';

// ----------------------------------------------------------------------------

export {
  addCampaignMedia,
  createMetricoolDraft,
  createSocialCampaign,
  deleteMetricoolPost,
  fetchCampaigns,
  getAllMetricoolPosts,
  getCampaignByStockNumber,
  getCampaignMedia,
  getCampaignPreview,
  getCampaignsList,
  postCampaignToSocial,
  refreshMetricoolPosts,
  removeCampaignMedia,
  scheduleMetricoolPost,
  updateCampaign,
  updateCampaignText,
  updateProposedPosts,
};
