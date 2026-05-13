// ----------------------------------------------------------------------------
// Dispatch Daily Ranking — Cron Scheduler
// Wired into server.js after DB connection is established.
// ----------------------------------------------------------------------------

import cron from 'node-cron';

import {
  RANKING_CRON_SCHEDULE,
  RANKING_CRON_TIMEZONE,
} from '../constants/dispatchRanking.js';
import { logger } from '../utils/logger.js';

import { runDailyRanking } from './dispatchRanking.service.js';

let isRunning = false;

async function runWithGuard() {
  if (isRunning) {
    logger.warn(
      '[DispatchRanking] Skipping scheduled run — previous run still in progress'
    );
    return;
  }
  isRunning = true;
  try {
    await runDailyRanking();
  } catch (err) {
    logger.error('[DispatchRanking] Cron run failed', {
      error: err.message,
      stack: err.stack,
    });
  } finally {
    isRunning = false;
  }
}

export function startDispatchRankingCron() {
  if (!cron.validate(RANKING_CRON_SCHEDULE)) {
    logger.error('[DispatchRanking] Invalid cron schedule', {
      schedule: RANKING_CRON_SCHEDULE,
    });
    return;
  }

  cron.schedule(RANKING_CRON_SCHEDULE, runWithGuard, {
    scheduled: true,
    timezone: RANKING_CRON_TIMEZONE,
  });

  logger.info('[DispatchRanking] Cron scheduled', {
    schedule: RANKING_CRON_SCHEDULE,
    timezone: RANKING_CRON_TIMEZONE,
  });
}
