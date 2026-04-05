import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import {
  preprocessHeart,
  selectHeartProfile,
  type HeartArtifactMap,
} from '../heartPreprocess';
import type { UltrasoundAnalysis } from '../visionAnalysis';
import {
  ANNOTATION_PANEL_LEFT_RATIO,
  ANNOTATION_PANEL_RIGHT_RATIO,
} from '../constants';

function createUniformImage(
  width: number,
  height: number,
  gray: number,
): { data: Buffer; channels: 4 } {
  const buf = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    buf[i * 4] = gray;
    buf[i * 4 + 1] = gray;
    buf[i * 4 + 2] = gray;
    buf[i * 4 + 3] = 255;
  }
  return { data: buf, channels: 4 };
}

function drawDottedRing(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  radius: number,
  spacingDeg = 5,
  brightness = 240,
): Buffer {
  const centerX = width / 2;
  const centerY = height / 2;

  for (let degrees = 0; degrees < 360; degrees += spacingDeg) {
    const radians = (degrees * Math.PI) / 180;
    const x = Math.round(centerX + radius * Math.cos(radians));
    const y = Math.round(centerY + radius * Math.sin(radians));

    if (x >= 0 && x < width && y >= 0 && y < height) {
      const index = (y * width + x) * channels;
      data[index] = brightness;
      data[index + 1] = brightness;
      data[index + 2] = brightness;
    }
  }

  return data;
}

function drawHorizontalBlackBand(
  data: Buffer,
  width: number,
  channels: number,
  startY: number,
  endY: number,
): Buffer {
  for (let y = startY; y <= endY; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * channels;
      data[index] = 0;
      data[index + 1] = 0;
      data[index + 2] = 0;
    }
  }

  return data;
}

function makeAnalysis(overrides: {
  imageQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  anatomyConfidence?: 'high' | 'medium' | 'low';
  overlayInterference?: 'none' | 'mild' | 'moderate' | 'heavy';
  structureCount?: number;
}): UltrasoundAnalysis {
  const structures = Array.from(
    { length: overrides.structureCount ?? 5 },
    (_, index) => `structure-${index}`,
  );

  return {
    estimatedGestationalWeeks: 24,
    viewAngle: 'axial',
    imageQuality: overrides.imageQuality ?? 'good',
    visibleStructures: structures,
    overallDescription: 'Test analysis',
    organDetails: {
      viewPlane: 'four-chamber',
      visibleAnatomyDescription: 'test anatomy',
      measurements: null,
      anatomyConfidence: overrides.anatomyConfidence ?? 'high',
      overlayInterference: overrides.overlayInterference ?? 'none',
      sidedness: null,
      cardiacDetails: {
        visibleChambers: ['LV', 'RV'],
        septalIntegrity: 'intact',
        valvesVisible: ['mitral'],
        greatVessels: 'aorta visible',
        pericardiumVisible: true,
        structuralAnomalyFlag: null,
      },
    },
  };
}

function makeArtifactMap(overrides: Partial<HeartArtifactMap> = {}): HeartArtifactMap {
  return {
    roiBounds: { x: 128, y: 0, width: 320, height: 512 },
    measurementRingPresent: false,
    measurementRingRadiusPx: null,
    blackBands: [],
    blackBandPresent: false,
    roiCoveragePercent: 60,
    qualityClass: 'strict',
    ...overrides,
  };
}

describe('selectHeartProfile', () => {
  it('returns strict when artifact map is clean and analysis is confident', () => {
    expect(selectHeartProfile(makeArtifactMap(), makeAnalysis({}))).toBe('strict');
  });

  it('returns salvage when the artifact map is already degraded', () => {
    expect(
      selectHeartProfile(
        makeArtifactMap({ qualityClass: 'salvage', measurementRingPresent: true }),
        makeAnalysis({}),
      ),
    ).toBe('salvage');
  });

  it('returns salvage when analysis is absent or weak', () => {
    expect(selectHeartProfile(makeArtifactMap(), null)).toBe('salvage');
    expect(
      selectHeartProfile(
        makeArtifactMap(),
        makeAnalysis({ anatomyConfidence: 'low', overlayInterference: 'heavy' }),
      ),
    ).toBe('salvage');
    expect(
      selectHeartProfile(
        makeArtifactMap(),
        makeAnalysis({ imageQuality: 'poor', structureCount: 2 }),
      ),
    ).toBe('salvage');
  });
});

describe('preprocessHeart', () => {
  it('returns a strict artifact map for a clean central cardiac region', async () => {
    const width = 512;
    const height = 512;
    const { data } = createUniformImage(width, height, 80);
    const leftPanelWidth = Math.round(width * ANNOTATION_PANEL_LEFT_RATIO);
    const rightPanelStart = Math.round(width * (1 - ANNOTATION_PANEL_RIGHT_RATIO));

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < leftPanelWidth; x++) {
        const index = (y * width + x) * 4;
        data[index] = 0;
        data[index + 1] = 0;
        data[index + 2] = 0;
      }

      for (let x = rightPanelStart; x < width; x++) {
        const index = (y * width + x) * 4;
        data[index] = 0;
        data[index + 1] = 0;
        data[index + 2] = 0;
      }
    }

    const inputBuffer = await sharp(data, {
      raw: { width, height, channels: 4 },
    }).png().toBuffer();

    const result = await preprocessHeart(inputBuffer);

    expect(result.cleanedBuffer).toBeInstanceOf(Buffer);
    expect(result.artifactMap.measurementRingPresent).toBe(false);
    expect(result.artifactMap.blackBandPresent).toBe(false);
    expect(result.artifactMap.qualityClass).toBe('strict');
    expect(result.artifactMap.roiCoveragePercent).toBeGreaterThan(30);
  });

  it('marks dotted measurement rings as salvage artifacts', async () => {
    const width = 512;
    const height = 512;
    const { data } = createUniformImage(width, height, 25);
    drawDottedRing(data, width, height, 4, 150, 5, 240);

    const inputBuffer = await sharp(data, {
      raw: { width, height, channels: 4 },
    }).png().toBuffer();

    const result = await preprocessHeart(inputBuffer);

    expect(result.artifactMap.measurementRingPresent).toBe(true);
    expect(result.artifactMap.qualityClass).toBe('salvage');
  });

  it('marks wide black bands as salvage artifacts', async () => {
    const width = 512;
    const height = 512;
    const { data } = createUniformImage(width, height, 80);
    drawHorizontalBlackBand(data, width, 4, 200, 220);

    const inputBuffer = await sharp(data, {
      raw: { width, height, channels: 4 },
    }).png().toBuffer();

    const result = await preprocessHeart(inputBuffer);

    expect(result.artifactMap.blackBandPresent).toBe(true);
    expect(result.artifactMap.qualityClass).toBe('salvage');
  });
});
