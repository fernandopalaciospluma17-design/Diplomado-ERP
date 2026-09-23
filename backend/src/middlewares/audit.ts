import type { RequestHandler } from 'express';
import { AuditModel } from '../models/audit.model.js';
import { logger } from '../utils/logger.js';

export const auditAction = (action: string): RequestHandler => (request, response, next) => {
  response.on('finish', () => {
    if (request.user) {
      const [module, entity] = action.toLowerCase().split('_');
      void AuditModel.create({
        actorId: request.user.sub,
        companyId: request.user.companyId,
        branchId: request.user.branchId,
        action,
        module,
        entity,
        method: request.method,
        path: request.originalUrl,
        statusCode: response.statusCode,
        ip: request.ip,
        requestId: request.requestId
      }).catch((error: unknown) => logger.error({ err: error, action, requestId: request.requestId }, 'Unable to persist audit event'));
    }
  });
  next();
};
