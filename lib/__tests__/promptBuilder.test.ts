import { describe, it, expect } from 'vitest';
import {
  buildEnhancedPrompt,
  buildGeminiPrompt,
  buildPrompt,
  buildHeartStrictPrompt,
  buildHeartSalvagePrompt,
  buildGeminiHeartStrictPrompt,
  buildGeminiHeartSalvagePrompt,
} from '../promptBuilder';

describe('buildPrompt', () => {
  describe('base prompt', () => {
    it('uses BLOCK A / BLOCK B structure', () => {
      const result = buildPrompt(50);
      expect(result).toContain('BLOCK A');
      expect(result).toContain('BLOCK B');
      expect(result).toContain('PRESERVE EXACTLY');
      expect(result).toContain('ALLOWED IMPROVEMENTS');
    });

    it('includes CONTENT CLASSIFICATION and texture translation intro', () => {
      const result = buildPrompt(50);
      expect(result).toContain('CONTENT CLASSIFICATION');
      expect(result).toContain('photorealistic newborn skin');
      expect(result).toContain('faithful texture translation, not a recomposed portrait');
    });

    it('locks facing direction as FIXED in BLOCK A', () => {
      const result = buildPrompt(50);
      expect(result).toContain('This is FIXED. Do NOT mirror, flip, or reverse.');
      expect(result).toContain('Anti-mirror rule');
    });

    it('enforces crop boundary in BLOCK A', () => {
      const result = buildPrompt(50);
      expect(result).toContain('treat the source frame as a hard boundary. Do NOT recenter. Do NOT zoom out.');
    });

    it('uses generic facing and chin when no analysis is provided', () => {
      const result = buildPrompt(50);
      expect(result).toContain('preserve-as-is');
      expect(result).toContain('[source: generic]');
    });

    it('falls back to general realism in BLOCK B when no analysis', () => {
      const result = buildPrompt(50);
      expect(result).toContain('Improve general realism only. No feature-specific guidance available.');
    });

    it('includes Realistic newborn skin in BLOCK B', () => {
      const result = buildPrompt(50);
      expect(result).toContain('Realistic newborn skin');
    });

    it('does not use the medical-illustration disclaimer', () => {
      const result = buildPrompt(50);
      expect(result).not.toContain('No human subjects depicted as people');
    });
  });

  describe('creativity modifiers', () => {
    it('uses strict mode for creativity <= 30', () => {
      expect(buildPrompt(0)).toContain('Strict mode');
      expect(buildPrompt(30)).toContain('Strict mode');
    });

    it('uses balanced mode for creativity 31–70', () => {
      expect(buildPrompt(31)).toContain('Balanced mode');
      expect(buildPrompt(50)).toContain('Balanced mode');
      expect(buildPrompt(70)).toContain('Balanced mode');
    });

    it('uses high mode for creativity >= 71', () => {
      expect(buildPrompt(71)).toContain('High mode');
      expect(buildPrompt(100)).toContain('High mode');
    });
  });

  describe('skin tone', () => {
    it('includes moreno skin tone modifier when skinTone is moreno', () => {
      const result = buildPrompt(50, 'moreno');
      expect(result).toContain('Skin tone requirement');
      expect(result).toContain('warm brown skin');
    });

    it('does NOT include skin tone modifier when skinTone is normal', () => {
      const result = buildPrompt(50, 'normal');
      expect(result).not.toContain('Skin tone requirement');
    });

    it('defaults to normal skin tone (no modifier) when skinTone is omitted', () => {
      const result = buildPrompt(50);
      expect(result).not.toContain('Skin tone requirement');
    });
  });

  describe('output structure', () => {
    it('joins sections with double newlines', () => {
      const result = buildPrompt(50, 'moreno');
      expect(result).toContain('\n\n');
    });

    it('does not include null or undefined in output', () => {
      const result = buildPrompt(50, 'normal');
      expect(result).not.toContain('null');
      expect(result).not.toContain('undefined');
    });
  });

  describe('enhanced portrait prompt', () => {
    it('emits BLOCK A with coordinate-derived facing and BLOCK B with specific baby features', () => {
      const result = buildEnhancedPrompt(
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

      // BLOCK A structure
      expect(result).toContain('BLOCK A');
      expect(result).toContain('PRESERVE EXACTLY');
      // coordinate-derived facing
      expect(result).toContain('facing-left');
      expect(result).toContain('[source: coordinates]');
      // landmark note since coords were used
      expect(result).toContain('Landmark geometry is derived from spatial analysis');
      // BLOCK B structure
      expect(result).toContain('BLOCK B');
      expect(result).toContain('THIS SPECIFIC BABY\'S FEATURES');
      expect(result).toContain('Realistic newborn skin');
      // does not use medical-illustration disclaimer
      expect(result).not.toContain('No human subjects depicted as people');
    });

    it('uses coordinate-derived facing-right and includes landmark note when coordinates are used', () => {
      const result = buildEnhancedPrompt(
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

      expect(result).toContain('BLOCK A');
      expect(result).toContain('facing-right');
      expect(result).toContain('[source: coordinates]');
      expect(result).toContain('Landmark geometry is derived from spatial analysis');
      // head tilt comes through as human-readable
      expect(result).toContain('15°');
      // view angle human-readable
      expect(result).toContain('three-quarter view from the right');
    });

    it('works without spatialLayout — uses generic pose preservation', () => {
      const result = buildEnhancedPrompt(
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

      expect(result).toContain('BLOCK A');
      expect(result).toContain('preserve-as-is');
      expect(result).toContain('[source: generic]');
      // no landmark note since no coordinates were available
      expect(result).not.toContain('Landmark geometry is derived from spatial analysis');
      // still has baby features in BLOCK B
      expect(result).toContain('THIS SPECIFIC BABY\'S FEATURES');
      // creativity modifier is still included
      expect(result).toContain('Strictly maintain the anatomical geometry of the original input image.');
    });
  });

  describe('enhanced realistic prompt', () => {
    it('uses organ confidence and overlay interference as hard constraints', () => {
      const result = buildEnhancedPrompt(
        45,
        'normal',
        'realistic',
        '2d',
        'heart',
        'Known conditions: 4-chamber view.',
        {
          estimatedGestationalWeeks: 24,
          viewAngle: 'axial',
          imageQuality: 'fair',
          visibleStructures: ['left ventricle', 'right ventricle', 'interventricular septum'],
          organDetails: {
            viewPlane: 'four-chamber',
            visibleAnatomyDescription: 'Four-chamber cardiac slice with both ventricles and part of the septum visible.',
            measurements: null,
            anatomyConfidence: 'medium',
            overlayInterference: 'moderate',
            sidedness: 'spine remains posterior-right',
            cardiacDetails: {
              visibleChambers: ['LV', 'RV'],
              septalIntegrity: 'IVS partially visible',
              valvesVisible: ['mitral', 'tricuspid'],
              greatVessels: 'not visible in this plane',
              pericardiumVisible: true,
              structuralAnomalyFlag: null,
            },
          },
          overallDescription: 'Axial cardiac view with partial overlay interference.',
        },
      );

      expect(result).toContain('Anatomy confidence: medium');
      expect(result).toContain('Overlay interference: moderate');
      expect(result).toContain('If anatomy confidence is "medium"');
      expect(result).toContain('If overlay interference is "moderate"');
      expect(result).toContain('prioritize ONLY the structures explicitly listed');
      expect(result).toContain('spine remains posterior-right');
    });
  });

  describe('gemini organ prompt', () => {
    it('uses heart analysis to block textbook thoracic reconstructions', () => {
      const result = buildGeminiPrompt(
        'heart',
        '2d',
        '',
        {
          estimatedGestationalWeeks: 24,
          viewAngle: 'axial',
          imageQuality: 'fair',
          visibleStructures: ['left ventricle', 'right ventricle', 'interventricular septum'],
          organDetails: {
            viewPlane: 'four-chamber',
            visibleAnatomyDescription:
              'Four-chamber cardiac slice with both ventricles and part of the septum visible.',
            measurements: null,
            anatomyConfidence: 'medium',
            overlayInterference: 'moderate',
            sidedness: 'spine remains posterior-right',
            cardiacDetails: {
              visibleChambers: ['LV', 'RV'],
              septalIntegrity: 'IVS partially visible',
              valvesVisible: ['mitral', 'tricuspid'],
              greatVessels: 'not visible in this plane',
              pericardiumVisible: false,
              structuralAnomalyFlag: null,
            },
          },
          overallDescription: 'Axial cardiac view with partial overlay interference.',
        },
      );

      expect(result).toContain('Do NOT turn this into a generic textbook thoracic cross-section.');
      expect(result).toContain('Do NOT add lungs, ribs, chest wall, spine, pericardium');
      expect(result).toContain('VISION-ANCHORED CONSTRAINTS');
      expect(result).toContain('Anatomy confidence: medium');
      expect(result).toContain('Overlay interference: moderate');
      expect(result).toContain('Cardiac chambers confirmed: LV, RV');
      expect(result).toContain('Conservative mode: because confidence is medium and overlay interference is moderate');
      expect(result).toContain('Do NOT present this as a dissected specimen');
      expect(result).toContain('do NOT render a clean dissected-heart appearance');
      expect(result).toContain('dotted or faint circular measurement guide');
      expect(result).toContain('Never interpret it as septum, vessel wall, or tissue plane');
      expect(result).toContain('Do NOT create concentric rings, donut-like chambers');
    });
  });
});

// ---------- Heart-specific prompt builders (strict / salvage) ----------

const heartAnalysis = {
  estimatedGestationalWeeks: 24,
  viewAngle: 'axial' as const,
  imageQuality: 'good' as const,
  visibleStructures: ['left ventricle', 'right ventricle', 'interventricular septum', 'mitral valve', 'tricuspid valve'],
  organDetails: {
    viewPlane: 'four-chamber',
    visibleAnatomyDescription: 'Four-chamber cardiac slice with both ventricles.',
    measurements: null,
    anatomyConfidence: 'high' as const,
    overlayInterference: 'none' as const,
    sidedness: 'spine remains posterior-right',
    cardiacDetails: {
      visibleChambers: ['LV', 'RV'],
      septalIntegrity: 'IVS intact',
      valvesVisible: ['mitral', 'tricuspid'],
      greatVessels: 'aorta visible',
      pericardiumVisible: true,
      structuralAnomalyFlag: null,
    },
  },
  overallDescription: 'Clean four-chamber cardiac view.',
};

describe('buildHeartStrictPrompt', () => {
  it('contains HDlive tissue instructions', () => {
    const result = buildHeartStrictPrompt('2d', '', heartAnalysis);
    expect(result).toContain('HDlive');
    expect(result).toContain('texture swap, not a new illustration');
  });

  it('includes cardiac details when analysis is available', () => {
    const result = buildHeartStrictPrompt('2d', '', heartAnalysis);
    expect(result).toContain('CARDIAC STRUCTURE DETAILS');
    expect(result).toContain('Visible chambers: LV, RV');
    expect(result).toContain('Septal integrity: IVS intact');
  });

  it('includes STRICT profile header', () => {
    const result = buildHeartStrictPrompt('2d', '', heartAnalysis);
    expect(result).toContain('PROFILE: STRICT');
  });

  it('does NOT contain conservative mode lines', () => {
    const result = buildHeartStrictPrompt('2d', '', heartAnalysis);
    expect(result).not.toContain('Conservative mode');
  });

  it('does NOT contain anonymous tissue language', () => {
    const result = buildHeartStrictPrompt('2d', '', heartAnalysis);
    expect(result).not.toContain('anonymous tissue masses');
  });

  it('includes clinical notes when provided', () => {
    const result = buildHeartStrictPrompt('2d', 'suspected VSD', heartAnalysis);
    expect(result).toContain('CLINICAL CONTEXT');
    expect(result).toContain('suspected VSD');
  });

  it('works without analysis', () => {
    const result = buildHeartStrictPrompt('2d', '', null);
    expect(result).toContain('PROFILE: STRICT');
    expect(result).not.toContain('CARDIAC STRUCTURE DETAILS');
  });

  it('contains black band artifact prohibition in base heart prompt', () => {
    const result = buildHeartStrictPrompt('2d', '', heartAnalysis);
    expect(result).toContain('Do NOT turn black gaps, black bands, or masked regions into tissue boundaries');
  });

  it('contains black band artifact warning from vision block', () => {
    const result = buildHeartStrictPrompt('2d', '', heartAnalysis);
    expect(result).toContain('ARTIFACT WARNING');
    expect(result).toContain('NOT anatomical boundaries');
  });
});

describe('buildHeartSalvagePrompt', () => {
  it('contains SALVAGE profile header', () => {
    const result = buildHeartSalvagePrompt('2d', '', heartAnalysis);
    expect(result).toContain('PROFILE: SALVAGE');
  });

  it('does NOT contain named chambers (LV, RV, LA, RA)', () => {
    const result = buildHeartSalvagePrompt('2d', '', heartAnalysis);
    expect(result).not.toContain('Visible chambers: LV');
    expect(result).not.toContain('CARDIAC STRUCTURE DETAILS');
  });

  it('contains anonymous tissue mass language', () => {
    const result = buildHeartSalvagePrompt('2d', '', heartAnalysis);
    expect(result).toContain('anonymous tissue masses');
  });

  it('contains measurement ring artifact awareness', () => {
    const result = buildHeartSalvagePrompt('2d', '', heartAnalysis);
    expect(result).toContain('measurement rings are non-anatomical');
  });

  it('contains black band artifact awareness', () => {
    const result = buildHeartSalvagePrompt('2d', '', heartAnalysis);
    expect(result).toContain('black bands or gaps are removed background');
  });

  it('prohibits concentric rings and donut chambers', () => {
    const result = buildHeartSalvagePrompt('2d', '', heartAnalysis);
    expect(result).toContain('concentric rings, donut-like chambers');
  });

  it('prohibits anatomy completion', () => {
    const result = buildHeartSalvagePrompt('2d', '', heartAnalysis);
    expect(result).toContain('Do NOT complete anatomy');
  });

  it('prohibits dissected specimen appearance', () => {
    const result = buildHeartSalvagePrompt('2d', '', heartAnalysis);
    expect(result).toContain('Do NOT present this as a dissected specimen');
  });

  it('works without analysis', () => {
    const result = buildHeartSalvagePrompt('2d', '', null);
    expect(result).toContain('PROFILE: SALVAGE');
    expect(result).toContain('anonymous tissue masses');
  });
});

describe('buildGeminiHeartStrictPrompt', () => {
  it('contains STRICT profile header and Gemini base heart prompt', () => {
    const result = buildGeminiHeartStrictPrompt('2d', '', heartAnalysis);
    expect(result).toContain('PROFILE: STRICT');
    expect(result).toContain('GE Voluson HDlive Silhouette style');
  });

  it('includes full anchor block with cardiac details', () => {
    const result = buildGeminiHeartStrictPrompt('2d', '', heartAnalysis);
    expect(result).toContain('VISION-ANCHORED CONSTRAINTS');
    expect(result).toContain('Cardiac chambers confirmed: LV, RV');
  });

  it('does NOT contain anonymous tissue language', () => {
    const result = buildGeminiHeartStrictPrompt('2d', '', heartAnalysis);
    expect(result).not.toContain('anonymous tissue masses');
  });
});

describe('buildGeminiHeartSalvagePrompt', () => {
  it('contains SALVAGE profile header', () => {
    const result = buildGeminiHeartSalvagePrompt('2d', '', heartAnalysis);
    expect(result).toContain('PROFILE: SALVAGE');
  });

  it('does NOT include cardiac chamber names in anchor block', () => {
    const result = buildGeminiHeartSalvagePrompt('2d', '', heartAnalysis);
    expect(result).not.toContain('Cardiac chambers confirmed');
  });

  it('contains anonymous tissue and artifact restrictions', () => {
    const result = buildGeminiHeartSalvagePrompt('2d', '', heartAnalysis);
    expect(result).toContain('anonymous tissue masses');
    expect(result).toContain('measurement rings are non-anatomical');
    expect(result).toContain('concentric rings, donut-like chambers');
  });

  it('works without analysis', () => {
    const result = buildGeminiHeartSalvagePrompt('2d', '', null);
    expect(result).toContain('PROFILE: SALVAGE');
  });
});
