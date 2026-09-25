import { AttendanceModel, EmployeeModel, LeaveRequestModel } from '../models/hr.model.js';
import type { CreateAttendanceInput, CreateEmployeeInput, CreateLeaveRequestInput, ReviewLeaveRequestInput, UpdateEmployeeInput } from '../validators/hr.validators.js';

type Tenant = { companyId: string; branchId: string };
export class HRError extends Error {
  constructor(public readonly code: 'HR_DUPLICATE' | 'EMPLOYEE_NOT_FOUND' | 'LEAVE_NOT_FOUND' | 'ATTENDANCE_NOT_FOUND' | 'LEAVE_OVERLAP' | 'HR_REFERENCE_INVALID' | 'HR_STATE_INVALID') {
    const messages = {
      HR_DUPLICATE: 'El identificador de RRHH ya existe', EMPLOYEE_NOT_FOUND: 'Empleado no encontrado', LEAVE_NOT_FOUND: 'Solicitud de ausencia no encontrada',
      ATTENDANCE_NOT_FOUND: 'Registro de asistencia no encontrado', LEAVE_OVERLAP: 'La ausencia se solapa con otra solicitud activa', HR_REFERENCE_INVALID: 'El empleado no existe en el tenant', HR_STATE_INVALID: 'La transición de RRHH no está permitida'
    };
    super(messages[code]);
  }
}

export async function listEmployees(tenant: Tenant) { return EmployeeModel.find(tenant).sort({ lastName: 1, firstName: 1 }).limit(500); }
export async function createEmployee(input: CreateEmployeeInput, createdBy: string, tenant: Tenant) {
  try { return await EmployeeModel.create({ ...tenant, ...input, createdBy }); } catch (error) { if ((error as { code?: number }).code === 11000) throw new HRError('HR_DUPLICATE'); throw error; }
}
export async function updateEmployee(employeeNumber: string, input: UpdateEmployeeInput, tenant: Tenant) {
  const employee = await EmployeeModel.findOne({ ...tenant, employeeNumber: employeeNumber.toUpperCase() });
  if (!employee) throw new HRError('EMPLOYEE_NOT_FOUND');
  Object.assign(employee, input); return employee.save();
}
export async function listLeaveRequests(tenant: Tenant) { return LeaveRequestModel.find(tenant).sort({ startDate: -1 }).limit(500); }
export async function createLeaveRequest(input: CreateLeaveRequestInput, createdBy: string, tenant: Tenant) {
  if (!await EmployeeModel.exists({ ...tenant, employeeNumber: input.employeeNumber, status: 'ACTIVE' })) throw new HRError('HR_REFERENCE_INVALID');
  if (await LeaveRequestModel.exists({ ...tenant, employeeNumber: input.employeeNumber, status: { $in: ['PENDING', 'APPROVED'] }, startDate: { $lte: input.endDate }, endDate: { $gte: input.startDate } })) throw new HRError('LEAVE_OVERLAP');
  try { return await LeaveRequestModel.create({ ...tenant, ...input, status: 'PENDING', createdBy }); } catch (error) { if ((error as { code?: number }).code === 11000) throw new HRError('HR_DUPLICATE'); throw error; }
}
export async function reviewLeaveRequest(requestNumber: string, input: ReviewLeaveRequestInput, reviewedBy: string, tenant: Tenant) {
  const request = await LeaveRequestModel.findOne({ ...tenant, requestNumber: requestNumber.toUpperCase() });
  if (!request) throw new HRError('LEAVE_NOT_FOUND');
  if (request.status !== 'PENDING') throw new HRError('HR_STATE_INVALID');
  request.status = input.status; request.reviewedBy = reviewedBy; request.reviewedAt = new Date(); return request.save();
}
export async function listAttendance(tenant: Tenant, workDate?: string) { return AttendanceModel.find({ ...tenant, ...(workDate ? { workDate } : {}) }).sort({ workDate: -1, employeeNumber: 1 }).limit(1000); }
export async function createAttendance(input: CreateAttendanceInput, createdBy: string, tenant: Tenant) {
  if (!await EmployeeModel.exists({ ...tenant, employeeNumber: input.employeeNumber, status: 'ACTIVE' })) throw new HRError('HR_REFERENCE_INVALID');
  try { return await AttendanceModel.create({ ...tenant, ...input, createdBy }); } catch (error) { if ((error as { code?: number }).code === 11000) throw new HRError('HR_DUPLICATE'); throw error; }
}