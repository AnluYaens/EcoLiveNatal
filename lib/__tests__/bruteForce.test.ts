import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isLocked, recordFailedAttempt, clearAttempts } from '../bruteForce';

// Each test uses a unique IP to avoid cross-contamination
// (the module-level Map persists within a test file run)
let ipCounter = 0;
function nextIp(): string {
  return `10.0.0.${++ipCounter}`;
}

describe('bruteForce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isLocked', () => {
    it('returns not locked for unknown IP', () => {
      const result = isLocked(nextIp());
      expect(result).toEqual({ locked: false, secondsRemaining: 0 });
    });

    it('returns not locked after clearAttempts', () => {
      const ip = nextIp();
      for (let i = 0; i < 5; i++) recordFailedAttempt(ip);
      clearAttempts(ip);
      expect(isLocked(ip)).toEqual({ locked: false, secondsRemaining: 0 });
    });
  });

  describe('recordFailedAttempt', () => {
    it('is not locked after 4 failed attempts', () => {
      const ip = nextIp();
      for (let i = 0; i < 4; i++) recordFailedAttempt(ip);
      expect(isLocked(ip).locked).toBe(false);
    });

    it('is locked after 5 failed attempts', () => {
      const ip = nextIp();
      for (let i = 0; i < 5; i++) recordFailedAttempt(ip);
      expect(isLocked(ip).locked).toBe(true);
    });

    it('reports correct secondsRemaining when locked', () => {
      const ip = nextIp();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      for (let i = 0; i < 5; i++) recordFailedAttempt(ip);

      // Move forward 5 minutes (300 seconds into the 15-min lockout)
      vi.setSystemTime(new Date('2026-01-01T00:05:00Z'));
      const result = isLocked(ip);
      expect(result.locked).toBe(true);
      // ~600 seconds remaining (15 min - 5 min)
      expect(result.secondsRemaining).toBeGreaterThan(599);
      expect(result.secondsRemaining).toBeLessThanOrEqual(600);
    });

    it('is not locked once lockout period expires', () => {
      const ip = nextIp();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      for (let i = 0; i < 5; i++) recordFailedAttempt(ip);

      // Advance past 15-minute lockout
      vi.setSystemTime(new Date('2026-01-01T00:16:00Z'));
      expect(isLocked(ip).locked).toBe(false);
    });

    it('resets window after BRUTE_FORCE_WINDOW_MS (10 min) expires', () => {
      const ip = nextIp();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
      // 4 failed attempts in window
      for (let i = 0; i < 4; i++) recordFailedAttempt(ip);

      // Window expires (advance 11 minutes)
      vi.setSystemTime(new Date('2026-01-01T00:11:00Z'));
      // This should start a fresh window (attempt #1 in new window)
      recordFailedAttempt(ip);

      // Only 1 attempt in new window — not locked
      expect(isLocked(ip).locked).toBe(false);
    });
  });

  describe('clearAttempts', () => {
    it('unlocks a currently locked IP', () => {
      const ip = nextIp();
      for (let i = 0; i < 5; i++) recordFailedAttempt(ip);
      expect(isLocked(ip).locked).toBe(true);

      clearAttempts(ip);
      expect(isLocked(ip).locked).toBe(false);
    });

    it('is safe to call on an IP with no record', () => {
      expect(() => clearAttempts(nextIp())).not.toThrow();
    });
  });
});
