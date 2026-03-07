export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/hevc',
  'image/webp',
] as const;
export const DEFAULT_CREATIVITY = 50;

// Brute-force protection (verify-pin)
export const BRUTE_FORCE_MAX_ATTEMPTS = 5;
export const BRUTE_FORCE_WINDOW_MS = 10 * 60 * 1000;  // 10 min
export const BRUTE_FORCE_LOCKOUT_MS = 15 * 60 * 1000; // 15 min

// Usage tracking
export const DAILY_LIMIT_PRUNE_DAYS = 30;
export const DEFAULT_STYLE = 'soft';
export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_TITLE ?? 'EcoLiveNatal';
export const CLINIC_NAME =
  process.env.NEXT_PUBLIC_CLINIC_NAME ?? '';
export const CLINIC_LOGO =
  process.env.NEXT_PUBLIC_CLINIC_LOGO_URL ?? '';
