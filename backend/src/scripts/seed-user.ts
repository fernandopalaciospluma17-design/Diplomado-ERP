import 'dotenv/config';
import mongoose from 'mongoose';
import { CompanyModel } from '../models/company.model.js';
import { BranchModel } from '../models/branch.model.js';
import { RoleModel } from '../models/role.model.js';
import { UserModel } from '../models/user.model.js';
import { hashPassword } from '../utils/password.js';

async function seed() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/erp?replicaSet=rs0';
  console.log(`Conectando a MongoDB en: ${mongoUri}...`);
  await mongoose.connect(mongoUri);

  const companyCode = 'NODARA';
  let company = await CompanyModel.findOne({ code: companyCode });
  if (!company) {
    company = await CompanyModel.create({
      code: companyCode,
      name: 'Nodara ERP',
      legalName: 'Nodara ERP S.A.',
      status: 'ACTIVE'
    });
  }

  let branch = await BranchModel.findOne({ companyId: company._id, code: 'PRINCIPAL' });
  if (!branch) {
    branch = await BranchModel.create({
      companyId: company._id,
      code: 'PRINCIPAL',
      name: 'Sucursal Principal',
      status: 'ACTIVE'
    });
  }

  let adminRole = await RoleModel.findOne({ companyId: company._id, code: 'COMPANY_ADMIN' });
  if (!adminRole) {
    adminRole = await RoleModel.create({
      companyId: company._id,
      code: 'COMPANY_ADMIN',
      name: 'Administrador de empresa',
      permissionIds: [],
      status: 'ACTIVE'
    });
  }

  const email = 'admin@nodara.com';
  const password = 'Admin123456!';
  const passwordHash = await hashPassword(password);

  let user = await UserModel.findOne({ email });
  if (!user) {
    user = await UserModel.create({
      name: 'Administrador Nodara',
      email,
      passwordHash,
      companyId: company._id,
      branchId: branch._id,
      roleId: adminRole.id,
      status: 'ACTIVE'
    });
    console.log('✅ Usuario creado exitosamente:');
  } else {
    user.passwordHash = passwordHash;
    user.companyId = company._id;
    user.branchId = branch._id;
    user.roleId = adminRole.id;
    user.status = 'ACTIVE';
    await user.save();
    console.log('✅ Usuario actualizado exitosamente:');
  }

  console.log(`   Correo: ${email}`);
  console.log(`   Contraseña: ${password}`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('❌ Error creando usuario:', err);
  process.exit(1);
});
