import { Router } from 'express';
import { createMasterDataController, listMasterDataController, updateMasterDataController } from '../controllers/master-data.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { auditAction } from '../middlewares/audit.js';
import { masterDataKinds } from '../models/master-data.model.js';
import type { RequestHandler } from 'express';

export const masterDataRouter = Router();
masterDataRouter.use(requireAuth);
const requireKindPermission = (action: 'read' | 'create' | 'update'): RequestHandler => (request, response, next) => {
  const permission = `master-data.${request.params.kind}.${action}`;
  if (!request.user?.permissions?.includes(permission)) {
    response.status(403).json({ success: false, message: 'Permisos insuficientes', error: { code: 'FORBIDDEN', details: [] } });
    return;
  }
  next();
};
masterDataRouter.param('kind', (request, response, next, kind: string) => {
  if (!(masterDataKinds as readonly string[]).includes(kind)) {
    response.status(422).json({ success: false, message: 'Tipo de dato maestro invalido', error: { code: 'VALIDATION_ERROR', details: [] } });
    return;
  }
  next();
});
masterDataRouter.get('/:kind', requireKindPermission('read'), listMasterDataController);
masterDataRouter.post('/:kind', requireKindPermission('create'), auditAction('MASTER_DATA_CREATE'), createMasterDataController);
masterDataRouter.patch('/:kind/:code', requireKindPermission('update'), auditAction('MASTER_DATA_UPDATE'), updateMasterDataController);
