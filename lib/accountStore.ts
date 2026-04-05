import { getTodayUsage, incrementUsage } from './usageStore';
import { REDIS_TOKEN_KEY_PREFIX } from './constants';
import { getRedisClient, isRedisConfigured } from './redis';

export interface Account {
  id: string;
  name: string;
  dailyLimit: number; // 0 = unlimited
}

type RedisAccountPayload = Account;

export async function findByToken(token: string): Promise<Account | null> {
  if (!isRedisConfigured()) {
    return null;
  }

  const redis = getRedisClient();
  const raw = await redis.get<RedisAccountPayload | string>(`${REDIS_TOKEN_KEY_PREFIX}:${token}`);

  if (!raw) return null;

  // Handle both parsed object and raw string from Redis
  const data: RedisAccountPayload = typeof raw === 'string' ? JSON.parse(raw) : raw;

  return {
    id: data.id,
    name: data.name,
    dailyLimit: data.dailyLimit,
  };
}

export async function isWithinLimit(accountId: string, dailyLimit: number): Promise<boolean> {
  if (dailyLimit === 0) return true; // unlimited
  const usage = await getTodayUsage(accountId);
  return usage < dailyLimit;
}

export { incrementUsage };
