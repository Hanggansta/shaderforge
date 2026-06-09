import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyCreemSignature(
  payload: string,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!signatureHeader || !secret) return false;

  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  const received = signatureHeader.trim();

  try {
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(received, 'utf8');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}