import 'dotenv/config';
import mongoose, { Types } from 'mongoose';
import { z } from 'zod';
import { AuditModel } from '../models/audit.model.js';
import { BranchModel } from '../models/branch.model.js';
import { CatalogModel } from '../models/catalog.model.js';
import { CompanyModel } from '../models/company.model.js';
import { ConfigurationModel } from '../models/configuration.model.js';
import { ExpenseModel } from '../models/expense.model.js';
import { InventoryBalanceModel, InventoryMovementModel } from '../models/inventory.model.js';
import { PaymentModel } from '../models/payment.model.js';
import { PermissionModel } from '../models/permission.model.js';
import { PurchaseModel } from '../models/purchase.model.js';
import { RoleModel } from '../models/role.model.js';
import { SaleModel } from '../models/sale.model.js';
import { SessionModel } from '../models/session.model.js';
import { UserModel } from '../models/user.model.js';
import { hashPassword } from '../utils/password.js';

const configSchema = z.object({
  MONGODB_URI: z.string().min(1),
  INITIAL_COMPANY_CODE: z.string().trim().min(1).max(40),
  INITIAL_COMPANY_NAME: z.string().trim().min(2).max(120),
  INITIAL_COMPANY_LEGAL_NAME: z.string().trim().min(2).max(180),
  INITIAL_BRANCH_CODE: z.string().trim().min(1).max(40),
  INITIAL_BRANCH_NAME: z.string().trim().min(2).max(120),
  INITIAL_ADMIN_NAME: z.string().trim().min(2).max(120).optional(),
  INITIAL_ADMIN_EMAIL: z.string().email().optional(),
  INITIAL_ADMIN_PASSWORD: z.string().min(12).optional()
});
const parsedConfig = configSchema.safeParse(process.env);
if (!parsedConfig.success) {
  const fields = [...new Set(parsedConfig.error.issues.map((issue) => issue.path.join('.')))].join(', ');
  throw new Error(`Configuracion de migracion ausente o invalida en: ${fields}`);
}
const config = parsedConfig.data;

const permissionDefinitions = [
  ['platform', 'users', 'READ'], ['platform', 'users', 'CREATE'],
  ['platform', 'companies', 'READ'], ['platform', 'companies', 'UPDATE'], ['platform', 'branches', 'READ'], ['platform', 'branches', 'CREATE'], ['platform', 'branches', 'UPDATE'],
  ['platform', 'permissions', 'READ'], ['platform', 'roles', 'READ'], ['platform', 'roles', 'CREATE'], ['platform', 'roles', 'UPDATE'],
  ['platform', 'audit', 'READ'],
  ['platform', 'configuration', 'READ'], ['platform', 'configuration', 'UPDATE'],
  ['master-data', 'catalogs', 'READ'], ['master-data', 'catalogs', 'CREATE'], ['master-data', 'catalogs', 'UPDATE'],
  ['inventory', 'stock', 'READ'], ['inventory', 'movement', 'CREATE'],
  ['sales', 'sale', 'READ'], ['sales', 'sale', 'CREATE'], ['sales', 'payment', 'READ'], ['sales', 'payment', 'CREATE'],
  ['purchases', 'purchase', 'READ'], ['purchases', 'purchase', 'CREATE'],
  ['finance', 'expenses', 'READ'], ['finance', 'expenses', 'CREATE'],
  ['analytics', 'reports', 'READ']
] as const;

const obsoleteIndexes: Record<string, string[]> = {
  catalogs: ['kind_1_code_1', 'kind_1_status_1_name_1'],
  inventorybalances: ['productCode_1_warehouseCode_1'],
  inventorymovements: ['productCode_1_warehouseCode_1_createdAt_-1'],
  sales: ['saleNumber_1', 'createdAt_-1_status_1'],
  purchases: ['purchaseNumber_1', 'createdAt_-1_status_1'],
  payments: ['saleNumber_1_createdAt_-1'],
  expenses: ['expenseNumber_1', 'paidAt_-1_categoryCode_1'],
  audits: ['actorId_1_createdAt_-1', 'createdAt_-1']
};

async function dropObsoleteIndexes() {
  for (const [collectionName, names] of Object.entries(obsoleteIndexes)) {
    const collection = mongoose.connection.collection(collectionName);
    let indexes: { name?: string }[];
    try { indexes = await collection.indexes(); } catch (error) {
      if ((error as { code?: number }).code === 26) continue;
      throw error;
    }
    const existing = new Set(indexes.map((index) => index.name));
    for (const name of names) if (existing.has(name)) await collection.dropIndex(name);
  }
}

async function main() {
  await mongoose.connect(config.MONGODB_URI, { autoIndex: false, autoCreate: false });
  const apply = process.argv.includes('--apply');
  const code = config.INITIAL_COMPANY_CODE.trim().toUpperCase();
  const existingCompany = await CompanyModel.findOne({ code });
  const [userCount, unscopedUserCount, catalogCount, inventoryBalanceCount, inventoryMovementCount, saleCount, paymentCount, purchaseCount, expenseCount, auditCount] = await Promise.all([
    UserModel.countDocuments(), UserModel.countDocuments({ companyId: { $exists: false } }),
    CatalogModel.countDocuments({ companyId: { $exists: false } }), InventoryBalanceModel.countDocuments({ companyId: { $exists: false } }),
    InventoryMovementModel.countDocuments({ companyId: { $exists: false } }), SaleModel.countDocuments({ companyId: { $exists: false } }),
    PaymentModel.countDocuments({ companyId: { $exists: false } }), PurchaseModel.countDocuments({ companyId: { $exists: false } }),
    ExpenseModel.countDocuments({ companyId: { $exists: false } }), AuditModel.countDocuments({ companyId: { $exists: false } })
  ]);
  const legacyUsers = await UserModel.find({ companyId: { $exists: false } }).select('_id roleId');
  const currentAdminRole = existingCompany && await RoleModel.findOne({ companyId: existingCompany._id, code: 'COMPANY_ADMIN' });
  const hasCompanyAdmin = Boolean(existingCompany && currentAdminRole && await UserModel.exists({ companyId: existingCompany._id, roleId: currentAdminRole.id }));
  if (userCount === 0 && (!config.INITIAL_ADMIN_NAME || !config.INITIAL_ADMIN_EMAIL || !config.INITIAL_ADMIN_PASSWORD)) throw new Error('No hay usuarios; configura las variables INITIAL_ADMIN_* antes de continuar.');
  if (userCount > 0 && !hasCompanyAdmin && !legacyUsers.some((user) => user.roleId === 'ADMIN')) throw new Error('No se encontró un administrador en el tenant inicial. No se modificó la base.');
  console.info(JSON.stringify({ mode: apply ? 'APPLY' : 'DRY RUN', companyCode: code, companyExists: Boolean(existingCompany), unscoped: { users: unscopedUserCount, catalogs: catalogCount, inventoryBalances: inventoryBalanceCount, inventoryMovements: inventoryMovementCount, sales: saleCount, payments: paymentCount, purchases: purchaseCount, expenses: expenseCount, auditEvents: auditCount }, bootstrapAdminWillBeCreated: userCount === 0 }, null, 2));
  if (!apply) { console.info('Dry run: sin escrituras. Agrega --apply solo después de verificar el backup y el destino.'); return; }
  await dropObsoleteIndexes();

  const company = await CompanyModel.findOneAndUpdate(
    { code },
    { $setOnInsert: { code, name: config.INITIAL_COMPANY_NAME, legalName: config.INITIAL_COMPANY_LEGAL_NAME, status: 'ACTIVE' } },
    { upsert: true, new: true, runValidators: true }
  );
  const branch = await BranchModel.findOneAndUpdate(
    { companyId: company._id, code: config.INITIAL_BRANCH_CODE.toUpperCase() },
    { $setOnInsert: { companyId: company._id, code: config.INITIAL_BRANCH_CODE, name: config.INITIAL_BRANCH_NAME, status: 'ACTIVE' } },
    { upsert: true, new: true, runValidators: true }
  );

  const permissionIds = new Map<string, Types.ObjectId>();
  for (const [module, resource, action] of permissionDefinitions) {
    const code = `${module}.${resource}.${action.toLowerCase()}`;
    const permission = await PermissionModel.findOneAndUpdate(
      { code },
      { $setOnInsert: { code, module, resource, action } },
      { upsert: true, new: true, runValidators: true }
    );
    permissionIds.set(code, permission._id);
  }

  const allIds = [...permissionIds.values()];
  const userReadCodes = new Set(['master-data.catalogs.read', 'inventory.stock.read', 'sales.sale.read', 'sales.payment.read', 'purchases.purchase.read', 'finance.expenses.read']);
  const userReadIds = [...permissionIds.entries()].filter(([code]) => userReadCodes.has(code)).map(([, id]) => id);
  const companyAdminPermissions = allIds;
  const adminRole = await RoleModel.findOneAndUpdate(
    { companyId: company._id, code: 'COMPANY_ADMIN' },
    { $setOnInsert: { companyId: company._id, code: 'COMPANY_ADMIN', name: 'Administrador de empresa', permissionIds: companyAdminPermissions, status: 'ACTIVE' } },
    { upsert: true, new: true, runValidators: true }
  );
  const userRole = await RoleModel.findOneAndUpdate(
    { companyId: company._id, code: 'USER' },
    { $setOnInsert: { companyId: company._id, code: 'USER', name: 'Usuario', permissionIds: userReadIds, status: 'ACTIVE' } },
    { upsert: true, new: true, runValidators: true }
  );

  if (userCount === 0) {
    await UserModel.create({
      name: config.INITIAL_ADMIN_NAME!,
      email: config.INITIAL_ADMIN_EMAIL!.toLowerCase(),
      passwordHash: await hashPassword(config.INITIAL_ADMIN_PASSWORD!),
      companyId: company._id,
      branchId: branch._id,
      roleId: adminRole.id,
      status: 'ACTIVE'
    });
  } else if (!await UserModel.exists({ companyId: company._id, roleId: adminRole.id }) && !await UserModel.exists({ companyId: company._id, roleId: 'ADMIN' }) && !legacyUsers.some((user) => user.roleId === 'ADMIN')) {
    throw new Error('No se encontró un administrador. Asigna uno antes de migrar o proporciona una ruta segura de alta inicial.');
  }

  for (const user of legacyUsers) {
    await UserModel.updateOne({ _id: user._id, companyId: { $exists: false } }, {
      $set: { companyId: company._id, branchId: branch._id, roleId: user.roleId === 'ADMIN' ? adminRole.id : userRole.id }
    });
  }

  for (const collectionName of ['catalogs', 'inventorybalances', 'inventorymovements', 'sales', 'payments', 'purchases', 'expenses', 'audits']) {
    await mongoose.connection.collection(collectionName).updateMany(
      { companyId: { $exists: false } },
      { $set: { companyId: company._id, branchId: branch._id } }
    );
  }

  for (const model of [CompanyModel, BranchModel, PermissionModel, RoleModel, UserModel, CatalogModel, InventoryBalanceModel, InventoryMovementModel, SaleModel, PaymentModel, PurchaseModel, ExpenseModel, ConfigurationModel, SessionModel, AuditModel]) await model.createIndexes();
  console.info(`Migración completada: empresa ${company.id}, sucursal ${branch.id}; revisa estos identificadores en la bitácora de despliegue.`);
}

main().catch((error: unknown) => {
  console.error('Falló la migración de empresa inicial.', error);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect();
});
