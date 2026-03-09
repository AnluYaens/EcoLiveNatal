import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock accountStore and bruteForce before importing the route
vi.mock('@/lib/accountStore', () => ({
  findByPin: vi.fn(),
}));

vi.mock('@/lib/bruteForce', () => ({
  isLocked: vi.fn(),
  recordFailedAttempt: vi.fn(),
  clearAttempts: vi.fn(),
}));

function makeRequest(body: unknown, ip = '1.2.3.4', extraHeaders: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/verify-pin', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
      ...extraHeaders,
    },
  });
}

describe('/api/verify-pin', () => {
  beforeEach(() => {
    // Reset module-level global rate limiter state between tests
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers(); // makes the 500ms delay instant
  });

  async function getHandler() {
    // Re-mock after resetModules
    vi.mock('@/lib/accountStore', () => ({ findByPin: vi.fn() }));
    vi.mock('@/lib/bruteForce', () => ({
      isLocked: vi.fn(),
      recordFailedAttempt: vi.fn(),
      clearAttempts: vi.fn(),
    }));
    const { POST } = await import('@/app/api/verify-pin/route');
    return POST;
  }

  async function getMocks() {
    const accountStore = await import('@/lib/accountStore');
    const bruteForce = await import('@/lib/bruteForce');
    return { accountStore, bruteForce };
  }

  it('returns 200 with accountId for a valid PIN', async () => {
    const POST = await getHandler();
    const { accountStore, bruteForce } = await getMocks();
    vi.mocked(bruteForce.isLocked).mockReturnValue({ locked: false, secondsRemaining: 0 });
    vi.mocked(accountStore.findByPin).mockReturnValue({ id: 'doc-a', pin: '111111', name: 'Dr. A', dailyLimit: 5 });

    const res = await POST(makeRequest({ pin: '111111' }));
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; accountId: string };
    expect(body.ok).toBe(true);
    expect(body.accountId).toBe('doc-a');
  });

  it('returns 403 and records failed attempt for a wrong PIN', async () => {
    const POST = await getHandler();
    const { accountStore, bruteForce } = await getMocks();
    vi.mocked(bruteForce.isLocked).mockReturnValue({ locked: false, secondsRemaining: 0 });
    vi.mocked(accountStore.findByPin).mockReturnValue(null);

    const resPromise = POST(makeRequest({ pin: '000000' }));
    vi.runAllTimersAsync();
    const res = await resPromise;

    expect(res.status).toBe(403);
    expect(vi.mocked(bruteForce.recordFailedAttempt)).toHaveBeenCalledWith('1.2.3.4');
  });

  it('returns 403 and records failed attempt for an invalid PIN format', async () => {
    const POST = await getHandler();
    const { bruteForce } = await getMocks();
    vi.mocked(bruteForce.isLocked).mockReturnValue({ locked: false, secondsRemaining: 0 });

    const resPromise = POST(makeRequest({ pin: '12345' })); // 5 digits — invalid
    vi.runAllTimersAsync();
    const res = await resPromise;

    expect(res.status).toBe(403);
    expect(vi.mocked(bruteForce.recordFailedAttempt)).toHaveBeenCalledWith('1.2.3.4');
  });

  it('returns 429 with minutes remaining when IP is locked', async () => {
    const POST = await getHandler();
    const { bruteForce } = await getMocks();
    vi.mocked(bruteForce.isLocked).mockReturnValue({ locked: true, secondsRemaining: 720 });

    const res = await POST(makeRequest({ pin: '111111' }));
    expect(res.status).toBe(429);
    const body = await res.json() as { error: string; minutes: number };
    expect(body.error).toBe('accountLocked');
    expect(body.minutes).toBe(12); // ceil(720 / 60)
  });

  it('calls clearAttempts on successful login', async () => {
    const POST = await getHandler();
    const { accountStore, bruteForce } = await getMocks();
    vi.mocked(bruteForce.isLocked).mockReturnValue({ locked: false, secondsRemaining: 0 });
    vi.mocked(accountStore.findByPin).mockReturnValue({ id: 'doc-a', pin: '111111', name: 'Dr. A', dailyLimit: 5 });

    await POST(makeRequest({ pin: '111111' }));
    expect(vi.mocked(bruteForce.clearAttempts)).toHaveBeenCalledWith('1.2.3.4');
  });

  it('extracts IP from the first value of x-forwarded-for', async () => {
    const POST = await getHandler();
    const { bruteForce } = await getMocks();
    vi.mocked(bruteForce.isLocked).mockReturnValue({ locked: false, secondsRemaining: 0 });

    const resPromise = POST(makeRequest({ pin: '000000' }, '5.5.5.5, 10.0.0.1'));
    vi.runAllTimersAsync();
    await resPromise;

    expect(vi.mocked(bruteForce.isLocked)).toHaveBeenCalledWith('5.5.5.5');
  });

  it('falls back to "unknown" when x-forwarded-for header is absent', async () => {
    const POST = await getHandler();
    const { bruteForce } = await getMocks();
    vi.mocked(bruteForce.isLocked).mockReturnValue({ locked: false, secondsRemaining: 0 });

    const req = new NextRequest('http://localhost/api/verify-pin', {
      method: 'POST',
      body: JSON.stringify({ pin: '000000' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const resPromise = POST(req);
    vi.runAllTimersAsync();
    await resPromise;

    expect(vi.mocked(bruteForce.isLocked)).toHaveBeenCalledWith('unknown');
  });

  it('returns 400 for malformed JSON body', async () => {
    const POST = await getHandler();
    const { bruteForce } = await getMocks();
    vi.mocked(bruteForce.isLocked).mockReturnValue({ locked: false, secondsRemaining: 0 });

    const req = new NextRequest('http://localhost/api/verify-pin', {
      method: 'POST',
      body: 'not-json',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 429 after exceeding the global rate limit (30 req/min)', async () => {
    const POST = await getHandler();
    const { bruteForce } = await getMocks();
    vi.mocked(bruteForce.isLocked).mockReturnValue({ locked: false, secondsRemaining: 0 });

    // Make 30 requests from different IPs (valid limit)
    for (let i = 0; i < 30; i++) {
      const resPromise = POST(makeRequest({ pin: '000000' }, `10.0.0.${i}`));
      vi.runAllTimersAsync();
      await resPromise;
    }

    // 31st request should be blocked by global rate limit
    const res = await POST(makeRequest({ pin: '000000' }, '99.99.99.99'));
    expect(res.status).toBe(429);
    const body = await res.json() as { error: string };
    expect(body.error).toContain('Demasiadas solicitudes');
  });
});
