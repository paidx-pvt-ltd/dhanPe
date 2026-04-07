import { Request, Response } from 'express';
import { DiditService } from './didit.service.js';

export class DiditController {
  constructor(private readonly diditService: DiditService) {}

  createSession = async (req: Request, res: Response): Promise<void> => {
    const session = await this.diditService.createSession(req.userId!);
    res.status(201).json({
      success: true,
      data: session,
    });
  };

  syncSession = async (req: Request, res: Response): Promise<void> => {
    const result = await this.diditService.syncSession(req.userId!, String(req.params.sessionId));
    res.json({
      success: true,
      data: result,
    });
  };

  webhook = async (req: Request, res: Response): Promise<void> => {
    const headers = {
      'x-signature-v2': req.header('x-signature-v2') ?? undefined,
      'x-signature-simple': req.header('x-signature-simple') ?? undefined,
      'x-timestamp': req.header('x-timestamp') ?? undefined,
      'x-didit-test-webhook': req.header('x-didit-test-webhook') ?? undefined,
    };
    const payload = req.body as {
      session_id?: string;
      status?: string;
      timestamp?: number | string;
      vendor_data?: string;
      workflow_id?: string;
      webhook_type?: string;
    };

    this.diditService.verifyWebhookSignature(payload, headers);
    if (this.diditService.isTestWebhook(headers, payload)) {
      res.json({ success: true, test: true });
      return;
    }
    await this.diditService.processWebhook(payload);

    res.json({ success: true });
  };
}
