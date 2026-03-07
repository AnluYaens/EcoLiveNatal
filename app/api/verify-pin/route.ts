import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as accountStore from '@/lib/accountStore';
import { isLocked, recordFailedAttempt, clearAttempts } from '@/lib/bruteForce';

const PinSchema = z.object({
  pin: z.string().length(6).regex(/^\d{6}$/),
});

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);

  // 1. Brute-force check
  const lockStatus = isLocked(ip);
  if (lockStatus.locked) {
    const minutes = Math.ceil(lockStatus.secondsRemaining / 60);
    return NextResponse.json(
      { error: 'accountLocked', minutes },
      { status: 429 }
    );
  }

  // 2. Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  // 3. Validate PIN format
  const parsed = PinSchema.safeParse(body);
  if (!parsed.success) {
    recordFailedAttempt(ip);
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  // 4. Look up account
  const account = accountStore.findByPin(parsed.data.pin);
  if (!account) {
    recordFailedAttempt(ip);
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  // 5. Success — clear brute-force attempts
  clearAttempts(ip);
  return NextResponse.json({ ok: true, accountId: account.id });
}
