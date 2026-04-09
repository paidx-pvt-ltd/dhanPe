import { Request, Response } from 'express';
import { UserService } from './user.service.js';
import { SubmitPanDto, UpdateProfileDto } from './user.schemas.js';

export class UserController {
  constructor(private readonly userService: UserService) {}

  getProfile = async (req: Request, res: Response): Promise<void> => {
    const profile = await this.userService.getProfile(req.userId!);
    res.json({ success: true, data: profile });
  };

  updateProfile = async (
    req: Request<unknown, unknown, UpdateProfileDto>,
    res: Response
  ): Promise<void> => {
    const profile = await this.userService.updateProfile(req.userId!, req.body);
    res.json({ success: true, data: profile });
  };

  submitPan = async (req: Request<unknown, unknown, SubmitPanDto>, res: Response): Promise<void> => {
    const result = await this.userService.submitPan(req.userId!, req.body);
    res.status(201).json({ success: true, data: result });
  };
}
