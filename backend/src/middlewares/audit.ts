import type { RequestHandler } from 'express';
import { AuditModel } from '../models/audit.model.js';

export const auditAction = (action: string): RequestHandler => (request, response, next) => {
  response.on('finish', () => {
    if (request.user) {
      void AuditModel.create({ actorId: request.user.sub, action, method: request.method, path: request.originalUrl, statusCode: response.statusCode }).catch(() => undefined);
    }
  });
  next();
};