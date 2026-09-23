import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { signAccessToken } from '../src/utils/jwt.js';

describe('GET /api/v1/health', () => {
  it('returns a consistent success envelope', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      message: 'Servicio disponible',
      data: { service: 'erp-backend', status: 'ok' }
    });
  });

  it('rejects the protected endpoint without a bearer token', async () => {
    const response = await request(app).get('/api/v1/health/protected');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' }
    });
  });

  it('rejects the current-user endpoint without a bearer token', async () => {
    const response = await request(app).get('/api/v1/auth/me');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' }
    });
  });

  it('rejects user administration for non-admin roles', async () => {
    const token = signAccessToken({ sub: 'user-id', roleId: 'USER' });
    const response = await request(app)
      .get('/api/v1/auth/users')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'FORBIDDEN' }
    });
  });

  it('requires authentication to read catalogs', async () => {
    const response = await request(app).get('/api/v1/catalogs/PRODUCT');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'UNAUTHORIZED' }
    });
  });

  it('rejects catalog creation for non-admin roles', async () => {
    const token = signAccessToken({ sub: 'user-id', roleId: 'USER' });
    const response = await request(app)
      .post('/api/v1/catalogs/PRODUCT')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'SKU-001', name: 'Producto de prueba' });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'FORBIDDEN' }
    });
  });

  it('validates catalog types before accessing persistence', async () => {
    const token = signAccessToken({ sub: 'user-id', roleId: 'USER' });
    const response = await request(app)
      .get('/api/v1/catalogs/INVALID')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ERROR' }
    });
  });

  it('requires authentication to read inventory', async () => {
    const response = await request(app).get('/api/v1/inventory/SKU-001/MAIN');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
  });

  it('rejects inventory movements for non-admin roles', async () => {
    const token = signAccessToken({ sub: 'user-id', roleId: 'USER' });
    const response = await request(app)
      .post('/api/v1/inventory/movements')
      .set('Authorization', `Bearer ${token}`)
      .send({ productCode: 'SKU-001', warehouseCode: 'MAIN', type: 'IN', quantity: 10, reason: 'Carga inicial' });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ success: false, error: { code: 'FORBIDDEN' } });
  });

  it('requires authentication to read sales', async () => {
    const response = await request(app).get('/api/v1/sales');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
  });

  it('rejects sale creation for non-admin roles', async () => {
    const token = signAccessToken({ sub: 'user-id', roleId: 'USER' });
    const response = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({ saleNumber: 'SALE-001', warehouseCode: 'MAIN', lines: [{ productCode: 'SKU-001', quantity: 1, unitPriceCents: 1000 }] });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ success: false, error: { code: 'FORBIDDEN' } });
  });

  it('requires authentication to read purchases', async () => {
    const response = await request(app).get('/api/v1/purchases');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
  });

  it('rejects purchase creation for non-admin roles', async () => {
    const token = signAccessToken({ sub: 'user-id', roleId: 'USER' });
    const response = await request(app)
      .post('/api/v1/purchases')
      .set('Authorization', `Bearer ${token}`)
      .send({ purchaseNumber: 'PUR-001', warehouseCode: 'MAIN', lines: [{ productCode: 'SKU-001', quantity: 1, unitCostCents: 500 }] });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ success: false, error: { code: 'FORBIDDEN' } });
  });

  it('requires admin access to reports', async () => {
    const token = signAccessToken({ sub: 'user-id', roleId: 'USER' });
    const response = await request(app).get('/api/v1/reports/summary').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ success: false, error: { code: 'FORBIDDEN' } });
  });
});