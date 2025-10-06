import pino from 'pino';

import { config } from '../config/env.js';

const logger = pino({
  formatters: {
    level: label => ({
      level: label,
    }),
  },
  level: config.LOG_LEVEL,
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  transport:
    config.NODE_ENV === 'development'
      ? {
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'yyyy-mm-dd HH:MM:ss',
          },
          target: 'pino-pretty',
        }
      : undefined,
});

export { logger };
