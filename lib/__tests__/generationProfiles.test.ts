import { describe, expect, it } from 'vitest';
import {
  REGION_ORDER,
  getDefaultScanTypeForRegion,
  getGenerationDefaults,
  getPreferredModeForRegion,
  getRegionProfile,
} from '../generationProfiles';

describe('generationProfiles', () => {
  it('keeps the canonical region order stable for the UI', () => {
    expect(REGION_ORDER).toEqual([
      'face',
      'heart',
      'brain',
      'spine',
      'abdomen',
      'fullBody',
    ]);
  });

  it('returns portrait defaults for face portrait mode', () => {
    expect(getGenerationDefaults('portrait', 'face')).toEqual({
      style: 'ultra',
      creativity: 15,
    });
  });

  it('falls back to the preferred mode when an invalid mode-region combination is requested', () => {
    expect(getGenerationDefaults('portrait', 'heart')).toEqual({
      style: 'ultra',
      creativity: 42,
    });
  });

  it('keeps region metadata available for every supported region', () => {
    for (const region of REGION_ORDER) {
      const profile = getRegionProfile(region);
      expect(profile.labelKey).toMatch(/^region/);
      expect(profile.cropGuidance.tipKey).toMatch(/^guidance/);
      expect(getPreferredModeForRegion(region)).toBeTruthy();
      expect(getDefaultScanTypeForRegion(region)).toBeTruthy();
    }
  });
});
