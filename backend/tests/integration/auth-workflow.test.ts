import mongoose, { Types } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const sentInvitations = vi.hoisted(() => [] as Array<{ to: string; name: string; confirmationUrl: string }>);

vi.mock('../../src/services/email.service.js', () => {
  class EmailDeliveryError extends Error {}
  return {
    EmailDeliveryError,
    sendAccountInvitationEmail: vi.fn(async (to: string, name: string, confirmationUrl: string) => {
      sentInvitations.push({ to, name, confirmationUrl });
    }),
    sendRolePermissionsChangedEmail: vi.fn(async () => undefined),
  };
});

import { app } from '../../src/app.js';
import { AuditModel } from '../../src/models/audit.model.js';
import { BranchModel } from '../../src/models/branch.model.js';
import { CompanyModel } from '../../src/models/company.model.js';
import { PermissionModel } from '../../src/models/permission.model.js';
import { RoleModel } from '../../src/models/role.model.js';
import { SessionModel } from '../../src/models/session.model.js';
import { UserModel } from '../../src/models/user.model.js';
import { hashPassword } from '../../src/utils/password.js';

const enabled = process.env.RUN_AUTH_E2E === '1';

function hasDisposableDatabase(uri: string) {
  try {
    const database = new URL(uri).pathname.replace(/^\//, '');
    return /(?:test|integration|disposable|gate)/i.test(database);
  } catch {
    return false;
  }
}

describe.skipIf(!enabled)('authentication and invitation E2E on disposable MongoDB', () => {
  const suffix = new Types.ObjectId().toHexString();
  const companyId = new Types.ObjectId();
  const otherCompanyId = new Types.ObjectId();
  const branchId = new Types.ObjectId();
  const secondBranchId = new Types.ObjectId();
  const otherBranchId = new Types.ObjectId();
  const permissions: Array<{ code: string; module: string; resource: string; action: 'READ' | 'CREATE' }> = [
    { code: 'platform.users.read', module: 'platform', resource: 'users', action: 'READ' },
    { code: 'platform.users.create', module: 'platform', resource: 'users', action: 'CREATE' },
    { code: 'platform.roles.read', module: 'platform', resource: 'roles', action: 'READ' },
    { code: 'platform.branches.read', module: 'platform', resource: 'branches', action: 'READ' },
    { code: 'analytics.reports.read', module: 'analytics', resource: 'reports', action: 'READ' },
  ];
  let permissionIds: Types.ObjectId[] = [];
  let createdPermissions: Types.ObjectId[] = [];
  let adminId: Types.ObjectId;
  let adminToken = '';
  let userToken = '';
  let invitedUserId = '';
  let invitedEmail = '';
  let adminSecondSessionToken = '';

  beforeAll(async () => {
    const uri = process.env.MONGODB_TEST_URI;
    if (!uri || !hasDisposableDatabase(uri)) {
      throw new Error('Set MONGODB_TEST_URI to a disposable database whose name contains test, integration, disposable, or gate.');
    }
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });

    const savedPermissions = await Promise.all(permissions.map(async (permission) => {
      const existing = await PermissionModel.findOne({ code: permission.code });
      if (existing) return existing;
      const created = await PermissionModel.create(permission);
      createdPermissions.push(created._id);
      return created;
    }));
    permissionIds = savedPermissions.map((permission) => permission._id);

    await CompanyModel.create([
      { _id: companyId, code: `E2E-${suffix}`, legalName: `E2E Company ${suffix}`, name: `E2E ${suffix}`, status: 'ACTIVE' },
      { _id: otherCompanyId, code: `E2X-${suffix}`, legalName: `Other Company ${suffix}`, name: `Other ${suffix}`, status: 'ACTIVE' },
    ]);
    await BranchModel.create([
      { _id: branchId, companyId, code: `MAIN-${suffix}`, name: 'Main Branch', status: 'ACTIVE' },
      { _id: secondBranchId, companyId, code: `SECOND-${suffix}`, name: 'Second Branch', status: 'ACTIVE' },
      { _id: otherBranchId, companyId: otherCompanyId, code: `OTHER-${suffix}`, name: 'Other Tenant Branch', status: 'ACTIVE' },
    ]);

    const role = await RoleModel.create({
      companyId,
      code: `ADMIN-${suffix}`,
      name: 'E2E Admin',
      permissionIds,
      status: 'ACTIVE',
    });
    const userRole = await RoleModel.create({
      companyId,
      code: `USER-${suffix}`,
      name: 'E2E User',
      permissionIds: [savedPermissions[4]._id],
      status: 'ACTIVE',
    });
    const foreignRole = await RoleModel.create({
      companyId: otherCompanyId,
      code: `FOREIGN-${suffix}`,
      name: 'Foreign Company Admin',
      permissionIds,
      status: 'ACTIVE',
    });
    const passwordHash = await hashPassword('Admin-password-123');
    const admin = await UserModel.create({
      name: 'E2E Administrator',
      email: `admin-${suffix}@example.test`,
      passwordHash,
      companyId,
      branchId,
      roleId: role.id,
      status: 'ACTIVE',
    });
    adminId = admin._id;
    await UserModel.create({
      name: 'Cross Tenant Role User',
      email: `cross-tenant-role-${suffix}@example.test`,
      passwordHash: await hashPassword('Cross-tenant-password-123'),
      companyId,
      branchId,
      roleId: foreignRole.id,
      status: 'ACTIVE',
    });
    invitedEmail = `invited-${suffix}@example.test`;
    sentInvitations.length = 0;
    expect(userRole.id).toBeTruthy();
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      const userIds = await UserModel.find({ companyId }, { _id: 1 }).lean();
      await SessionModel.deleteMany({ userId: { $in: userIds.map((user) => user._id) } });
      await AuditModel.deleteMany({ companyId: { $in: [companyId, otherCompanyId] } });
      await UserModel.deleteMany({ companyId: { $in: [companyId, otherCompanyId] } });
      await RoleModel.deleteMany({ companyId: { $in: [companyId, otherCompanyId] } });
      await BranchModel.deleteMany({ companyId: { $in: [companyId, otherCompanyId] } });
      await CompanyModel.deleteMany({ _id: { $in: [companyId, otherCompanyId] } });
      await PermissionModel.deleteMany({ _id: { $in: createdPermissions } });
      await mongoose.disconnect();
    }
  });

  it('runs the administrator invite, account confirmation, branch, permission, dashboard, and logout flow', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: `admin-${suffix}@example.test`, password: 'Admin-password-123' })
      .expect(200);
    adminToken = login.body.data.accessToken;
    expect(login.body.data.user.branchId).toBe(branchId.toString());

    await request(app).get('/api/v1/core/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app).post('/api/v1/auth/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Bad Role', email: `bad-${suffix}@example.test`, roleId: 'not-an-object-id' })
      .expect(422);

    const creation = await request(app).post('/api/v1/auth/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Invited Employee', email: invitedEmail, roleId: (await RoleModel.findOne({ companyId, code: `USER-${suffix}` }))!.id })
      .expect(201);
    invitedUserId = creation.body.data.id;
    expect(creation.body.data.status).toBe('PENDING_CONFIRMATION');
    expect(sentInvitations).toHaveLength(1);

    await request(app).post('/api/v1/auth/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Duplicate Employee', email: invitedEmail, roleId: creation.body.data.roleId })
      .expect(409);
    await request(app).post('/api/v1/auth/login')
      .send({ email: invitedEmail, password: 'Admin-password-123' })
      .expect(401);

    const firstToken = new URL(sentInvitations[0].confirmationUrl).searchParams.get('confirm')!;
    await request(app).post('/api/v1/auth/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Expired Invitation', email: `expired-${suffix}@example.test`, roleId: creation.body.data.roleId })
      .expect(201);
    const expiredInvite = sentInvitations[1];
    const expiredUser = await UserModel.findOne({ email: expiredInvite.to }).select('+emailConfirmationTokenHash +emailConfirmationExpiresAt');
    await UserModel.updateOne({ _id: expiredUser!._id }, { $set: { emailConfirmationExpiresAt: new Date(Date.now() - 1000) } });
    const expiredToken = new URL(expiredInvite.confirmationUrl).searchParams.get('confirm')!;
    await request(app).post('/api/v1/auth/confirm-account')
      .send({ token: expiredToken, password: 'New-password-123' })
      .expect(400);
    await UserModel.deleteOne({ _id: expiredUser!._id });

    await request(app).post('/api/v1/auth/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Reinvite Employee', email: invitedEmail, roleId: creation.body.data.roleId })
      .expect(409);
    await request(app).post(`/api/v1/auth/users/${invitedUserId}/resend-invitation`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(sentInvitations).toHaveLength(3);

    await request(app).post('/api/v1/auth/confirm-account')
      .send({ token: firstToken, password: 'New-password-123' })
      .expect(400);
    const confirmationToken = new URL(sentInvitations[2].confirmationUrl).searchParams.get('confirm')!;
    await request(app).post('/api/v1/auth/confirm-account')
      .send({ token: 'invalid-confirmation-token-value', password: 'New-password-123' })
      .expect(400);
    await request(app).post('/api/v1/auth/confirm-account')
      .send({ token: confirmationToken, password: 'New-password-123' })
      .expect(200);

    const userLogin = await request(app).post('/api/v1/auth/login')
      .send({ email: invitedEmail, password: 'New-password-123' })
      .expect(200);
    userToken = userLogin.body.data.accessToken;
    const profile = await request(app).get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(profile.body.data).toMatchObject({ id: invitedUserId, status: 'ACTIVE', branchId: branchId.toString() });

    await request(app).get('/api/v1/reports/summary')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    await request(app).get('/api/v1/auth/users')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    const crossTenantRoleLogin = await request(app).post('/api/v1/auth/login')
      .send({ email: `cross-tenant-role-${suffix}@example.test`, password: 'Cross-tenant-password-123' })
      .expect(200);
    const crossTenantProfile = await request(app).get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${crossTenantRoleLogin.body.data.accessToken}`)
      .expect(200);
    expect(crossTenantProfile.body.data.permissions).toEqual([]);
    await request(app).get('/api/v1/auth/users')
      .set('Authorization', `Bearer ${crossTenantRoleLogin.body.data.accessToken}`)
      .expect(403);

    await request(app).patch('/api/v1/core/sessions/current/branch')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ branchId: 'invalid' })
      .expect(422);
    await request(app).patch('/api/v1/core/sessions/current/branch')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ branchId: otherBranchId.toString() })
      .expect(403);
    await request(app).patch('/api/v1/core/sessions/current/branch')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ branchId: secondBranchId.toString() })
      .expect(200);
    const switchedProfile = await request(app).get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    expect(switchedProfile.body.data.branchId).toBe(secondBranchId.toString());
    await request(app).get(`/api/v1/reports/summary?branchId=${branchId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    const secondAdminLogin = await request(app).post('/api/v1/auth/login')
      .send({ email: `admin-${suffix}@example.test`, password: 'Admin-password-123' })
      .expect(200);
    adminSecondSessionToken = secondAdminLogin.body.data.accessToken;
    await request(app).delete('/api/v1/core/sessions/current')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
    await request(app).get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(401);
    await request(app).get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminSecondSessionToken}`)
      .expect(200);
  }, 60_000);

  it('rejects inactive users and expired sessions', async () => {
    const inactive = await UserModel.create({
      name: 'Inactive User',
      email: `inactive-${suffix}@example.test`,
      passwordHash: await hashPassword('Inactive-password-123'),
      companyId,
      branchId,
      status: 'INACTIVE',
    });
    await request(app).post('/api/v1/auth/login')
      .send({ email: inactive.email, password: 'Inactive-password-123' })
      .expect(401);

    const session = await SessionModel.findOne({ userId: adminId, revokedAt: null, expiresAt: { $gt: new Date() } });
    await SessionModel.updateOne({ _id: session!._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    await request(app).get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(401);
  }, 30_000);
});
