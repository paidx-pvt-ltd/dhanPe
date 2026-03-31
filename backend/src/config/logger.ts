import pino, { type DestinationStream } from 'pino';
import { config } from './index.js';

const isDev = config.server.env !== 'production';
const transport = pino.transport({
  target: 'pino-pretty',
  options: {
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
  },
}) as DestinationStream;

export const logger = isDev
  ? pino({ level: config.logging.level }, transport)
  : pino({ level: config.logging.level });
