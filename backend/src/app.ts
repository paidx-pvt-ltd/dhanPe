import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { logger } from './config/logger.js';
import { generalLimiter } from './middleware/rate-limit.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { userRoutes } from './modules/user/user.routes.js';
import { paymentRoutes } from './modules/payment/payment.routes.js';
import { transactionRoutes } from './modules/transaction/transaction.routes.js';
import { webhookRoutes } from './modules/webhook/webhook.routes.js';
import { healthRoutes } from './modules/health/health.routes.js';
import { openApiDocument } from './shared/openapi.js';

const parseWebhookBody = express.raw({
  type: 'application/json',
  verify: (req, _res, buffer) => {
    (req as express.Request).rawBody = buffer.toString('utf8');
  },
});

const app = express();
const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const allowedOrigins = new Set(config.server.corsOrigins);

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Native apps and server-to-server requests usually send no Origin header.
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    if (config.server.env !== 'production' && localhostPattern.test(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
};

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors(corsOptions));
app.use(generalLimiter);
app.use((req, _res, next) => {
  logger.info({ method: req.method, path: req.path }, 'Incoming request');
  next();
});

app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'DhanPe backend is running',
    endpoints: {
      health: '/health',
      readiness: '/health/ready',
      apiHealth: '/api/healthz',
      docs: '/docs/openapi.json',
    },
  });
});

app.get('/docs/openapi.json', (_req, res) => {
  res.json(openApiDocument);
});

app.use('/health', healthRoutes);
app.use('/webhook/cashfree', parseWebhookBody, webhookRoutes);
app.use('/api/webhook/cashfree', parseWebhookBody, webhookRoutes);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/auth', authRoutes);
app.use('/api/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/api/users', userRoutes);
app.use('/transfer', paymentRoutes);
app.use('/api/transfer', paymentRoutes);
app.use('/transaction', transactionRoutes);
app.use('/api/transaction', transactionRoutes);

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/api/healthz', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
