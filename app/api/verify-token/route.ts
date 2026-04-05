import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import * as accountStore from '@/lib/accountStore';
import { isLocked, recordFailedAttempt, clearAttempts } from '@/lib/bruteForce';
import { createApiErrorResponse } from '@/lib/apiErrors';

const TokenSchema = z.object({
  token: z.string().uuid(),
});

// Global rate limit — caps total token attempts across all IPs
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
    return createApiErrorResponse('rateLimit', 429);
  }

  const ip = getIp(req);

  // 2. Per-IP brute-force check
  const lockStatus = isLocked(ip);
  if (lockStatus.locked) {
    const minutes = Math.ceil(lockStatus.secondsRemaining / 60);
    return createApiErrorResponse('accountLocked', 429, { minutes });
  }

  // 3. Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return createApiErrorResponse('badRequest', 400);
  }

  // 4. Validate token format (UUID)
  const parsed = TokenSchema.safeParse(body);
  if (!parsed.success) {
    recordFailedAttempt(ip);
    await delay(FAIL_DELAY_MS);
    return createApiErrorResponse('unauthorized', 403);
  }

  try {
    // 5. Look up account by token
    const account = await accountStore.findByToken(parsed.data.token);
    if (!account) {
      recordFailedAttempt(ip);
      await delay(FAIL_DELAY_MS);
      return createApiErrorResponse('unauthorized', 403);
    }

    // 6. Success — clear brute-force attempts
    clearAttempts(ip);
    return NextResponse.json({
      ok: true,
      accountId: account.id,
      dailyLimit: account.dailyLimit,
    });
  } catch {
    console.error('Verify token API request failed');
    return createApiErrorResponse('generic', 500);
  }
}
