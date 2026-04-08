import { Request, Response } from 'express';
import { PayoutService } from './payout.service.js';

export class PayoutController {
  constructor(private readonly payoutService: PayoutService) {}

  sync = async (req: Request, res: Response): Promise<void> => {
    const status = await this.payoutService.syncTransferStatus(req.params.transactionId);
    res.json({
      success: true,
      data: {
        payoutStatus: status,
      },
    });
  };
}
