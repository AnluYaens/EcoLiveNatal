import { describe, it, expect } from 'vitest';
import { GenerateSchema } from '../validation';

describe('GenerateSchema', () => {
  describe('valid inputs', () => {
    it('accepts valid style, creativity, and skinTone', () => {
      const result = GenerateSchema.safeParse({ style: 'soft', creativity: 50, skinTone: 'normal' });
      expect(result.success).toBe(true);
    });

    it('accepts all valid style values', () => {
      for (const style of ['soft', 'ultra', 'cinematic'] as const) {
        const result = GenerateSchema.safeParse({ style, creativity: 50, skinTone: 'normal' });
        expect(result.success, `style "${style}" should be valid`).toBe(true);
      }
    });

    it('accepts creativity at boundaries (0 and 100)', () => {
      expect(GenerateSchema.safeParse({ style: 'soft', creativity: 0, skinTone: 'normal' }).success).toBe(true);
      expect(GenerateSchema.safeParse({ style: 'soft', creativity: 100, skinTone: 'normal' }).success).toBe(true);
    });

    it('accepts both skinTone values', () => {
      expect(GenerateSchema.safeParse({ style: 'soft', creativity: 50, skinTone: 'normal' }).success).toBe(true);
      expect(GenerateSchema.safeParse({ style: 'soft', creativity: 50, skinTone: 'moreno' }).success).toBe(true);
    });

    it('defaults skinTone to normal when omitted', () => {
      const result = GenerateSchema.safeParse({ style: 'soft', creativity: 50 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.skinTone).toBe('normal');
      }
    });
  });

  describe('invalid inputs', () => {
    it('rejects an unknown style', () => {
      const result = GenerateSchema.safeParse({ style: 'watercolor', creativity: 50, skinTone: 'normal' });
      expect(result.success).toBe(false);
    });

    it('rejects creativity below 0', () => {
      const result = GenerateSchema.safeParse({ style: 'soft', creativity: -1, skinTone: 'normal' });
      expect(result.success).toBe(false);
    });

    it('rejects creativity above 100', () => {
      const result = GenerateSchema.safeParse({ style: 'soft', creativity: 101, skinTone: 'normal' });
      expect(result.success).toBe(false);
    });

    it('rejects an unknown skinTone', () => {
      const result = GenerateSchema.safeParse({ style: 'soft', creativity: 50, skinTone: 'azul' });
      expect(result.success).toBe(false);
    });

    it('rejects missing style', () => {
      const result = GenerateSchema.safeParse({ creativity: 50, skinTone: 'normal' });
      expect(result.success).toBe(false);
    });

    it('rejects missing creativity', () => {
      const result = GenerateSchema.safeParse({ style: 'soft', skinTone: 'normal' });
      expect(result.success).toBe(false);
    });
  });
});
