import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  findByTokenMock,
  isWithinLimitMock,
  incrementUsageMock,
  preprocessUltrasoundMock,
  extractYellowOverlayMock,
  generatePortraitMock,
  buildPromptMock,
  buildEnhancedPromptMock,
  buildGeminiPromptMock,
  analyzeUltrasoundMock,
  generateAnatomicalImageMock,
} = vi.hoisted(() => ({
  findByTokenMock: vi.fn(),
  isWithinLimitMock: vi.fn(),
  incrementUsageMock: vi.fn(),
  preprocessUltrasoundMock: vi.fn(),
  extractYellowOverlayMock: vi.fn(),
  generatePortraitMock: vi.fn(),
  buildPromptMock: vi.fn(),
  buildEnhancedPromptMock: vi.fn(),
  buildGeminiPromptMock: vi.fn(),
  analyzeUltrasoundMock: vi.fn(),
  generateAnatomicalImageMock: vi.fn(),
}));

vi.mock('@/lib/accountStore', () => ({
  findByToken: findByTokenMock,
  isWithinLimit: isWithinLimitMock,
  incrementUsage: incrementUsageMock,
}));

vi.mock('@/lib/imagePreprocess', () => ({
  preprocessUltrasound: preprocessUltrasoundMock,
  extractYellowOverlay: extractYellowOverlayMock,
}));

vi.mock('@/lib/openaiClient', () => ({
  generatePortrait: generatePortraitMock,
}));

vi.mock('@/lib/promptBuilder', () => ({
  buildPrompt: buildPromptMock,
  buildEnhancedPrompt: buildEnhancedPromptMock,
  buildGeminiPrompt: buildGeminiPromptMock,
}));

vi.mock('@/lib/visionAnalysis', () => ({
  analyzeUltrasound: analyzeUltrasoundMock,
}));

vi.mock('@/lib/geminiClient', () => ({
  generateAnatomicalImage: generateAnatomicalImageMock,
}));

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR42mP8z/CfHgAGgwJ/l9WewQAAAABJRU5ErkJggg==';

function makeRequest(overrides: {
  token?: string;
  accountId?: string;
  style?: string;
  creativity?: string;
} = {}): NextRequest {
  const formData = new FormData();
  formData.append(
    'image',
    new File([new Uint8Array([1, 2, 3, 4])], 'scan.png', { type: 'image/png' }),
  );
  formData.append('style', overrides.style ?? 'ultra');
  formData.append('creativity', overrides.creativity ?? '50');
  formData.append('token', overrides.token ?? '550e8400-e29b-41d4-a716-446655440000');
  formData.append('accountId', overrides.accountId ?? 'acct-1');

  return new NextRequest('http://localhost/api/generate', {
    method: 'POST',
    body: formData,
    headers: { 'x-forwarded-for': '1.2.3.4' },
  });
}

describe('/api/generate usage handling', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    process.env.MOCK_API = 'false';
    process.env.USE_GEMINI_FOR_ORGANS = 'false';
    process.env.ENABLE_VISION_ANALYSIS = 'false';
    process.env.ENABLE_SESSION_IMAGE_CACHE = 'false';

    findByTokenMock.mockResolvedValue({ id: 'acct-1', name: 'Dr. A', dailyLimit: 5 });
    isWithinLimitMock.mockResolvedValue(true);
    incrementUsageMock.mockResolvedValue(undefined);
    preprocessUltrasoundMock.mockResolvedValue(Buffer.from('processed-image'));
    extractYellowOverlayMock.mockResolvedValue(null);
    buildPromptMock.mockReturnValue('prompt');
    buildEnhancedPromptMock.mockReturnValue('prompt');
    buildGeminiPromptMock.mockReturnValue('prompt');
    analyzeUltrasoundMock.mockResolvedValue(null);
    generateAnatomicalImageMock.mockResolvedValue(PNG_BASE64);
    generatePortraitMock.mockResolvedValue(PNG_BASE64);
  });

  async function getHandler() {
    const { POST } = await import('@/app/api/generate/route');
    return POST;
  }

  it('does not consume usage when the token is invalid', async () => {
    const POST = await getHandler();
    findByTokenMock.mockResolvedValue(null);

    const res = await POST(makeRequest());

    expect(res.status).toBe(403);
    expect(incrementUsageMock).not.toHaveBeenCalled();
    await expect(res.json()).resolves.toMatchObject({ error: 'unauthorized' });
  });

  it('does not consume usage when the daily limit is exceeded', async () => {
    const POST = await getHandler();
    isWithinLimitMock.mockResolvedValue(false);

    const res = await POST(makeRequest());

    expect(res.status).toBe(429);
    expect(incrementUsageMock).not.toHaveBeenCalled();
    await expect(res.json()).resolves.toMatchObject({ error: 'dailyLimitExceeded' });
  });

  it('does not consume usage on timeout', async () => {
    const POST = await getHandler();
    generatePortraitMock.mockRejectedValue(new Error('timeout'));

    const res = await POST(makeRequest());

    expect(res.status).toBe(504);
    expect(incrementUsageMock).not.toHaveBeenCalled();
    await expect(res.json()).resolves.toMatchObject({ error: 'timeout' });
  });

  it('does not consume usage on content block', async () => {
    const POST = await getHandler();
    generatePortraitMock.mockRejectedValue({ code: 'content_policy_violation' });

    const res = await POST(makeRequest());

    expect(res.status).toBe(400);
    expect(incrementUsageMock).not.toHaveBeenCalled();
    await expect(res.json()).resolves.toMatchObject({ error: 'contentBlock' });
  });

  it('consumes usage only when a new image is returned successfully', async () => {
    process.env.MOCK_API = 'true';
    const POST = await getHandler();

    const res = await POST(makeRequest());
    const body = (await res.json()) as { image?: string };

    expect(res.status).toBe(200);
    expect(body.image).toBeTruthy();
    expect(incrementUsageMock).toHaveBeenCalledTimes(1);
  });

  it('does not consume additional usage on a session cache hit', async () => {
    process.env.MOCK_API = 'true';
    process.env.ENABLE_SESSION_IMAGE_CACHE = 'true';
    const POST = await getHandler();

    const firstResponse = await POST(makeRequest());
    const secondResponse = await POST(makeRequest());

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(isWithinLimitMock).toHaveBeenCalledTimes(1);
    expect(incrementUsageMock).toHaveBeenCalledTimes(1);
  });
});
