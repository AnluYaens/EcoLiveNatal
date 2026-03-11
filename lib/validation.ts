import { z } from 'zod';

export const ANATOMICAL_REGIONS = ['face', 'heart', 'brain', 'spine', 'abdomen', 'fullBody'] as const;

export const GenerateSchema = z.object({
  style: z.enum(['soft', 'ultra', 'cinematic']),
  creativity: z.number().min(0).max(100),
  skinTone: z.enum(['normal', 'moreno']).default('normal'),
  mode: z.enum(['portrait', 'realistic']).default('portrait'),
  scanType: z.enum(['3d4d', '2d']).default('3d4d'),
  anatomicalRegion: z.enum(ANATOMICAL_REGIONS).default('face'),
  clinicalNotes: z.string().max(200).default(''),
});

export type GenerateInput = z.infer<typeof GenerateSchema>;
