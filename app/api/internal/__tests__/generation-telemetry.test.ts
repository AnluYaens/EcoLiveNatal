import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { getGenerationTelemetrySnapshotMock } = vi.hoisted(() => ({
  getGenerationTelemetrySnapshotMock: vi.fn(),
}));

vi.mock('@/lib/generationTelemetry', () => ({
  getGenerationTelemetrySnapshot: getGenerationTelemetrySnapshotMock,
}));

function makeRequest(token?: string): NextRequest {
  return new NextRequest('http://localhost/api/internal/generation-telemetry', {
    method: 'GET',
    headers: token
      ? { authorization: `Bearer ${token}` }
      : {},
  });
}

describe('/api/internal/generation-telemetry', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.INTERNAL_METRICS_TOKEN = 'secret-token';
    getGenerationTelemetrySnapshotMock.mockResolvedValue({
      summary: { totalEvents: 2 },
      recentEvents: [{ id: 'evt-1' }],
    });
  });

  async function getHandler() {
    const { GET } = await import('@/app/api/internal/generation-telemetry/route');
    return GET;
  }

  it('returns 401 without a valid bearer token', async () => {
    const GET = await getHandler();

    const res = await GET(makeRequest());

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ error: 'unauthorized' });
  });

  it('returns the telemetry snapshot for an authorized request', async () => {
    const GET = await getHandler();

    const res = await GET(makeRequest('secret-token'));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      summary: { totalEvents: 2 },
      recentEvents: [{ id: 'evt-1' }],
    });
  });

  it('returns 500 when snapshot retrieval fails unexpectedly', async () => {
    const GET = await getHandler();
    getGenerationTelemetrySnapshotMock.mockRejectedValue(new Error('redis down'));

    const res = await GET(makeRequest('secret-token'));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({ error: 'generic' });
  });
});
