import { NextRequest, NextResponse } from 'next/server';
import { getGenerationTelemetrySnapshot } from '@/lib/generationTelemetry';
import { createApiErrorResponse } from '@/lib/apiErrors';

function isAuthorized(req: NextRequest): boolean {
  const expectedToken = process.env.INTERNAL_METRICS_TOKEN;
  if (!expectedToken) return false;

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;

  return authHeader.slice('Bearer '.length) === expectedToken;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return createApiErrorResponse('unauthorized', 401);
  }

  try {
    const snapshot = await getGenerationTelemetrySnapshot();

    return NextResponse.json(snapshot, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    console.error('Generation telemetry snapshot request failed');
    return createApiErrorResponse('generic', 500);
  }
}
