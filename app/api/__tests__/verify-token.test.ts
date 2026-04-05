import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  findByTokenMock,
  isLockedMock,
  recordFailedAttemptMock,
  clearAttemptsMock,
} = vi.hoisted(() => ({
  findByTokenMock: vi.fn(),
  isLockedMock: vi.fn(),
  recordFailedAttemptMock: vi.fn(),
  clearAttemptsMock: vi.fn(),
}));

vi.mock('@/lib/accountStore', () => ({
  findByToken: findByTokenMock,
}));

vi.mock('@/lib/bruteForce', () => ({
  isLocked: isLockedMock,
  recordFailedAttempt: recordFailedAttemptMock,
  clearAttempts: clearAttemptsMock,
}));

function makeRequest(body: unknown, ip = '1.2.3.4'): NextRequest {
  return new NextRequest('http://localhost/api/verify-token', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
  });
}

describe('/api/verify-token', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    isLockedMock.mockReturnValue({ locked: false, secondsRemaining: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function getHandler() {
    const { POST } = await import('@/app/api/verify-token/route');
    return POST;
  }

  it('returns 200 with account metadata for a valid token', async () => {
    const POST = await getHandler();
    findByTokenMock.mockResolvedValue({ id: 'doc-a', name: 'Dr. A', dailyLimit: 5 });

    const res = await POST(makeRequest({ token: '550e8400-e29b-41d4-a716-446655440000' }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      ok: true,
      accountId: 'doc-a',
      dailyLimit: 5,
    });
  });

  it('returns 403 and records a failed attempt for an unknown token', async () => {
    const POST = await getHandler();
    findByTokenMock.mockResolvedValue(null);

    const responsePromise = POST(makeRequest({ token: '550e8400-e29b-41d4-a716-446655440000' }));
    await vi.runAllTimersAsync();
    const res = await responsePromise;

    expect(res.status).toBe(403);
    expect(recordFailedAttemptMock).toHaveBeenCalledWith('1.2.3.4');
    await expect(res.json()).resolves.toMatchObject({ error: 'unauthorized' });
  });

  it('returns 403 for an invalid token format', async () => {
    const POST = await getHandler();

    const responsePromise = POST(makeRequest({ token: 'not-a-uuid' }));
    await vi.runAllTimersAsync();
    const res = await responsePromise;

    expect(res.status).toBe(403);
    expect(recordFailedAttemptMock).toHaveBeenCalledWith('1.2.3.4');
    await expect(res.json()).resolves.toMatchObject({ error: 'unauthorized' });
  });

  it('returns 429 with remaining minutes when the IP is locked', async () => {
    const POST = await getHandler();
    isLockedMock.mockReturnValue({ locked: true, secondsRemaining: 720 });

    const res = await POST(makeRequest({ token: '550e8400-e29b-41d4-a716-446655440000' }));

    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toMatchObject({
      error: 'accountLocked',
      minutes: 12,
    });
  });

  it('clears previous attempts on success', async () => {
    const POST = await getHandler();
    findByTokenMock.mockResolvedValue({ id: 'doc-a', name: 'Dr. A', dailyLimit: 5 });

    await POST(makeRequest({ token: '550e8400-e29b-41d4-a716-446655440000' }));

    expect(clearAttemptsMock).toHaveBeenCalledWith('1.2.3.4');
  });

  it('extracts the first IP from x-forwarded-for', async () => {
    const POST = await getHandler();

    const responsePromise = POST(
      makeRequest({ token: 'not-a-uuid' }, '5.5.5.5, 10.0.0.1'),
    );
    await vi.runAllTimersAsync();
    await responsePromise;

    expect(isLockedMock).toHaveBeenCalledWith('5.5.5.5');
  });

  it('falls back to unknown when x-forwarded-for is absent', async () => {
    const POST = await getHandler();

    const req = new NextRequest('http://localhost/api/verify-token', {
      method: 'POST',
      body: JSON.stringify({ token: 'not-a-uuid' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const responsePromise = POST(req);
    await vi.runAllTimersAsync();
    await responsePromise;

    expect(isLockedMock).toHaveBeenCalledWith('unknown');
  });

  it('returns 400 for malformed JSON', async () => {
    const POST = await getHandler();

    const req = new NextRequest('http://localhost/api/verify-token', {
      method: 'POST',
      body: 'not-json',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '1.2.3.4',
      },
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'badRequest' });
  });

  it('blocks the 31st request with the global rate limit', async () => {
    const POST = await getHandler();

    for (let index = 0; index < 30; index++) {
      const responsePromise = POST(
        makeRequest({ token: 'not-a-uuid' }, `10.0.0.${index}`),
      );
      await vi.runAllTimersAsync();
      await responsePromise;
    }

    const res = await POST(makeRequest({ token: 'not-a-uuid' }, '99.99.99.99'));

    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toMatchObject({ error: 'rateLimit' });
  });

  it('returns 500 when account lookup fails unexpectedly', async () => {
    const POST = await getHandler();
    findByTokenMock.mockRejectedValue(new Error('redis down'));

    const res = await POST(makeRequest({ token: '550e8400-e29b-41d4-a716-446655440000' }));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: 'generic' });
  });
});
