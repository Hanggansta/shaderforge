import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyCreemSignature } from '../verify-creem-signature';

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

describe('verifyCreemSignature', () => {
  it('accepts valid HMAC signatures', () => {
    const payload = '{"eventType":"subscription.paid"}';
    const secret = 'whsec_test';
    expect(verifyCreemSignature(payload, sign(payload, secret), secret)).toBe(true);
  });

  it('rejects invalid signatures', () => {
    expect(verifyCreemSignature('{}', 'bad', 'whsec_test')).toBe(false);
  });
});