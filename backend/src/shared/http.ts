import { type NextFunction, type Request, type RequestHandler, type Response } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export const asHandler = (handler: AsyncRequestHandler): RequestHandler => {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
};
