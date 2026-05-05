import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { preprocessUltrasound, stripYellowOverlay, hasMaskStrips } from '@/lib/imagePreprocess';
import { chooseGptImage2OutputSize, generatePortrait, isGptImage2Model } from '@/lib/openaiClient';
import {
  buildCanonicalPrompt,
  buildGeminiPrompt,
  buildGeminiHeartStrictPrompt,
  buildGeminiHeartSalvagePrompt,
} from '@/lib/promptBuilder';
import { analyzeUltrasound } from '@/lib/visionAnalysis';
import type { UltrasoundAnalysis } from '@/lib/visionAnalysis';
import { preprocessHeart, selectHeartProfile, type HeartRenderProfile, type HeartArtifactMap } from '@/lib/heartPreprocess';
import { generateAnatomicalImage } from '@/lib/geminiClient';
import { trackGenerationTelemetry, type TelemetryCacheOutcome, type TelemetryProvider, type TelemetryStatus } from '@/lib/generationTelemetry';
import {
  GenerateSchema,
  type AnatomicalRegion,
  type GenerationMode,
  type ScanType,
  type SkinTone,
} from '@/lib/validation';
import {
  ANNOTATION_PANEL_LEFT_RATIO,
  ANNOTATION_PANEL_RIGHT_RATIO,
  MAX_FILE_SIZE_BYTES,
  SUPPORTED_MIME_TYPES,
} from '@/lib/constants';
import * as accountStore from '@/lib/accountStore';
import { createApiErrorResponse } from '@/lib/apiErrors';

type ImageProviderStrategy = 'dual' | 'openai_all' | 'gemini_organs';

// ⚠️ In-memory rate limiting — resets on each serverless cold start.
// For production multi-instance deployments, replace with Redis/Upstash.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;
const DEFAULT_OPENAI_TIMEOUT_MS = 120_000;
const OPENAI_TIMEOUT_MS = getTimeoutFromEnv(
  'OPENAI_IMAGE_TIMEOUT_MS',
  DEFAULT_OPENAI_TIMEOUT_MS,
  60_000,
  300_000,
);
const GEMINI_TIMEOUT_MS = 120_000;
const USE_GEMINI_FOR_ORGANS = process.env.USE_GEMINI_FOR_ORGANS === 'true';
const DEFAULT_OPENAI_PORTRAIT_MODEL = 'gpt-image-2';
const DEFAULT_OPENAI_ANATOMICAL_MODEL = 'gpt-image-2';
const DEFAULT_IMAGE_PROVIDER_STRATEGY: ImageProviderStrategy = 'openai_all';
const IMAGE_CACHE_TTL_MS = 45 * 60_000;
const IMAGE_CACHE_MAX_ENTRIES = 100;
const PROMPT_FINGERPRINT_VERSION = 'v8-canonical-prompts';
const ENABLE_SESSION_IMAGE_CACHE = process.env.ENABLE_SESSION_IMAGE_CACHE === 'true';
const ENABLE_VISION_ANALYSIS = process.env.ENABLE_VISION_ANALYSIS === 'true';
// Diagnostic flags for Fase A experiments (docs/diagnosis_2026_04.md).
// Both default off — set in .env to enable without committing.
const SKIP_IMAGE_PREPROCESS = process.env.SKIP_IMAGE_PREPROCESS === 'true';

type RequestFingerprint = string;
interface SessionImageCacheEntry {
  imageBase64: string;
  expiresAt: number;
  lastAccessAt: number;
}

interface PromptBuildInput {
  creativity: number;
  skinTone: SkinTone;
  mode: GenerationMode;
  scanType: ScanType;
  anatomicalRegion: AnatomicalRegion;
  clinicalNotes: string;
  analysis: UltrasoundAnalysis | null;
  heartProfile: HeartRenderProfile | null;
  letterboxInfo?: { padLeft: number; padTop: number; scaledW: number; scaledH: number };
}

interface BuiltPrompt {
  prompt: string;
  promptType: string;
  analysisUsed: boolean;
}

const sessionImageCache = new Map<RequestFingerprint, SessionImageCacheEntry>();

function getTimeoutFromEnv(
  envName: string,
  fallbackMs: number,
  minMs: number,
  maxMs: number,
): number {
  const raw = process.env[envName]?.trim();
  if (!raw) return fallbackMs;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    console.warn(`[generate] invalid ${envName}="${raw}", defaulting to ${fallbackMs}ms`);
    return fallbackMs;
  }

  return Math.min(maxMs, Math.max(minMs, parsed));
}

function getImageProviderStrategy(): ImageProviderStrategy {
  const raw = process.env.IMAGE_PROVIDER_STRATEGY?.trim();
  if (!raw) return DEFAULT_IMAGE_PROVIDER_STRATEGY;

  if (raw === 'dual' || raw === 'openai_all' || raw === 'gemini_organs') {
    return raw;
  }

  console.warn(
    `[generate] invalid IMAGE_PROVIDER_STRATEGY="${raw}", defaulting to ${DEFAULT_IMAGE_PROVIDER_STRATEGY}`,
  );
  return DEFAULT_IMAGE_PROVIDER_STRATEGY;
}

const IMAGE_PROVIDER_STRATEGY = getImageProviderStrategy();

function createRequestFingerprint(
  processedImageBuffer: Buffer,
  creativity: number,
  anatomicalRegion: string,
  clinicalNotes: string,
): RequestFingerprint {
  const hash = createHash('sha256');
  hash.update(processedImageBuffer);
  hash.update('\n');
  hash.update(String(creativity));
  hash.update('\n');
  hash.update(anatomicalRegion);
  hash.update('\n');
  hash.update(clinicalNotes);
  hash.update('\n');
  hash.update(PROMPT_FINGERPRINT_VERSION);
  return hash.digest('hex');
}

function cleanupImageCache(now: number): void {
  const expiredKeys: RequestFingerprint[] = [];
  sessionImageCache.forEach((entry, key) => {
    if (entry.expiresAt <= now) {
      expiredKeys.push(key);
    }
  });
  expiredKeys.forEach((key) => {
    sessionImageCache.delete(key);
  });

  if (sessionImageCache.size <= IMAGE_CACHE_MAX_ENTRIES) return;

  const entriesByLastAccess: Array<[RequestFingerprint, SessionImageCacheEntry]> = [];
  sessionImageCache.forEach((entry, key) => {
    entriesByLastAccess.push([key, entry]);
  });
  entriesByLastAccess.sort((a, b) => a[1].lastAccessAt - b[1].lastAccessAt);
  const overflowCount = sessionImageCache.size - IMAGE_CACHE_MAX_ENTRIES;

  for (let i = 0; i < overflowCount; i++) {
    const key = entriesByLastAccess[i]?.[0];
    if (key) {
      sessionImageCache.delete(key);
    }
  }
}

function getCachedImage(requestFingerprint: RequestFingerprint): string | null {
  const now = Date.now();
  const entry = sessionImageCache.get(requestFingerprint);
  if (!entry) return null;

  if (entry.expiresAt <= now) {
    sessionImageCache.delete(requestFingerprint);
    return null;
  }

  entry.lastAccessAt = now;
  return entry.imageBase64;
}

function setCachedImage(
  requestFingerprint: RequestFingerprint,
  imageBase64: string,
): void {
  const now = Date.now();
  sessionImageCache.set(requestFingerprint, {
    imageBase64,
    expiresAt: now + IMAGE_CACHE_TTL_MS,
    lastAccessAt: now,
  });
  cleanupImageCache(now);
}

/**
 * Black out the left and right annotation panels that GE ultrasound machines
 * overlay on cardiac and other anatomical scans (Card-circ, Heart-A, Th-circ, etc.).
 * Applied BEFORE preprocessUltrasound() for non-face anatomical scans only.
 */
async function blackOutAnnotationPanels(inputBuffer: Buffer): Promise<Buffer> {
  const metadata = await sharp(inputBuffer).metadata();
  const width = metadata.width ?? 1024;
  const height = metadata.height ?? 1024;

  const leftWidth = Math.floor(width * ANNOTATION_PANEL_LEFT_RATIO);   // GE left measurement panel
  const rightWidth = Math.floor(width * ANNOTATION_PANEL_RIGHT_RATIO);  // GE device/probe info

  const black = { r: 0, g: 0, b: 0 };

  const leftStrip = await sharp({
    create: { width: leftWidth, height, channels: 3, background: black },
  }).png().toBuffer();

  const rightStrip = await sharp({
    create: { width: rightWidth, height, channels: 3, background: black },
  }).png().toBuffer();

  return sharp(inputBuffer)
    .flatten({ background: black })
    .composite([
      { input: leftStrip, top: 0, left: 0 },
      { input: rightStrip, top: 0, left: width - rightWidth },
    ])
    .png()
    .toBuffer();
}

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

function isContentPolicyError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null || !('code' in err)) {
    return false;
  }

  const code = err.code;
  return code === 'moderation_blocked' || code === 'content_policy_violation';
}

function getPreprocessPath(
  provider: TelemetryProvider,
  anatomicalRegion?: string,
  scanType?: string,
): string | undefined {
  if (!anatomicalRegion || !scanType) return undefined;
  return `${provider}:${anatomicalRegion}:${scanType}`;
}

function isPortraitOpenAiFlow(
  anatomicalRegion: AnatomicalRegion,
  mode: GenerationMode,
): boolean {
  return mode === 'portrait' && (anatomicalRegion === 'face' || anatomicalRegion === 'fullBody');
}

function shouldUseGeminiProvider(
  anatomicalRegion: AnatomicalRegion,
  mode: GenerationMode,
): boolean {
  if (isPortraitOpenAiFlow(anatomicalRegion, mode) || anatomicalRegion === 'face') {
    return false;
  }

  if (IMAGE_PROVIDER_STRATEGY === 'openai_all') {
    return false;
  }

  if (IMAGE_PROVIDER_STRATEGY === 'gemini_organs') {
    return true;
  }

  return USE_GEMINI_FOR_ORGANS;
}

function getOpenAiModel(mode: GenerationMode): string {
  if (mode === 'portrait') {
    return process.env.OPENAI_PORTRAIT_MODEL?.trim() || DEFAULT_OPENAI_PORTRAIT_MODEL;
  }

  return process.env.OPENAI_ANATOMICAL_MODEL?.trim() || DEFAULT_OPENAI_ANATOMICAL_MODEL;
}

function getTelemetryProvider(useGeminiPath: boolean): TelemetryProvider {
  if (process.env.MOCK_API === 'true') {
    return 'mock';
  }

  return useGeminiPath ? 'gemini' : 'openai';
}

async function runProviderCallWithTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutError = new Error('timeout');

  const timedOperation = operation(controller.signal).catch((err: unknown) => {
    if (controller.signal.aborted) {
      throw timeoutError;
    }
    throw err;
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(timeoutError);
    }, timeoutMs);
  });

  try {
    return await Promise.race([timedOperation, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function buildOpenAiPrompt(input: PromptBuildInput): BuiltPrompt {
  const builtPrompt = buildCanonicalPrompt({
    creativity: input.creativity,
    skinTone: input.skinTone,
    mode: input.mode,
    scanType: input.scanType,
    anatomicalRegion: input.anatomicalRegion,
    clinicalNotes: input.clinicalNotes,
  });

  return {
    prompt: builtPrompt.prompt,
    promptType: builtPrompt.promptType,
    analysisUsed: input.analysis !== null,
  };
}

function buildGeminiProviderPrompt(input: PromptBuildInput): BuiltPrompt {
  if (input.anatomicalRegion === 'heart' && input.heartProfile) {
    return {
      prompt:
        input.heartProfile === 'strict'
          ? buildGeminiHeartStrictPrompt(
              input.scanType,
              input.clinicalNotes,
              input.analysis,
              input.creativity,
            )
          : buildGeminiHeartSalvagePrompt(
              input.scanType,
              input.clinicalNotes,
              input.analysis,
              input.creativity,
            ),
      promptType: `heart-${input.heartProfile}`,
      analysisUsed: input.analysis !== null,
    };
  }

  const analysisUsed = input.analysis !== null;
  return {
    prompt: buildGeminiPrompt(
      input.anatomicalRegion,
      input.scanType,
      input.clinicalNotes,
      input.analysis,
    ),
    promptType: analysisUsed ? 'enhanced' : 'base',
    analysisUsed,
  };
}

export async function POST(req: NextRequest) {
  const requestStartedAt = Date.now();
  let heartProfile: HeartRenderProfile | null = null;
  let heartArtifactMap: HeartArtifactMap | null = null;

  const telemetryContext: {
    provider: TelemetryProvider;
    cacheOutcome: TelemetryCacheOutcome;
    analysisUsed: boolean;
    imageQuality?: 'excellent' | 'good' | 'fair' | 'poor';
    anatomyConfidence?: 'high' | 'medium' | 'low';
    anatomicalRegion?: AnatomicalRegion;
    mode?: GenerationMode;
    scanType?: ScanType;
    heartProfile?: HeartRenderProfile;
    measurementRingDetected?: boolean;
    blackBandDetected?: boolean;
  } = {
    provider: 'none',
    cacheOutcome: 'disabled',
    analysisUsed: false,
  };

  async function recordTelemetry(status: TelemetryStatus): Promise<void> {
    try {
      await trackGenerationTelemetry({
        status,
        provider: telemetryContext.provider,
        anatomicalRegion: telemetryContext.anatomicalRegion,
        mode: telemetryContext.mode,
        scanType: telemetryContext.scanType,
        preprocessPath: getPreprocessPath(
          telemetryContext.provider,
          telemetryContext.anatomicalRegion,
          telemetryContext.scanType,
        ),
        cacheOutcome: telemetryContext.cacheOutcome,
        analysisUsed: telemetryContext.analysisUsed,
        analysisImageQuality: telemetryContext.imageQuality,
        analysisAnatomyConfidence: telemetryContext.anatomyConfidence,
        heartProfile: telemetryContext.heartProfile,
        measurementRingDetected: telemetryContext.measurementRingDetected,
        blackBandDetected: telemetryContext.blackBandDetected,
        durationMs: Date.now() - requestStartedAt,
      });
    } catch {
      console.warn('Generation telemetry recording failed');
    }
  }

  // 1. Rate limit
  const ip = getIp(req);
  if (!checkRateLimit(ip)) {
    await recordTelemetry('rateLimit');
    return createApiErrorResponse('rateLimit', 429);
  }

  // 2. Content-Type check
  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    await recordTelemetry('badRequest');
    return createApiErrorResponse('badRequest', 400);
  }

  // 3. Parse FormData
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    await recordTelemetry('badRequest');
    return createApiErrorResponse('badRequest', 400);
  }

  // 3a. Validate token + account
  const tokenRaw = formData.get('token');
  const accountIdRaw = formData.get('accountId');
  if (typeof tokenRaw !== 'string' || typeof accountIdRaw !== 'string') {
    await recordTelemetry('unauthorized');
    return createApiErrorResponse('unauthorized', 403);
  }

  const imageFile = formData.get('image');
  const creativityRaw = formData.get('creativity');
  const skinToneRaw = formData.get('skinTone');
  const modeRaw = formData.get('mode');
  const scanTypeRaw = formData.get('scanType');
  const anatomicalRegionRaw = formData.get('anatomicalRegion');
  const clinicalNotesRaw = formData.get('clinicalNotes');

  if (!(imageFile instanceof File)) {
    await recordTelemetry('badRequest');
    return createApiErrorResponse('badRequest', 400);
  }

  // 4. Validate creativity + skinTone with Zod
  const parsed = GenerateSchema.safeParse({
    creativity: Number(creativityRaw),
    skinTone: skinToneRaw ?? 'normal',
    mode: modeRaw ?? 'portrait',
    scanType: scanTypeRaw ?? '3d4d',
    anatomicalRegion: anatomicalRegionRaw ?? 'face',
    clinicalNotes: typeof clinicalNotesRaw === 'string' ? clinicalNotesRaw : '',
  });
  if (!parsed.success) {
    await recordTelemetry('badRequest');
    return createApiErrorResponse('badRequest', 400);
  }
  const { creativity, skinTone, mode, scanType, anatomicalRegion, clinicalNotes } = parsed.data;
  telemetryContext.anatomicalRegion = anatomicalRegion;
  telemetryContext.mode = mode;
  telemetryContext.scanType = scanType;
  // Sanitize clinical notes: strip control characters, keep only safe chars
  const sanitizedNotes = clinicalNotes
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/[^\w\sáéíóúñüÁÉÍÓÚÑÜ.,;:()\/\-°²³+]/g, '')
    .trim()
    .slice(0, 200);

  // 5. Validate image
  if (imageFile.size > MAX_FILE_SIZE_BYTES) {
    await recordTelemetry('badRequest');
    return createApiErrorResponse('badRequest', 400);
  }

  const supportedTypes: readonly string[] = SUPPORTED_MIME_TYPES;
  if (!supportedTypes.includes(imageFile.type)) {
    await recordTelemetry('badRequest');
    return createApiErrorResponse('badRequest', 400);
  }

  // 6–8. Preprocess → build prompt → generate (60s timeout)
  try {
    const account = await accountStore.findByToken(tokenRaw);
    if (!account || account.id !== accountIdRaw) {
      await recordTelemetry('unauthorized');
      return createApiErrorResponse('unauthorized', 403);
    }

    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 6. Provider + preprocess selection.
    // Portrait stays on OpenAI; anatomical realistic flows follow the provider strategy.
    const useGeminiPath = shouldUseGeminiProvider(anatomicalRegion, mode);
    const openAiModel = useGeminiPath ? null : getOpenAiModel(mode);
    const useNativeOpenAiSize = openAiModel !== null && isGptImage2Model(openAiModel);
    const useLegacyOpenAiLetterbox = !useGeminiPath && !useNativeOpenAiSize;
    telemetryContext.provider = getTelemetryProvider(useGeminiPath);
    let processed: Buffer;

    console.log(
      `[generate] strategy=${IMAGE_PROVIDER_STRATEGY} provider=${useGeminiPath ? 'GEMINI' : 'OPENAI'} region=${anatomicalRegion} mode=${mode} scanType=${scanType}`,
    );

    if (SKIP_IMAGE_PREPROCESS) {
      console.log('[generate] SKIP_IMAGE_PREPROCESS=true — bypassing annotation blackout, preprocessUltrasound, stripYellowOverlay, heart preprocess');
      processed = buffer;
    } else if (useGeminiPath) {
      const preCroppedBuffer = await blackOutAnnotationPanels(buffer);
      processed = await preprocessUltrasound(preCroppedBuffer, {
        anatomicalRegion,
        scanType,
      });
      processed = await stripYellowOverlay(processed);
    } else {
      // OpenAI: black out annotation panels + top/bottom strips
      const preCroppedBuffer = anatomicalRegion !== 'face'
        ? await blackOutAnnotationPanels(buffer)
        : buffer;
      processed = await preprocessUltrasound(preCroppedBuffer, {
        anatomicalRegion,
        scanType,
      });
      if (anatomicalRegion !== 'face' || scanType === '2d') {
        processed = await stripYellowOverlay(processed);
      }
    }

    // 6c. Heart-specific preprocessing (artifact detection & cleaning)
    if (!SKIP_IMAGE_PREPROCESS && anatomicalRegion === 'heart') {
      const heartResult = await preprocessHeart(processed);
      processed = heartResult.cleanedBuffer;
      heartArtifactMap = heartResult.artifactMap;
      console.log(
        `[generate] heart preprocess — ring=${heartArtifactMap.measurementRingPresent} bands=${heartArtifactMap.blackBands.length} roi=${heartArtifactMap.roiCoveragePercent.toFixed(0)}% class=${heartArtifactMap.qualityClass}`,
      );
    }

    // 6a-post. Capture the proportional buffer for vision analysis and for
    // native GPT Image 2 sizing. Legacy OpenAI models still use the square
    // sentinel-letterbox path below, so their pre-letterbox geometry is kept.
    const processedForAnalysis = processed;

    // Compute native GPT Image 2 size, or legacy sentinel-bar geometry for
    // precise post-generation pixel crop on older OpenAI image models.
    let originalW = 1024;
    let originalH = 1024;
    let padLeft = 0;
    let padTop = 0;
    let scaledW = 1024;
    let scaledH = 1024;
    let openAiOutputSize: `${number}x${number}` = '1024x1024';
    if (!useGeminiPath) {
      const preMeta = await sharp(processedForAnalysis).metadata();
      originalW = preMeta.width ?? 1024;
      originalH = preMeta.height ?? 1024;
      openAiOutputSize = useNativeOpenAiSize
        ? chooseGptImage2OutputSize(originalW, originalH)
        : '1024x1024';

      if (useLegacyOpenAiLetterbox) {
        const scale = Math.min(1, Math.min(1024 / originalW, 1024 / originalH));
        scaledW = Math.round(originalW * scale);
        scaledH = Math.round(originalH * scale);
        padLeft = Math.floor((1024 - scaledW) / 2);
        padTop  = Math.floor((1024 - scaledH)  / 2);
      }
    }

    // Legacy OpenAI models: letterbox to exactly 1024×1024 using pure cyan (#00FFFF) padding.
    // Cyan never appears in 3D/4D ultrasound imagery (no tissue, gel, or device panel
    // produces it) and carries no content-moderation associations — giving the model
    // an unambiguous signal that the padded areas are not content to fill or extend into.
    if (useLegacyOpenAiLetterbox) {
      processed = await sharp(processed)
        .resize(1024, 1024, {
          fit: 'contain',
          background: { r: 0, g: 255, b: 255 },
          withoutEnlargement: true,
        })
        .png()
        .toBuffer();
    }

    // 6b. Vision analysis (optional, non-blocking on failure)
    // Runs on the pre-letterbox buffer so feature descriptions (nose, lips, chin)
    // are derived from the clean proportional image, unaffected by padding bars.
    let analysis: UltrasoundAnalysis | null = null;
    if (ENABLE_VISION_ANALYSIS) {
      try {
        console.log(`[generate] vision analysis starting for ${anatomicalRegion}...`);
        analysis = await analyzeUltrasound(processedForAnalysis, anatomicalRegion, scanType, sanitizedNotes);
        if (analysis) {
          console.log(
            `[generate] vision analysis OK — viewAngle=${analysis.viewAngle} quality=${analysis.imageQuality} structures=${analysis.visibleStructures.length}`,
          );
        } else {
          console.warn(
            `[generate] vision analysis returned no structured result for ${anatomicalRegion}, proceeding without`,
          );
        }
      } catch {
        console.warn(`[generate] vision analysis FAILED for ${anatomicalRegion}, proceeding without`);
        analysis = null;
      }
    } else {
      console.log('[generate] vision analysis DISABLED');
    }

    // 7. Heart profile selection (combines artifact map + vision analysis)
    if (anatomicalRegion === 'heart' && heartArtifactMap) {
      heartProfile = selectHeartProfile(heartArtifactMap, analysis);
      telemetryContext.heartProfile = heartProfile;
      telemetryContext.measurementRingDetected = heartArtifactMap.measurementRingPresent;
      telemetryContext.blackBandDetected = heartArtifactMap.blackBandPresent;
      console.log(`[generate] heart profile=${heartProfile}`);
    }

    // 7a. Provider-specific prompt building
    const promptBuildInput: PromptBuildInput = {
      creativity,
      skinTone,
      mode,
      scanType,
      anatomicalRegion,
      clinicalNotes: sanitizedNotes,
      analysis,
      heartProfile,
      letterboxInfo: useLegacyOpenAiLetterbox
        ? { padLeft, padTop, scaledW, scaledH }
        : undefined,
    };
    const builtPrompt: BuiltPrompt = useGeminiPath
        ? buildGeminiProviderPrompt(promptBuildInput)
        : buildOpenAiPrompt(promptBuildInput);

    telemetryContext.analysisUsed = builtPrompt.analysisUsed;
    telemetryContext.imageQuality = analysis?.imageQuality;
    telemetryContext.anatomyConfidence = analysis?.organDetails?.anatomyConfidence;
    console.log(
      `[generate] prompt=${builtPrompt.promptType} (${builtPrompt.prompt.length} chars)`,
    );
    if (process.env.NODE_ENV === 'development') {
      console.log('[generate] full prompt:\n', builtPrompt.prompt);
    }

    let requestFingerprint: RequestFingerprint | null = null;
    if (ENABLE_SESSION_IMAGE_CACHE) {
      telemetryContext.cacheOutcome = 'miss';
      requestFingerprint = createRequestFingerprint(
        processed,
        creativity,
        anatomicalRegion,
        sanitizedNotes,
      );
      const cachedImage = getCachedImage(requestFingerprint);
      if (cachedImage) {
        telemetryContext.cacheOutcome = 'hit';
        console.log('[generate] CACHE HIT — returning cached image');
        await recordTelemetry('success');
        return NextResponse.json({ image: cachedImage });
      }
    }

    if (!(await accountStore.isWithinLimit(account.id, account.dailyLimit))) {
      await recordTelemetry('dailyLimitExceeded');
      return createApiErrorResponse('dailyLimitExceeded', 429);
    }

    // Mock mode — skip provider call, but still behaves like a successful generation.
    if (process.env.MOCK_API === 'true') {
      const mockPng = await sharp({
        create: {
          width: 1,
          height: 1,
          channels: 3,
          background: { r: 232, g: 160, b: 160 },
        },
      })
        .png()
        .toBuffer();
      const mockBase64 = mockPng.toString('base64');
      if (ENABLE_SESSION_IMAGE_CACHE && requestFingerprint) {
        setCachedImage(requestFingerprint, mockBase64);
      }
      await accountStore.incrementUsage(account.id);
      await recordTelemetry('success');
      return NextResponse.json({ image: mockBase64 });
    }

    // 8. Generate image with the selected provider prompt.
    let originalWidth = 0;
    let originalHeight = 0;
    if (useGeminiPath) {
      const inputMeta = await sharp(processed).metadata();
      originalWidth = inputMeta.width ?? 1024;
      originalHeight = inputMeta.height ?? 1024;
      console.log(
        `[generate] calling GEMINI (${originalWidth}x${originalHeight}, prompt=${builtPrompt.prompt.length} chars)...`,
      );
    } else {
      console.log(
        `[generate] calling OPENAI (model=${openAiModel}, size=${openAiOutputSize}, prompt=${builtPrompt.prompt.length} chars)...`,
      );
    }

    const genStart = Date.now();
    const rawBase64 = useGeminiPath
      ? await runProviderCallWithTimeout(
          () => generateAnatomicalImage(
            processed,
            builtPrompt.prompt,
            originalWidth,
            originalHeight,
          ),
          GEMINI_TIMEOUT_MS,
        )
      : await runProviderCallWithTimeout(
          (signal) => generatePortrait(processed, builtPrompt.prompt, {
            model: openAiModel ?? undefined,
            signal,
            size: openAiOutputSize,
            timeoutMs: OPENAI_TIMEOUT_MS,
          }),
          OPENAI_TIMEOUT_MS,
        );
    console.log(`[generate] image generated OK in ${((Date.now() - genStart) / 1000).toFixed(1)}s`);

    // 9. Post-processing: remove padding from Gemini output + color grading
    const rawBuffer = Buffer.from(rawBase64, 'base64');

    let postInput = sharp(rawBuffer);
    if (useGeminiPath) {
      // Force Gemini output to match input dimensions exactly
      postInput = postInput.resize(originalWidth, originalHeight, { fit: 'fill' });
    }

    let postProcessed = postInput;

    if (anatomicalRegion === 'heart' && heartProfile === 'salvage') {
      // Heart salvage: minimal finishing to avoid waxy/specimen artefacts
      postProcessed = postProcessed
        .sharpen({ sigma: 0.5, m1: 0.25, m2: 0.15 })
        .modulate({ brightness: 1.0, saturation: 1.0 });
    } else if (anatomicalRegion === 'heart' && heartProfile === 'strict') {
      // Heart strict: moderate finishing, controlled HDlive look
      postProcessed = postProcessed
        .sharpen({ sigma: 0.8, m1: 0.5, m2: 0.3 })
        .modulate({ brightness: 1.02, saturation: 1.03 });
    } else if (mode === 'portrait') {
      // Portrait: light sharpening, no saturation boost to avoid pink cast
      postProcessed = postProcessed
        .sharpen({ sigma: 0.8, m1: 0.5, m2: 0.3 })
        .modulate({ brightness: 1.01, saturation: 1.0 });
    } else {
      // Realistic: stronger sharpening + warm saturation to enhance tissue texture and HDlive look
      postProcessed = postProcessed
        .sharpen({ sigma: 1.4, m1: 1.0, m2: 0.6 })
        .modulate({ brightness: 1.03, saturation: 1.12 });
    }

    // Remove sentinel bars and restore original input dimensions.
    // Legacy OpenAI path: extract the content area using pre-computed bar geometry
    // (deterministic pixel crop — no color detection), then resize to the
    // original pre-letterbox dimensions so output matches what was uploaded.
    // GPT Image 2 path: keep the native aspect-ratio output without square crop/resize.
    // Gemini path: trim mask strips when present, else keep as-is.
    const untrimmedBuffer = await postProcessed.png().toBuffer();
    let finalBuffer: Buffer;
    if (useLegacyOpenAiLetterbox) {
      finalBuffer = await sharp(untrimmedBuffer)
        .extract({ left: padLeft, top: padTop, width: scaledW, height: scaledH })
        .resize(originalW, originalH, { fit: 'fill' })
        .png()
        .toBuffer();
    } else if (!useGeminiPath) {
      finalBuffer = untrimmedBuffer;
    } else if (hasMaskStrips(anatomicalRegion, scanType)) {
      finalBuffer = await sharp(untrimmedBuffer).trim({ background: '#000000' }).png().toBuffer();
    } else {
      finalBuffer = await postProcessed.png().toBuffer();
    }
    const base64 = finalBuffer.toString('base64');
    console.log(`[generate] DONE — output size=${(finalBuffer.length / 1024).toFixed(0)}KB`);

    if (ENABLE_SESSION_IMAGE_CACHE && requestFingerprint) {
      setCachedImage(requestFingerprint, base64);
    }

    await accountStore.incrementUsage(account.id);
    await recordTelemetry('success');
    return NextResponse.json({ image: base64 });
  } catch (err: unknown) {
    // Timeout handling
    if (err instanceof Error && err.message === 'timeout') {
      await recordTelemetry('timeout');
      return createApiErrorResponse('timeout', 504);
    }

    if (isContentPolicyError(err)) {
      await recordTelemetry('contentBlock');
      return createApiErrorResponse('contentBlock', 400);
    }

    console.error('Generate API request failed');
    await recordTelemetry('generic');
    return createApiErrorResponse('generic', 500);
  }
}
