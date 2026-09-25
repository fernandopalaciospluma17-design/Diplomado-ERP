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

  it('exposes database readiness separately from process health', async () => {
    const response = await request(app).get('/api/v1/health/ready');

    expect([200, 503]).toContain(response.status);
    expect(response.body.data).toMatchObject({ service: 'erp-backend' });
    expect(['ready', 'not_ready']).toContain(response.body.data.status);
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

  it('requires a persistent session before user administration', async () => {
    const token = signAccessToken({ sub: 'user-id', roleId: 'USER' });
    const response = await request(app)
      .get('/api/v1/auth/users')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'SESSION_REQUIRED' }
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

  it('requires authentication to read HR employees and attendance', async () => {
    const employees = await request(app).get('/api/v1/hr/employees');
    const attendance = await request(app).get('/api/v1/hr/attendance');

    expect(employees.status).toBe(401);
    expect(attendance.status).toBe(401);
  });

  it('requires a persistent session before catalog creation', async () => {
    const token = signAccessToken({ sub: 'user-id', roleId: 'USER' });
    const response = await request(app)
      .post('/api/v1/catalogs/PRODUCT')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: 'SKU-001', name: 'Producto de prueba' });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'SESSION_REQUIRED' }
    });
  });

  it('rejects pre-session tokens before catalog validation', async () => {
    const token = signAccessToken({ sub: 'user-id', roleId: 'USER' });
    const response = await request(app)
      .get('/api/v1/catalogs/INVALID')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: 'SESSION_REQUIRED' }
    });
  });

  it('requires authentication to read inventory', async () => {
    const response = await request(app).get('/api/v1/inventory/SKU-001/MAIN');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
  });

  it('requires a persistent session before inventory changes', async () => {
    const token = signAccessToken({ sub: 'user-id', roleId: 'USER' });
    const response = await request(app)
      .post('/api/v1/inventory/movements')
      .set('Authorization', `Bearer ${token}`)
      .send({ productCode: 'SKU-001', warehouseCode: 'MAIN', type: 'IN', quantity: 10, reason: 'Carga inicial' });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ success: false, error: { code: 'SESSION_REQUIRED' } });
  });

  it('requires authentication to read sales', async () => {
    const response = await request(app).get('/api/v1/sales');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
  });

  it('requires a persistent session before sale creation', async () => {
    const token = signAccessToken({ sub: 'user-id', roleId: 'USER' });
    const response = await request(app)
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({ saleNumber: 'SALE-001', warehouseCode: 'MAIN', lines: [{ productCode: 'SKU-001', quantity: 1, unitPriceCents: 1000 }] });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ success: false, error: { code: 'SESSION_REQUIRED' } });
  });

  it('requires authentication to read purchases', async () => {
    const response = await request(app).get('/api/v1/purchases');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ success: false, error: { code: 'UNAUTHORIZED' } });
  });

  it('requires a persistent session before purchase creation', async () => {
    const token = signAccessToken({ sub: 'user-id', roleId: 'USER' });
    const response = await request(app)
      .post('/api/v1/purchases')
      .set('Authorization', `Bearer ${token}`)
      .send({ purchaseNumber: 'PUR-001', warehouseCode: 'MAIN', lines: [{ productCode: 'SKU-001', quantity: 1, unitCostCents: 500 }] });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ success: false, error: { code: 'SESSION_REQUIRED' } });
  });

  it('requires admin access to reports', async () => {
    const token = signAccessToken({ sub: 'user-id', roleId: 'USER' });
    const response = await request(app).get('/api/v1/reports/summary').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ success: false, error: { code: 'SESSION_REQUIRED' } });
  });
});
