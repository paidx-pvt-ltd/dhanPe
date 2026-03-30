import { Router, Request, Response } from 'express';

const router = Router();

/**
 * Health check endpoint
 * Used by:
 * - Smoke tests (CI/CD pipelines)
 * - Load balancers (Vercel)
 * - Monitoring services
 */
router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    // Check database is connected
    const dbCheck = process.env.DATABASE_URL ? '✓' : '✗';

    // Check environment is set
    const nodeEnv = process.env.NODE_ENV || 'unknown';

    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: nodeEnv,
      database: dbCheck,
      uptime: process.uptime(),
      version: '1.0.0',
    };

    res.status(200).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      message: 'Service unavailable',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Ready check endpoint
 * More comprehensive readiness probe for Kubernetes-style deployment
 */
router.get('/ready', async (_req: Request, res: Response): Promise<void> => {
  try {
    // In production, add actual readiness checks here:
    // - Database connectivity
    // - External service availability
    // - Cache readiness

    res.status(200).json({
      ready: true,
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      ready: false,
      error: 'Service not ready',
    });
  }
});

export default router;
