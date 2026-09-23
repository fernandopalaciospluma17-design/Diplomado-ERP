import { describe, expect, it } from 'vitest';
import { comparePassword, hashPassword } from '../src/utils/password.js';
import { signAccessToken, verifyAccessToken } from '../src/utils/jwt.js';

describe('authentication utilities', () => {
  it('hashes passwords without storing the original value', async () => {
    const password = 'correct-password';
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    await expect(comparePassword(password, hash)).resolves.toBe(true);
    await expect(comparePassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('signs and verifies an access token', () => {
    const token = signAccessToken({ sub: 'user-id', roleId: 'role-id' });

    expect(verifyAccessToken(token)).toMatchObject({ sub: 'user-id', roleId: 'role-id' });
  });
});