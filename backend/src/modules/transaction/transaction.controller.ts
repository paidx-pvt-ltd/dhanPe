import { Request, Response } from 'express';
import { TransactionService } from './transaction.service.js';

export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  getLifecycle = async (req: Request, res: Response): Promise<void> => {
    const result = await this.transactionService.getLifecycle(req.params.id, req.userId!);
    res.json({
      success: true,
      data: result,
    });
  };
}
