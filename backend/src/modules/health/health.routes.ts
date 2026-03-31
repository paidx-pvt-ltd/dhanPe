import { Router } from 'express';
import { prisma } from '../../db/prisma.js';

export const healthRoutes = Router();

healthRoutes.get('/', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

healthRoutes.get('/ready', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({
    ready: true,
    timestamp: new Date().toISOString(),
  });
});
