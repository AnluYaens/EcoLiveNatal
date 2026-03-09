import { describe, it, expect } from 'vitest';
import { buildPrompt } from '../promptBuilder';

describe('buildPrompt', () => {
  describe('base prompt', () => {
    it('always includes the base ultrasound-to-portrait instruction', () => {
      const result = buildPrompt('soft', 50);
      expect(result).toContain('3D/4D obstetric ultrasound');
      expect(result).toContain('ultra-realistic newborn portrait');
    });

    it('always includes the likeness requirement', () => {
      const result = buildPrompt('ultra', 50);
      expect(result).toContain('Likeness requirement');
    });

    it('always includes the clothing requirement', () => {
      const result = buildPrompt('cinematic', 50);
      expect(result).toContain('Clothing requirement');
    });
  });

  describe('style modifiers', () => {
    it('includes soft style modifier', () => {
      const result = buildPrompt('soft', 50);
      expect(result).toContain('soft natural lighting');
    });

    it('includes ultra style modifier', () => {
      const result = buildPrompt('ultra', 50);
      expect(result).toContain('ultra-realistic details');
    });

    it('includes cinematic style modifier', () => {
      const result = buildPrompt('cinematic', 50);
      expect(result).toContain('cinematic lighting');
    });
  });

  describe('creativity modifiers', () => {
    it('uses strict mode for creativity <= 30', () => {
      expect(buildPrompt('soft', 0)).toContain('Strict mode');
      expect(buildPrompt('soft', 30)).toContain('Strict mode');
    });

    it('uses balanced mode for creativity 31–70', () => {
      expect(buildPrompt('soft', 31)).toContain('Balanced mode');
      expect(buildPrompt('soft', 50)).toContain('Balanced mode');
      expect(buildPrompt('soft', 70)).toContain('Balanced mode');
    });

    it('uses high mode for creativity >= 71', () => {
      expect(buildPrompt('soft', 71)).toContain('High mode');
      expect(buildPrompt('soft', 100)).toContain('High mode');
    });
  });

  describe('skin tone', () => {
    it('includes moreno skin tone modifier when skinTone is moreno', () => {
      const result = buildPrompt('soft', 50, 'moreno');
      expect(result).toContain('Skin tone requirement');
      expect(result).toContain('warm brown skin');
    });

    it('does NOT include skin tone modifier when skinTone is normal', () => {
      const result = buildPrompt('soft', 50, 'normal');
      expect(result).not.toContain('Skin tone requirement');
    });

    it('defaults to normal skin tone (no modifier) when skinTone is omitted', () => {
      const result = buildPrompt('soft', 50);
      expect(result).not.toContain('Skin tone requirement');
    });
  });

  describe('output structure', () => {
    it('joins sections with double newlines', () => {
      const result = buildPrompt('soft', 50, 'moreno');
      expect(result).toContain('\n\n');
    });

    it('does not include null or undefined in output', () => {
      const result = buildPrompt('soft', 50, 'normal');
      expect(result).not.toContain('null');
      expect(result).not.toContain('undefined');
    });
  });
});
