// Methods index for social controllers
import { createSocialCampaign } from './methods/social.controller.campaign.create.js';
import { getCampaignByStockNumber } from './methods/social.controller.campaign.detail.js';
import { fetchCampaigns } from './methods/social.controller.campaign.fetch.js';
import { addCampaignMedia } from './methods/social.controller.campaign.media.add.js';
import { removeCampaignMedia } from './methods/social.controller.campaign.media.delete.js';
import { getCampaignMedia } from './methods/social.controller.campaign.media.get.js';
import { postItemToSocial as postCampaignToSocial } from './methods/social.controller.campaign.post.js';
import { getCampaignPreview } from './methods/social.controller.campaign.preview.js';
import { addProposedPosts } from './methods/social.controller.campaign.proposed.posts.add.js';
import { deleteProposedPosts } from './methods/social.controller.campaign.proposed.posts.delete.js';
import { addProposedPostMedia } from './methods/social.controller.campaign.proposed.posts.media.add.js';
import { removeProposedPostMedia } from './methods/social.controller.campaign.proposed.posts.media.delete.js';
import { replaceProposedPostMedia } from './methods/social.controller.campaign.proposed.posts.media.replace.js';
import { updateProposedPosts } from './methods/social.controller.campaign.proposed.posts.update.js';
import { updateCampaign } from './methods/social.controller.campaign.update.js';
import { deleteMetricoolPost } from './methods/social.controller.metricool.delete.js';
import { createMetricoolDraft } from './methods/social.controller.metricool.draft.js';
import { getAllMetricoolPosts } from './methods/social.controller.metricool.list.js';
import { refreshMetricoolPosts } from './methods/social.controller.metricool.refresh.js';
import { scheduleMetricoolPost } from './methods/social.controller.metricool.schedule.js';

// ----------------------------------------------------------------------------

export {
  addCampaignMedia,
  addProposedPostMedia,
  addProposedPosts,
  createMetricoolDraft,
  createSocialCampaign,
  deleteMetricoolPost,
  deleteProposedPosts,
  fetchCampaigns,
  getAllMetricoolPosts,
  getCampaignByStockNumber,
  getCampaignMedia,
  getCampaignPreview,
  postCampaignToSocial,
  refreshMetricoolPosts,
  removeCampaignMedia,
  removeProposedPostMedia,
  replaceProposedPostMedia,
  scheduleMetricoolPost,
  updateCampaign,
  updateProposedPosts,
};
