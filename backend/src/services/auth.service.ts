import { UserModel } from '../models/user.model.js';
import { comparePassword, hashPassword } from '../utils/password.js';
import { signAccessToken } from '../utils/jwt.js';
import type { CreateUserInput, LoginInput } from '../validators/auth.validators.js';

export class AuthError extends Error {
  constructor(public readonly code: 'INVALID_CREDENTIALS' | 'INACTIVE_USER' | 'USER_NOT_FOUND' | 'USER_EXISTS') {
    super('Credenciales invalidas');
  }
}

export async function login(input: LoginInput) {
  const user = await UserModel.findOne({ email: input.email }).select('+passwordHash');
  if (!user || !(await comparePassword(input.password, user.passwordHash))) {
    throw new AuthError('INVALID_CREDENTIALS');
  }
  if (user.status !== 'ACTIVE') {
    throw new AuthError('INACTIVE_USER');
  }

  user.lastLogin = new Date();
  await user.save();

  return {
    accessToken: signAccessToken({ sub: user.id, roleId: user.roleId }),
    user: { id: user.id, name: user.name, email: user.email, roleId: user.roleId, status: user.status }
  };
}

export async function getCurrentUser(userId: string) {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AuthError('USER_NOT_FOUND');
  }

  return { id: user.id, name: user.name, email: user.email, roleId: user.roleId, status: user.status };
}

export async function listUsers() {
  const users = await UserModel.find().sort({ createdAt: -1 });
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

export async function createUser(input: CreateUserInput) {
  const existingUser = await UserModel.exists({ email: input.email });
  if (existingUser) {
    throw new AuthError('USER_EXISTS');
  }

  const user = await UserModel.create({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    roleId: input.roleId,
    status: input.status
  });

  return { id: user.id, name: user.name, email: user.email, roleId: user.roleId, status: user.status };
}