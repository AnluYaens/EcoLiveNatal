import { z } from 'zod';

export const ANATOMICAL_REGIONS = ['face', 'heart', 'brain', 'spine', 'abdomen', 'fullBody'] as const;
export type AnatomicalRegion = (typeof ANATOMICAL_REGIONS)[number];
export const GENERATION_MODES = ['portrait', 'realistic'] as const;
export type GenerationMode = (typeof GENERATION_MODES)[number];
export const GENERATION_STYLES = ['soft', 'ultra', 'cinematic'] as const;
export type GenerationStyle = (typeof GENERATION_STYLES)[number];
export const SKIN_TONES = ['normal', 'moreno'] as const;
export type SkinTone = (typeof SKIN_TONES)[number];
export const SCAN_TYPES = ['3d4d', '2d'] as const;
export type ScanType = (typeof SCAN_TYPES)[number];

export const REGION_ALLOWED_MODES: Readonly<Record<AnatomicalRegion, readonly GenerationMode[]>> = {
  face: ['portrait', 'realistic'],
  heart: ['realistic'],
  brain: ['realistic'],
  spine: ['realistic'],
  abdomen: ['realistic'],
  fullBody: ['portrait', 'realistic'],
};

export const REGION_PREFERRED_SCAN_TYPE: Readonly<Record<AnatomicalRegion, ScanType>> = {
  face: '3d4d',
  heart: '2d',
  brain: '2d',
  spine: '2d',
  abdomen: '2d',
  fullBody: '3d4d',
};

export function isModeAllowedForRegion(
  mode: GenerationMode,
  anatomicalRegion: AnatomicalRegion,
): boolean {
  return REGION_ALLOWED_MODES[anatomicalRegion].includes(mode);
}

export function isPreferredScanTypeForRegion(
  scanType: ScanType,
  anatomicalRegion: AnatomicalRegion,
): boolean {
  return REGION_PREFERRED_SCAN_TYPE[anatomicalRegion] === scanType;
}

export const GenerateSchema = z.object({
  style: z.enum(GENERATION_STYLES),
  creativity: z.number().min(0).max(100),
  skinTone: z.enum(SKIN_TONES).default('normal'),
  mode: z.enum(GENERATION_MODES).default('portrait'),
  scanType: z.enum(SCAN_TYPES).default('3d4d'),
  anatomicalRegion: z.enum(ANATOMICAL_REGIONS).default('face'),
  clinicalNotes: z.string().max(400).default(''),
}).superRefine(({ mode, anatomicalRegion }, ctx) => {
  if (!isModeAllowedForRegion(mode, anatomicalRegion)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['mode'],
      message: `Mode "${mode}" is not allowed for region "${anatomicalRegion}"`,
    });
  }
});
