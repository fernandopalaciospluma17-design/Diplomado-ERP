import { Resend } from 'resend';
import { env } from '../config/env.js';

export class EmailDeliveryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'EmailDeliveryError';
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]!);
}

export async function sendAccountInvitationEmail(to: string, name: string, confirmationUrl: string) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    throw new EmailDeliveryError('El servicio de correo no está configurado');
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(confirmationUrl);
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject: 'Confirma tu cuenta de Nodara ERP',
    html: `<p>Hola ${safeName},</p><p>Se creó una cuenta para ti en Nodara ERP. Para confirmarla y establecer tu contraseña, abre este enlace (válido por 24 horas):</p><p><a href="${safeUrl}">Confirmar cuenta</a></p><p>Si no esperabas esta invitación, puedes ignorar este correo.</p>`,
    text: `Hola ${name},\n\nSe creó una cuenta para ti en Nodara ERP. Para confirmarla y establecer tu contraseña, abre este enlace (válido por 24 horas):\n${confirmationUrl}\n\nSi no esperabas esta invitación, puedes ignorar este correo.`
  });

  if (error) {
    throw new EmailDeliveryError(`Resend no pudo enviar la invitación: ${error.message}`);
  }
}

export async function sendRolePermissionsChangedEmail(to: string, name: string, roleName: string) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    throw new EmailDeliveryError('El servicio de correo no está configurado');
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const safeName = escapeHtml(name);
  const safeRoleName = escapeHtml(roleName);
  const { error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject: 'Se actualizaron los permisos de tu cuenta de Nodara ERP',
    html: `<p>Hola ${safeName},</p><p>El rol o los permisos asociados a tu cuenta fueron actualizados.</p><p>Rol: ${safeRoleName}</p><p>Si no esperabas este cambio, contacta al administrador de tu empresa.</p>`,
    text: `Hola ${name},\n\nEl rol o los permisos asociados a tu cuenta fueron actualizados.\nRol: ${roleName}\n\nSi no esperabas este cambio, contacta al administrador de tu empresa.`
  });

  if (error) {
    throw new EmailDeliveryError(`Resend no pudo enviar el aviso de cambio de permisos: ${error.message}`);
  }
}
