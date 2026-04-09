import { Request, Response } from 'express';
import { TransactionService } from './transaction.service.js';

export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  listSummaries = async (req: Request, res: Response): Promise<void> => {
    const limit = Number(req.query.limit ?? 12);
    const result = await this.transactionService.listSummaries(req.userId!, limit);
    res.json({
      success: true,
      data: result,
    });
  };

  getLifecycle = async (req: Request, res: Response): Promise<void> => {
    const result = await this.transactionService.getLifecycle(req.params.id, req.userId!);
    res.json({
      success: true,
      data: result,
    });
  };
}
