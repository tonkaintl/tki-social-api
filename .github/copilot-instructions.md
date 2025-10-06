# TKI Social API - Copilot Instructions

This is a production-ready Node.js service that exposes a stable internal API for posting and fetching social content while hiding provider differences behind adapters.

## Project Structure

- Modular adapters for Meta, LinkedIn, X, and Reddit
- Express.js server with middleware for auth, rate limiting, logging
- Internal authentication via x-internal-secret header
- Comprehensive error handling and logging with pino
- ESLint + Prettier + perfectionist plugin for code quality

## Development Guidelines

- Use JavaScript (not TypeScript)
- Follow the established adapter pattern for new social providers
- All external API calls should include retries and rate limiting
- Never call Twilio directly - use Binder service endpoints only
- Maintain same-shaped interfaces across all adapters

## Completed Tasks

✅ Project scaffolded with complete directory structure
✅ Package.json with all dependencies configured
✅ ESLint and Prettier configuration
✅ Environment configuration and validation
✅ Express server with middleware setup
✅ Meta adapter implementation (functional)
✅ LinkedIn, X, Reddit adapters (stubbed)
✅ Binder service integration
✅ Test setup with Vitest
