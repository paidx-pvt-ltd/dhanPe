import { Request, Response } from 'express';
import { CreateRefundDto } from './refund.schemas.js';
import { RefundService } from './refund.service.js';

export class RefundController {
  constructor(
    private readonly refundService: RefundService,
    private readonly scheduleRefundSync: (refundId: string, userId: string) => Promise<void> = async () =>
      undefined
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateRefundDto;
    const result = await this.refundService.createRefund(
      req.userId!,
      req.params.transactionId,
      body
    );
    res.status(201).json({
      success: true,
      data: result,
    });
  };

  sync = async (req: Request, res: Response): Promise<void> => {
    await this.scheduleRefundSync(req.params.refundId, req.userId!);
    res.status(202).json({
      success: true,
      data: {
        refundId: req.params.refundId,
        status: 'queued',
      },
    });
  };
}
