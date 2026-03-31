import pino from 'pino';
import { config } from './index.js';

const isDev = config.server.env !== 'production';

export const logger = isDev
  ? pino(
      { level: config.logging.level },
      pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      })
    )
  : pino({ level: config.logging.level });
