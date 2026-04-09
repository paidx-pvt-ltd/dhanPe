import { NextFunction, Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { AuthorizationError } from '../shared/errors.js';

export const requireAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  const userId = req.userId;
  if (!userId) {
    next(new AuthorizationError('Admin access requires authentication'));
    return;
  }

  void prisma.user
    .findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    })
    .then((user) => {
      if (!user?.isAdmin) {
        next(new AuthorizationError('Admin access required'));
        return;
      }

      next();
    })
    .catch(next);
};
