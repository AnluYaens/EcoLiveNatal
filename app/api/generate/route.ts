import { NextRequest, NextResponse } from 'next/server';
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
const OPENAI_TIMEOUT_MS = 60_000;

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
  } catch {
    return NextResponse.json(
      { error: 'Ocurrió un error inesperado. Intenta de nuevo.' },
      { status: 400 }
    );
  }

  // 3a. Validate PIN
  const pinRaw = formData.get('pin');
  const accessPin = process.env.ACCESS_PIN;
  if (!accessPin || typeof pinRaw !== 'string' || pinRaw !== accessPin) {
    return NextResponse.json(
      { error: 'Acceso no autorizado' },
      { status: 403 }
    );
  }

  const imageFile = formData.get('image');
  const styleRaw = formData.get('style');
  const creativityRaw = formData.get('creativity');

  if (!(imageFile instanceof File)) {
    return NextResponse.json(
      { error: 'Ocurrió un error inesperado. Intenta de nuevo.' },
      { status: 400 }
    );
  }

  // 4. Validate style + creativity with Zod
  const parsed = GenerateSchema.safeParse({
    style: styleRaw,
    creativity: Number(creativityRaw),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ocurrió un error inesperado. Intenta de nuevo.' },
      { status: 400 }
    );
  }
  const { style, creativity } = parsed.data;

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
    const processed = await preprocessUltrasound(buffer);

    // 7. Build prompt
    const prompt = buildPrompt(style, creativity);

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

    // 8. Generate with 60s timeout
    const base64 = await Promise.race([
      generatePortrait(processed, prompt),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('timeout')),
          OPENAI_TIMEOUT_MS
        )
      ),
    ]);

    return NextResponse.json({ image: base64 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'timeout') {
      return NextResponse.json(
        { error: 'La generación tardó demasiado. Intenta de nuevo.' },
        { status: 504 }
      );
    }

    if (err instanceof OpenAI.APIError) {
      if (
        err.code === 'content_policy_violation' ||
        (err.status === 400 && err.code !== null)
      ) {
        return NextResponse.json(
          {
            error:
              'La imagen no pudo procesarse. Intenta con una foto diferente.',
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Ocurrió un error inesperado. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}
