import {
  REGION_PREFERRED_SCAN_TYPE,
  isModeAllowedForRegion,
  type AnatomicalRegion,
  type GenerationMode,
  type ScanType,
} from './validation';

export type GenerationStyle = 'soft' | 'ultra' | 'cinematic';

interface GenerationDefaults {
  readonly style: GenerationStyle;
  readonly creativity: number;
}

interface CropGuidance {
  readonly tipKey: string;
  readonly subTipKey: string;
}

export interface RegionProfile {
  readonly iconPath: string;
  readonly labelKey: string;
  readonly descKey: string;
  readonly defaultMode: GenerationMode;
  readonly defaultScanType: ScanType;
  readonly supportedModes: readonly GenerationMode[];
  readonly cropGuidance: CropGuidance;
  readonly generationDefaults: Readonly<Record<GenerationMode, GenerationDefaults>>;
}

export const REGION_ORDER: readonly AnatomicalRegion[] = [
  'face',
  'heart',
  'brain',
  'spine',
  'abdomen',
  'fullBody',
];

export const REGION_PROFILES: Readonly<Record<AnatomicalRegion, RegionProfile>> = {
  face: {
    iconPath:
      'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z',
    labelKey: 'regionFace',
    descKey: 'regionFaceDesc',
    defaultMode: 'portrait',
    defaultScanType: REGION_PREFERRED_SCAN_TYPE.face,
    supportedModes: ['portrait', 'realistic'],
    cropGuidance: {
      tipKey: 'guidanceFaceTip',
      subTipKey: 'guidanceFaceSubTip',
    },
    generationDefaults: {
      portrait: { style: 'ultra', creativity: 15 },
      realistic: { style: 'ultra', creativity: 35 },
    },
  },
  heart: {
    iconPath:
      'M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z',
    labelKey: 'regionHeart',
    descKey: 'regionHeartDesc',
    defaultMode: 'realistic',
    defaultScanType: REGION_PREFERRED_SCAN_TYPE.heart,
    supportedModes: ['realistic'],
    cropGuidance: {
      tipKey: 'guidanceHeartTip',
      subTipKey: 'guidanceHeartSubTip',
    },
    generationDefaults: {
      portrait: { style: 'ultra', creativity: 50 },
      realistic: { style: 'ultra', creativity: 42 },
    },
  },
  brain: {
    iconPath:
      'M12 2a9 9 0 00-9 9c0 3.87 2.46 7.16 5.9 8.42.07-.34.2-.68.38-1 .3-.53.76-.97 1.32-1.22a3.5 3.5 0 01-.6-1.95 3.5 3.5 0 013.5-3.5h.5a3.5 3.5 0 013.5 3.5c0 .72-.22 1.39-.6 1.95.56.25 1.02.69 1.32 1.22.18.32.31.66.38 1A9.004 9.004 0 0021 11a9 9 0 00-9-9z',
    labelKey: 'regionBrain',
    descKey: 'regionBrainDesc',
    defaultMode: 'realistic',
    defaultScanType: REGION_PREFERRED_SCAN_TYPE.brain,
    supportedModes: ['realistic'],
    cropGuidance: {
      tipKey: 'guidanceBrainTip',
      subTipKey: 'guidanceBrainSubTip',
    },
    generationDefaults: {
      portrait: { style: 'ultra', creativity: 50 },
      realistic: { style: 'ultra', creativity: 40 },
    },
  },
  spine: {
    iconPath:
      'M12 2L9.5 5H11v3H9.5L12 11l2.5-3H13V5h1.5L12 2zm0 11l-2.5 3H11v3H9.5L12 22l2.5-3H13v-3h1.5L12 13z',
    labelKey: 'regionSpine',
    descKey: 'regionSpineDesc',
    defaultMode: 'realistic',
    defaultScanType: REGION_PREFERRED_SCAN_TYPE.spine,
    supportedModes: ['realistic'],
    cropGuidance: {
      tipKey: 'guidanceSpineTip',
      subTipKey: 'guidanceSpineSubTip',
    },
    generationDefaults: {
      portrait: { style: 'ultra', creativity: 50 },
      realistic: { style: 'ultra', creativity: 38 },
    },
  },
  abdomen: {
    iconPath:
      'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z',
    labelKey: 'regionAbdomen',
    descKey: 'regionAbdomenDesc',
    defaultMode: 'realistic',
    defaultScanType: REGION_PREFERRED_SCAN_TYPE.abdomen,
    supportedModes: ['realistic'],
    cropGuidance: {
      tipKey: 'guidanceAbdomenTip',
      subTipKey: 'guidanceAbdomenSubTip',
    },
    generationDefaults: {
      portrait: { style: 'ultra', creativity: 50 },
      realistic: { style: 'ultra', creativity: 40 },
    },
  },
  fullBody: {
    iconPath:
      'M12 2a2 2 0 110 4 2 2 0 010-4zM10 8a2 2 0 00-2 2v4h2v8h4v-8h2v-4a2 2 0 00-2-2h-4z',
    labelKey: 'regionFullBody',
    descKey: 'regionFullBodyDesc',
    defaultMode: 'portrait',
    defaultScanType: REGION_PREFERRED_SCAN_TYPE.fullBody,
    supportedModes: ['portrait', 'realistic'],
    cropGuidance: {
      tipKey: 'guidanceFullBodyTip',
      subTipKey: 'guidanceFullBodySubTip',
    },
    generationDefaults: {
      portrait: { style: 'ultra', creativity: 25 },
      realistic: { style: 'ultra', creativity: 45 },
    },
  },
};

export function getRegionProfile(region: AnatomicalRegion): RegionProfile {
  return REGION_PROFILES[region];
}

export function getPreferredModeForRegion(region: AnatomicalRegion): GenerationMode {
  return REGION_PROFILES[region].defaultMode;
}

export function getGenerationDefaults(
  mode: GenerationMode,
  region: AnatomicalRegion,
): GenerationDefaults {
  const profile = REGION_PROFILES[region];
  const safeMode = isModeAllowedForRegion(mode, region) ? mode : profile.defaultMode;
  return profile.generationDefaults[safeMode];
}
