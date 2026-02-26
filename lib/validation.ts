import { z } from 'zod';

export const GenerateSchema = z.object({
  style: z.enum(['soft', 'ultra', 'cinematic']),
  creativity: z.number().min(0).max(100),
});

export type GenerateInput = z.infer<typeof GenerateSchema>;
