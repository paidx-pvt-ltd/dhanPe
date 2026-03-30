import { Request } from 'express';

/**
 * Extend Express Request to include userId and user properties
 * Used by authenticated routes
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export interface RequestWithUser extends Request {
  userId: string;
  user: {
    id: string;
    email: string;
  };
}
