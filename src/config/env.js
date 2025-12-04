import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

const envSchema = z.object({
  AZURE_API_AUDIENCE: z.string().optional(),
  AZURE_CLIENT_ID: z.string().optional(),
  AZURE_CLIENT_SECRET: z.string().optional(),
  AZURE_EMAIL_CLIENT_ID: z.string().optional(),
  AZURE_EMAIL_SENDER: z.string().email().optional(),
  AZURE_GRAPH_API: z.string().url().default('https://graph.microsoft.com/v1.0'),
  AZURE_TENANT_ID: z.string().optional(),
  BINDER_API_URL: z.string().url().default('http://localhost:4100'),
  BINDER_INTERNAL_SECRET: z.string().min(1).default('test-binder-secret'),
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
  METRICOOL_TEAM_ID: z.string().optional(),
  METRICOOL_USER_ID: z.string().optional(),
  MONGODB_TKIBINDER_URI: z.string().optional(),
  MONGODB_TKIPORTAL_URI: z.string().optional(),
  MONGODB_TKISOCIAL_URI: z.string().optional(),
  N8N_INTERNAL_SECRET: z.string().min(1).default('test-n8n-secret'),
  N8N_TONKA_DISPATCH_WEBHOOK_URL: z.string().url().optional(),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z
    .string()
    .transform(Number)
    .pipe(z.number().min(1).max(65535))
    .default(8080),
  PORTAL_API_URL: z.string().url().default('http://localhost:4200'),
  PORTAL_INTERNAL_SECRET: z.string().min(1).default('test_portal_secret'),
  THREADS_ACCESS_TOKEN: z.string().optional(),
  THREADS_CLIENT_ID: z.string().optional(),
  THREADS_CLIENT_SECRET: z.string().optional(),
  TIKTOK_BUSINESS_ACCESS_TOKEN: z.string().optional(),
  TIKTOK_BUSINESS_CLIENT_ID: z.string().optional(),
  TIKTOK_BUSINESS_CLIENT_SECRET: z.string().optional(),
  TIKTOK_PERSONAL_ACCESS_TOKEN: z.string().optional(),
  TIKTOK_PERSONAL_CLIENT_ID: z.string().optional(),
  TIKTOK_PERSONAL_CLIENT_SECRET: z.string().optional(),
  X_ACCESS_TOKEN: z.string().optional(),
  X_CLIENT_ID: z.string().optional(),
  X_CLIENT_SECRET: z.string().optional(),
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
