import { Router } from 'express';
import { prisma } from '../../db/prisma.js';
import { asHandler } from '../../shared/http.js';
import { fintechRuntime } from '../fintech/fintech.runtime.js';
import { DiditClient } from './didit.client.js';
import { DiditController } from './didit.controller.js';
import { DiditRepository } from './didit.repository.js';
import { DiditService } from './didit.service.js';

const diditRepository = new DiditRepository(prisma);
const diditClient = new DiditClient();
const diditService = new DiditService(diditRepository, diditClient, prisma);
const diditController = new DiditController(diditService, (job) =>
  fintechRuntime.dispatcher.enqueueWebhook(job)
);

export const diditWebhookRoutes = Router();

diditWebhookRoutes.post('/', asHandler(diditController.webhook));
