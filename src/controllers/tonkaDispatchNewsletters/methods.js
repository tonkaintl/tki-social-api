import { deleteNewsletter } from './methods/newsletters.controller.delete.js';
import { removeArticle } from './methods/newsletters.controller.delete.remove-article.js';
import { listNewsletters } from './methods/newsletters.controller.get.list.js';
import { getNewsletter } from './methods/newsletters.controller.get.single.js';
import { updateArticle } from './methods/newsletters.controller.patch.update-article.js';
import { updateNewsletter } from './methods/newsletters.controller.patch.update.js';
import { addArticle } from './methods/newsletters.controller.post.add-article.js';
import { createNewsletter } from './methods/newsletters.controller.post.create.js';
import { reorderArticles } from './methods/newsletters.controller.post.reorder.js';

export {
  addArticle,
  createNewsletter,
  deleteNewsletter,
  getNewsletter,
  listNewsletters,
  removeArticle,
  reorderArticles,
  updateArticle,
  updateNewsletter,
};
