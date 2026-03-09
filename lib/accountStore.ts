import fs from 'fs';
import path from 'path';
import { getTodayUsage, incrementUsage } from './usageStore';

export interface Account {
  id: string;
  pin: string;
  name: string;
  dailyLimit: number; // 0 = unlimited
}

interface AccountsConfig {
  accounts: Account[];
}

const CONFIG_PATH = path.join(process.cwd(), 'config', 'accounts.json');

// Module-level cache
let accountsCache: Account[] | null = null;

function parseAndValidate(config: AccountsConfig): Account[] {
  const pins = config.accounts.map((a) => a.pin);
  const uniquePins = new Set(pins);
  if (uniquePins.size !== pins.length) {
    throw new Error('accounts.json contains duplicate PINs — fix before proceeding');
  }
  return config.accounts;
}

function loadAccounts(): Account[] {
  if (accountsCache) return accountsCache;

  // 1. File on disk (local / self-hosted)
  if (fs.existsSync(CONFIG_PATH)) {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    accountsCache = parseAndValidate(JSON.parse(raw) as AccountsConfig);
    return accountsCache;
  }

  // 2. ACCOUNTS_JSON env var (Vercel / serverless)
  const accountsJson = process.env.ACCOUNTS_JSON;
  if (accountsJson) {
    accountsCache = parseAndValidate(JSON.parse(accountsJson) as AccountsConfig);
    return accountsCache;
  }

  // 3. Legacy fallback: single account from ACCESS_PIN env var
  const pin = process.env.ACCESS_PIN ?? '';
  if (!pin) return [];
  accountsCache = [{ id: 'default', pin, name: 'Default', dailyLimit: 0 }];
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

export async function getTodayAccountUsage(accountId: string): Promise<number> {
  return getTodayUsage(accountId);
}

export async function isWithinLimit(accountId: string): Promise<boolean> {
  const account = findById(accountId);
  if (!account) return false;
  if (account.dailyLimit === 0) return true; // unlimited
  const usage = await getTodayUsage(accountId);
  return usage < account.dailyLimit;
}

export { incrementUsage };
