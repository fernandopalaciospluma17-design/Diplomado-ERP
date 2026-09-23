import { UserModel } from '../models/user.model.js';
import { SessionModel } from '../models/session.model.js';
import { RoleModel } from '../models/role.model.js';
import { BranchModel } from '../models/branch.model.js';
import { CompanyModel } from '../models/company.model.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { signAccessToken } from '../utils/jwt.js';
import type { CreateUserInput, LoginInput } from '../validators/auth.validators.js';

export class AuthError extends Error {
  constructor(public readonly code: 'INVALID_CREDENTIALS' | 'INACTIVE_USER' | 'USER_NOT_FOUND' | 'USER_EXISTS' | 'INVALID_ROLE' | 'TENANT_NOT_CONFIGURED') {
    super('Credenciales invalidas');
  }
}

export async function login(input: LoginInput, ip?: string, userAgent?: string) {
  const user = await UserModel.findOne({ email: input.email }).select('+passwordHash');
  if (!user || !(await comparePassword(input.password, user.passwordHash))) {
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
  return {
    accessToken: signAccessToken({ sub: user.id, roleId: user.roleId, sid: session.id, companyId: user.companyId?.toString(), branchId: user.branchId?.toString() }),
    user: { id: user.id, name: user.name, email: user.email, roleId: user.roleId, companyId: user.companyId?.toString(), branchId: user.branchId?.toString(), status: user.status }
  };
}

export async function getCurrentUser(userId: string) {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AuthError('USER_NOT_FOUND');
  }

  return { id: user.id, name: user.name, email: user.email, roleId: user.roleId, companyId: user.companyId?.toString(), branchId: user.branchId?.toString(), status: user.status };
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

  const user = await UserModel.create({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    companyId,
    branchId,
    roleId: role.id,
    status: input.status
  });

  return { id: user.id, name: user.name, email: user.email, roleId: user.roleId, companyId: user.companyId?.toString(), branchId: user.branchId?.toString(), status: user.status };
}
