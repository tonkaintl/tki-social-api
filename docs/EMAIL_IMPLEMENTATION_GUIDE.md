# Email Implementation Guide - TKI Social API

This document explains how email sending is implemented in TKI Social API using Gmail delegated sending with a Google service account.

## Overview

The application sends email through Gmail SMTP using OAuth2 access tokens minted from a service account, with domain-wide delegation to an impersonated mailbox.

## Key Components

### 1. Email Service

File: `src/services/email.service.js`

Responsibilities:

- Load service account credentials from disk
- Generate delegated OAuth2 access token with `google-auth-library`
- Send HTML email through Gmail via `nodemailer`

### 2. Required Environment Variables

```bash
# Gmail delegated sender
GMAIL_IMPERSONATED_USER=tki-agent@tonkaintl.com
GMAIL_FROM_EMAIL=tki-agent@tonkaintl.com
GMAIL_FROM_NAME=Tonka Agent
GMAIL_SERVICE_ACCOUNT_FILE=./app-notifier-service-account.json

# Optional recipient list (comma-separated)
TONKA_SPARK_RECIPIENTS=recipient1@example.com,recipient2@example.com

# Optional legacy fallback key (still supported)
# PRIORITY_QUEUE_ALERT_EMAILS=recipient1@example.com,recipient2@example.com
```

Notes:

- `GMAIL_IMPERSONATED_USER` must be a mailbox in your Google Workspace domain.
- `GMAIL_SERVICE_ACCOUNT_FILE` must point to a valid service-account JSON file.

### 3. Dependencies

```json
{
  "google-auth-library": "^10.6.2",
  "nodemailer": "^8.0.4"
}
```

## Runtime Flow

1. `emailService.sendEmail(...)` is called.
2. Service account JSON is read from `GMAIL_SERVICE_ACCOUNT_FILE`.
3. A delegated JWT is created with scope `https://mail.google.com/` and subject `GMAIL_IMPERSONATED_USER`.
4. Access token is exchanged and used by `nodemailer` OAuth2 auth.
5. Email is sent using `from` as `GMAIL_FROM_NAME <GMAIL_FROM_EMAIL>`.

## Sending Email Example

```javascript
import { emailService } from './src/services/email.service.js';

await emailService.sendEmail({
  to: ['recipient1@example.com', 'recipient2@example.com'],
  subject: 'Your Subject',
  htmlBody: '<h1>Hello</h1><p>Your content</p>',
});
```

## Health Check

The service health check validates delegated token generation.

```javascript
const health = await emailService.healthCheck();
// Example:
// {
//   status: 'healthy',
//   configured: true,
//   senderEmail: 'tki-agent@tonkaintl.com'
// }
```

## Common Issues

### 1. Failed to load Gmail service account credentials

Cause:

- Missing or incorrect `GMAIL_SERVICE_ACCOUNT_FILE`
- Invalid JSON file format

Fix:

- Verify file exists at the configured path
- Verify JSON contains `client_email` and `private_key`

### 2. Failed to obtain email service access token

Cause:

- Domain-wide delegation not configured
- Service account not authorized for Gmail scopes
- Invalid impersonated user

Fix:

- Ensure Google Workspace admin configured domain-wide delegation for the service account
- Authorize Gmail scope: `https://mail.google.com/`
- Ensure `GMAIL_IMPERSONATED_USER` is a valid mailbox in the domain

### 3. Failed to send email

Cause:

- Recipient addresses invalid
- Gmail policy or permission issue
- Token expired or denied

Fix:

- Validate recipient formatting
- Confirm delegated permissions are active
- Review application logs for exact SMTP/OAuth error

## Railway Variable Sync

`scripts/set-railway-vars.ps1` includes Gmail keys:

- `GMAIL_IMPERSONATED_USER`
- `GMAIL_FROM_EMAIL`
- `GMAIL_FROM_NAME`
- `GMAIL_SERVICE_ACCOUNT_FILE`

## Legacy Notes

- Office 365 / Microsoft Graph email keys have been removed from runtime email sending logic.
- `TONKA_SPARK_RECIPIENTS` now falls back to `PRIORITY_QUEUE_ALERT_EMAILS` when needed during migration.
