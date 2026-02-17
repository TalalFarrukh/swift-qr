import { createHash, timingSafeEqual } from 'crypto';

export function hashQrPassword(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function verifyQrPassword(raw: string, hashed: string | null): boolean {
  if (!hashed) return false;
  const hash = hashQrPassword(raw);
  const a = Buffer.from(hash, 'utf8');
  const b = Buffer.from(hashed, 'utf8');
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

