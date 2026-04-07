import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { authenticate } from '../../middleware/auth.js';
import { asHandler } from '../../shared/http.js';
import { DiditClient } from './didit.client.js';
import { DiditController } from './didit.controller.js';
import { DiditRepository } from './didit.repository.js';
import { DiditService } from './didit.service.js';

const diditRepository = new DiditRepository(prisma);
const diditClient = new DiditClient();
const diditService = new DiditService(diditRepository, diditClient, prisma);
const diditController = new DiditController(diditService);

export const diditRoutes = Router();

diditRoutes.post('/session', authenticate, asHandler(diditController.createSession));
diditRoutes.post('/session/:sessionId/sync', authenticate, asHandler(diditController.syncSession));
