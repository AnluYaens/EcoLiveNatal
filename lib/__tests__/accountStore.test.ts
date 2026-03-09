import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs before importing accountStore
vi.mock('fs', () => {
  const existsSync = vi.fn();
  const readFileSync = vi.fn();
  const writeFileSync = vi.fn();
  const renameSync = vi.fn();
  const mkdirSync = vi.fn();
  return {
    default: { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync },
    existsSync,
    readFileSync,
    writeFileSync,
    renameSync,
    mkdirSync,
  };
});

// Mock usageStore so accountStore tests focus on account logic only
vi.mock('@/lib/usageStore', () => ({
  getTodayUsage: vi.fn(),
  incrementUsage: vi.fn(),
}));

const TEST_ACCOUNTS = {
  accounts: [
    { id: 'doc-a', pin: '111111', name: 'Dr. A', dailyLimit: 5 },
    { id: 'doc-b', pin: '222222', name: 'Dr. B', dailyLimit: 0 },
  ],
};

describe('accountStore', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function setupStore(accountsJson: object) {
    const fs = await import('fs');
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(accountsJson));
    return import('@/lib/accountStore');
  }

  describe('findByPin', () => {
    it('returns the account for a valid PIN', async () => {
      const { findByPin } = await setupStore(TEST_ACCOUNTS);
      expect(findByPin('111111')).toEqual(TEST_ACCOUNTS.accounts[0]);
    });

    it('returns null for an unknown PIN', async () => {
      const { findByPin } = await setupStore(TEST_ACCOUNTS);
      expect(findByPin('999999')).toBeNull();
    });

    it('uses ACCOUNTS_JSON env var when file is absent', async () => {
      const fs = await import('fs');
      vi.mocked(fs.existsSync).mockReturnValue(false);
      process.env.ACCOUNTS_JSON = JSON.stringify(TEST_ACCOUNTS);
      const { findByPin } = await import('@/lib/accountStore');
      expect(findByPin('111111')).toEqual(TEST_ACCOUNTS.accounts[0]);
      delete process.env.ACCOUNTS_JSON;
    });

    it('returns null when no file, no ACCOUNTS_JSON, and no ACCESS_PIN', async () => {
      const fs = await import('fs');
      vi.mocked(fs.existsSync).mockReturnValue(false);
      delete process.env.ACCOUNTS_JSON;
      delete process.env.ACCESS_PIN;
      const { findByPin } = await import('@/lib/accountStore');
      expect(findByPin('111111')).toBeNull();
    });
  });

  describe('findById', () => {
    it('returns the account for a valid ID', async () => {
      const { findById } = await setupStore(TEST_ACCOUNTS);
      expect(findById('doc-b')).toEqual(TEST_ACCOUNTS.accounts[1]);
    });

    it('returns null for an unknown ID', async () => {
      const { findById } = await setupStore(TEST_ACCOUNTS);
      expect(findById('unknown-id')).toBeNull();
    });
  });

  describe('PIN uniqueness validation', () => {
    it('throws if two accounts share the same PIN', async () => {
      const duplicateConfig = {
        accounts: [
          { id: 'doc-a', pin: '111111', name: 'Dr. A', dailyLimit: 5 },
          { id: 'doc-b', pin: '111111', name: 'Dr. B', dailyLimit: 10 },
        ],
      };
      const { findByPin } = await setupStore(duplicateConfig);
      expect(() => findByPin('111111')).toThrow('duplicate PINs');
    });
  });

  describe('isWithinLimit', () => {
    it('returns false for an unknown accountId', async () => {
      const { isWithinLimit } = await setupStore(TEST_ACCOUNTS);
      const usageStore = await import('@/lib/usageStore');
      vi.mocked(usageStore.getTodayUsage).mockResolvedValue(0);
      expect(await isWithinLimit('nonexistent')).toBe(false);
    });

    it('returns true for an unlimited account (dailyLimit: 0) regardless of usage', async () => {
      const { isWithinLimit } = await setupStore(TEST_ACCOUNTS);
      const usageStore = await import('@/lib/usageStore');
      vi.mocked(usageStore.getTodayUsage).mockResolvedValue(9999);
      // doc-b has dailyLimit: 0 — unlimited, getTodayUsage not even called
      expect(await isWithinLimit('doc-b')).toBe(true);
    });

    it('returns true when usage is below dailyLimit', async () => {
      const { isWithinLimit } = await setupStore(TEST_ACCOUNTS);
      const usageStore = await import('@/lib/usageStore');
      vi.mocked(usageStore.getTodayUsage).mockResolvedValue(4);
      // doc-a has dailyLimit: 5, usage is 4
      expect(await isWithinLimit('doc-a')).toBe(true);
    });

    it('returns false when usage equals dailyLimit', async () => {
      const { isWithinLimit } = await setupStore(TEST_ACCOUNTS);
      const usageStore = await import('@/lib/usageStore');
      vi.mocked(usageStore.getTodayUsage).mockResolvedValue(5);
      // doc-a has dailyLimit: 5, usage is 5
      expect(await isWithinLimit('doc-a')).toBe(false);
    });

    it('returns false when usage exceeds dailyLimit', async () => {
      const { isWithinLimit } = await setupStore(TEST_ACCOUNTS);
      const usageStore = await import('@/lib/usageStore');
      vi.mocked(usageStore.getTodayUsage).mockResolvedValue(10);
      expect(await isWithinLimit('doc-a')).toBe(false);
    });
  });
});
