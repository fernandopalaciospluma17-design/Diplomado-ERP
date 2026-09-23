import type { RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AuthError, createUser, getCurrentUser, listUsers, login } from '../services/auth.service.js';
import { createUserSchema, loginSchema } from '../validators/auth.validators.js';

export const loginController: RequestHandler = async (request, response, next) => {
  try {
    const input = loginSchema.parse(request.body);
    const data = await login(input);
    response.status(200).json({ success: true, message: 'Inicio de sesion correcto', data });
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(422).json({ success: false, message: 'Datos invalidos', error: { code: 'VALIDATION_ERROR', details: error.issues } });
      return;
    }
    if (error instanceof AuthError) {
      response.status(401).json({ success: false, message: error.message, error: { code: error.code, details: [] } });
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

export const listUsersController: RequestHandler = async (_request, response, next) => {
  try {
    const data = await listUsers();
    response.status(200).json({ success: true, message: 'Usuarios consultados', data });
  } catch (error) {
    next(error);
  }
};

export const createUserController: RequestHandler = async (request, response, next) => {
  try {
    const input = createUserSchema.parse(request.body);
    const data = await createUser(input);
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
    next(error);
  }
};