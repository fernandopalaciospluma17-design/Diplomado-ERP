import cors from 'cors';
import { randomUUID } from 'node:crypto';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';
import { authRouter } from './routes/auth.routes.js';
import { catalogRouter } from './routes/catalog.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { inventoryRouter } from './routes/inventory.routes.js';
import { saleRouter } from './routes/sale.routes.js';
import { purchaseRouter } from './routes/purchase.routes.js';
import { expenseRouter } from './routes/expense.routes.js';
import { reportRouter } from './routes/report.routes.js';
import { coreRouter } from './routes/core.routes.js';
import { masterDataRouter } from './routes/master-data.routes.js';
import { accountingRouter } from './routes/accounting.routes.js';
import { crmRouter } from './routes/crm.routes.js';
import { posRouter } from './routes/pos.routes.js';
import { hrRouter } from './routes/hr.routes.js';
import { logger } from './utils/logger.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: '1mb' }));
app.use((request, response, next) => {
  const suppliedId = request.header('x-request-id');
  const requestId = suppliedId && /^[a-zA-Z0-9._-]{1,64}$/.test(suppliedId) ? suppliedId : randomUUID();
  request.requestId = requestId;
  response.setHeader('x-request-id', requestId);
  next();
});
app.use(pinoHttp({ logger }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));

app.get('/', (_request, response) => {
  response.json({ success: true, message: 'ERP API', data: { version: 'v1' } });
});

app.use('/api/v1/health', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/core', coreRouter);
app.use('/api/v1/catalogs', catalogRouter);
app.use('/api/v1/master-data', masterDataRouter);
app.use('/api/v1/inventory', inventoryRouter);
app.use('/api/v1/sales', saleRouter);
app.use('/api/v1/purchases', purchaseRouter);
app.use('/api/v1/expenses', expenseRouter);
app.use('/api/v1/reports', reportRouter);
app.use('/api/v1/accounting', accountingRouter);
app.use('/api/v1/crm', crmRouter);
app.use('/api/v1/pos', posRouter);
app.use('/api/v1/hr', hrRouter);
app.use(notFoundHandler);
app.use(errorHandler);
