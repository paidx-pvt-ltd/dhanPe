import { Request, Response } from 'express';
import { CreateDisputeDto, ResolveDisputeDto, RespondDisputeDto } from './dispute.schemas.js';
import { DisputeService } from './dispute.service.js';

export class DisputeController {
  constructor(private readonly disputeService: DisputeService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateDisputeDto;
    const result = await this.disputeService.createDispute(body, req.userId!);
    res.status(201).json({
      success: true,
      data: result,
    });
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const result = await this.disputeService.listDisputes({
      status: req.query.status as CreateDisputeDto['status'],
      phase: req.query.phase as CreateDisputeDto['phase'],
      transactionId: req.query.transactionId as string | undefined,
    });
    res.json({
      success: true,
      data: result,
    });
  };

  get = async (req: Request, res: Response): Promise<void> => {
    const result = await this.disputeService.getDispute(req.params.disputeId);
    res.json({
      success: true,
      data: result,
    });
  };

  respond = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as RespondDisputeDto;
    const result = await this.disputeService.respondToDispute(req.params.disputeId, body);
    res.json({
      success: true,
      data: result,
    });
  };

  resolve = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as ResolveDisputeDto;
    const result = await this.disputeService.resolveDispute(
      req.params.disputeId,
      req.userId!,
      body
    );
    res.json({
      success: true,
      data: result,
    });
  };
}
