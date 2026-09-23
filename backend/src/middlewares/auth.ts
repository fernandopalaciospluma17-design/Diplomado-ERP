import type { RequestHandler } from 'express';
import { Types } from 'mongoose';
import { RoleModel } from '../models/role.model.js';
import { BranchModel } from '../models/branch.model.js';
import { CompanyModel } from '../models/company.model.js';
import { SessionModel } from '../models/session.model.js';
import { UserModel } from '../models/user.model.js';
import { verifyAccessToken } from '../utils/jwt.js';

export const requireAuth: RequestHandler = async (request, response, next) => {
  const header = request.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) {
    response.status(401).json({ success: false, message: 'Autenticacion requerida', error: { code: 'UNAUTHORIZED', details: [] } });
    return;
  }

  let payload;
  try { payload = verifyAccessToken(token); } catch {
    response.status(401).json({ success: false, message: 'Sesion invalida', error: { code: 'INVALID_TOKEN', details: [] } });
    return;
  }
  if (!payload.sid || !Types.ObjectId.isValid(payload.sid) || !Types.ObjectId.isValid(payload.sub)) {
    response.status(401).json({ success: false, message: 'La sesion debe renovarse', error: { code: 'SESSION_REQUIRED', details: [] } });
    return;
  }

  try {
    const session = await SessionModel.findOne({ _id: payload.sid, userId: payload.sub, revokedAt: null, expiresAt: { $gt: new Date() } });
    const user = await UserModel.findById(payload.sub);
    const companyActive = user?.companyId ? Boolean(await CompanyModel.exists({ _id: user.companyId, status: 'ACTIVE' })) : false;
    const branchActive = user?.companyId && user.branchId ? Boolean(await BranchModel.exists({ _id: user.branchId, companyId: user.companyId, status: 'ACTIVE' })) : false;
    if (!session || !user || user.status !== 'ACTIVE' || !companyActive || !branchActive || String(session.companyId ?? '') !== String(user.companyId ?? '') || String(session.branchId ?? '') !== String(user.branchId ?? '')) {
      response.status(401).json({ success: false, message: 'Sesion revocada o expirada', error: { code: 'SESSION_INVALID', details: [] } });
      return;
    }
    const role = user.roleId && Types.ObjectId.isValid(user.roleId)
      ? await RoleModel.findOne({ _id: user.roleId, companyId: user.companyId, status: 'ACTIVE' }).populate('permissionIds', 'code')
      : null;
    const permissions = role?.permissionIds.map((permission) => (permission as unknown as { code: string }).code) ?? [];
    request.user = {
      sub: user.id,
      roleId: user.roleId,
      sid: session.id,
      companyId: user.companyId?.toString(),
      branchId: user.branchId?.toString(),
      permissions
    };
    next();
  } catch (error) {
    next(error);
  }
};

export function requireRole(...roleIds: string[]): RequestHandler {
  return (request, response, next) => {
    if (!request.user || !request.user.roleId || !roleIds.includes(request.user.roleId)) {
      response.status(403).json({ success: false, message: 'Permisos insuficientes', error: { code: 'FORBIDDEN', details: [] } });
      return;
    }

    next();
  };
}

export function requirePermission(...permissionCodes: string[]): RequestHandler {
  return (request, response, next) => {
    const user = request.user;
    if (!user || !permissionCodes.some((code) => user.permissions?.includes(code))) {
      response.status(403).json({ success: false, message: 'Permisos insuficientes', error: { code: 'FORBIDDEN', details: [] } });
      return;
    }
    next();
  };
}
