import { Types } from 'mongoose';
import { BranchModel } from '../models/branch.model.js';
import { AuditModel } from '../models/audit.model.js';
import { CompanyModel } from '../models/company.model.js';
import { ConfigurationModel } from '../models/configuration.model.js';
import { PermissionModel } from '../models/permission.model.js';
import { RoleModel } from '../models/role.model.js';
import { SessionModel } from '../models/session.model.js';
import type { CreateBranchInput, CreateRoleInput, UpdateBranchInput, UpdateCompanyInput } from '../validators/core.validators.js';

export class CoreError extends Error {
  constructor(public readonly code: 'NOT_FOUND' | 'INVALID_PERMISSION' | 'BRANCH_COMPANY_MISMATCH') { super(code); }
}

export const listCompany = (companyId: string) => CompanyModel.findById(companyId);
export async function updateCompany(companyId: string, input: UpdateCompanyInput) {
  if (!Types.ObjectId.isValid(companyId)) throw new CoreError('NOT_FOUND');
  const company = await CompanyModel.findByIdAndUpdate(companyId, input, { new: true, runValidators: true });
  if (!company) throw new CoreError('NOT_FOUND');
  return company;
}
export const listBranches = (companyId: string) => BranchModel.find({ companyId }).sort({ name: 1 });

export async function createBranch(companyId: string, input: CreateBranchInput) {
  if (!Types.ObjectId.isValid(companyId) || !await CompanyModel.exists({ _id: companyId, status: 'ACTIVE' })) throw new CoreError('NOT_FOUND');
  return BranchModel.create({ companyId, ...input });
}

export async function updateBranch(companyId: string, branchId: string, input: UpdateBranchInput) {
  if (!Types.ObjectId.isValid(companyId) || !Types.ObjectId.isValid(branchId)) throw new CoreError('NOT_FOUND');
  const branch = await BranchModel.findOneAndUpdate({ _id: branchId, companyId }, input, { new: true, runValidators: true });
  if (!branch) throw new CoreError('NOT_FOUND');
  return branch;
}

export const listPermissions = () => PermissionModel.find().sort({ module: 1, resource: 1, action: 1 });

export async function listRoles(companyId: string) {
  return RoleModel.find({ companyId }).populate('permissionIds').sort({ name: 1 });
}

export async function createRole(companyId: string, input: CreateRoleInput, grantedPermissionCodes: string[] = []) {
  if (!Types.ObjectId.isValid(companyId) || !await CompanyModel.exists({ _id: companyId })) throw new CoreError('NOT_FOUND');
  const permissionCount = await PermissionModel.countDocuments({ _id: { $in: input.permissionIds }, code: { $in: grantedPermissionCodes } });
  if (permissionCount !== new Set(input.permissionIds).size) throw new CoreError('INVALID_PERMISSION');
  return RoleModel.create({ companyId, ...input });
}

export async function updateRole(companyId: string, roleId: string, input: Partial<CreateRoleInput>, grantedPermissionCodes: string[] = []) {
  if (!Types.ObjectId.isValid(companyId) || !Types.ObjectId.isValid(roleId)) throw new CoreError('NOT_FOUND');
  if (input.permissionIds) {
    const permissionCount = await PermissionModel.countDocuments({ _id: { $in: input.permissionIds }, code: { $in: grantedPermissionCodes } });
    if (permissionCount !== new Set(input.permissionIds).size) throw new CoreError('INVALID_PERMISSION');
  }
  const role = await RoleModel.findOneAndUpdate({ _id: roleId, companyId }, input, { new: true, runValidators: true }).populate('permissionIds');
  if (!role) throw new CoreError('NOT_FOUND');
  return role;
}

export async function listConfiguration(companyId: string, branchId?: string) {
  const query = branchId ? { companyId, branchId } : { companyId, branchId: { $exists: false } };
  return ConfigurationModel.find(query).sort({ key: 1 });
}

export async function setConfiguration(companyId: string, branchId: string | undefined, key: string, value: unknown, updatedBy: string) {
  if (branchId && !await BranchModel.exists({ _id: branchId, companyId })) throw new CoreError('BRANCH_COMPANY_MISMATCH');
  const scope = branchId ? { companyId, branchId, key } : { companyId, key, branchId: { $exists: false } };
  return ConfigurationModel.findOneAndUpdate(scope, { $set: { value, updatedBy } }, { upsert: true, new: true, runValidators: true });
}

export const listSessions = (userId: string) => SessionModel.find({ userId, revokedAt: null, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 }).select('-tokenVersion');
export const revokeAllSessions = async (userId: string) => SessionModel.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
export const listAuditEvents = (companyId: string, branchId: string) => AuditModel.find({ companyId, branchId }).sort({ createdAt: -1 }).limit(100);
