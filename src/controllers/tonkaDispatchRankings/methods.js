import { listCatalogArticles } from './methods/rankings.controller.get.catalog-articles.js';
import { listCatalogCategories } from './methods/rankings.controller.get.catalog-categories.js';
import { listRankings } from './methods/rankings.controller.get.list.js';
import {
  enrichRankingById,
  enrichRankingsBatch,
} from './methods/rankings.controller.post.enrich.js';
import { testDispatchEmail } from './methods/rankings.controller.post.test-email.js';

export {
  enrichRankingById,
  enrichRankingsBatch,
  listCatalogArticles,
  listCatalogCategories,
  listRankings,
  testDispatchEmail,
};
