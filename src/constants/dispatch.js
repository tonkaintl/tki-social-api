// Tonka Dispatch Content Pipeline Constants

// Entry statuses - tracks lifecycle from idea to publication
export const DISPATCH_STATUS = {
  ARCHIVED: 'archived', // Entry archived
  DRAFT: 'draft', // Has generated content, being refined
  IDEA: 'idea', // Initial seed - title, thesis, tags only
  PUBLISHED: 'published', // Published to audience
};

export const DISPATCH_STATUS_VALUES = Object.values(DISPATCH_STATUS);

// Content categories for Tonka Dispatch editorial focus
export const DISPATCH_CATEGORY = {
  ANALYSIS: 'analysis', // Deep dive analysis
  COMMENTARY: 'commentary', // Opinion pieces
  CULTURE: 'culture', // Cultural observations
  GEOPOLITICS: 'geopolitics', // International affairs
  TECHNOLOGY: 'technology', // Tech developments
  UPDATES: 'updates', // Quick updates/news
};

export const DISPATCH_CATEGORY_VALUES = Object.values(DISPATCH_CATEGORY);

// Generation sources - tracks how content was created
export const GENERATION_SOURCE = {
  AI_GENERATED: 'ai_generated', // AI-generated draft
  HUMAN_WRITTEN: 'human_written', // Manually written
  HYBRID: 'hybrid', // Combination of AI + human
};

export const GENERATION_SOURCE_VALUES = Object.values(GENERATION_SOURCE);

// Media generation status
export const MEDIA_STATUS = {
  FAILED: 'failed', // Generation failed
  GENERATED: 'generated', // Successfully generated
  PENDING: 'pending', // Awaiting generation
};

export const MEDIA_STATUS_VALUES = Object.values(MEDIA_STATUS);
