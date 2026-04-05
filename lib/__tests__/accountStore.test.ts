import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findByToken, isWithinLimit } from '@/lib/accountStore';

const { redisGetMock, redisCtorMock, getTodayUsageMock } = vi.hoisted(() => {
  const redisGetMock = vi.fn();
  const redisCtorMock = vi.fn(function RedisMock() {
    return { get: redisGetMock };
  });
  const getTodayUsageMock = vi.fn();

  return { redisGetMock, redisCtorMock, getTodayUsageMock };
});

vi.mock('@upstash/redis', () => ({
  Redis: redisCtorMock,
}));

vi.mock('@/lib/usageStore', () => ({
  getTodayUsage: getTodayUsageMock,
  incrementUsage: vi.fn(),
}));

describe('accountStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
  });

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  describe('findByToken', () => {
    it('returns null when Redis is not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;

      await expect(findByToken('missing-env')).resolves.toBeNull();
      expect(redisCtorMock).not.toHaveBeenCalled();
    });

    it('returns the account when Redis stores an object payload', async () => {
      redisGetMock.mockResolvedValue({
        id: 'doc-a',
        name: 'Dr. A',
        dailyLimit: 5,
      });

      await expect(findByToken('token-a')).resolves.toEqual({
        id: 'doc-a',
        name: 'Dr. A',
        dailyLimit: 5,
      });
      expect(redisGetMock).toHaveBeenCalledWith('ecln:token:token-a');
    });

    it('parses string payloads returned by Redis', async () => {
      redisGetMock.mockResolvedValue(JSON.stringify({
        id: 'doc-b',
        name: 'Dr. B',
        dailyLimit: 0,
      }));

      await expect(findByToken('token-b')).resolves.toEqual({
        id: 'doc-b',
        name: 'Dr. B',
        dailyLimit: 0,
      });
    });

    it('returns null for an unknown token', async () => {
      redisGetMock.mockResolvedValue(null);

      await expect(findByToken('missing-token')).resolves.toBeNull();
    });
  });

  describe('isWithinLimit', () => {
    it('returns true for an unlimited account', async () => {
      await expect(isWithinLimit('doc-unlimited', 0)).resolves.toBe(true);
      expect(getTodayUsageMock).not.toHaveBeenCalled();
    });

    it('returns true when usage is below the daily limit', async () => {
      getTodayUsageMock.mockResolvedValue(4);

      await expect(isWithinLimit('doc-a', 5)).resolves.toBe(true);
      expect(getTodayUsageMock).toHaveBeenCalledWith('doc-a');
    });

    it('returns false when usage matches the daily limit', async () => {
      getTodayUsageMock.mockResolvedValue(5);

      await expect(isWithinLimit('doc-a', 5)).resolves.toBe(false);
    });

    it('returns false when usage exceeds the daily limit', async () => {
      getTodayUsageMock.mockResolvedValue(6);

      await expect(isWithinLimit('doc-a', 5)).resolves.toBe(false);
    });
  });
});
