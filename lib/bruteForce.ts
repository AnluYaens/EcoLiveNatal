import {
  BRUTE_FORCE_MAX_ATTEMPTS,
  BRUTE_FORCE_WINDOW_MS,
  BRUTE_FORCE_LOCKOUT_MS,
} from './constants';

interface BruteForceEntry {
  attempts: number;
  windowStart: number;
  lockedUntil: number;
}

const bruteForceMap = new Map<string, BruteForceEntry>();

export function isLocked(ip: string): { locked: boolean; secondsRemaining: number } {
  const entry = bruteForceMap.get(ip);
  if (!entry) return { locked: false, secondsRemaining: 0 };

  const now = Date.now();
  if (entry.lockedUntil > now) {
    return {
      locked: true,
      secondsRemaining: Math.ceil((entry.lockedUntil - now) / 1000),
    };
  }
  return { locked: false, secondsRemaining: 0 };
}

export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const entry = bruteForceMap.get(ip);

  if (!entry || now - entry.windowStart > BRUTE_FORCE_WINDOW_MS) {
    // Start fresh window
    bruteForceMap.set(ip, { attempts: 1, windowStart: now, lockedUntil: 0 });
    return;
  }

  const attempts = entry.attempts + 1;
  const lockedUntil = attempts >= BRUTE_FORCE_MAX_ATTEMPTS ? now + BRUTE_FORCE_LOCKOUT_MS : entry.lockedUntil;
  bruteForceMap.set(ip, { attempts, windowStart: entry.windowStart, lockedUntil });
}

export function clearAttempts(ip: string): void {
  bruteForceMap.delete(ip);
}
