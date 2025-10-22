import { removeCampaignMedia } from './methods/campaigns.controller.delete.media.delete.js';
import { getCampaignByStockNumber } from './methods/campaigns.controller.get.detail.js';
import { fetchCampaigns } from './methods/campaigns.controller.get.js';
import { getCampaignMedia } from './methods/campaigns.controller.get.media.js';
import { getCampaignPreview } from './methods/campaigns.controller.get.preview.js';
import { addProposedPosts } from './methods/campaigns.controller.patch.proposed.posts.add.js';
import { deleteProposedPosts } from './methods/campaigns.controller.patch.proposed.posts.delete.js';
// Methods index for campaign controllers
import { createSocialCampaign } from './methods/campaigns.controller.post.create.js';
import { addCampaignMedia } from './methods/campaigns.controller.post.media.add.js';
import { replaceProposedPostMedia } from './methods/campaigns.controller.post.proposed.posts.media.replace.js';
import { updateProposedPosts } from './methods/campaigns.controller.post.proposed.posts.update.js';
import { updateCampaign } from './methods/campaigns.controller.post.update.js';
import { generateRssFeed } from './methods/campaigns.controller.rss.feed.js';

// ----------------------------------------------------------------------------

export {
  addCampaignMedia,
  addProposedPosts,
  createSocialCampaign,
  deleteProposedPosts,
  fetchCampaigns,
  generateRssFeed,
  getCampaignByStockNumber,
  getCampaignMedia,
  getCampaignPreview,
  removeCampaignMedia,
  replaceProposedPostMedia,
  updateCampaign,
  updateProposedPosts,
};
