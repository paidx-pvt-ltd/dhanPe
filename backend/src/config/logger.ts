import pino from 'pino';
import { config } from './index';

export const logger = pino({
  level: config.logging.level,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
      singleLine: false,
    },
  },
});

export default logger;
