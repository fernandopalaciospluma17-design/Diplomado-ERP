import { afterEach, describe, expect, it, vi } from 'vitest';

const resend = vi.hoisted(() => ({ send: vi.fn() }));

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: resend.send };
    constructor(_apiKey: string) {}
  },
}));

import { env } from '../src/config/env.js';
import { EmailDeliveryError, sendAccountInvitationEmail } from '../src/services/email.service.js';

afterEach(() => {
  vi.clearAllMocks();
});

describe('Resend invitation delivery', () => {
  it('sends an escaped invitation using the configured sender and link', async () => {
    const previous = { apiKey: env.RESEND_API_KEY, sender: env.EMAIL_FROM };
    env.RESEND_API_KEY = 're_test_key';
    env.EMAIL_FROM = 'Nodara Test <verified@example.test>';
    resend.send.mockResolvedValue({ data: { id: 'email-test-id' }, error: null });

    try {
      await expect(sendAccountInvitationEmail(
        'person@example.test',
        '<Admin & User>',
        'https://nodara.example/?confirm=opaque-token'
      )).resolves.toBeUndefined();
      expect(resend.send).toHaveBeenCalledWith(expect.objectContaining({
        from: 'Nodara Test <verified@example.test>',
        to: 'person@example.test',
        subject: 'Confirma tu cuenta de Nodara ERP',
        html: expect.stringContaining('&lt;Admin &amp; User&gt;'),
        text: expect.stringContaining('https://nodara.example/?confirm=opaque-token'),
      }));
    } finally {
      env.RESEND_API_KEY = previous.apiKey;
      env.EMAIL_FROM = previous.sender;
    }
  });

  it('does not claim delivery when the provider is not configured or rejects the request', async () => {
    const previous = { apiKey: env.RESEND_API_KEY, sender: env.EMAIL_FROM };
    try {
      env.RESEND_API_KEY = undefined;
      env.EMAIL_FROM = undefined;
      await expect(sendAccountInvitationEmail('person@example.test', 'Person', 'https://nodara.example'))
        .rejects.toBeInstanceOf(EmailDeliveryError);
      expect(resend.send).not.toHaveBeenCalled();

      env.RESEND_API_KEY = 're_test_key';
      env.EMAIL_FROM = 'Nodara Test <verified@example.test>';
      resend.send.mockResolvedValue({ data: null, error: { message: 'domain not verified' } });
      await expect(sendAccountInvitationEmail('person@example.test', 'Person', 'https://nodara.example'))
        .rejects.toThrow('domain not verified');
    } finally {
      env.RESEND_API_KEY = previous.apiKey;
      env.EMAIL_FROM = previous.sender;
    }
  });
});
