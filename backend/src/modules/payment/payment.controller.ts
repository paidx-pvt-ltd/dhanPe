import { Request, Response } from 'express';
import { PaymentService } from './payment.service.js';
import { CreateTransferDto } from './payment.schemas.js';

export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  createTransfer = async (
    req: Request<unknown, unknown, CreateTransferDto>,
    res: Response
  ): Promise<void> => {
    const result = await this.paymentService.createTransfer(
      req.userId!,
      req.body,
      req.header('x-idempotency-key') ?? undefined
    );

    res.status(201).json({
      success: true,
      data: result,
    });
  };
}
