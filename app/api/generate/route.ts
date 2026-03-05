import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import OpenAI from 'openai';
import sharp from 'sharp';
import { preprocessUltrasound } from '@/lib/imagePreprocess';
import { generatePortrait } from '@/lib/openaiClient';
import { buildPrompt } from '@/lib/promptBuilder';
import { GenerateSchema } from '@/lib/validation';
import { MAX_FILE_SIZE_BYTES, SUPPORTED_MIME_TYPES } from '@/lib/constants';

// ⚠️ In-memory rate limiting — resets on each serverless cold start.
// For production multi-instance deployments, replace with Redis/Upstash.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;
const OPENAI_TIMEOUT_MS = 55_000;
const IMAGE_CACHE_TTL_MS = 45 * 60_000;
const IMAGE_CACHE_MAX_ENTRIES = 100;
const PROMPT_FINGERPRINT_VERSION = 'v1-neutral-consistency';
const ENABLE_SESSION_IMAGE_CACHE = process.env.ENABLE_SESSION_IMAGE_CACHE === 'true';

type RequestFingerprint = string;

interface SessionImageCacheEntry {
  imageBase64: string;
  expiresAt: number;
  lastAccessAt: number;
}

const sessionImageCache = new Map<RequestFingerprint, SessionImageCacheEntry>();

function createRequestFingerprint(
  processedImageBuffer: Buffer,
  style: string,
  creativity: number,
): RequestFingerprint {
  const hash = createHash('sha256');
  hash.update(processedImageBuffer);
  hash.update('\n');
  hash.update(style);
  hash.update('\n');
  hash.update(String(creativity));
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

export async function POST(req: NextRequest) {
  // 1. Rate limit
  const ip = getIp(req);
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta en unos minutos.' },
      { status: 429 }
    );
  }

  // 2. Content-Type check
  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json(
      { error: 'Ocurrió un error inesperado. Intenta de nuevo.' },
      { status: 400 }
    );
  }

  // 3. Parse FormData
  let formData: FormData;
  try {
    formData = await req.formData();
    console.log('Step 2: FormData parsed');
  } catch (err) {
    console.error('Generate API error:', err);
    return NextResponse.json(
      { error: 'Ocurrió un error inesperado. Intenta de nuevo.' },
      { status: 400 }
    );
  }

  // 3a. Validate PIN
  const pinRaw = formData.get('pin');
  const accessPin = process.env.ACCESS_PIN;
  console.log('Step 1: PIN check');
  if (!accessPin || typeof pinRaw !== 'string' || pinRaw !== accessPin) {
    return NextResponse.json(
      { error: 'Acceso no autorizado' },
      { status: 403 }
    );
  }

  const imageFile = formData.get('image');
  const styleRaw = formData.get('style');
  const creativityRaw = formData.get('creativity');
  const skinToneRaw = formData.get('skinTone');

  if (!(imageFile instanceof File)) {
    return NextResponse.json(
      { error: 'Ocurrió un error inesperado. Intenta de nuevo.' },
      { status: 400 }
    );
  }

  // 4. Validate style + creativity + skinTone with Zod
  const parsed = GenerateSchema.safeParse({
    style: styleRaw,
    creativity: Number(creativityRaw),
    skinTone: skinToneRaw ?? 'normal',
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ocurrió un error inesperado. Intenta de nuevo.' },
      { status: 400 }
    );
  }
  const { style, creativity, skinTone } = parsed.data;
  console.log('Step 3: Validation passed');

  // 5. Validate image
  if (imageFile.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'La imagen es demasiado grande. Máximo 10MB.' },
      { status: 400 }
    );
  }

  const supportedTypes: readonly string[] = SUPPORTED_MIME_TYPES;
  if (!supportedTypes.includes(imageFile.type)) {
    return NextResponse.json(
      { error: 'Formato no soportado. Usa JPG o PNG.' },
      { status: 400 }
    );
  }

  // 6–8. Preprocess → build prompt → generate (60s timeout)
  try {
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 6. Preprocess
    console.log('Step 4: Image preprocessing');
    const processed = await preprocessUltrasound(buffer);

    // 7. Build prompt
    console.log('Step 5: Building prompt');
    const prompt = buildPrompt(style, creativity, skinTone);

    // Mock mode — skip OpenAI, return a 1×1 pink PNG for UI testing
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
      return NextResponse.json({ image: mockPng.toString('base64') });
    }

    let requestFingerprint: RequestFingerprint | null = null;
    if (ENABLE_SESSION_IMAGE_CACHE) {
      requestFingerprint = createRequestFingerprint(
        processed,
        style,
        creativity,
      );
      const cachedImage = getCachedImage(requestFingerprint);
      if (cachedImage) {
        console.log('Generate API: cache hit');
        return NextResponse.json({ image: cachedImage });
      }
    }

    // 8. Generate with 60s timeout
    console.log('Step 6: Calling OpenAI');
    const base64 = await Promise.race([
      generatePortrait(processed, prompt),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('timeout')),
          OPENAI_TIMEOUT_MS
        )
      ),
    ]);

    if (ENABLE_SESSION_IMAGE_CACHE && requestFingerprint) {
      setCachedImage(requestFingerprint, base64);
    }

    return NextResponse.json({ image: base64 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'timeout') {
      return NextResponse.json(
        { error: 'La generación tardó demasiado. Intenta de nuevo.' },
        { status: 504 }
      );
    }

    if (err instanceof OpenAI.APIError) {
      if (err.code === 'moderation_blocked' || err.code === 'content_policy_violation') {
        return NextResponse.json(
          {
            error:
              'La imagen no pudo procesarse. Intenta con una foto diferente.',
          },
          { status: 400 }
        );
      }
    } else {
      console.error('Generate API error:', err);
    }

    return NextResponse.json(
      { error: 'Ocurrió un error inesperado. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}
