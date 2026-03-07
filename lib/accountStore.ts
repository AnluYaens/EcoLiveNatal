import fs from 'fs';
import path from 'path';
import { DAILY_LIMIT_PRUNE_DAYS } from './constants';

export interface Account {
  id: string;
  pin: string;
  name: string;
  dailyLimit: number; // 0 = unlimited
}

interface AccountsConfig {
  accounts: Account[];
}

type DailyUsage = Record<string, Record<string, number>>;

const CONFIG_PATH = path.join(process.cwd(), 'config', 'accounts.json');
const DATA_DIR = path.join(process.cwd(), 'data');
const USAGE_PATH = path.join(DATA_DIR, 'usage.json');

// Module-level cache
let accountsCache: Account[] | null = null;

function loadAccounts(): Account[] {
  if (accountsCache) return accountsCache;

  if (!fs.existsSync(CONFIG_PATH)) {
    // Fallback: single account from env var
    const pin = process.env.ACCESS_PIN ?? '';
    if (!pin) return [];
    accountsCache = [{ id: 'default', pin, name: 'Default', dailyLimit: 0 }];
    return accountsCache;
  }

  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  const config: AccountsConfig = JSON.parse(raw) as AccountsConfig;

  // Validate PIN uniqueness
  const pins = config.accounts.map((a) => a.pin);
  const uniquePins = new Set(pins);
  if (uniquePins.size !== pins.length) {
    throw new Error('accounts.json contains duplicate PINs — fix before proceeding');
  }

  accountsCache = config.accounts;
  return accountsCache;
}

export function findByPin(pin: string): Account | null {
  const accounts = loadAccounts();
  return accounts.find((a) => a.pin === pin) ?? null;
}

export function findById(id: string): Account | null {
  const accounts = loadAccounts();
  return accounts.find((a) => a.id === id) ?? null;
}

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

// Serialize writes to avoid race conditions
let writeQueue: Promise<void> = Promise.resolve();

async function writeUsage(usage: DailyUsage): Promise<void> {
  const tmp = USAGE_PATH + '.tmp';
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(usage, null, 2), 'utf-8');
  fs.renameSync(tmp, USAGE_PATH);
}

export function getTodayUsage(accountId: string): number {
  const usage = readUsage();
  const today = getTodayKey();
  return usage[today]?.[accountId] ?? 0;
}

export function isWithinLimit(accountId: string): boolean {
  const account = findById(accountId);
  if (!account) return false;
  if (account.dailyLimit === 0) return true; // unlimited
  return getTodayUsage(accountId) < account.dailyLimit;
}

export function incrementUsage(accountId: string): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    const usage = readUsage();
    const today = getTodayKey();
    if (!usage[today]) usage[today] = {};
    usage[today][accountId] = (usage[today][accountId] ?? 0) + 1;
    const pruned = pruneOldDates(usage);
    await writeUsage(pruned);
  });
  return writeQueue;
}
