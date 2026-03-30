import pino from 'pino';
import { config } from './index';

const isDev = process.env.NODE_ENV !== 'production';

const pinoConfig = {
  level: config.logging.level,
};

export const logger = isDev
  ? pino(
      pinoConfig,
      pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          singleLine: false,
        },
      })
    )
  : pino(pinoConfig);

export default logger;
