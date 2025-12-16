// Writers Room tone variants
export const TONE_VARIANT = {
  REPORTER: 'reporter',
  SALESPERSON: 'salesperson',
  STORYTELLER: 'storyteller',
};

export const TONE_VARIANT_VALUES = Object.values(TONE_VARIANT);

// Writers Room ad status
export const AD_STATUS = {
  DRAFT: 'draft',
  FAILED: 'failed',
  SENT: 'sent',
};

export const AD_STATUS_VALUES = Object.values(AD_STATUS);

// Writers Room content status
export const CONTENT_STATUS = {
  DRAFT: 'draft',
  FAILED: 'failed',
  SENT: 'sent',
};

export const CONTENT_STATUS_VALUES = Object.values(CONTENT_STATUS);

// Platform brands
export const PLATFORM_BRANDS = {
  DIESEL_KINGS: 'diesel_kings',
  ECHOLOOP: 'echoloop',
  GENERIC_BRAND: 'generic_brand',
  KETOSIS_LIFESTYLE_PROJECT: 'ketosis_lifestyle_project',
  PURPLE_STAR: 'purple_star',
  THEATER_404: 'theater_404',
  TONKA_BLOG: 'tonka_blog',
  TONKA_NEWSLETTER: 'tonka_newsletter',
};

export const PLATFORM_BRANDS_VALUES = Object.values(PLATFORM_BRANDS);

// Platform modes (drive the system_message for the Head Writer)
export const PLATFORM_MODES = {
  BLOG_POST: 'blog_post',
  FUTURE_STORY_ARC: 'future_story_arc',
  MIXED_ALLEGORY: 'mixed_allegory',
  NOVELLA_CHAPTER: 'novella_chapter',
  REFERENCE_DOC: 'reference_doc',
  SCREENPLAY: 'screenplay',
  SOCIAL_POST: 'social_post',
  STORY_PROMPTS: 'story_prompts',
  STRAIGHT_AD: 'straight_ad',
  VISUAL_PROMPTS: 'visual_prompts',
};

export const PLATFORM_MODES_VALUES = Object.values(PLATFORM_MODES);

// Writing genres
export const WRITING_GENRES = {
  ACTION: 'action',
  BIOGRAPHY: 'biography',
  COMEDY: 'comedy',
  DOCUMENTARY: 'documentary',
  HISTORIC: 'historic',
  RESEARCH: 'research',
  SCIFI: 'scifi',
};

export const WRITING_GENRES_VALUES = Object.values(WRITING_GENRES);

// Schema field names (for consistent referencing)
export const WRITERS_ROOM_FIELDS = {
  AD_ID: 'ad_id',
  CONDITION: 'condition',
  COPY: 'copy',
  CREATED_AT: 'created_at',
  DATE: 'date',
  EMAIL_SENT_AT: 'email_sent_at',
  END_PHRASE: 'end_phrase',
  EXW: 'exw',
  HEADLINE: 'headline',
  HOOK: 'hook',
  IS_PASS: 'is_pass',
  ISSUES: 'issues',
  ISSUES_GUARD: 'issues_guard',
  NOTIFIER_EMAIL: 'notifier_email',
  PHOTOS: 'photos',
  PLATFORM_TARGETS: 'platform_targets',
  PRICE_USD: 'price_usd',
  RULES: 'rules',
  SPECS: 'specs',
  STATUS: 'status',
  STOCK_NUMBER: 'stock_number',
  SUBJECT: 'subject',
  TAGLINE: 'tagline',
  TONE_VARIANT: 'tone_variant',
  UPDATED_AT: 'updated_at',
};
