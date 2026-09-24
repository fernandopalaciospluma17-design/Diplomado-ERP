import type { RequestHandler } from 'express';
import { ZodError, z } from 'zod';
import { InventoryError } from '../services/inventory.service.js';
import { SaleError } from '../services/sale.service.js';
import { closePOSession, createPOSTicket, listPOSSessions, listPOSTickets, openPOSession, POSError } from '../services/pos.service.js';
import { closePOSessionSchema, createPOSTicketSchema, openPOSessionSchema } from '../validators/pos.validators.js';

function tenant(req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1]) { if (!req.user?.companyId || !req.user.branchId) { res.status(403).json({ success: false, message: 'Usuario sin empresa o sucursal asignada', error: { code: 'TENANT_REQUIRED', details: [] } }); return undefined; } return { companyId: req.user.companyId, branchId: req.user.branchId }; }
function handle(error: unknown, res: Parameters<RequestHandler>[1], next: Parameters<RequestHandler>[2]) {
  if (error instanceof ZodError) { res.status(422).json({ success: false, message: 'Datos invalidos', error: { code: 'VALIDATION_ERROR', details: error.issues } }); return; }
  if (error instanceof POSError) { res.status(error.code === 'POS_SESSION_NOT_FOUND' ? 404 : error.code === 'TRANSACTION_REQUIRED' ? 503 : 409).json({ success: false, message: error.message, error: { code: error.code, details: [] } }); return; }
  if (error instanceof InventoryError) { res.status(error.code === 'TRANSACTION_REQUIRED' ? 503 : error.code === 'INVALID_INVENTORY_REFERENCE' || error.code === 'INVALID_QUANTITY_PRECISION' ? 422 : 409).json({ success: false, message: error.message, error: { code: error.code, details: [] } }); return; }
  if (error instanceof SaleError) { res.status(error.code === 'SALE_NOT_FOUND' ? 404 : 409).json({ success: false, message: error.message, error: { code: error.code, details: [] } }); return; }
  next(error);
}
const key = (req: Parameters<RequestHandler>[0]) => z.string().trim().min(8).max(120).parse(req.get('idempotency-key'));
export const listPOSSessionsController: RequestHandler = async (req, res, next) => { try { const t = tenant(req, res); if (!t) return; res.status(200).json({ success: true, message: 'Sesiones POS consultadas', data: await listPOSSessions(t) }); } catch (e) { next(e); } };
export const openPOSessionController: RequestHandler = async (req, res, next) => { try { const t = tenant(req, res); if (!t) return; res.status(201).json({ success: true, message: 'Sesión POS abierta', data: await openPOSession(openPOSessionSchema.parse(req.body), req.user!.sub, t) }); } catch (e) { handle(e, res, next); } };
export const closePOSessionController: RequestHandler = async (req, res, next) => { try { const t = tenant(req, res); if (!t) return; const number = z.string().trim().min(1).max(40).parse(req.params.sessionNumber); res.status(200).json({ success: true, message: 'Sesión POS cerrada', data: await closePOSession(number, closePOSessionSchema.parse(req.body), req.user!.sub, t) }); } catch (e) { handle(e, res, next); } };
export const listPOSTicketsController: RequestHandler = async (req, res, next) => { try { const t = tenant(req, res); if (!t) return; const number = z.string().trim().min(1).max(40).parse(req.params.sessionNumber); res.status(200).json({ success: true, message: 'Tickets POS consultados', data: await listPOSTickets(number, t) }); } catch (e) { handle(e, res, next); } };
export const createPOSTicketController: RequestHandler = async (req, res, next) => { try { const t = tenant(req, res); if (!t) return; res.status(201).json({ success: true, message: 'Ticket y cobro POS registrados', data: await createPOSTicket(createPOSTicketSchema.parse(req.body), key(req), req.user!.sub, t) }); } catch (e) { handle(e, res, next); } };
