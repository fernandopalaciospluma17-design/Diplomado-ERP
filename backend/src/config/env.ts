import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/erp?replicaSet=rs0'),
  CORS_ORIGIN: z.string().min(1)
    .transform((value) => value.split(',').map((origin) => origin.trim().replace(/\/$/, '')))
    .pipe(z.array(z.string().url().refine((origin) => new URL(origin).origin === origin, 'Debe ser un origen sin ruta')).min(1))
    .default(['http://localhost:8081']),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  JWT_SECRET: z.string().min(32).optional(),
  JWT_EXPIRES_IN: z.string().min(1).default('15m'),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),
  PUBLIC_APP_URL: z.string().url().default('http://localhost:8081')
}).superRefine((value, context) => {
  if (value.NODE_ENV === 'production' && !value.JWT_SECRET) {
    context.addIssue({ code: 'custom', path: ['JWT_SECRET'], message: 'JWT_SECRET es obligatorio en producción' });
  }
  if (value.NODE_ENV === 'production' && value.CORS_ORIGIN.some((origin) => new URL(origin).protocol !== 'https:')) {
    context.addIssue({ code: 'custom', path: ['CORS_ORIGIN'], message: 'CORS_ORIGIN de producción solo puede contener orígenes HTTPS' });
  }
  if (value.NODE_ENV === 'production' && (!value.RESEND_API_KEY || !value.EMAIL_FROM)) {
    context.addIssue({ code: 'custom', path: ['RESEND_API_KEY'], message: 'RESEND_API_KEY y EMAIL_FROM son obligatorios en producción' });
  }
  if (value.NODE_ENV === 'production' && !value.PUBLIC_APP_URL.startsWith('https://')) {
    context.addIssue({ code: 'custom', path: ['PUBLIC_APP_URL'], message: 'PUBLIC_APP_URL debe usar HTTPS en producción' });
  }
}).transform((value) => ({ ...value, JWT_SECRET: value.JWT_SECRET ?? 'development-only-secret-change-me-123456' }));

export const env = envSchema.parse(process.env);
