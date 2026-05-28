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
// NOTE: keep in sync with PROJECT_MODE_CONFIGS in
// services/writersRoom/profiles/projectModes.js — the Writer's Room
// pipeline accepts any key from there, and the TonkaSparkPosts mongoose
// model validates against this enum. A drift between the two causes
// "is not a valid enum value" errors on spark-post save (the pipeline
// runs but the production forward fails).
export const PLATFORM_MODES = {
  BLOG_POST: 'blog_post',
  DEFAULT_MODE: 'default_mode',
  DISPATCH_ESSAY: 'dispatch_essay',
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

// ----------------------------------------------------------------------------
// Writers Room PIPELINE (script-only port of the n8n "Writer's Room" workflow)
// ----------------------------------------------------------------------------

// Pipeline node identifiers — used by POST /api/writers-room/test-node to
// run a single node in isolation. Each value matches an export in
// src/services/writersRoom/nodes/.
export const PIPELINE_NODE = {
  AI_TELLS_CHECK: 'aiTellsCheck',
  ART_DIRECTOR: 'artDirector',
  BUILD_WRITER_PANEL: 'buildWriterPanel',
  DRAFT_CONTEXT: 'draftContext',
  FINAL_DISPATCH: 'finalDispatch',
  FINAL_EDITOR: 'finalEditor',
  FUTURE_STORY_ARC: 'futureStoryArc',
  GENRE_TONE_ROUTER: 'genreToneRouter',
  HEAD_WRITER: 'headWriter',
  INPUT_NORMALIZER: 'inputNormalizer',
  // After socialMediaDirector produces title_variations, randomly promote
  // one into final_draft.title so the spark-post downstream consumer sees
  // a fresh variation per run instead of always the editor's first pick.
  PICK_TITLE: 'pickTitle',
  PROJECT_MODE: 'projectMode',
  RESEARCHER: 'researcher',
  SOCIAL_MEDIA_DIRECTOR: 'socialMediaDirector',
  WRITER_ACTION: 'writerAction',
  WRITER_BIOGRAPHER: 'writerBiographer',
  WRITER_COMEDY: 'writerComedy',
  WRITER_DOCUMENTARY: 'writerDocumentary',
  WRITER_HISTORIC: 'writerHistoric',
  WRITER_SCIFI: 'writerSciFi',
};

export const PIPELINE_NODE_VALUES = Object.values(PIPELINE_NODE);

// LLM provider names — used by the prompt registry and client router.
export const LLM_PROVIDER = {
  ANTHROPIC: 'anthropic',
  GEMINI: 'gemini',
  OPENAI: 'openai',
  OPENAI_AGENT: 'openai-agent',
  PERPLEXITY: 'perplexity',
};

export const LLM_PROVIDER_VALUES = Object.values(LLM_PROVIDER);

// NOTE: Per-provider default models live in config/env.js — OPENAI_MODEL,
// GEMINI_MODEL, PERPLEXITY_MODEL, ANTHROPIC_MODEL. The LLM router uses them
// as the fallback when a prompt's meta.json doesn't pin a model. Per-prompt
// meta.json values always win for the nodes that want specialization.

// Draft lengths recognized by the Input Normalizer + Head Writer.
export const DRAFT_LENGTH = {
  LONG: 'long',
  MEDIUM: 'medium',
  SHORT: 'short',
};

export const DRAFT_LENGTH_VALUES = Object.values(DRAFT_LENGTH);

// Input defaults — mirror the n8n "Input Normalizer" code node.
export const PIPELINE_INPUT_DEFAULTS = {
  draft_length: DRAFT_LENGTH.SHORT,
  enable_research: false,
  fact_to_fiction: 50,
  output_blog_post: true,
  output_future_story_arc: false,
  output_reference_doc: false,
  output_visual_prompts: false,
  project_mode: 'blog_post',
  target_brand: 'tonka_blog',
  tone_strictness: 50,
};

// Cron — runs at 06:00 and 14:00 America/Chicago, Monday–Friday.
// node-cron format: minute hour day-of-month month day-of-week
export const PIPELINE_CRON_SCHEDULE = '0 6,14 * * 1-5';
export const PIPELINE_CRON_TIMEZONE = 'America/Chicago';

// Idea rotation — Mongo settings doc that tracks which SEASON-01-IDEAS.md
// entry was last used, so the cron rotates one-by-one through the list.
export const IDEA_ROTATION = {
  CURSOR_KEY: 'season01_idea_cursor',
  FILENAME: 'SEASON-01-IDEAS.md',
  // Lines 1-2 are the header ("Appendix: ..." / "Season 1: Master List...").
  // Lines after that include section dividers ("Selling & Vendors",
  // "Buyers & Transparency", "Tonka Voice, Culture & Industry Insight").
  // We filter those out at read time using this set.
  SECTION_HEADERS: new Set([
    'Appendix: TKI Dispatch',
    'Season 1: Master List of 75 Post Ideas',
    'Selling & Vendors',
    'Buyers & Transparency',
    'Tonka Voice, Culture & Industry Insight',
  ]),
};

// Pipeline error codes.
export const PIPELINE_ERROR_CODE = {
  IDEA_NOT_FOUND: 'IDEA_NOT_FOUND',
  IDEA_ROTATION_EMPTY: 'IDEA_ROTATION_EMPTY',
  IDEA_ROTATION_READ_FAILED: 'IDEA_ROTATION_READ_FAILED',
  IDEAS_CRUD_FAILED: 'IDEAS_CRUD_FAILED',
  IDEAS_DUPLICATE: 'IDEAS_DUPLICATE',
  IDEAS_LIST_FAILED: 'IDEAS_LIST_FAILED',
  IDEAS_SEASON_EXHAUSTED: 'IDEAS_SEASON_EXHAUSTED',
  INVALID_IDEA_ID: 'INVALID_IDEA_ID',
  INVALID_NODE_NAME: 'INVALID_NODE_NAME',
  INVALID_RUN_ID: 'INVALID_RUN_ID',
  LLM_CALL_FAILED: 'LLM_CALL_FAILED',
  MISSING_API_KEY: 'MISSING_API_KEY',
  MISSING_STORY_SEED: 'MISSING_STORY_SEED',
  NODE_NOT_IMPLEMENTED: 'NODE_NOT_IMPLEMENTED',
  PIPELINE_FAILED: 'PIPELINE_FAILED',
  PROMPT_NOT_FOUND: 'PROMPT_NOT_FOUND',
  RESEARCH_FAILED: 'RESEARCH_FAILED',
  RUN_LIST_FAILED: 'RUN_LIST_FAILED',
  RUN_NOT_FOUND: 'RUN_NOT_FOUND',
};

// ----------------------------------------------------------------------------
// Writers Room idea bank — replaces SEASON-01-IDEAS.md as the rotation source.
// Frontend manages this collection via /api/writers-room/ideas CRUD; the cron
// picks the next unused idea by (season, position) each fire.
// ----------------------------------------------------------------------------

// Mirrors the frontend CATEGORIES list. Stored on each idea, surfaced to the
// LLM only when the project_mode profile needs it (otherwise editorial-only).
export const IDEA_CATEGORY = {
  BUYER: 'buyer',
  COMMENTARY: 'commentary',
  CULTURE: 'culture',
  OTHER: 'other',
  VENDOR: 'vendor',
};

export const IDEA_CATEGORY_VALUES = Object.values(IDEA_CATEGORY);

export const IDEA_STATUS = {
  // Picked by the cron, pipeline currently running. Still selectable by the
  // selector if the run document is stale (use the cron concurrency guard).
  IN_PROGRESS: 'in_progress',
  // Removed from rotation but kept for history. Soft-delete target.
  RETIRED: 'retired',
  // Hasn't run yet (or has been manually reset). Free for the next cron
  // fire to pick. Named "unused" instead of "pending" because "pending"
  // implies queued/scheduled — these ideas aren't queued, they're just
  // sitting in the bank waiting for their turn.
  UNUSED: 'unused',
  // Pipeline completed (regardless of failed/partial/succeeded run status).
  // The cron skips USED ideas until the season is fully exhausted.
  USED: 'used',
};

export const IDEA_STATUS_VALUES = Object.values(IDEA_STATUS);

// Default season label new ideas get when one isn't supplied. The frontend
// can override per-create, and the seed script stamps "season_01".
export const IDEA_DEFAULT_SEASON = 'season_01';

export const IDEAS_PAGINATION = {
  DEFAULT_LIMIT: 100,
  DEFAULT_PAGE: 1,
  MAX_LIMIT: 500,
};

// ----------------------------------------------------------------------------
// Writers Room run persistence — every pipeline run is logged to the
// writers_room_runs collection so failed/partial runs can be mined for gems
// (good writer notes, useful research findings, etc.) and successful runs
// have a queryable archive.
// ----------------------------------------------------------------------------

export const RUN_STATUS = {
  // Pipeline crashed before producing a final draft. Snapshots may have
  // partial data (writer notes, research) worth mining.
  FAILED: 'failed',
  // Pipeline finished but one or more LLM nodes failed/short-circuited
  // (e.g. research failed but draft still produced). The final payload
  // exists and was forwarded to tonka-spark-post.
  PARTIAL: 'partial',
  // In-flight — the orchestrator has created the record but hasn't
  // finalized yet. If you see one of these stuck for hours, the server
  // probably crashed mid-run.
  RUNNING: 'running',
  // Full success, payload forwarded to tonka-spark-post.
  SUCCEEDED: 'succeeded',
};

export const RUN_STATUS_VALUES = Object.values(RUN_STATUS);

export const RUN_TRIGGER = {
  API: 'api',
  CRON: 'cron',
  TEST_NODE: 'test-node',
};

export const RUN_TRIGGER_VALUES = Object.values(RUN_TRIGGER);

// Runs older than this get TTL-purged. Failed runs are the high-value
// archive for mining gems, but they aren't useful forever — 90 days is
// enough to spot trends without bloating the collection.
export const RUN_RETENTION_DAYS = 90;

// Pagination caps for GET /runs.
export const RUN_PAGINATION = {
  DEFAULT_LIMIT: 25,
  DEFAULT_PAGE: 1,
  MAX_LIMIT: 100,
};

// ----------------------------------------------------------------------------
// AI-tells admin — user-managed dictionary of patterns that flag AI slop
// (em-dash inspirational closes, "long haul", semicolon-metaphors) or
// brand-forbidden words ("yellow iron", "fluff"). Runs as a pipeline step
// after finalEditor; tells_count >= threshold downgrades the run to
// `partial` and skips the spark-post forward.
// ----------------------------------------------------------------------------

export const TELL_CATEGORY = {
  // Generic LLM giveaways (em-dash pivots, semicolon-metaphors, etc.)
  AI_TELL: 'ai_tell',
  // Words a real broker / Tonka buyer never says
  BRAND_FORBIDDEN: 'brand_forbidden',
  // Response preamble bleed-through ("Here is the JSON", "Certainly!")
  PREAMBLE: 'preamble',
  // Writer-talking-about-writing meta language ("fluff", "long-form content")
  WEASEL_WORDS: 'weasel_words',
};

export const TELL_CATEGORY_VALUES = Object.values(TELL_CATEGORY);

export const TELL_PATTERN_TYPE = {
  REGEX: 'regex',
  SUBSTRING: 'substring',
};

export const TELL_PATTERN_TYPE_VALUES = Object.values(TELL_PATTERN_TYPE);

export const TELL_SEVERITY = {
  HIGH: 'high', // 5 points — definite slop ("a buyer I knew")
  LOW: 'low', //  1 point — borderline ("yellow iron")
  MEDIUM: 'medium', // 3 points — strong tell ("the long haul")
};

export const TELL_SEVERITY_VALUES = Object.values(TELL_SEVERITY);

export const TELL_SEVERITY_SCORE = {
  high: 5,
  low: 1,
  medium: 3,
};

// Default threshold — when the sum of severity scores for found tells
// reaches this, the run is downgraded to `partial` and not forwarded to
// tonka_spark_posts. Override via WRITERS_ROOM_TELLS_THRESHOLD.
export const TELL_DEFAULT_THRESHOLD = 10;

export const TELL_PAGINATION = {
  DEFAULT_LIMIT: 50,
  DEFAULT_PAGE: 1,
  MAX_LIMIT: 200,
};

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
