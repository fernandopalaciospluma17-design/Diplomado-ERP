import { Router } from 'express';
import { summaryReportController } from '../controllers/report.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';

export const reportRouter = Router();
reportRouter.get('/summary', requireAuth, requireRole('ADMIN'), summaryReportController);