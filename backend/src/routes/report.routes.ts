import { Router } from 'express';
import { summaryReportController } from '../controllers/report.controller.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';

export const reportRouter = Router();
reportRouter.get('/summary', requireAuth, requirePermission('analytics.reports.read'), summaryReportController);
