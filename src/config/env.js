import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

const defaultTonkaSparkRecipients =
  process.env.TONKA_SPARK_RECIPIENTS ||
  process.env.PRIORITY_QUEUE_ALERT_EMAILS ||
  'tki-agent@tonkaintl.com';

// zod's `.default()` only fires when the value is `undefined` — but dotenv
// loads `KEY=` (empty assignment) as an empty string, which would pass
// through z.string() validation as a valid value and slip past the default.
// Anywhere we want "missing or blank both fall back to the default," use
// this helper instead of plain `.default()`.
const nonEmptyStringWithDefault = defaultVal =>
  z.preprocess(
    v => (typeof v === 'string' && v.length === 0 ? undefined : v),
    z.string().default(defaultVal)
  );

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().optional(),
  // Default Anthropic model. Not currently used by the Writer's Room
  // pipeline (which is OpenAI/Gemini/Perplexity); kept for other services.
  ANTHROPIC_MODEL: nonEmptyStringWithDefault('claude-haiku-4-5'),
  BINDER_API_URL: z.string().url().default('http://localhost:4100'),
  BINDER_INTERNAL_SECRET: z.string().min(1).default('test-binder-secret'),
  CLERK_LONG_LIVED_ADMIN_EMAIL: z
    .string()
    .email()
    .default('tki-agent@tonkaintl.com'),
  CLERK_SECRET_KEY: z.string().optional(),
  DISPATCH_BACKLOG_DAYS: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(365))
    .default('28'),
  DISPATCH_CANDIDATE_EXCLUDE_USED: z
    .string()
    .transform(val => val === 'true')
    .pipe(z.boolean())
    .default(true),
  DISPATCH_CANDIDATE_MAX_AGE_DAYS: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(30))
    .default(5),
  DISPATCH_CANDIDATE_SCORE_MIN: z
    .string()
    .transform(Number)
    .pipe(z.number().min(0).max(100))
    .default(70),
  DISPATCH_MAX_PER_CATEGORY_IN_RESULTS: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1))
    .default(3),
  DISPATCH_MAX_PER_CATEGORY_POOL: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1))
    .default(8),
  DISPATCH_MAX_PER_FEED: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1))
    .default(5),
  DISPATCH_MAX_POOL_TOTAL: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1))
    .default(60),
  DISPATCH_SCORE_PER_CATEGORY: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1))
    .default(8),
  DISPATCH_RANKINGS_TARGET_COUNT: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1))
    .default(10),
  GEMINI_API_KEY: z.string().optional(),
  // Default Gemini model the Writer's Room router falls back to when a
  // prompt's meta.json doesn't specify one. Per-prompt model in meta.json
  // wins — this is only the floor.
  // gemini-2.5-flash is the current cheap/fast tier. gemini-2.0-flash-lite
  // was retired for new users in 2025.
  GEMINI_MODEL: nonEmptyStringWithDefault('gemini-2.5-flash'),
  GMAIL_FROM_EMAIL: z.string().email().optional(),
  GMAIL_FROM_NAME: z.string().default('Tonka Agent'),
  GMAIL_IMPERSONATED_USER: z.string().email().optional(),
  GMAIL_SERVICE_ACCOUNT_FILE: z
    .string()
    .default('./app-notifier-service-account.json'),
  GMAIL_SERVICE_ACCOUNT_JSON_BASE64: z.string().optional(),
  INSTAGRAM_ACCESS_TOKEN: z.string().optional(),
  INSTAGRAM_CLIENT_ID: z.string().optional(),
  INSTAGRAM_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_ACCESS_TOKEN: z.string().optional(),
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_PAGE_ACCESS_TOKEN: z.string().optional(),
  META_PAGE_ID: z.string().optional(),
  META_VERIFY_TOKEN: z.string().default('verify_me'),
  METRICOOL_API_TOKEN: z.string().optional(),
  METRICOOL_BLOG_ID: z.string().optional(),
  METRICOOL_USER_ID: z.string().optional(),
  MONGODB_TKIBINDER_URI: z.string().optional(),
  MONGODB_TKIPORTAL_URI: z.string().optional(),
  MONGODB_TKISOCIAL_URI: z.string().optional(),
  N8N_INTERNAL_SECRET: z.string().min(1).default('test-n8n-secret'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  OPENAI_API_KEY: z.string().optional(),
  // Default OpenAI model the Writer's Room router falls back to when a
  // prompt's meta.json doesn't specify one. Per-prompt model in meta.json
  // wins — this is only the floor.
  OPENAI_MODEL: nonEmptyStringWithDefault('gpt-4o-mini'),
  PERPLEXITY_API_KEY: z.string().optional(),
  // Default Perplexity model the researcher node uses. sonar-pro gives
  // broader coverage with citations; swap to sonar for cheaper/faster runs.
  PERPLEXITY_MODEL: nonEmptyStringWithDefault('sonar-pro'),
  PORT: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(65535))
    .default(8080),
  PORTAL_API_URL: z.string().url().default('http://localhost:4200'),
  PORTAL_INTERNAL_SECRET: z.string().min(1).default('test_portal_secret'),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_BASE_URL: z.string().url().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  THREADS_ACCESS_TOKEN: z.string().optional(),
  THREADS_CLIENT_ID: z.string().optional(),
  THREADS_CLIENT_SECRET: z.string().optional(),
  TIKTOK_BUSINESS_ACCESS_TOKEN: z.string().optional(),
  TIKTOK_BUSINESS_CLIENT_ID: z.string().optional(),
  TIKTOK_BUSINESS_CLIENT_SECRET: z.string().optional(),
  TIKTOK_PERSONAL_ACCESS_TOKEN: z.string().optional(),
  TIKTOK_PERSONAL_CLIENT_ID: z.string().optional(),
  TIKTOK_PERSONAL_CLIENT_SECRET: z.string().optional(),
  TONKA_DISPATCH_RECIPIENTS: z.string().default('stephen@tonkaintl.com'),
  TONKA_SPARK_RECIPIENTS: z.string().default(defaultTonkaSparkRecipients),
  TONKA_SPARK_SEND_EMAIL: z
    .string()
    .transform(val => val === 'true')
    .pipe(z.boolean())
    .default(true),
  // ── Writers Room pipeline (n8n replacement) ──────────────────────────────
  // Kept alphabetical (sort/sort-keys rule). Semantic grouping in comments only.
  //
  // creativity_to_reporter random window. LOWER = wild-creative, HIGHER =
  // dry-reporter. 0–20 keeps the cron output on the creative end.
  WRITERS_ROOM_CREATIVITY_MAX: z
    .string()
    .transform(Number)
    .pipe(z.number().min(0).max(100))
    .default('20'),
  WRITERS_ROOM_CREATIVITY_MIN: z
    .string()
    .transform(Number)
    .pipe(z.number().min(0).max(100))
    .default('0'),
  // Cron feature flag. False in non-prod so we don't burn LLM tokens at boot.
  WRITERS_ROOM_CRON_ENABLED: z
    .string()
    .transform(val => val === 'true')
    .pipe(z.boolean())
    .default('false'),
  // Cron schedule + timezone pulled from env so we can change cadence
  // without a deploy. Default = 07:00 America/Chicago, Monday through Friday.
  WRITERS_ROOM_CRON_SCHEDULE: nonEmptyStringWithDefault('0 7 * * 1-5'),
  WRITERS_ROOM_CRON_TIMEZONE: nonEmptyStringWithDefault('America/Chicago'),
  WRITERS_ROOM_DRAFT_LENGTH: z
    .enum(['short', 'medium', 'long'])
    .default('short'),
  WRITERS_ROOM_ENABLE_RESEARCH: z
    .string()
    .transform(val => val === 'true')
    .pipe(z.boolean())
    .default('true'),
  // fact_to_fiction: HIGHER = more facts (the researcher prompt is the only
  // place the direction is annotated for the LLM: "higher = lean harder on
  // real data"). 100 = pure facts.
  WRITERS_ROOM_FACT_TO_FICTION: z
    .string()
    .transform(Number)
    .pipe(z.number().min(0).max(100))
    .default('100'),
  // ── Per-node model overrides ─────────────────────────────────────────────
  // Every Writers Room LLM node's model, surfaced here so all cost drivers
  // are visible/tunable in one place. Each defaults to the model the node's
  // prompts/<slug>/meta.json historically pinned, so leaving these unset
  // changes nothing. Set one to re-point that node (e.g. drop the brainstorm
  // writers to a cheaper tier). Precedence: these win over meta.json.
  WRITERS_ROOM_MODEL_ART_DIRECTOR: nonEmptyStringWithDefault('gpt-5-mini'),
  WRITERS_ROOM_MODEL_FINAL_EDITOR: nonEmptyStringWithDefault('gpt-4.1-mini'),
  WRITERS_ROOM_MODEL_FUTURE_ARC: nonEmptyStringWithDefault('gpt-5-mini'),
  WRITERS_ROOM_MODEL_HEAD_WRITER: nonEmptyStringWithDefault('gpt-5-mini'),
  WRITERS_ROOM_MODEL_RESEARCHER: nonEmptyStringWithDefault('sonar-pro'),
  WRITERS_ROOM_MODEL_ROUTER: nonEmptyStringWithDefault('gemini-2.5-flash'),
  WRITERS_ROOM_MODEL_SOCIAL_DIRECTOR: nonEmptyStringWithDefault(
    'gpt-4.1-mini-2025-04-14'
  ),
  // OpenAI brainstorm writers (action, comedy, scifi).
  WRITERS_ROOM_MODEL_WRITERS: nonEmptyStringWithDefault('gpt-5-mini'),
  // Gemini brainstorm writers (biographer, documentary, historic).
  WRITERS_ROOM_MODEL_WRITERS_GEMINI:
    nonEmptyStringWithDefault('gemini-2.5-flash'),
  WRITERS_ROOM_OUTPUT_BLOG_POST: z
    .string()
    .transform(val => val === 'true')
    .pipe(z.boolean())
    .default('true'),
  WRITERS_ROOM_OUTPUT_FUTURE_STORY_ARC: z
    .string()
    .transform(val => val === 'true')
    .pipe(z.boolean())
    .default('true'),
  WRITERS_ROOM_OUTPUT_VISUAL_PROMPTS: z
    .string()
    .transform(val => val === 'true')
    .pipe(z.boolean())
    .default('true'),
  WRITERS_ROOM_PROJECT_MODE: nonEmptyStringWithDefault('blog_post'),
  WRITERS_ROOM_TARGET_BRAND: nonEmptyStringWithDefault('tonka_blog'),
  // AI-tells severity threshold. When a final draft's accumulated tell
  // severity score reaches this number, the run is downgraded from
  // `succeeded` to `partial` and skips the spark-post forward + email.
  // Use higher numbers (15+) to be lenient; lower (5) to be strict.
  WRITERS_ROOM_TELLS_THRESHOLD: z
    .string()
    .transform(Number)
    .pipe(z.number().min(0).max(100))
    .default('10'),
  // tone_strictness random window — fully open by default (0–100) so the
  // panel surprises us on every fire.
  WRITERS_ROOM_TONE_MAX: z
    .string()
    .transform(Number)
    .pipe(z.number().min(0).max(100))
    .default('100'),
  WRITERS_ROOM_TONE_MIN: z
    .string()
    .transform(Number)
    .pipe(z.number().min(0).max(100))
    .default('0'),
  YOUTUBE_ACCESS_TOKEN: z.string().optional(),
  YOUTUBE_CLIENT_ID: z.string().optional(),
  YOUTUBE_CLIENT_SECRET: z.string().optional(),
});

let config;

try {
  config = envSchema.parse(process.env);
} catch (error) {
  console.error('❌ Environment validation failed:');
  console.error(
    error.errors
      .map(err => `  - ${err.path.join('.')}: ${err.message}`)
      .join('\n')
  );
  process.exit(1);
}

export { config };
