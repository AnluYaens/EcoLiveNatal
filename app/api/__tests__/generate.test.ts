import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import sharp from 'sharp';

const {
  findByTokenMock,
  isWithinLimitMock,
  incrementUsageMock,
  preprocessUltrasoundMock,
  stripYellowOverlayMock,
  trackGenerationTelemetryMock,
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
  stripYellowOverlayMock: vi.fn(),
  trackGenerationTelemetryMock: vi.fn(),
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
  stripYellowOverlay: stripYellowOverlayMock,
}));

vi.mock('@/lib/openaiClient', () => ({
  generatePortrait: generatePortraitMock,
}));

vi.mock('@/lib/generationTelemetry', () => ({
  trackGenerationTelemetry: trackGenerationTelemetryMock,
}));

vi.mock('@/lib/promptBuilder', () => ({
  buildPrompt: buildPromptMock,
  buildEnhancedPrompt: buildEnhancedPromptMock,
  buildGeminiPrompt: buildGeminiPromptMock,
  buildHeartStrictPrompt: vi.fn().mockReturnValue('heart-strict-prompt'),
  buildHeartSalvagePrompt: vi.fn().mockReturnValue('heart-salvage-prompt'),
  buildGeminiHeartStrictPrompt: vi.fn().mockReturnValue('gemini-heart-strict-prompt'),
  buildGeminiHeartSalvagePrompt: vi.fn().mockReturnValue('gemini-heart-salvage-prompt'),
}));

vi.mock('@/lib/visionAnalysis', () => ({
  analyzeUltrasound: analyzeUltrasoundMock,
}));

vi.mock('@/lib/geminiClient', () => ({
  generateAnatomicalImage: generateAnatomicalImageMock,
}));

vi.mock('@/lib/heartPreprocess', () => ({
  preprocessHeart: vi.fn().mockImplementation(async (input: Buffer) => ({
    cleanedBuffer: input, // pass through the already-valid buffer from preprocessUltrasound
    artifactMap: {
      roiBounds: { x: 128, y: 0, width: 256, height: 512 },
      measurementRingPresent: false,
      measurementRingRadiusPx: null,
      blackBands: [],
      blackBandPresent: false,
      roiCoveragePercent: 60,
      qualityClass: 'strict',
    },
  })),
  selectHeartProfile: vi.fn().mockReturnValue('salvage'),
}));

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR42mP8z/CfHgAGgwJ/l9WewQAAAABJRU5ErkJggg==';

function makeRequest(overrides: {
  token?: string;
  accountId?: string;
  style?: string;
  creativity?: string;
  mode?: string;
  anatomicalRegion?: string;
  scanType?: string;
  imageBytes?: Uint8Array;
} = {}): NextRequest {
  const formData = new FormData();
  formData.append(
    'image',
    new File([overrides.imageBytes ?? new Uint8Array([1, 2, 3, 4])], 'scan.png', {
      type: 'image/png',
    }),
  );
  formData.append('style', overrides.style ?? 'ultra');
  formData.append('creativity', overrides.creativity ?? '50');
  formData.append('mode', overrides.mode ?? 'portrait');
  formData.append('anatomicalRegion', overrides.anatomicalRegion ?? 'face');
  formData.append('scanType', overrides.scanType ?? '3d4d');
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
    stripYellowOverlayMock.mockImplementation(async (input: Buffer) => input);
    trackGenerationTelemetryMock.mockResolvedValue(undefined);
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

  it('rejects invalid mode-region combinations before consuming usage', async () => {
    const POST = await getHandler();

    const res = await POST(makeRequest({ mode: 'portrait', anatomicalRegion: 'heart' }));

    expect(res.status).toBe(400);
    expect(incrementUsageMock).not.toHaveBeenCalled();
    await expect(res.json()).resolves.toMatchObject({ error: 'badRequest' });
  });

  it('heart with weak analysis uses salvage profile via Gemini path', async () => {
    process.env.USE_GEMINI_FOR_ORGANS = 'true';
    process.env.ENABLE_VISION_ANALYSIS = 'true';
    const POST = await getHandler();
    const pngBuffer = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();

    preprocessUltrasoundMock.mockResolvedValue(pngBuffer);
    stripYellowOverlayMock.mockResolvedValue(pngBuffer);

    const { selectHeartProfile } = await import('@/lib/heartPreprocess');
    (selectHeartProfile as ReturnType<typeof vi.fn>).mockReturnValue('salvage');

    analyzeUltrasoundMock.mockResolvedValue({
      estimatedGestationalWeeks: 24,
      viewAngle: 'sagittal',
      imageQuality: 'fair',
      visibleStructures: ['left ventricle', 'right ventricle', 'septum'],
      organDetails: {
        viewPlane: 'four-chamber',
        visibleAnatomyDescription: 'Partial cardiac slice with only a few structures visible.',
        measurements: null,
        anatomyConfidence: 'medium',
        overlayInterference: 'moderate',
        sidedness: null,
        cardiacDetails: {
          visibleChambers: ['LV', 'RV'],
          septalIntegrity: 'partially visible',
          valvesVisible: [],
          greatVessels: 'not visible in this plane',
          pericardiumVisible: false,
          structuralAnomalyFlag: null,
        },
      },
      overallDescription: 'Weak cardiac view with overlays.',
    });

    const res = await POST(
      makeRequest({
        mode: 'realistic',
        anatomicalRegion: 'heart',
        scanType: '2d',
        imageBytes: new Uint8Array(pngBuffer),
      }),
    );

    expect(res.status).toBe(200);
    // Heart now uses its own prompt builders, not buildGeminiPrompt
    const { buildGeminiHeartSalvagePrompt } = await import('@/lib/promptBuilder');
    expect(buildGeminiHeartSalvagePrompt).toHaveBeenCalled();
    // The generic buildGeminiPrompt should NOT have been called for heart
    expect(buildGeminiPromptMock).not.toHaveBeenCalled();
  });

  it('heart with clean artifacts and no analysis defaults to salvage', async () => {
    process.env.MOCK_API = 'true';
    process.env.ENABLE_VISION_ANALYSIS = 'false';
    const POST = await getHandler();

    // Heart path needs a valid PNG because blackOutAnnotationPanels uses sharp
    const pngBuffer = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 0, g: 0, b: 0 } },
    }).png().toBuffer();
    preprocessUltrasoundMock.mockResolvedValue(pngBuffer);
    stripYellowOverlayMock.mockResolvedValue(pngBuffer);

    const { selectHeartProfile } = await import('@/lib/heartPreprocess');
    // No analysis → salvage regardless of clean artifacts
    (selectHeartProfile as ReturnType<typeof vi.fn>).mockReturnValue('salvage');

    const res = await POST(
      makeRequest({ mode: 'realistic', anatomicalRegion: 'heart', scanType: '2d', imageBytes: new Uint8Array(pngBuffer) }),
    );

    expect(res.status).toBe(200);
    const { buildHeartSalvagePrompt } = await import('@/lib/promptBuilder');
    expect(buildHeartSalvagePrompt).toHaveBeenCalled();
  });

  it('face requests are not affected by heart preprocessing', async () => {
    process.env.MOCK_API = 'true';
    const POST = await getHandler();

    const res = await POST(makeRequest({ mode: 'portrait', anatomicalRegion: 'face' }));

    expect(res.status).toBe(200);
    // Heart preprocess should not have been called for face
    const { preprocessHeart } = await import('@/lib/heartPreprocess');
    expect(preprocessHeart).not.toHaveBeenCalled();
  });
});
