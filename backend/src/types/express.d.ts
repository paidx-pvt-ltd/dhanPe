declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: {
        id: string;
        mobileNumber: string;
      };
      rawBody?: string;
    }
  }
}

export {};
