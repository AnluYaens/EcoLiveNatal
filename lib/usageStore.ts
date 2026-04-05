import fs from 'fs';
import path from 'path';
import {
  DAILY_LIMIT_PRUNE_DAYS,
  REDIS_USAGE_KEY_PREFIX,
  USAGE_REDIS_TTL_SECONDS,
} from './constants';
import { getRedisClient, isRedisConfigured } from './redis';

// ─── Types ────────────────────────────────────────────────────────────────────

type DailyUsage = Record<string, Record<string, number>>;

// ─── Filesystem implementation ────────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), 'data');
const USAGE_PATH = path.join(DATA_DIR, 'usage.json');

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
}

function readUsage(): DailyUsage {
  if (!fs.existsSync(USAGE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(USAGE_PATH, 'utf-8')) as DailyUsage;
  } catch {
    return {};
  }
}

function pruneOldDates(usage: DailyUsage): DailyUsage {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - DAILY_LIMIT_PRUNE_DAYS);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const pruned: DailyUsage = {};
  for (const date of Object.keys(usage)) {
    if (date >= cutoffStr) pruned[date] = usage[date];
  }
  return pruned;
}

function writeUsageToFile(usage: DailyUsage): void {
  const tmp = USAGE_PATH + '.tmp';
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(usage, null, 2), 'utf-8');
  fs.renameSync(tmp, USAGE_PATH);
}

// Serialize writes to avoid race conditions on the filesystem
let writeQueue: Promise<void> = Promise.resolve();

function getTodayUsageFromFile(accountId: string): number {
  const usage = readUsage();
  const today = getTodayKey();
  return usage[today]?.[accountId] ?? 0;
}

function incrementUsageInFile(accountId: string): Promise<void> {
  writeQueue = writeQueue.then(() => {
    const usage = readUsage();
    const today = getTodayKey();
    if (!usage[today]) usage[today] = {};
    usage[today][accountId] = (usage[today][accountId] ?? 0) + 1;
    writeUsageToFile(pruneOldDates(usage));
  });
  return writeQueue;
}

// ─── Redis implementation ─────────────────────────────────────────────────────

function buildRedisKey(accountId: string): string {
  const today = getTodayKey();
  return `${REDIS_USAGE_KEY_PREFIX}:${today}:${accountId}`;
}

async function getTodayUsageFromRedis(accountId: string): Promise<number> {
  const redis = getRedisClient();
  const value = await redis.get<number>(buildRedisKey(accountId));
  return value ?? 0;
}

async function incrementUsageInRedis(accountId: string): Promise<void> {
  const redis = getRedisClient();
  const key = buildRedisKey(accountId);
  await redis.incr(key);
  await redis.expire(key, USAGE_REDIS_TTL_SECONDS);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getTodayUsage(accountId: string): Promise<number> {
  if (isRedisConfigured()) return getTodayUsageFromRedis(accountId);
  return getTodayUsageFromFile(accountId);
}

export async function incrementUsage(accountId: string): Promise<void> {
  if (isRedisConfigured()) return incrementUsageInRedis(accountId);
  return incrementUsageInFile(accountId);
}
