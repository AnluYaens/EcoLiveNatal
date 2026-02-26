export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
] as const;
export const DEFAULT_CREATIVITY = 50;
export const DEFAULT_STYLE = 'soft';
export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_TITLE ?? 'EcoLiveNatal';
export const CLINIC_NAME =
  process.env.NEXT_PUBLIC_CLINIC_NAME ?? '';
export const CLINIC_LOGO =
  process.env.NEXT_PUBLIC_CLINIC_LOGO_URL ?? '';
