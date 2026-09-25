import { describe, expect, it } from 'vitest';
import { createAttendanceSchema, createEmployeeSchema, createLeaveRequestSchema } from '../src/validators/hr.validators.js';

describe('HR validators', () => {
  it('normalizes employee and leave request codes', () => {
    const employee = createEmployeeSchema.parse({ employeeNumber: 'emp-01', firstName: 'Ana', lastName: 'López', hiredAt: '2026-01-01' });
    const leave = createLeaveRequestSchema.parse({ requestNumber: 'vac-01', employeeNumber: 'emp-01', type: 'VACATION', startDate: '2026-02-01', endDate: '2026-02-05' });

    expect(employee.employeeNumber).toBe('EMP-01');
    expect(leave).toMatchObject({ requestNumber: 'VAC-01', employeeNumber: 'EMP-01' });
  });

  it('rejects an inverted leave date range', () => {
    expect(() => createLeaveRequestSchema.parse({ requestNumber: 'VAC-02', employeeNumber: 'EMP-01', type: 'PERSONAL', startDate: '2026-02-05', endDate: '2026-02-01' })).toThrow();
  });

  it('requires an ISO work date and ordered attendance times', () => {
    expect(() => createAttendanceSchema.parse({ employeeNumber: 'EMP-01', workDate: '01/02/2026', status: 'PRESENT' })).toThrow();
    expect(() => createAttendanceSchema.parse({ employeeNumber: 'EMP-01', workDate: '2026-02-01', status: 'PRESENT', checkIn: '2026-02-01T18:00:00Z', checkOut: '2026-02-01T08:00:00Z' })).toThrow();
  });
});