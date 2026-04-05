import fs from 'fs';
import path from 'path';
import {
  GENERATION_TELEMETRY_MAX_EVENTS,
  REDIS_GENERATION_TELEMETRY_KEY,
} from './constants';
import { getRedisClient, isRedisConfigured } from './redis';
import type { AnatomicalRegion, GenerationMode, ScanType } from './validation';

export type TelemetryStatus =
  | 'success'
  | 'rateLimit'
  | 'badRequest'
  | 'unauthorized'
  | 'dailyLimitExceeded'
  | 'timeout'
  | 'contentBlock'
  | 'generic';

export type TelemetryProvider = 'openai' | 'gemini' | 'mock' | 'none';
export type TelemetryCacheOutcome = 'disabled' | 'hit' | 'miss';
export type TelemetryDurationBucket = '<10s' | '10-30s' | '30-60s' | '60s+';

export interface GenerationTelemetryEvent {
  readonly id: string;
  readonly occurredAt: string;
  readonly status: TelemetryStatus;
  readonly provider?: TelemetryProvider;
  readonly anatomicalRegion?: AnatomicalRegion;
  readonly mode?: GenerationMode;
  readonly scanType?: ScanType;
  readonly preprocessPath?: string;
  readonly cacheOutcome?: TelemetryCacheOutcome;
  readonly analysisUsed?: boolean;
  readonly analysisImageQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  readonly analysisAnatomyConfidence?: 'high' | 'medium' | 'low';
  readonly heartProfile?: 'strict' | 'salvage';
  readonly measurementRingDetected?: boolean;
  readonly blackBandDetected?: boolean;
  readonly durationMs?: number;
  readonly durationBucket: TelemetryDurationBucket;
}

export interface GenerationTelemetrySummary {
  readonly generatedAt: string;
  readonly totalEvents: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly successRate: number;
  readonly analysisUsageRate: number;
  readonly countsByStatus: Record<string, number>;
  readonly countsByProvider: Record<string, number>;
  readonly countsByRegion: Record<string, number>;
  readonly countsByMode: Record<string, number>;
  readonly countsByScanType: Record<string, number>;
  readonly countsByDurationBucket: Record<string, number>;
  readonly countsByCacheOutcome: Record<string, number>;
  readonly countsByPreprocessPath: Record<string, number>;
  readonly countsByAnalysisImageQuality: Record<string, number>;
  readonly countsByAnatomyConfidence: Record<string, number>;
  readonly countsByHeartProfile: Record<string, number>;
}

interface TelemetryFileShape {
  events: GenerationTelemetryEvent[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const TELEMETRY_PATH = path.join(DATA_DIR, 'generation-telemetry.json');

function readTelemetryFile(): TelemetryFileShape {
  if (!fs.existsSync(TELEMETRY_PATH)) {
    return { events: [] };
  }

  try {
    return JSON.parse(fs.readFileSync(TELEMETRY_PATH, 'utf-8')) as TelemetryFileShape;
  } catch {
    return { events: [] };
  }
}

function writeTelemetryFile(events: GenerationTelemetryEvent[]): void {
  const tmp = `${TELEMETRY_PATH}.tmp`;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(tmp, JSON.stringify({ events }, null, 2), 'utf-8');
  fs.renameSync(tmp, TELEMETRY_PATH);
}

let writeQueue: Promise<void> = Promise.resolve();

function clampTelemetryEvents(events: GenerationTelemetryEvent[]): GenerationTelemetryEvent[] {
  return events
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, GENERATION_TELEMETRY_MAX_EVENTS);
}

async function appendTelemetryFile(event: GenerationTelemetryEvent): Promise<void> {
  writeQueue = writeQueue.then(() => {
    const current = readTelemetryFile();
    writeTelemetryFile(clampTelemetryEvents([event, ...current.events]));
  });
  return writeQueue;
}

async function appendTelemetryRedis(event: GenerationTelemetryEvent): Promise<void> {
  const redis = getRedisClient();
  await redis.lpush(REDIS_GENERATION_TELEMETRY_KEY, JSON.stringify(event));
  await redis.ltrim(
    REDIS_GENERATION_TELEMETRY_KEY,
    0,
    GENERATION_TELEMETRY_MAX_EVENTS - 1,
  );
}

async function readTelemetryRedis(): Promise<GenerationTelemetryEvent[]> {
  const redis = getRedisClient();
  const raw = await redis.lrange<string>(
    REDIS_GENERATION_TELEMETRY_KEY,
    0,
    GENERATION_TELEMETRY_MAX_EVENTS - 1,
  );
  return raw
    .map((entry) => {
      try {
        return JSON.parse(entry) as GenerationTelemetryEvent;
      } catch {
        return null;
      }
    })
    .filter((entry): entry is GenerationTelemetryEvent => entry !== null);
}

function toDurationBucket(durationMs: number): TelemetryDurationBucket {
  if (durationMs < 10_000) return '<10s';
  if (durationMs < 30_000) return '10-30s';
  if (durationMs < 60_000) return '30-60s';
  return '60s+';
}

function incrementCount(
  counts: Record<string, number>,
  key: string | undefined,
): void {
  if (!key) return;
  counts[key] = (counts[key] ?? 0) + 1;
}

function buildSummary(events: GenerationTelemetryEvent[]): GenerationTelemetrySummary {
  const countsByStatus: Record<string, number> = {};
  const countsByProvider: Record<string, number> = {};
  const countsByRegion: Record<string, number> = {};
  const countsByMode: Record<string, number> = {};
  const countsByScanType: Record<string, number> = {};
  const countsByDurationBucket: Record<string, number> = {};
  const countsByCacheOutcome: Record<string, number> = {};
  const countsByPreprocessPath: Record<string, number> = {};
  const countsByAnalysisImageQuality: Record<string, number> = {};
  const countsByAnatomyConfidence: Record<string, number> = {};
  const countsByHeartProfile: Record<string, number> = {};

  let successCount = 0;
  let analysisUsedCount = 0;

  for (const event of events) {
    incrementCount(countsByStatus, event.status);
    incrementCount(countsByProvider, event.provider);
    incrementCount(countsByRegion, event.anatomicalRegion);
    incrementCount(countsByMode, event.mode);
    incrementCount(countsByScanType, event.scanType);
    incrementCount(countsByDurationBucket, event.durationBucket);
    incrementCount(countsByCacheOutcome, event.cacheOutcome);
    incrementCount(countsByPreprocessPath, event.preprocessPath);
    incrementCount(countsByAnalysisImageQuality, event.analysisImageQuality);
    incrementCount(countsByAnatomyConfidence, event.analysisAnatomyConfidence);
    incrementCount(countsByHeartProfile, event.heartProfile);

    if (event.status === 'success') {
      successCount += 1;
    }
    if (event.analysisUsed) {
      analysisUsedCount += 1;
    }
  }

  const totalEvents = events.length;
  const failureCount = totalEvents - successCount;

  return {
    generatedAt: new Date().toISOString(),
    totalEvents,
    successCount,
    failureCount,
    successRate: totalEvents === 0 ? 0 : Number((successCount / totalEvents).toFixed(4)),
    analysisUsageRate: totalEvents === 0 ? 0 : Number((analysisUsedCount / totalEvents).toFixed(4)),
    countsByStatus,
    countsByProvider,
    countsByRegion,
    countsByMode,
    countsByScanType,
    countsByDurationBucket,
    countsByCacheOutcome,
    countsByPreprocessPath,
    countsByAnalysisImageQuality,
    countsByAnatomyConfidence,
    countsByHeartProfile,
  };
}

export async function trackGenerationTelemetry(
  event: Omit<GenerationTelemetryEvent, 'id' | 'occurredAt' | 'durationBucket'> & { durationMs?: number },
): Promise<void> {
  const telemetryEvent: GenerationTelemetryEvent = {
    ...event,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    occurredAt: new Date().toISOString(),
    durationBucket: toDurationBucket(event.durationMs ?? 0),
  };

  if (isRedisConfigured()) {
    await appendTelemetryRedis(telemetryEvent);
    return;
  }

  await appendTelemetryFile(telemetryEvent);
}

export async function getGenerationTelemetrySnapshot(
  recentLimit = 50,
): Promise<{ summary: GenerationTelemetrySummary; recentEvents: GenerationTelemetryEvent[] }> {
  const events = isRedisConfigured()
    ? await readTelemetryRedis()
    : readTelemetryFile().events;

  const sortedEvents = events.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return {
    summary: buildSummary(sortedEvents),
    recentEvents: sortedEvents.slice(0, recentLimit),
  };
}
