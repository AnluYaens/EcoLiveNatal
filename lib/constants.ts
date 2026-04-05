export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/hevc',
  'image/webp',
] as const;

// Brute-force protection (verify-token)
export const BRUTE_FORCE_MAX_ATTEMPTS = 5;
export const BRUTE_FORCE_WINDOW_MS = 10 * 60 * 1000;  // 10 min
export const BRUTE_FORCE_LOCKOUT_MS = 15 * 60 * 1000; // 15 min

// Usage tracking
export const DAILY_LIMIT_PRUNE_DAYS = 30;
export const USAGE_REDIS_TTL_SECONDS = 90 * 24 * 3600;
export const GENERATION_TELEMETRY_MAX_EVENTS = 500;
export const REDIS_NAMESPACE = 'ecln';
export const REDIS_TOKEN_KEY_PREFIX = `${REDIS_NAMESPACE}:token`;
export const REDIS_USAGE_KEY_PREFIX = `${REDIS_NAMESPACE}:usage`;
export const REDIS_GENERATION_TELEMETRY_KEY = `${REDIS_NAMESPACE}:telemetry:generation`;
export const ANNOTATION_PANEL_LEFT_RATIO = 0.25;
export const ANNOTATION_PANEL_RIGHT_RATIO = 0.12;
export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_TITLE ?? 'EcoLiveNatal';
export const CLINIC_NAME =
  process.env.NEXT_PUBLIC_CLINIC_NAME ?? '';
export const CLINIC_LOGO =
  process.env.NEXT_PUBLIC_CLINIC_LOGO_URL ?? '';
