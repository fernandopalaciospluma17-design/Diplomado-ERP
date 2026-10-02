import { Types } from 'mongoose';
import { UserModel } from '../models/user.model.js';
import { SessionModel } from '../models/session.model.js';
import { RoleModel } from '../models/role.model.js';
import { BranchModel } from '../models/branch.model.js';
import { CompanyModel } from '../models/company.model.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { createEmailConfirmationToken, hashEmailConfirmationToken } from '../utils/email-confirmation-token.js';
import { signAccessToken } from '../utils/jwt.js';
import { EmailDeliveryError, sendAccountInvitationEmail } from './email.service.js';
import { env } from '../config/env.js';
import type { CreateUserInput, LoginInput } from '../validators/auth.validators.js';

export class AuthError extends Error {
  constructor(public readonly code: 'INVALID_CREDENTIALS' | 'INACTIVE_USER' | 'USER_NOT_FOUND' | 'USER_EXISTS' | 'INVALID_ROLE' | 'TENANT_NOT_CONFIGURED' | 'INVALID_CONFIRMATION_TOKEN' | 'USER_NOT_PENDING_CONFIRMATION') {
    super('Credenciales invalidas');
  }
}

async function sendInvitation(user: { email: string; name: string }, token: string) {
  const confirmationUrl = new URL('/', env.PUBLIC_APP_URL);
  confirmationUrl.searchParams.set('confirm', token);
  await sendAccountInvitationEmail(user.email, user.name, confirmationUrl.toString());
}

export async function login(input: LoginInput, ip?: string, userAgent?: string) {
  const user = await UserModel.findOne({ email: input.email }).select('+passwordHash');
  if (!user || !user.passwordHash || !(await comparePassword(input.password, user.passwordHash))) {
    throw new AuthError('INVALID_CREDENTIALS');
  }
  if (user.status !== 'ACTIVE') {
    throw new AuthError('INACTIVE_USER');
  }
  if (!user.companyId || !user.branchId || !await CompanyModel.exists({ _id: user.companyId, status: 'ACTIVE' }) || !await BranchModel.exists({ _id: user.branchId, companyId: user.companyId, status: 'ACTIVE' })) {
    throw new AuthError('TENANT_NOT_CONFIGURED');
  }

  user.lastLogin = new Date();
  await user.save();

  const session = await SessionModel.create({ userId: user._id, companyId: user.companyId, branchId: user.branchId, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), ip, userAgent });
  const currentUserData = await getCurrentUser(user.id);
  return {
    accessToken: signAccessToken({ sub: user.id, roleId: user.roleId, sid: session.id, companyId: user.companyId?.toString(), branchId: user.branchId?.toString() }),
    user: currentUserData
  };
}

export async function getCurrentUser(userId: string) {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AuthError('USER_NOT_FOUND');
  }

  let company = null;
  let branch = null;
  let availableBranches: Array<{ id: string; code: string; name: string; address?: string }> = [];
  let roleInfo = null;
  let permissions: string[] = [];

  if (user.companyId) {
    const compDoc = await CompanyModel.findById(user.companyId);
    if (compDoc) {
      company = {
        id: compDoc.id,
        code: compDoc.code,
        name: compDoc.name,
        legalName: compDoc.legalName,
        taxId: compDoc.taxId
      };
    }
    const branchDocs = await BranchModel.find({ companyId: user.companyId, status: 'ACTIVE' }).sort({ name: 1 });
    availableBranches = branchDocs.map((b) => ({
      id: b.id,
      code: b.code,
      name: b.name,
      address: b.address
    }));
  }

  if (user.branchId) {
    const branchDoc = await BranchModel.findById(user.branchId);
    if (branchDoc) {
      branch = {
        id: branchDoc.id,
        code: branchDoc.code,
        name: branchDoc.name,
        address: branchDoc.address
      };
    }
  }

  if (user.roleId) {
    if (Types.ObjectId.isValid(user.roleId)) {
      const roleDoc = await RoleModel.findOne({ _id: user.roleId, status: 'ACTIVE' }).populate('permissionIds', 'code');
      if (roleDoc) {
        roleInfo = { id: roleDoc.id, code: roleDoc.code, name: roleDoc.name };
        permissions = roleDoc.permissionIds.map((p) => (p as unknown as { code: string }).code);
      }
    } else {
      roleInfo = { id: user.roleId, code: user.roleId, name: user.roleId };
    }
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roleId: user.roleId,
    companyId: user.companyId?.toString(),
    branchId: user.branchId?.toString(),
    status: user.status,
    company,
    branch,
    role: roleInfo,
    permissions,
    availableBranches
  };
}

export async function revokeSession(sessionId: string, userId: string) {
  await SessionModel.updateOne({ _id: sessionId, userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

export async function listUsers(companyId: string) {
  const users = await UserModel.find({ companyId }).sort({ createdAt: -1 });
  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    roleId: user.roleId,
    status: user.status,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  }));
}

export async function createUser(input: CreateUserInput, companyId: string, branchId: string) {
  const role = await RoleModel.findOne({ _id: input.roleId, companyId, status: 'ACTIVE' });
  const branch = await BranchModel.exists({ _id: branchId, companyId, status: 'ACTIVE' });
  if (!role || !branch) throw new AuthError('INVALID_ROLE');
  const existingUser = await UserModel.exists({ email: input.email });
  if (existingUser) {
    throw new AuthError('USER_EXISTS');
  }

  const { token, tokenHash } = createEmailConfirmationToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const user = await UserModel.create({
    name: input.name,
    email: input.email,
    companyId,
    branchId,
    roleId: role.id,
    status: 'PENDING_CONFIRMATION',
    emailConfirmationTokenHash: tokenHash,
    emailConfirmationExpiresAt: expiresAt
  });

  try {
    await sendInvitation(user, token);
  } catch (error) {
    await UserModel.deleteOne({
      _id: user._id,
      status: 'PENDING_CONFIRMATION',
      emailConfirmationTokenHash: tokenHash
    });
    if (error instanceof EmailDeliveryError) throw error;
    throw new EmailDeliveryError('No se pudo enviar la invitación por correo', { cause: error });
  }

  return { id: user.id, name: user.name, email: user.email, roleId: user.roleId, companyId: user.companyId?.toString(), branchId: user.branchId?.toString(), status: user.status };
}

export async function resendAccountInvitation(userId: string, companyId: string) {
  const user = await UserModel.findOne({ _id: userId, companyId });
  if (!user) throw new AuthError('USER_NOT_FOUND');
  if (user.status !== 'PENDING_CONFIRMATION') throw new AuthError('USER_NOT_PENDING_CONFIRMATION');

  const { token, tokenHash } = createEmailConfirmationToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const updated = await UserModel.updateOne(
    { _id: user._id, companyId, status: 'PENDING_CONFIRMATION' },
    { $set: { emailConfirmationTokenHash: tokenHash, emailConfirmationExpiresAt: expiresAt } }
  );
  if (updated.matchedCount !== 1) throw new AuthError('USER_NOT_PENDING_CONFIRMATION');

  await sendInvitation(user, token);
  return { id: user.id, email: user.email, status: user.status };
}

export async function confirmAccount(token: string, password: string) {
  const tokenHash = hashEmailConfirmationToken(token);
  const now = new Date();
  const pendingUser = await UserModel.findOne({
    emailConfirmationTokenHash: tokenHash,
    emailConfirmationExpiresAt: { $gt: now },
    status: 'PENDING_CONFIRMATION'
  });
  if (!pendingUser) throw new AuthError('INVALID_CONFIRMATION_TOKEN');

  const passwordHash = await hashPassword(password);
  const user = await UserModel.findOneAndUpdate(
    {
      _id: pendingUser._id,
      emailConfirmationTokenHash: tokenHash,
      emailConfirmationExpiresAt: { $gt: new Date() },
      status: 'PENDING_CONFIRMATION'
    },
    {
      $set: { passwordHash, status: 'ACTIVE', emailConfirmedAt: new Date() },
      $unset: { emailConfirmationTokenHash: 1, emailConfirmationExpiresAt: 1 }
    },
    { new: true }
  );
  if (!user) throw new AuthError('INVALID_CONFIRMATION_TOKEN');

  return { id: user.id, name: user.name, email: user.email, status: user.status };
}
