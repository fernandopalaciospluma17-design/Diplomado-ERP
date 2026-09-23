import 'express';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: { sub: string; roleId?: string; sid?: string; companyId?: string; branchId?: string; permissions?: string[] };
    }
  }
}

export {};
