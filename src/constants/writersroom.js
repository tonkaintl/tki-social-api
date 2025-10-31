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
