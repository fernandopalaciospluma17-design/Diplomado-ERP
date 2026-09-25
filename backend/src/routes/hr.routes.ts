import { Router } from 'express';
import { createAttendanceController, createEmployeeController, createLeaveRequestController, listAttendanceController, listEmployeesController, listLeaveRequestsController, reviewLeaveRequestController, updateEmployeeController } from '../controllers/hr.controller.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { auditAction } from '../middlewares/audit.js';

export const hrRouter = Router();
hrRouter.get('/employees', requireAuth, requirePermission('hr.employee.read'), listEmployeesController);
hrRouter.post('/employees', requireAuth, requirePermission('hr.employee.create'), auditAction('HR_EMPLOYEE_CREATE'), createEmployeeController);
hrRouter.patch('/employees/:employeeNumber', requireAuth, requirePermission('hr.employee.update'), auditAction('HR_EMPLOYEE_UPDATE'), updateEmployeeController);
hrRouter.get('/leave-requests', requireAuth, requirePermission('hr.leave.read'), listLeaveRequestsController);
hrRouter.post('/leave-requests', requireAuth, requirePermission('hr.leave.create'), auditAction('HR_LEAVE_CREATE'), createLeaveRequestController);
hrRouter.patch('/leave-requests/:requestNumber/review', requireAuth, requirePermission('hr.leave.approve'), auditAction('HR_LEAVE_REVIEW'), reviewLeaveRequestController);
hrRouter.get('/attendance', requireAuth, requirePermission('hr.attendance.read'), listAttendanceController);
hrRouter.post('/attendance', requireAuth, requirePermission('hr.attendance.create'), auditAction('HR_ATTENDANCE_CREATE'), createAttendanceController);