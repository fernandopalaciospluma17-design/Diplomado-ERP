import { Router } from 'express';
import { confirmAccountController, createUserController, currentUserController, listUsersController, loginController, resendAccountInvitationController } from '../controllers/auth.controller.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { auditAction } from '../middlewares/audit.js';

export const authRouter = Router();
authRouter.post('/login', loginController);
authRouter.post('/confirm-account', confirmAccountController);
authRouter.get('/me', requireAuth, currentUserController);
authRouter.get('/users', requireAuth, requirePermission('platform.users.read'), listUsersController);
authRouter.post('/users', requireAuth, requirePermission('platform.users.create'), auditAction('USER_CREATE'), createUserController);
authRouter.post('/users/:userId/resend-invitation', requireAuth, requirePermission('platform.users.create'), auditAction('USER_INVITE_RESEND'), resendAccountInvitationController);
