import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import sharp from 'sharp';

const {
  findByTokenMock,
  isWithinLimitMock,
  incrementUsageMock,
  preprocessUltrasoundMock,
  stripYellowOverlayMock,
  hasMaskStripsMock,
  trackGenerationTelemetryMock,
  imagesEditMock,
  toFileMock,
  buildGeminiPromptMock,
  buildCanonicalPromptMock,
  analyzeUltrasoundMock,
  generateAnatomicalImageMock,
} = vi.hoisted(() => ({
  findByTokenMock: vi.fn(),
  isWithinLimitMock: vi.fn(),
  incrementUsageMock: vi.fn(),
  preprocessUltrasoundMock: vi.fn(),
  stripYellowOverlayMock: vi.fn(),
  hasMaskStripsMock: vi.fn(),
  trackGenerationTelemetryMock: vi.fn(),
  imagesEditMock: vi.fn(),
  toFileMock: vi.fn(),
  buildGeminiPromptMock: vi.fn(),
  buildCanonicalPromptMock: vi.fn(),
  analyzeUltrasoundMock: vi.fn(),
  generateAnatomicalImageMock: vi.fn(),
}));

vi.mock('openai', () => {
  class APIError extends Error {
    code?: string;
    status?: number;
    type?: string;
    requestID?: string;
  }

  class OpenAIMock {
    static APIError = APIError;
    images = {
      edit: imagesEditMock,
    };
  }

  return {
    default: OpenAIMock,
    toFile: toFileMock,
  };
});

vi.mock('@/lib/accountStore', () => ({
  findByToken: findByTokenMock,
  isWithinLimit: isWithinLimitMock,
  incrementUsage: incrementUsageMock,
}));

vi.mock('@/lib/imagePreprocess', () => ({
  preprocessUltrasound: preprocessUltrasoundMock,
  stripYellowOverlay: stripYellowOverlayMock,
  hasMaskStrips: hasMaskStripsMock,
}));

vi.mock('@/lib/generationTelemetry', () => ({
  trackGenerationTelemetry: trackGenerationTelemetryMock,
}));

vi.mock('@/lib/promptBuilder', () => ({
  buildCanonicalPrompt: buildCanonicalPromptMock,
  buildGeminiPrompt: buildGeminiPromptMock,
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
let inputPngBuffer: Buffer<ArrayBufferLike> = Buffer.from(PNG_BASE64, 'base64');
let generatedPngBase64 = PNG_BASE64;

function toBlobPart(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

beforeAll(async () => {
  inputPngBuffer = await sharp({
    create: {
      width: 64,
      height: 64,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  }).png().toBuffer();

  generatedPngBase64 = (await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 3,
      background: { r: 232, g: 160, b: 160 },
    },
  }).png().toBuffer()).toString('base64');
});

function makeRequest(overrides: {
  token?: string;
  accountId?: string;
  creativity?: string;
  mode?: string;
  anatomicalRegion?: string;
  scanType?: string;
  imageBytes?: Uint8Array;
} = {}): NextRequest {
  const formData = new FormData();
  formData.append(
    'image',
    new File([toBlobPart(overrides.imageBytes ?? inputPngBuffer)], 'scan.png', {
      type: 'image/png',
    }),
  );
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
    process.env.IMAGE_PROVIDER_STRATEGY = 'openai_all';
    process.env.USE_GEMINI_FOR_ORGANS = 'false';
    process.env.ENABLE_VISION_ANALYSIS = 'false';
    process.env.ENABLE_SESSION_IMAGE_CACHE = 'false';
    process.env.OPENAI_PORTRAIT_MODEL = '';
    process.env.OPENAI_ANATOMICAL_MODEL = '';
    process.env.OPENAI_IMAGE_TIMEOUT_MS = '';
    process.env.USE_SHORT_PROMPTS = 'false';
    process.env.SKIP_IMAGE_PREPROCESS = 'false';

    findByTokenMock.mockResolvedValue({ id: 'acct-1', name: 'Dr. A', dailyLimit: 5 });
    isWithinLimitMock.mockResolvedValue(true);
    incrementUsageMock.mockResolvedValue(undefined);
    preprocessUltrasoundMock.mockResolvedValue(inputPngBuffer);
    stripYellowOverlayMock.mockImplementation(async (input: Buffer) => input);
    hasMaskStripsMock.mockReturnValue(false);
    trackGenerationTelemetryMock.mockResolvedValue(undefined);
    buildGeminiPromptMock.mockReturnValue('prompt');
    buildCanonicalPromptMock.mockImplementation(
      (input: { mode: string; anatomicalRegion: string }) => ({
        prompt: `canonical-${input.mode}-${input.anatomicalRegion}`,
        promptType:
          input.mode === 'portrait'
            ? 'portraitPrompt'
            : input.anatomicalRegion === 'heart'
              ? 'heartPrompt'
              : 'anatomicalPrompt',
      }),
    );
    analyzeUltrasoundMock.mockResolvedValue(null);
    generateAnatomicalImageMock.mockResolvedValue(generatedPngBase64);
    imagesEditMock.mockResolvedValue({ data: [{ b64_json: generatedPngBase64 }] });
    toFileMock.mockImplementation(async (input: Buffer) =>
      new File([toBlobPart(input)], 'ultrasound.png', { type: 'image/png' }),
    );
  });

  async function getHandler() {
    const { POST } = await import('@/app/api/generate/route');
    return POST;
  }

  function lastImageEditCall(): {
    model?: string;
    input_fidelity?: string;
    quality?: string;
    size?: string;
  } {
    const call = imagesEditMock.mock.calls.at(-1)?.[0] as
      | {
          model?: string;
          input_fidelity?: string;
          quality?: string;
          size?: string;
        }
      | undefined;
    if (!call) {
      throw new Error('Expected OpenAI image edit to be called');
    }
    return call;
  }

  function lastToFileInputBuffer(): Buffer {
    const input = toFileMock.mock.calls.at(-1)?.[0];
    if (!Buffer.isBuffer(input)) {
      throw new Error('Expected OpenAI toFile to receive a Buffer');
    }
    return input;
  }

  function lastImageEditOptions(): {
    maxRetries?: number;
    signal?: AbortSignal;
    timeout?: number;
  } {
    const options = imagesEditMock.mock.calls.at(-1)?.[1] as
      | { maxRetries?: number; signal?: AbortSignal; timeout?: number }
      | undefined;
    if (!options) {
      throw new Error('Expected OpenAI image edit options');
    }
    return options;
  }

  function lastCanonicalPromptInput(): {
    mode?: string;
    anatomicalRegion?: string;
    scanType?: string;
    analysis?: unknown;
  } {
    const input = buildCanonicalPromptMock.mock.calls.at(-1)?.[0] as
      | {
          mode?: string;
          anatomicalRegion?: string;
          scanType?: string;
          analysis?: unknown;
        }
      | undefined;
    if (!input) {
      throw new Error('Expected buildCanonicalPrompt to be called');
    }
    return input;
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
    imagesEditMock.mockRejectedValue(new Error('timeout'));

    const res = await POST(makeRequest());

    expect(res.status).toBe(504);
    expect(incrementUsageMock).not.toHaveBeenCalled();
    await expect(res.json()).resolves.toMatchObject({ error: 'timeout' });
  });

  it('does not consume usage on content block', async () => {
    const POST = await getHandler();
    imagesEditMock.mockRejectedValue({ code: 'content_policy_violation' });

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

  it('dual strategy keeps anatomical flows on OpenAI when the Gemini legacy flag is off', async () => {
    process.env.IMAGE_PROVIDER_STRATEGY = 'dual';
    process.env.USE_GEMINI_FOR_ORGANS = 'false';
    const POST = await getHandler();

    const res = await POST(
      makeRequest({ mode: 'realistic', anatomicalRegion: 'heart', scanType: '2d' }),
    );

    expect(res.status).toBe(200);
    expect(imagesEditMock).toHaveBeenCalledTimes(1);
    expect(generateAnatomicalImageMock).not.toHaveBeenCalled();
    expect(lastImageEditCall()).toMatchObject({ model: 'gpt-image-2' });
  });

  it('openai_all routes anatomical flows through OpenAI with OPENAI_ANATOMICAL_MODEL', async () => {
    process.env.IMAGE_PROVIDER_STRATEGY = 'openai_all';
    process.env.USE_GEMINI_FOR_ORGANS = 'true';
    process.env.OPENAI_ANATOMICAL_MODEL = 'gpt-image-2';
    const POST = await getHandler();

    const res = await POST(
      makeRequest({ mode: 'realistic', anatomicalRegion: 'heart', scanType: '2d' }),
    );

    expect(res.status).toBe(200);
    expect(imagesEditMock).toHaveBeenCalledTimes(1);
    expect(generateAnatomicalImageMock).not.toHaveBeenCalled();
    expect(lastImageEditCall()).toMatchObject({ model: 'gpt-image-2' });
    expect(lastImageEditOptions()).toMatchObject({
      maxRetries: 0,
      timeout: 120_000,
    });
    expect(lastImageEditOptions().signal).toBeInstanceOf(AbortSignal);
    expect(lastImageEditCall()).not.toHaveProperty('input_fidelity');
  });

  it('gpt-image-2 uses native non-square input geometry and a proportional custom size', async () => {
    process.env.SKIP_IMAGE_PREPROCESS = 'true';
    process.env.OPENAI_PORTRAIT_MODEL = 'gpt-image-2';
    const sourceBuffer = await sharp({
      create: {
        width: 1280,
        height: 720,
        channels: 3,
        background: { r: 20, g: 30, b: 40 },
      },
    }).png().toBuffer();
    const POST = await getHandler();

    const res = await POST(
      makeRequest({
        mode: 'portrait',
        anatomicalRegion: 'face',
        scanType: '3d4d',
        imageBytes: new Uint8Array(sourceBuffer),
      }),
    );

    const inputMeta = await sharp(lastToFileInputBuffer()).metadata();
    expect(res.status).toBe(200);
    expect(inputMeta.width).toBe(1280);
    expect(inputMeta.height).toBe(720);
    expect(lastImageEditCall()).toMatchObject({
      model: 'gpt-image-2',
      size: '1280x720',
    });
    expect(lastImageEditCall()).not.toHaveProperty('input_fidelity');
    expect(lastImageEditCall()).not.toHaveProperty('quality');
  });

  it('default strategy uses OpenAI for anatomical flows even when the legacy Gemini flag is on', async () => {
    process.env.IMAGE_PROVIDER_STRATEGY = '';
    process.env.USE_GEMINI_FOR_ORGANS = 'true';
    const POST = await getHandler();

    const res = await POST(
      makeRequest({ mode: 'realistic', anatomicalRegion: 'brain', scanType: '2d' }),
    );

    expect(res.status).toBe(200);
    expect(imagesEditMock).toHaveBeenCalledTimes(1);
    expect(generateAnatomicalImageMock).not.toHaveBeenCalled();
    expect(lastImageEditCall()).toMatchObject({ model: 'gpt-image-2' });
  });

  it('default portrait model is gpt-image-2', async () => {
    process.env.OPENAI_PORTRAIT_MODEL = '';
    const POST = await getHandler();

    const res = await POST(makeRequest({ mode: 'portrait', anatomicalRegion: 'face' }));

    expect(res.status).toBe(200);
    expect(lastImageEditCall()).toMatchObject({ model: 'gpt-image-2' });
    expect(lastImageEditCall()).not.toHaveProperty('input_fidelity');
  });

  it.each([
    { mode: 'portrait', anatomicalRegion: 'face', scanType: '3d4d' },
    { mode: 'portrait', anatomicalRegion: 'fullBody', scanType: '3d4d' },
    { mode: 'realistic', anatomicalRegion: 'heart', scanType: '2d' },
    { mode: 'realistic', anatomicalRegion: 'brain', scanType: '2d' },
    { mode: 'realistic', anatomicalRegion: 'spine', scanType: '2d' },
    { mode: 'realistic', anatomicalRegion: 'abdomen', scanType: '2d' },
    { mode: 'realistic', anatomicalRegion: 'fullBody', scanType: '3d4d' },
  ])(
    'OpenAI path builds one canonical prompt for $mode/$anatomicalRegion',
    async ({ mode, anatomicalRegion, scanType }) => {
      process.env.MOCK_API = 'true';
      process.env.IMAGE_PROVIDER_STRATEGY = 'openai_all';
      const POST = await getHandler();

      const res = await POST(
        makeRequest({
          mode,
          anatomicalRegion,
          scanType,
        }),
      );

      expect(res.status).toBe(200);
      expect(buildCanonicalPromptMock).toHaveBeenCalledTimes(1);
      expect(lastCanonicalPromptInput()).toMatchObject({
        mode,
        anatomicalRegion,
        scanType,
      });
    },
  );

  it('USE_SHORT_PROMPTS=true does not change GPT Image 2 canonical prompt routing', async () => {
    process.env.MOCK_API = 'true';
    process.env.USE_SHORT_PROMPTS = 'true';
    const POST = await getHandler();

    const res = await POST(makeRequest({ mode: 'portrait', anatomicalRegion: 'face' }));

    expect(res.status).toBe(200);
    expect(buildCanonicalPromptMock).toHaveBeenCalledTimes(1);
    expect(lastCanonicalPromptInput()).toMatchObject({
      mode: 'portrait',
      anatomicalRegion: 'face',
    });
  });

  it('OPENAI_IMAGE_TIMEOUT_MS overrides the OpenAI SDK timeout', async () => {
    process.env.IMAGE_PROVIDER_STRATEGY = 'openai_all';
    process.env.OPENAI_IMAGE_TIMEOUT_MS = '180000';
    const POST = await getHandler();

    const res = await POST(
      makeRequest({ mode: 'realistic', anatomicalRegion: 'heart', scanType: '2d' }),
    );

    expect(res.status).toBe(200);
    expect(lastImageEditOptions()).toMatchObject({
      maxRetries: 0,
      timeout: 180_000,
    });
  });

  it('gemini_organs routes non-face anatomical flows through Gemini without the legacy flag', async () => {
    process.env.IMAGE_PROVIDER_STRATEGY = 'gemini_organs';
    process.env.USE_GEMINI_FOR_ORGANS = 'false';
    const POST = await getHandler();

    const res = await POST(
      makeRequest({ mode: 'realistic', anatomicalRegion: 'brain', scanType: '2d' }),
    );

    expect(res.status).toBe(200);
    expect(generateAnatomicalImageMock).toHaveBeenCalledTimes(1);
    expect(imagesEditMock).not.toHaveBeenCalled();
    expect(trackGenerationTelemetryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        provider: 'gemini',
        anatomicalRegion: 'brain',
      }),
    );
  });

  it('invalid IMAGE_PROVIDER_STRATEGY falls back to the recommended OpenAI behavior', async () => {
    process.env.IMAGE_PROVIDER_STRATEGY = 'not-a-strategy';
    process.env.USE_GEMINI_FOR_ORGANS = 'true';
    const POST = await getHandler();

    const res = await POST(
      makeRequest({ mode: 'realistic', anatomicalRegion: 'abdomen', scanType: '2d' }),
    );

    expect(res.status).toBe(200);
    expect(imagesEditMock).toHaveBeenCalledTimes(1);
    expect(generateAnatomicalImageMock).not.toHaveBeenCalled();
  });

  it('face and full-body portrait stay on OpenAI in gemini_organs strategy', async () => {
    process.env.IMAGE_PROVIDER_STRATEGY = 'gemini_organs';
    process.env.USE_GEMINI_FOR_ORGANS = 'true';
    const POST = await getHandler();

    const faceResponse = await POST(
      makeRequest({ mode: 'portrait', anatomicalRegion: 'face', scanType: '3d4d' }),
    );
    const fullBodyResponse = await POST(
      makeRequest({ mode: 'portrait', anatomicalRegion: 'fullBody', scanType: '3d4d' }),
    );

    expect(faceResponse.status).toBe(200);
    expect(fullBodyResponse.status).toBe(200);
    expect(imagesEditMock).toHaveBeenCalledTimes(2);
    expect(generateAnatomicalImageMock).not.toHaveBeenCalled();
  });

  it('portrait model gpt-image-2 omits input_fidelity', async () => {
    process.env.OPENAI_PORTRAIT_MODEL = 'gpt-image-2';
    const POST = await getHandler();

    const res = await POST(makeRequest({ mode: 'portrait', anatomicalRegion: 'face' }));

    expect(res.status).toBe(200);
    expect(lastImageEditCall()).toMatchObject({ model: 'gpt-image-2' });
    expect(lastImageEditCall()).not.toHaveProperty('input_fidelity');
  });

  it('legacy OpenAI image models keep the 1024x1024 cyan letterbox path', async () => {
    process.env.SKIP_IMAGE_PREPROCESS = 'true';
    process.env.OPENAI_PORTRAIT_MODEL = 'gpt-image-1.5';
    const sourceBuffer = await sharp({
      create: {
        width: 1280,
        height: 720,
        channels: 3,
        background: { r: 20, g: 30, b: 40 },
      },
    }).png().toBuffer();
    const POST = await getHandler();

    const res = await POST(
      makeRequest({
        mode: 'portrait',
        anatomicalRegion: 'face',
        scanType: '3d4d',
        imageBytes: new Uint8Array(sourceBuffer),
      }),
    );

    const { data, info } = await sharp(lastToFileInputBuffer())
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(res.status).toBe(200);
    expect(info.width).toBe(1024);
    expect(info.height).toBe(1024);
    expect(data[0]).toBe(0);
    expect(data[1]).toBe(255);
    expect(data[2]).toBe(255);
    expect(lastImageEditCall()).toMatchObject({
      model: 'gpt-image-1.5',
      size: '1024x1024',
      input_fidelity: 'high',
    });
  });

  it('heart with weak analysis uses salvage profile via Gemini path', async () => {
    process.env.IMAGE_PROVIDER_STRATEGY = 'dual';
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
    expect(trackGenerationTelemetryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        provider: 'gemini',
        heartProfile: 'salvage',
        measurementRingDetected: false,
        blackBandDetected: false,
      }),
    );
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
    expect(buildCanonicalPromptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'realistic',
        anatomicalRegion: 'heart',
        scanType: '2d',
      }),
    );
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

  it('face+portrait calls analyzeUltrasound when vision analysis is enabled', async () => {
    process.env.MOCK_API = 'true';
    process.env.ENABLE_VISION_ANALYSIS = 'true';
    const POST = await getHandler();

    const res = await POST(makeRequest({ mode: 'portrait', anatomicalRegion: 'face' }));

    expect(res.status).toBe(200);
    expect(analyzeUltrasoundMock).toHaveBeenCalled();
  });

  it('ENABLE_VISION_ANALYSIS=true does not pass analysis into OpenAI canonical prompt text', async () => {
    process.env.MOCK_API = 'true';
    process.env.ENABLE_VISION_ANALYSIS = 'true';
    analyzeUltrasoundMock.mockResolvedValue({
      estimatedGestationalWeeks: 30,
      viewAngle: 'profile-left',
      imageQuality: 'good',
      visibleStructures: ['nose', 'lips'],
      overallDescription: 'Profile face view.',
    });
    const POST = await getHandler();

    const res = await POST(makeRequest({ mode: 'portrait', anatomicalRegion: 'face' }));

    expect(res.status).toBe(200);
    expect(analyzeUltrasoundMock).toHaveBeenCalled();
    expect(lastCanonicalPromptInput()).toMatchObject({
      mode: 'portrait',
      anatomicalRegion: 'face',
    });
    expect(lastCanonicalPromptInput()).not.toHaveProperty('analysis');
    expect(trackGenerationTelemetryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        analysisUsed: true,
      }),
    );
  });

  it('ENABLE_VISION_ANALYSIS=false skips analysis and builds the canonical portrait prompt', async () => {
    process.env.MOCK_API = 'true';
    process.env.ENABLE_VISION_ANALYSIS = 'false';
    const POST = await getHandler();

    const res = await POST(makeRequest({ mode: 'portrait', anatomicalRegion: 'face' }));

    expect(res.status).toBe(200);
    expect(analyzeUltrasoundMock).not.toHaveBeenCalled();
    expect(buildCanonicalPromptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'portrait',
        anatomicalRegion: 'face',
      }),
    );
    expect(trackGenerationTelemetryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        analysisUsed: false,
      }),
    );
  });

  it('face+portrait uses the same canonical prompt when vision analysis returns null', async () => {
    process.env.MOCK_API = 'true';
    process.env.ENABLE_VISION_ANALYSIS = 'true';
    // analyzeUltrasoundMock returns null by default (see beforeEach)
    const POST = await getHandler();

    const res = await POST(makeRequest({ mode: 'portrait', anatomicalRegion: 'face' }));

    expect(res.status).toBe(200);
    expect(buildCanonicalPromptMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'portrait',
        anatomicalRegion: 'face',
      }),
    );
  });
});
