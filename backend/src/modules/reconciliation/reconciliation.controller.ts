import { Request, Response } from 'express';
import { RunReconciliationDto, resolveReconciliationItemSchema } from './reconciliation.schemas.js';
import { ReconciliationService } from './reconciliation.service.js';

export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  run = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as RunReconciliationDto;
    const result = await this.reconciliationService.run(body.scope, req.userId!);
    res.status(201).json({
      success: true,
      data: result,
    });
  };

  getRun = async (req: Request, res: Response): Promise<void> => {
    const result = await this.reconciliationService.getRun(req.params.runId);
    res.json({
      success: true,
      data: result,
    });
  };

  listItems = async (req: Request, res: Response): Promise<void> => {
    const result = await this.reconciliationService.listItems({
      status: req.query.status as 'OPEN' | 'RESOLVED' | undefined,
      scope: req.query.scope as 'PAYMENT' | 'PAYOUT' | 'REFUND' | undefined,
    });
    res.json({
      success: true,
      data: result,
    });
  };

  resolveItem = async (req: Request, res: Response): Promise<void> => {
    const body = resolveReconciliationItemSchema.parse(req.body);
    const result = await this.reconciliationService.resolveItem(
      req.params.itemId,
      req.userId!,
      body.resolutionNote
    );
    res.json({
      success: true,
      data: result,
    });
  };
}
