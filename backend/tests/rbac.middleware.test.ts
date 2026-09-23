import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { requirePermission } from '../src/middlewares/auth.js';

describe('permission authorization', () => {
  it('allows a persisted permission grant for the requested action', async () => {
    const app = express();
    app.get('/protected', (req, _res, next) => { req.user = { sub: 'user-1', permissions: ['sales.sale.read'] }; next(); }, requirePermission('sales.sale.read'), (_req, res) => res.sendStatus(204));
    await request(app).get('/protected').expect(204);
  });

  it('does not treat read as permission to create', async () => {
    const app = express();
    app.get('/protected', (req, _res, next) => { req.user = { sub: 'user-1', permissions: ['sales.sale.read'] }; next(); }, requirePermission('sales.sale.create'), (_req, res) => res.sendStatus(204));
    const response = await request(app).get('/protected');
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});
