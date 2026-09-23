import type { ErrorRequestHandler, RequestHandler } from 'express';
import { logger } from '../utils/logger.js';

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json({
    success: false,
    message: 'Recurso no encontrado',
    error: { code: 'NOT_FOUND', details: [`${request.method} ${request.originalUrl}`] }
  });
};

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  logger.error({ err: error, requestId: request.requestId }, 'Unhandled request error');
  response.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: { code: 'INTERNAL_SERVER_ERROR', details: [] }
  });
};