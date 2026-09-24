import type { RequestHandler } from 'express';
import { ZodError, z } from 'zod';
import { MasterDataError, createMasterData, listMasterData, updateMasterData } from '../services/master-data.service.js';
import { masterDataKindSchema } from '../validators/master-data.validators.js';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  q: z.string().trim().min(1).max(100).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional()
});

function tenant(request: Parameters<RequestHandler>[0], response: Parameters<RequestHandler>[1]) {
  if (!request.user?.companyId || !request.user.branchId) {
    response.status(403).json({ success: false, message: 'Usuario sin empresa o sucursal asignada', error: { code: 'TENANT_REQUIRED', details: [] } });
    return undefined;
  }
  return { companyId: request.user.companyId, branchId: request.user.branchId };
}

function validationFailure(error: unknown, response: Parameters<RequestHandler>[1]) {
  if (error instanceof ZodError) {
    response.status(422).json({ success: false, message: 'Datos invalidos', error: { code: 'VALIDATION_ERROR', details: error.issues } });
    return true;
  }
  return false;
}

function domainFailure(error: unknown, response: Parameters<RequestHandler>[1]) {
  if (!(error instanceof MasterDataError)) return false;
  const status = error.code === 'MASTER_DATA_EXISTS' || error.code === 'MASTER_DATA_IN_USE' || error.code === 'TRACKING_CONFIGURATION_LOCKED' ? 409 : error.code === 'MASTER_DATA_NOT_FOUND' ? 404 : 422;
  const messages: Record<MasterDataError['code'], string> = {
    MASTER_DATA_EXISTS: 'El codigo ya esta registrado', MASTER_DATA_NOT_FOUND: 'Registro no encontrado',
    INVALID_REFERENCE: 'Una o mas referencias no existen o estan inactivas', MASTER_DATA_IN_USE: 'El registro tiene dependencias activas y no puede desactivarse',
    TRACKING_CONFIGURATION_LOCKED: 'La trazabilidad no puede cambiarse despues del primer movimiento de inventario'
  };
  response.status(status).json({ success: false, message: messages[error.code], error: { code: error.code, details: [] } });
  return true;
}

export const listMasterDataController: RequestHandler = async (request, response, next) => {
  try {
    const kind = masterDataKindSchema.parse(request.params.kind);
    const query = listQuerySchema.parse(request.query);
    const scope = tenant(request, response); if (!scope) return;
    const data = await listMasterData(kind, scope.companyId, scope.branchId, query);
    response.status(200).json({ success: true, message: 'Datos maestros consultados', data });
  } catch (error) { if (!validationFailure(error, response)) next(error); }
};

export const createMasterDataController: RequestHandler = async (request, response, next) => {
  try {
    const kind = masterDataKindSchema.parse(request.params.kind);
    const scope = tenant(request, response); if (!scope) return;
    const data = await createMasterData(kind, request.body, scope.companyId, scope.branchId);
    response.status(201).json({ success: true, message: 'Dato maestro creado', data });
  } catch (error) { if (!validationFailure(error, response) && !domainFailure(error, response)) next(error); }
};

export const updateMasterDataController: RequestHandler = async (request, response, next) => {
  try {
    const kind = masterDataKindSchema.parse(request.params.kind);
    const code = z.string().trim().min(1).max(40).parse(request.params.code);
    const scope = tenant(request, response); if (!scope) return;
    const data = await updateMasterData(kind, code, request.body, scope.companyId, scope.branchId);
    response.status(200).json({ success: true, message: 'Dato maestro actualizado', data });
  } catch (error) { if (!validationFailure(error, response) && !domainFailure(error, response)) next(error); }
};
