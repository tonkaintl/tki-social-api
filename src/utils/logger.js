/**
 * Lightweight console-based logger.
 * Drop-in replacement for the previous pino logger; preserves the
 * `logger.debug/info/warn/error(msg, meta?)` call shape used across the app.
 */

import { config } from '../config/env.js';

const LEVELS = { debug: 10, error: 40, info: 20, warn: 30 };
const ACTIVE = LEVELS[config.LOG_LEVEL] ?? LEVELS.info;

const ts = () => new Date().toISOString();

const fmt = (level, msg, meta) => {
  const base = `[${ts()}] ${level.toUpperCase()}: ${msg}`;
  if (meta === undefined) return base;
  if (meta instanceof Error) {
    return `${base}\n${meta.stack || meta.message}`;
  }
  if (typeof meta === 'object') {
    try {
      return `${base} ${JSON.stringify(meta)}`;
    } catch {
      return `${base} [unserializable meta]`;
    }
  }
  return `${base} ${meta}`;
};

const log = (level, sink, msg, meta) => {
  if (LEVELS[level] < ACTIVE) return;
  sink(fmt(level, msg, meta));
};

export const logger = {
  debug: (msg, meta) => log('debug', console.log, msg, meta),
  error: (msg, meta) => log('error', console.error, msg, meta),
  info: (msg, meta) => log('info', console.log, msg, meta),
  warn: (msg, meta) => log('warn', console.warn, msg, meta),
};
