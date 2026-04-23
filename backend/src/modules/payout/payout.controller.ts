import { Request, Response } from 'express';

export class PayoutController {
  constructor(private readonly schedulePayoutSync: (transactionId: string) => Promise<void>) {}

  sync = async (req: Request, res: Response): Promise<void> => {
    await this.schedulePayoutSync(req.params.transactionId);
    res.status(202).json({
      success: true,
      data: {
        transactionId: req.params.transactionId,
        status: 'queued',
      },
    });
  };
}
