import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as accountStore from '@/lib/accountStore';
import { isLocked, recordFailedAttempt, clearAttempts } from '@/lib/bruteForce';

const PinSchema = z.object({
  pin: z.string().length(6).regex(/^\d{6}$/),
});

// Global rate limit — caps total PIN attempts across all IPs
const GLOBAL_RATE_LIMIT = 30;
const GLOBAL_RATE_WINDOW_MS = 60_000;
// Delay added to every failed attempt to slow distributed attacks
const FAIL_DELAY_MS = 500;

let globalCount = 0;
let globalWindowResetAt = Date.now() + GLOBAL_RATE_WINDOW_MS;

function checkGlobalRateLimit(): boolean {
  const now = Date.now();
  if (now > globalWindowResetAt) {
    globalCount = 1;
    globalWindowResetAt = now + GLOBAL_RATE_WINDOW_MS;
    return true;
  }
  if (globalCount >= GLOBAL_RATE_LIMIT) return false;
  globalCount++;
  return true;
}

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  // 1. Global rate limit
  if (!checkGlobalRateLimit()) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta en unos minutos.' },
      { status: 429 }
    );
  }

  const ip = getIp(req);

  // 2. Per-IP brute-force check
  const lockStatus = isLocked(ip);
  if (lockStatus.locked) {
    const minutes = Math.ceil(lockStatus.secondsRemaining / 60);
    return NextResponse.json(
      { error: 'accountLocked', minutes },
      { status: 429 }
    );
  }

  // 3. Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  // 4. Validate PIN format
  const parsed = PinSchema.safeParse(body);
  if (!parsed.success) {
    recordFailedAttempt(ip);
    await delay(FAIL_DELAY_MS);
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  // 5. Look up account
  const account = accountStore.findByPin(parsed.data.pin);
  if (!account) {
    recordFailedAttempt(ip);
    await delay(FAIL_DELAY_MS);
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  // 6. Success — clear brute-force attempts
  clearAttempts(ip);
  return NextResponse.json({ ok: true, accountId: account.id });
}
