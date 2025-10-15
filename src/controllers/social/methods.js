// Methods index for social controllers
import { createSocialCampaign } from './methods/social.controller.campaign.create.js';
import { getCampaignByStockNumber } from './methods/social.controller.campaign.detail.js';
import { getCampaignsList } from './methods/social.controller.campaign.list.js';
import { getCampaignPreview } from './methods/social.controller.campaign.preview.js';
import { updateCampaign } from './methods/social.controller.campaign.update.js';
import { createSocialComment } from './methods/social.controller.comment.create.js';
import { fetchSocialPosts } from './methods/social.controller.fetch.posts.js';
import { createSocialPost } from './methods/social.controller.post.create.js';
import { postItemToSocial } from './methods/social.controller.post.item.js';

// ----------------------------------------------------------------------------

export {
  createSocialCampaign,
  createSocialComment,
  createSocialPost,
  fetchSocialPosts,
  getCampaignByStockNumber,
  getCampaignPreview,
  getCampaignsList,
  postItemToSocial,
  updateCampaign,
};
