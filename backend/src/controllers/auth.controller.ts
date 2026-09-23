import type { RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AuthError, createUser, getCurrentUser, listUsers, login } from '../services/auth.service.js';
import { createUserSchema, loginSchema } from '../validators/auth.validators.js';

export const loginController: RequestHandler = async (request, response, next) => {
  try {
    const input = loginSchema.parse(request.body);
    const data = await login(input, request.ip, request.get('user-agent'));
    response.status(200).json({ success: true, message: 'Inicio de sesion correcto', data });
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(422).json({ success: false, message: 'Datos invalidos', error: { code: 'VALIDATION_ERROR', details: error.issues } });
      return;
    }
    if (error instanceof AuthError) {
      const status = error.code === 'TENANT_NOT_CONFIGURED' ? 409 : 401;
      response.status(status).json({ success: false, message: error.message, error: { code: error.code, details: [] } });
      return;
    }
    next(error);
  }
};

export const currentUserController: RequestHandler = async (request, response, next) => {
  try {
    const data = await getCurrentUser(request.user!.sub);
    response.status(200).json({ success: true, message: 'Usuario autenticado', data });
  } catch (error) {
    if (error instanceof AuthError && error.code === 'USER_NOT_FOUND') {
      response.status(404).json({ success: false, message: 'Usuario no encontrado', error: { code: error.code, details: [] } });
      return;
    }
    next(error);
  }
};

export const listUsersController: RequestHandler = async (request, response, next) => {
  try {
    if (!request.user?.companyId) { response.status(403).json({ success: false, message: 'Usuario sin empresa asignada', error: { code: 'COMPANY_REQUIRED', details: [] } }); return; }
    const data = await listUsers(request.user.companyId);
    response.status(200).json({ success: true, message: 'Usuarios consultados', data });
  } catch (error) {
    next(error);
  }
};

export const createUserController: RequestHandler = async (request, response, next) => {
  try {
    if (!request.user?.companyId || !request.user.branchId) { response.status(403).json({ success: false, message: 'Usuario sin empresa o sucursal asignada', error: { code: 'TENANT_REQUIRED', details: [] } }); return; }
    const input = createUserSchema.parse(request.body);
    const data = await createUser(input, request.user.companyId, request.user.branchId);
    response.status(201).json({ success: true, message: 'Usuario creado', data });
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(422).json({ success: false, message: 'Datos invalidos', error: { code: 'VALIDATION_ERROR', details: error.issues } });
      return;
    }
    if (error instanceof AuthError && error.code === 'USER_EXISTS') {
      response.status(409).json({ success: false, message: 'El correo ya esta registrado', error: { code: error.code, details: [] } });
      return;
    }
    if (error instanceof AuthError && error.code === 'INVALID_ROLE') {
      response.status(422).json({ success: false, message: 'Rol o sucursal no válidos para la empresa', error: { code: error.code, details: [] } });
      return;
    }
    next(error);
  }
};
