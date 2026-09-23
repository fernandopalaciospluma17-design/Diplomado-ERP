import { Router } from 'express';
import { createUserController, currentUserController, listUsersController, loginController } from '../controllers/auth.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

export const authRouter = Router();
authRouter.post('/login', loginController);
authRouter.get('/me', requireAuth, currentUserController);
authRouter.get('/users', requireAuth, requireRole('ADMIN'), listUsersController);
authRouter.post('/users', requireAuth, requireRole('ADMIN'), createUserController);