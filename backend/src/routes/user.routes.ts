import { Router } from 'express';
import { authenticate, requireAuth } from '../middlewares/auth';
import { UserService } from '../services/user.service';

const router = Router();

/**
 * GET /users/profile
 * Get authenticated user's profile
 */
router.get('/profile', authenticate, requireAuth, async (req, res, next) => {
  try {
    const profile = await UserService.getProfile(req.userId!);
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /users/balance
 * Get user's balance
 */
router.get('/balance', authenticate, requireAuth, async (req, res, next) => {
  try {
    const balance = await UserService.getBalance(req.userId!);
    res.json({ success: true, data: { balance } });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /users/profile
 * Update user profile
 */
router.patch('/profile', authenticate, requireAuth, async (req, res, next) => {
  try {
    const updated = await UserService.updateProfile(req.userId!, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

export default router;
