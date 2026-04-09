import { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { RefreshDto, VerifyOtpDto } from './auth.schemas.js';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  getWidgetConfig = async (_req: Request, res: Response): Promise<void> => {
    const result = await this.authService.getWidgetConfig();
    res.json(result);
  };

  verifyOtp = async (
    req: Request<unknown, unknown, VerifyOtpDto>,
    res: Response
  ): Promise<void> => {
    const result = await this.authService.verifyOtp(req.body);
    res.json(result);
  };

  refresh = async (req: Request<unknown, unknown, RefreshDto>, res: Response): Promise<void> => {
    const result = await this.authService.refresh(req.body.refreshToken);
    res.json(result);
  };
}
