import type { RequestHandler } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';

export const requireAuth: RequestHandler = (request, response, next) => {
  const header = request.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) {
    response.status(401).json({ success: false, message: 'Autenticacion requerida', error: { code: 'UNAUTHORIZED', details: [] } });
    return;
  }

  try {
    request.user = verifyAccessToken(token);
    next();
  } catch {
    response.status(401).json({ success: false, message: 'Sesion invalida', error: { code: 'INVALID_TOKEN', details: [] } });
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