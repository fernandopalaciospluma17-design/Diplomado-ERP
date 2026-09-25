import { z } from 'zod';

const code = z.string().trim().min(1).max(40).transform((value) => value.toUpperCase());
const date = z.coerce.date();

export const createEmployeeSchema = z.object({
  employeeNumber: code,
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).optional(),
  phone: z.string().trim().max(40).optional(),
  department: z.string().trim().max(100).optional(),
  position: z.string().trim().max(100).optional(),
  userId: z.string().trim().max(80).optional(),
  hiredAt: date
});
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = z.object({
  firstName: z.string().trim().min(2).max(80).optional(),
  lastName: z.string().trim().min(2).max(80).optional(),
  email: z.string().trim().email().max(254).optional(),
  phone: z.string().trim().max(40).optional(),
  department: z.string().trim().max(100).optional(),
  position: z.string().trim().max(100).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional()
}).refine((value) => Object.keys(value).length > 0, 'Incluye al menos un campo para actualizar');
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

export const createLeaveRequestSchema = z.object({
  requestNumber: code,
  employeeNumber: code,
  type: z.enum(['VACATION', 'SICK', 'PERSONAL', 'OTHER']),
  startDate: date,
  endDate: date,
  reason: z.string().trim().max(500).optional()
}).refine((value) => value.endDate >= value.startDate, { path: ['endDate'], message: 'La fecha final debe ser posterior o igual a la inicial' });
export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;

export const reviewLeaveRequestSchema = z.object({ status: z.enum(['APPROVED', 'REJECTED', 'CANCELLED']) });
export type ReviewLeaveRequestInput = z.infer<typeof reviewLeaveRequestSchema>;

const workDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato YYYY-MM-DD');
export const createAttendanceSchema = z.object({
  employeeNumber: code,
  workDate,
  checkIn: date.optional(),
  checkOut: date.optional(),
  status: z.enum(['PRESENT', 'ABSENT', 'REMOTE']),
  notes: z.string().trim().max(500).optional()
}).refine((value) => !value.checkIn || !value.checkOut || value.checkOut >= value.checkIn, { path: ['checkOut'], message: 'La salida debe ser posterior o igual a la entrada' });
export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>;