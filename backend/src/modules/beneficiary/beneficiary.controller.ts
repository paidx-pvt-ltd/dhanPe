import { Request, Response } from 'express';
import { BeneficiaryService } from './beneficiary.service.js';
import { CreateBeneficiaryDto } from './beneficiary.schemas.js';

export class BeneficiaryController {
  constructor(private readonly beneficiaryService: BeneficiaryService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const result = await this.beneficiaryService.list(req.userId!);
    res.json({
      success: true,
      data: result,
    });
  };

  create = async (
    req: Request<unknown, unknown, CreateBeneficiaryDto>,
    res: Response
  ): Promise<void> => {
    const result = await this.beneficiaryService.create(req.userId!, req.body);
    res.status(201).json({
      success: true,
      data: result,
    });
  };
}
