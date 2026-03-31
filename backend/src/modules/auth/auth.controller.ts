import { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto, RefreshDto, SignupDto } from './auth.schemas.js';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  signup = async (req: Request<unknown, unknown, SignupDto>, res: Response): Promise<void> => {
    const result = await this.authService.signup(req.body);
    res.status(201).json(result);
  };

  login = async (req: Request<unknown, unknown, LoginDto>, res: Response): Promise<void> => {
    const result = await this.authService.login(req.body);
    res.json(result);
  };

  refresh = async (req: Request<unknown, unknown, RefreshDto>, res: Response): Promise<void> => {
    const result = await this.authService.refresh(req.body.refreshToken);
    res.json(result);
  };
}
