import { z } from 'zod';

export const GenerateSchema = z.object({
  style: z.enum(['soft', 'ultra', 'cinematic']),
  creativity: z.number().min(0).max(100),
  skinTone: z.enum(['normal', 'moreno']).default('normal'),
  mode: z.enum(['portrait', 'realistic']).default('portrait'),
  scanType: z.enum(['3d4d', '2d']).default('3d4d'),
});

export type GenerateInput = z.infer<typeof GenerateSchema>;
