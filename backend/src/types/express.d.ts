import 'express';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: { sub: string; roleId?: string };
    }
  }
}

export {};