import { Request, Response } from 'express';
import { UserService } from './user.service.js';

export class UserController {
  constructor(private readonly userService: UserService) {}

  getProfile = async (req: Request, res: Response): Promise<void> => {
    const profile = await this.userService.getProfile(req.userId!);
    res.json({ success: true, data: profile });
  };

  updateProfile = async (req: Request, res: Response): Promise<void> => {
    const profile = await this.userService.updateProfile(req.userId!, req.body);
    res.json({ success: true, data: profile });
  };
}
