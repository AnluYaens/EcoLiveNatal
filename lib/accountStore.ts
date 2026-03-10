import { getTodayUsage, incrementUsage } from './usageStore';

export interface Account {
  id: string;
  name: string;
  dailyLimit: number; // 0 = unlimited
}

interface TokenData {
  id: string;
  name: string;
  dailyLimit: number;
}

async function getRedis() {
  const { Redis } = await import('@upstash/redis');
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

export async function findByToken(token: string): Promise<Account | null> {
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    return null;
  }

  const redis = await getRedis();
  const redisKey = `ecln:token:${token}`;
  const raw = await redis.get<TokenData | string>(redisKey);

  if (!raw) return null;

  // Handle both parsed object and raw string from Redis
  const data: TokenData = typeof raw === 'string' ? JSON.parse(raw) : raw;

  return {
    id: data.id,
    name: data.name,
    dailyLimit: data.dailyLimit,
  };
}

export async function findById(accountId: string): Promise<Account | null> {
  // For limit checks we need to scan — but we already have the account data
  // from the initial token lookup, so this is only used for isWithinLimit.
  // We store account data in the token, so we can't look up by ID without
  // knowing the token. Instead, store a reverse mapping.
  if (!process.env.UPSTASH_REDIS_REST_URL) return null;

  const redis = await getRedis();
  const raw = await redis.get<TokenData | string>(`ecln:account:${accountId}`);
  if (!raw) return null;

  const data: TokenData = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return { id: data.id, name: data.name, dailyLimit: data.dailyLimit };
}

export async function isWithinLimit(accountId: string, dailyLimit: number): Promise<boolean> {
  if (dailyLimit === 0) return true; // unlimited
  const usage = await getTodayUsage(accountId);
  return usage < dailyLimit;
}

export { incrementUsage };
