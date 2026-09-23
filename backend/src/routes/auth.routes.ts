import { Router } from 'express';
import { createUserController, currentUserController, listUsersController, loginController } from '../controllers/auth.controller.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { auditAction } from '../middlewares/audit.js';

export const authRouter = Router();
authRouter.post('/login', loginController);
authRouter.get('/me', requireAuth, currentUserController);
authRouter.get('/users', requireAuth, requirePermission('platform.users.read'), listUsersController);
authRouter.post('/users', requireAuth, requirePermission('platform.users.create'), auditAction('USER_CREATE'), createUserController);
