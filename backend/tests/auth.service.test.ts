import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  userFindOne: vi.fn(),
  userFindOneAndUpdate: vi.fn(),
  userExists: vi.fn(),
  userCreate: vi.fn(),
  userDeleteOne: vi.fn(),
  userUpdateOne: vi.fn(),
  branchFindOne: vi.fn(),
  branchExists: vi.fn(),
  roleFindOne: vi.fn(),
  companyExists: vi.fn(),
  sessionCreate: vi.fn(),
  sessionUpdateOne: vi.fn(),
  emailInvitation: vi.fn(),
  roleNotification: vi.fn(),
}));

vi.mock('../src/models/user.model.js', () => ({
  UserModel: {
    findOne: mocks.userFindOne,
    findOneAndUpdate: mocks.userFindOneAndUpdate,
    exists: mocks.userExists,
    create: mocks.userCreate,
    deleteOne: mocks.userDeleteOne,
    updateOne: mocks.userUpdateOne,
  },
}));
vi.mock('../src/models/branch.model.js', () => ({
  BranchModel: { findOne: mocks.branchFindOne, exists: mocks.branchExists },
}));
vi.mock('../src/models/role.model.js', () => ({ RoleModel: { findOne: mocks.roleFindOne } }));
vi.mock('../src/models/company.model.js', () => ({ CompanyModel: { exists: mocks.companyExists } }));
vi.mock('../src/models/session.model.js', () => ({
  SessionModel: { create: mocks.sessionCreate, updateOne: mocks.sessionUpdateOne },
}));
vi.mock('../src/services/email.service.js', () => {
  class EmailDeliveryError extends Error {}
  return {
    EmailDeliveryError,
    sendAccountInvitationEmail: mocks.emailInvitation,
    sendRolePermissionsChangedEmail: mocks.roleNotification,
  };
});

import { AuthError, confirmAccount, createUser, resendAccountInvitation, revokeSession, switchSessionBranch } from '../src/services/auth.service.js';
import { EmailDeliveryError } from '../src/services/email.service.js';
import { env } from '../src/config/env.js';

const companyId = new Types.ObjectId().toString();
const branchId = new Types.ObjectId().toString();
const otherBranchId = new Types.ObjectId().toString();
const roleId = new Types.ObjectId().toString();
const userObjectId = new Types.ObjectId();
const sessionId = new Types.ObjectId().toString();

function queryResult<T>(value: T) {
  const query = {
    select: vi.fn().mockResolvedValue(value),
    then: (resolve: (result: T) => unknown, reject?: (error: unknown) => unknown) => Promise.resolve(value).then(resolve, reject),
  };
  return query;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('account invitation and session services', () => {
  it('creates a pending user with a real role and sends a public confirmation link', async () => {
    const previousUrl = env.PUBLIC_APP_URL;
    env.PUBLIC_APP_URL = 'https://nodara.example';
    mocks.roleFindOne.mockResolvedValue({ id: roleId });
    mocks.branchExists.mockResolvedValue({ _id: branchId });
    mocks.userExists.mockResolvedValue(null);
    mocks.userCreate.mockImplementation(async (input) => ({ ...input, _id: userObjectId, id: userObjectId.toString() }));
    mocks.emailInvitation.mockResolvedValue(undefined);

    try {
      const user = await createUser({ name: 'New User', email: 'new@example.com', roleId }, companyId, branchId);
      const sentUrl = new URL(mocks.emailInvitation.mock.calls[0][2] as string);

      expect(user.status).toBe('PENDING_CONFIRMATION');
      expect(user.roleId).toBe(roleId);
      expect(mocks.userCreate).toHaveBeenCalledWith(expect.objectContaining({
        companyId,
        branchId,
        status: 'PENDING_CONFIRMATION',
        emailConfirmationExpiresAt: expect.any(Date),
      }));
      expect(sentUrl.origin).toBe('https://nodara.example');
      expect(sentUrl.searchParams.get('confirm')).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(mocks.userCreate.mock.calls[0][0]).not.toHaveProperty('passwordHash');
    } finally {
      env.PUBLIC_APP_URL = previousUrl;
    }
  });

  it('rejects duplicate accounts before sending another invitation', async () => {
    mocks.roleFindOne.mockResolvedValue({ id: roleId });
    mocks.branchExists.mockResolvedValue({ _id: branchId });
    mocks.userExists.mockResolvedValue({ _id: userObjectId });

    await expect(createUser({ name: 'New User', email: 'taken@example.com', roleId }, companyId, branchId))
      .rejects.toMatchObject({ code: 'USER_EXISTS' });
    expect(mocks.emailInvitation).not.toHaveBeenCalled();
  });

  it('removes the newly-created pending user when invitation delivery fails', async () => {
    mocks.roleFindOne.mockResolvedValue({ id: roleId });
    mocks.branchExists.mockResolvedValue({ _id: branchId });
    mocks.userExists.mockResolvedValue(null);
    const tokenHash = 'pending-token-hash';
    mocks.userCreate.mockResolvedValue({
      _id: userObjectId,
      id: userObjectId.toString(),
      name: 'New User',
      email: 'new@example.com',
      status: 'PENDING_CONFIRMATION',
    });
    mocks.emailInvitation.mockRejectedValue(new EmailDeliveryError('provider unavailable'));

    await expect(createUser({ name: 'New User', email: 'new@example.com', roleId }, companyId, branchId))
      .rejects.toBeInstanceOf(EmailDeliveryError);
    expect(mocks.userDeleteOne).toHaveBeenCalledWith(expect.objectContaining({ status: 'PENDING_CONFIRMATION' }));
    expect(mocks.userDeleteOne.mock.calls[0][0]).toHaveProperty('emailConfirmationTokenHash', expect.any(String));
    expect(mocks.userDeleteOne.mock.calls[0][0]).not.toHaveProperty('emailConfirmationTokenHash', tokenHash);
  });

  it('restores the previous valid confirmation token if a resend fails', async () => {
    const oldHash = 'previous-token-hash';
    const oldExpiry = new Date(Date.now() + 60_000);
    const user = {
      _id: userObjectId,
      id: userObjectId.toString(),
      companyId,
      name: 'Pending User',
      email: 'pending@example.com',
      status: 'PENDING_CONFIRMATION',
      emailConfirmationTokenHash: oldHash,
      emailConfirmationExpiresAt: oldExpiry,
    };
    mocks.userFindOne.mockReturnValue(queryResult(user));
    mocks.userUpdateOne
      .mockResolvedValueOnce({ matchedCount: 1 })
      .mockResolvedValueOnce({ matchedCount: 1 });
    mocks.emailInvitation.mockRejectedValue(new EmailDeliveryError('provider unavailable'));

    await expect(resendAccountInvitation(userObjectId.toString(), companyId)).rejects.toBeInstanceOf(EmailDeliveryError);

    expect(mocks.userUpdateOne).toHaveBeenCalledTimes(2);
    expect(mocks.userUpdateOne.mock.calls[1][0]).toMatchObject({
      _id: userObjectId,
      companyId,
      status: 'PENDING_CONFIRMATION',
      emailConfirmationTokenHash: expect.any(String),
    });
    expect(mocks.userUpdateOne.mock.calls[1][1]).toEqual({
      $set: { emailConfirmationTokenHash: oldHash, emailConfirmationExpiresAt: oldExpiry },
    });
  });

  it('activates an invited account only once and hashes its password', async () => {
    const sentUrl = new URL('https://nodara.example/?confirm=valid-token-value-which-is-long-enough');
    const token = sentUrl.searchParams.get('confirm')!;
    const pending = { _id: userObjectId, email: 'new@example.com', status: 'PENDING_CONFIRMATION' };
    const active = { id: userObjectId.toString(), name: 'New User', email: pending.email, status: 'ACTIVE' };
    mocks.userFindOne.mockReturnValue(queryResult(pending));
    mocks.userFindOneAndUpdate.mockResolvedValue(active);

    await expect(confirmAccount(token, 'strong-password-123')).resolves.toEqual(active);
    expect(mocks.userFindOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: userObjectId, status: 'PENDING_CONFIRMATION', emailConfirmationExpiresAt: expect.any(Object) }),
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'ACTIVE', passwordHash: expect.any(String) }),
        $unset: { emailConfirmationTokenHash: 1, emailConfirmationExpiresAt: 1 },
      }),
      { new: true }
    );
    expect(mocks.userFindOneAndUpdate.mock.calls[0][1].$set.passwordHash).not.toBe('strong-password-123');
  });

  it('switches only the active session to an active branch of the same company', async () => {
    const branch = { _id: new Types.ObjectId(branchId), id: branchId, code: 'WEST', name: 'West Branch' };
    mocks.branchFindOne.mockResolvedValue(branch);
    mocks.sessionUpdateOne.mockResolvedValue({ matchedCount: 1 });

    await expect(switchSessionBranch(userObjectId.toString(), sessionId, companyId, branchId))
      .resolves.toMatchObject({ branchId, branch: { code: 'WEST' } });
    expect(mocks.branchFindOne).toHaveBeenCalledWith({ _id: branchId, companyId, status: 'ACTIVE' });
    expect(mocks.sessionUpdateOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: sessionId, userId: userObjectId.toString(), companyId, revokedAt: null }),
      { $set: { branchId: branch._id } }
    );
  });

  it('rejects unavailable branch IDs and expired or revoked sessions', async () => {
    mocks.branchFindOne.mockResolvedValue(null);
    await expect(switchSessionBranch(userObjectId.toString(), sessionId, companyId, otherBranchId))
      .rejects.toMatchObject({ code: 'BRANCH_NOT_AVAILABLE' });
    expect(mocks.sessionUpdateOne).not.toHaveBeenCalled();

    mocks.branchFindOne.mockResolvedValue({ _id: new Types.ObjectId(branchId), id: branchId });
    mocks.sessionUpdateOne.mockResolvedValue({ matchedCount: 0 });
    await expect(switchSessionBranch(userObjectId.toString(), sessionId, companyId, branchId))
      .rejects.toMatchObject({ code: 'SESSION_INVALID' });
  });

  it('scopes revocation to both the current session and its owner', async () => {
    mocks.sessionUpdateOne.mockResolvedValue({ matchedCount: 1 });
    await revokeSession(sessionId, userObjectId.toString());
    expect(mocks.sessionUpdateOne).toHaveBeenCalledWith(
      { _id: sessionId, userId: userObjectId.toString(), revokedAt: null },
      { $set: { revokedAt: expect.any(Date) } }
    );
  });
});
