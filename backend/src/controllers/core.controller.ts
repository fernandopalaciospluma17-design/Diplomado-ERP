import type { RequestHandler } from 'express';
import { ZodError } from 'zod';
import { CoreError, createBranch, createRole, listAuditEvents, listBranches, listCompany, listConfiguration, listPermissions, listRoles, listSessions, revokeAllSessions, setConfiguration, updateBranch, updateCompany, updateRole } from '../services/core.service.js';
import { createBranchSchema, createRoleSchema, setConfigurationSchema, updateBranchSchema, updateCompanySchema, updateRoleSchema } from '../validators/core.validators.js';

function handleError(error: unknown, response: Parameters<RequestHandler>[1], next: Parameters<RequestHandler>[2]) {
  if (error instanceof ZodError) {
    response.status(422).json({ success: false, message: 'Datos invalidos', error: { code: 'VALIDATION_ERROR', details: error.issues } });
  } else if (error instanceof CoreError) {
    response.status(error.code === 'NOT_FOUND' ? 404 : 422).json({ success: false, message: error.message, error: { code: error.code, details: [] } });
  } else {
    next(error);
  }
}

export const listCompaniesController: RequestHandler = async (req, res, next) => { try { if (!req.user?.companyId) { res.status(403).json({ success: false, message: 'Usuario sin empresa asignada', error: { code: 'COMPANY_REQUIRED', details: [] } }); return; } res.json({ success: true, message: 'Empresa consultada', data: await listCompany(req.user.companyId) }); } catch (e) { next(e); } };
export const updateCompanyController: RequestHandler = async (req, res, next) => { try { if (req.user?.companyId !== req.params.companyId) { res.status(403).json({ success: false, message: 'Empresa fuera de alcance', error: { code: 'FORBIDDEN', details: [] } }); return; } res.json({ success: true, message: 'Empresa actualizada', data: await updateCompany(String(req.params.companyId), updateCompanySchema.parse(req.body)) }); } catch (e) { handleError(e, res, next); } };

export const listBranchesController: RequestHandler = async (req, res, next) => {
  try {
    if (req.user?.companyId !== req.params.companyId) { res.status(403).json({ success: false, message: 'Empresa fuera de alcance', error: { code: 'FORBIDDEN', details: [] } }); return; }
    res.json({ success: true, message: 'Sucursales consultadas', data: await listBranches(String(req.params.companyId)) });
  } catch (e) { next(e); }
};
export const createBranchController: RequestHandler = async (req, res, next) => {
  try {
    if (req.user?.companyId !== req.params.companyId) { res.status(403).json({ success: false, message: 'Empresa fuera de alcance', error: { code: 'FORBIDDEN', details: [] } }); return; }
    res.status(201).json({ success: true, message: 'Sucursal creada', data: await createBranch(String(req.params.companyId), createBranchSchema.parse(req.body)) });
  } catch (e) { handleError(e, res, next); }
};
export const updateBranchController: RequestHandler = async (req, res, next) => {
  try {
    if (req.user?.companyId !== req.params.companyId) { res.status(403).json({ success: false, message: 'Empresa fuera de alcance', error: { code: 'FORBIDDEN', details: [] } }); return; }
    res.json({ success: true, message: 'Sucursal actualizada', data: await updateBranch(String(req.params.companyId), String(req.params.branchId), updateBranchSchema.parse(req.body)) });
  } catch (e) { handleError(e, res, next); }
};

export const listPermissionsController: RequestHandler = async (_req, res, next) => { try { res.json({ success: true, message: 'Permisos consultados', data: await listPermissions() }); } catch (e) { next(e); } };
export const listRolesController: RequestHandler = async (req, res, next) => { try { if (!req.user?.companyId) { res.status(403).json({ success: false, message: 'Usuario sin empresa asignada', error: { code: 'COMPANY_REQUIRED', details: [] } }); return; } res.json({ success: true, message: 'Roles consultados', data: await listRoles(req.user.companyId) }); } catch (e) { next(e); } };
export const createRoleController: RequestHandler = async (req, res, next) => { try { if (!req.user?.companyId) { res.status(403).json({ success: false, message: 'Usuario sin empresa asignada', error: { code: 'COMPANY_REQUIRED', details: [] } }); return; } res.status(201).json({ success: true, message: 'Rol creado', data: await createRole(req.user.companyId, createRoleSchema.parse(req.body), req.user.permissions) }); } catch (e) { handleError(e, res, next); } };
export const updateRoleController: RequestHandler = async (req, res, next) => { try { if (!req.user?.companyId) { res.status(403).json({ success: false, message: 'Usuario sin empresa asignada', error: { code: 'COMPANY_REQUIRED', details: [] } }); return; } res.json({ success: true, message: 'Rol actualizado', data: await updateRole(req.user.companyId, String(req.params.roleId), updateRoleSchema.parse(req.body), req.user.permissions) }); } catch (e) { handleError(e, res, next); } };

export const listConfigurationController: RequestHandler = async (req, res, next) => { try { if (!req.user?.companyId) { res.status(403).json({ success: false, message: 'Usuario sin empresa asignada', error: { code: 'COMPANY_REQUIRED', details: [] } }); return; } res.json({ success: true, message: 'Configuracion consultada', data: await listConfiguration(req.user.companyId, req.user.branchId) }); } catch (e) { next(e); } };
export const setConfigurationController: RequestHandler = async (req, res, next) => { try { if (!req.user?.companyId) { res.status(403).json({ success: false, message: 'Usuario sin empresa asignada', error: { code: 'COMPANY_REQUIRED', details: [] } }); return; } const { value } = setConfigurationSchema.parse(req.body); const key = String(req.params.key).trim().toLowerCase(); if (!/^[a-z][a-z0-9.-]{1,119}$/.test(key)) throw new ZodError([]); res.json({ success: true, message: 'Configuracion guardada', data: await setConfiguration(req.user.companyId, req.user.branchId, key, value, req.user.sub) }); } catch (e) { handleError(e, res, next); } };
export const listSessionsController: RequestHandler = async (req, res, next) => { try { res.json({ success: true, message: 'Sesiones consultadas', data: await listSessions(req.user!.sub) }); } catch (e) { next(e); } };
export const revokeSessionsController: RequestHandler = async (req, res, next) => { try { await revokeAllSessions(req.user!.sub); res.json({ success: true, message: 'Sesiones revocadas', data: { revoked: true } }); } catch (e) { next(e); } };
export const listAuditController: RequestHandler = async (req, res, next) => { try { if (!req.user?.companyId || !req.user.branchId) { res.status(403).json({ success: false, message: 'Usuario sin empresa o sucursal asignada', error: { code: 'TENANT_REQUIRED', details: [] } }); return; } res.json({ success: true, message: 'Auditoria consultada', data: await listAuditEvents(req.user.companyId, req.user.branchId) }); } catch (e) { next(e); } };
