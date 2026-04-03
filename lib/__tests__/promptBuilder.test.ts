import { describe, it, expect } from 'vitest';
import { buildEnhancedPrompt, buildPrompt } from '../promptBuilder';

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

    it('always includes the safety framing and coverage requirement', () => {
      const result = buildPrompt('cinematic', 50);
      expect(result).toContain('Safety framing rule');
      expect(result).toContain('Coverage rule');
    });

    it('keeps portrait prompts focused on a specific baby instead of a medical illustration disclaimer', () => {
      const result = buildPrompt('ultra', 50);
      expect(result).toContain('THIS SPECIFIC baby');
      expect(result).toContain('same baby');
      expect(result).not.toContain('No human subjects depicted as people');
    });

    it('avoids instructing a dark studio background and preserves visible hands around the face', () => {
      const result = buildPrompt('ultra', 50);
      expect(result).toContain("you MUST preserve it and render it as the baby's real hand/arm");
      expect(result).toContain('not a dark studio backdrop');
      expect(result).not.toContain('neutral or dark background');
      expect(result).toContain('strict silhouette and contour map');
      expect(result).toContain('family-safe close-up portrait focused on the baby\'s face and any clearly visible hand only');
      expect(result).toContain('It must NEVER cover or cross the forehead, eyes, cheeks, nose, lips, or chin');
      expect(result).not.toContain('No nudity of any kind');
      expect(result).toContain('Do NOT beautify or idealize the face');
      expect(result).toContain('Use swaddle minimally');
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

  describe('enhanced portrait prompt', () => {
    it('uses face analysis details without reintroducing the medical-illustration disclaimer', () => {
      const result = buildEnhancedPrompt(
        'ultra',
        50,
        'normal',
        'portrait',
        '3d4d',
        'face',
        '',
        {
          estimatedGestationalWeeks: 32,
          viewAngle: 'profile-left',
          imageQuality: 'good',
          visibleStructures: ['nose', 'lips', 'chin'],
          spatialLayout: {
            headTiltDegrees: -12,
            chinElevationDegrees: 10,
            facingDirection: 'facing-left',
            subjectCenterX: 0.55,
            subjectCenterY: 0.45,
            subjectOccupancyPercent: 65,
            noseTipX: 0.38,
            noseTipY: 0.48,
            chinX: 0.45,
            chinY: 0.68,
            foreheadX: 0.52,
            foreheadY: 0.22,
          },
          faceDetails: {
            noseDescription: 'rounded tip',
            lipDescription: 'full lips',
            chinDescription: 'soft rounded chin',
            foreheadDescription: 'smooth forehead',
            cheekDescription: 'full cheeks',
            eyeDescription: 'eyes closed',
            handPosition: null,
            earVisible: false,
            hairVisible: false,
            expression: 'peaceful',
          },
          overallDescription: 'Profile facial view with soft cheeks.',
        },
      );

      expect(result).toContain('VISION ANALYSIS');
      expect(result).toContain('same baby');
      expect(result).not.toContain('No human subjects depicted as people');
      expect(result).toContain('rather than replacing it with blanket or background');
      expect(result).toContain('rather than a dark studio backdrop');
      expect(result).toContain('strict silhouette and contour map');
      expect(result).toContain('family-safe close-up portrait focused on the baby\'s face and any clearly visible hand only');
      expect(result).toContain('It must NEVER cover or cross the forehead, eyes, cheeks, nose, lips, or chin');
      expect(result).not.toContain('No nudity of any kind');
      expect(result).toContain('Do NOT beautify or idealize the face');
      expect(result).toContain('Use swaddle minimally');
    });

    it('includes spatial anchor data with coordinates when spatialLayout is present', () => {
      const result = buildEnhancedPrompt(
        'ultra',
        50,
        'normal',
        'portrait',
        '3d4d',
        'face',
        '',
        {
          estimatedGestationalWeeks: 30,
          viewAngle: 'three-quarter-right',
          imageQuality: 'excellent',
          visibleStructures: ['nose', 'lips', 'chin', 'forehead'],
          spatialLayout: {
            headTiltDegrees: 15,
            chinElevationDegrees: -8,
            facingDirection: 'facing-right',
            subjectCenterX: 0.6,
            subjectCenterY: 0.4,
            subjectOccupancyPercent: 70,
            noseTipX: 0.72,
            noseTipY: 0.45,
            chinX: 0.65,
            chinY: 0.65,
            foreheadX: 0.55,
            foreheadY: 0.2,
          },
          faceDetails: {
            noseDescription: 'small nose',
            lipDescription: 'thin lips',
            chinDescription: 'pointed chin',
            foreheadDescription: 'rounded forehead',
            cheekDescription: 'round cheeks',
            eyeDescription: 'eyes closed',
            handPosition: null,
            earVisible: false,
            hairVisible: false,
            expression: 'calm',
          },
          overallDescription: 'Three-quarter view of the face.',
        },
      );

      expect(result).toContain('SPATIAL ANCHOR DATA');
      expect(result).toContain('(0.60, 0.40)');
      expect(result).toContain('15°');
      expect(result).toContain('facing-right');
      expect(result).toContain('Nose tip at: (0.72, 0.45)');
      expect(result).toContain('Chin at: (0.65, 0.65)');
      expect(result).toContain('Forehead top at: (0.55, 0.20)');
      expect(result).toContain('70%');
    });

    it('works without spatialLayout (backward compatible)', () => {
      const result = buildEnhancedPrompt(
        'ultra',
        50,
        'normal',
        'portrait',
        '3d4d',
        'face',
        '',
        {
          estimatedGestationalWeeks: 32,
          viewAngle: 'profile-left',
          imageQuality: 'good',
          visibleStructures: ['nose', 'lips'],
          faceDetails: {
            noseDescription: 'rounded',
            lipDescription: 'full',
            chinDescription: 'soft',
            foreheadDescription: 'smooth',
            cheekDescription: 'round',
            eyeDescription: 'closed',
            handPosition: null,
            earVisible: false,
            hairVisible: false,
            expression: 'peaceful',
          },
          overallDescription: 'Profile view.',
        },
      );

      expect(result).not.toContain('SPATIAL ANCHOR DATA');
      expect(result).toContain('VISION ANALYSIS');
      expect(result).toContain('SPATIAL AND POSE REQUIREMENT');
    });
  });
});
