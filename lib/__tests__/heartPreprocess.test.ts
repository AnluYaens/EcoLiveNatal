import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import {
  detectMeasurementRings,
  detectBlackBands,
  extractROI,
  selectHeartProfile,
  preprocessHeart,
  type HeartArtifactMap,
} from '../heartPreprocess';
import type { UltrasoundAnalysis } from '../visionAnalysis';

// ---------------------------------------------------------------------------
// Synthetic image helpers
// ---------------------------------------------------------------------------

/**
 * Create a raw RGBA buffer of the given size filled with a uniform gray level.
 */
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

/**
 * Draw bright dots arranged in a circle at the given radius from the image
 * centre, every `spacing` degrees. Returns the modified buffer.
 */
function drawDottedRing(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  radius: number,
  spacingDeg: number = 5,
  brightness: number = 240,
): Buffer {
  const cx = width / 2;
  const cy = height / 2;
  for (let deg = 0; deg < 360; deg += spacingDeg) {
    const rad = (deg * Math.PI) / 180;
    const x = Math.round(cx + radius * Math.cos(rad));
    const y = Math.round(cy + radius * Math.sin(rad));
    if (x >= 0 && x < width && y >= 0 && y < height) {
      const idx = (y * width + x) * channels;
      data[idx] = brightness;
      data[idx + 1] = brightness;
      data[idx + 2] = brightness;
    }
  }
  return data;
}

/**
 * Draw a solid filled ellipse (simulating continuous tissue).
 */
function drawSolidEllipse(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  brightness: number = 200,
): Buffer {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) {
        const idx = (y * width + x) * channels;
        data[idx] = brightness;
        data[idx + 1] = brightness;
        data[idx + 2] = brightness;
      }
    }
  }
  return data;
}

/**
 * Draw a horizontal black band (all zeros) across the full width.
 */
function drawHorizontalBlackBand(
  data: Buffer,
  width: number,
  channels: number,
  startY: number,
  endY: number,
): Buffer {
  for (let y = startY; y <= endY; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      data[idx] = 0;
      data[idx + 1] = 0;
      data[idx + 2] = 0;
    }
  }
  return data;
}

/**
 * Draw a vertical black band.
 */
function drawVerticalBlackBand(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  startX: number,
  endX: number,
): Buffer {
  for (let y = 0; y < height; y++) {
    for (let x = startX; x <= endX; x++) {
      const idx = (y * width + x) * channels;
      data[idx] = 0;
      data[idx + 1] = 0;
      data[idx + 2] = 0;
    }
  }
  return data;
}

/**
 * Create a minimal UltrasoundAnalysis for testing selectHeartProfile.
 */
function makeAnalysis(overrides: {
  imageQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  anatomyConfidence?: 'high' | 'medium' | 'low';
  overlayInterference?: 'none' | 'mild' | 'moderate' | 'heavy';
  structureCount?: number;
}): UltrasoundAnalysis {
  const structures = Array.from(
    { length: overrides.structureCount ?? 5 },
    (_, i) => `structure-${i}`,
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

// ---------------------------------------------------------------------------
// Tests: detectMeasurementRings
// ---------------------------------------------------------------------------

describe('detectMeasurementRings', () => {
  const W = 512;
  const H = 512;
  const CH = 4;

  it('detects a dotted bright circle on a dark background', () => {
    const { data } = createUniformImage(W, H, 20); // dark background
    drawDottedRing(data, W, H, CH, 150, 5, 240);

    const result = detectMeasurementRings(data, W, H, CH);
    expect(result.present).toBe(true);
    expect(result.radiusPx).not.toBeNull();
    // Radius should be close to 150 (within a bin tolerance)
    expect(Math.abs(result.radiusPx! - 150)).toBeLessThan(30);
  });

  it('does NOT false-positive on a solid bright ellipse (tissue)', () => {
    const { data } = createUniformImage(W, H, 20);
    drawSolidEllipse(data, W, H, CH, W / 2, H / 2, 120, 100, 200);

    const result = detectMeasurementRings(data, W, H, CH);
    expect(result.present).toBe(false);
  });

  it('does NOT false-positive on a completely black image', () => {
    const { data } = createUniformImage(W, H, 0);

    const result = detectMeasurementRings(data, W, H, CH);
    expect(result.present).toBe(false);
  });

  it('cleans ring pixels to neighbourhood average', () => {
    const bgGray = 30;
    const { data } = createUniformImage(W, H, bgGray);
    drawDottedRing(data, W, H, CH, 150, 5, 240);

    const result = detectMeasurementRings(data, W, H, CH);
    expect(result.present).toBe(true);

    // After cleaning, the ring pixel positions should no longer be bright
    const cx = W / 2;
    const cy = H / 2;
    const testAngle = 0; // check pixel at angle 0
    const x = Math.round(cx + 150 * Math.cos(testAngle));
    const y = Math.round(cy + 150 * Math.sin(testAngle));
    const idx = (y * W + x) * CH;

    // The cleaned pixel should be much closer to bgGray than to 240
    const cleanedLum =
      0.299 * result.cleanedData[idx] +
      0.587 * result.cleanedData[idx + 1] +
      0.114 * result.cleanedData[idx + 2];
    expect(cleanedLum).toBeLessThan(100);
  });
});

// ---------------------------------------------------------------------------
// Tests: detectBlackBands
// ---------------------------------------------------------------------------

describe('detectBlackBands', () => {
  const W = 512;
  const H = 512;
  const CH = 4;

  it('detects a horizontal black band spanning full width', () => {
    const { data } = createUniformImage(W, H, 80); // gray background (simulates tissue)
    // Draw a 20-pixel black band at y=200..219 (>2% of 512 ≈ 10px minimum)
    drawHorizontalBlackBand(data, W, CH, 200, 219);

    const result = detectBlackBands(data, W, H, CH);
    expect(result.bands.length).toBeGreaterThanOrEqual(1);

    const hBand = result.bands.find((b) => b.orientation === 'horizontal');
    expect(hBand).toBeDefined();
    expect(hBand!.startPx).toBeLessThanOrEqual(200);
    expect(hBand!.endPx).toBeGreaterThanOrEqual(219);
  });

  it('does NOT flag a small dark circular area as a band', () => {
    const { data } = createUniformImage(W, H, 80);
    // Draw a small dark circle (simulating a cardiac chamber) — localized, not full-width
    drawSolidEllipse(data, W, H, CH, W / 2, H / 2, 60, 60, 2);

    const result = detectBlackBands(data, W, H, CH);
    // The dark circle doesn't span 80% of usable width, so no band
    expect(result.bands.filter((b) => b.orientation === 'horizontal').length).toBe(0);
  });

  it('detects a vertical black band', () => {
    const { data } = createUniformImage(W, H, 80);
    // Draw a vertical band at x=250..280 (31 pixels ≈ 6% of 512)
    drawVerticalBlackBand(data, W, H, CH, 250, 280);

    const result = detectBlackBands(data, W, H, CH);
    const vBand = result.bands.find((b) => b.orientation === 'vertical');
    expect(vBand).toBeDefined();
  });

  it('does NOT flag a dark area with texture variation as a band', () => {
    const { data } = createUniformImage(W, H, 80);
    // Add a horizontal strip that has some texture variation (not pure black)
    for (let y = 200; y < 220; y++) {
      for (let x = 0; x < W; x++) {
        const idx = (y * W + x) * CH;
        // Low but non-zero with variation
        const v = Math.floor(Math.random() * 15) + 3;
        data[idx] = v;
        data[idx + 1] = v;
        data[idx + 2] = v;
      }
    }

    const result = detectBlackBands(data, W, H, CH);
    // Variance > 0 should prevent detection as a pure black band
    const hBands = result.bands.filter((b) => b.orientation === 'horizontal');
    expect(hBands.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tests: extractROI
// ---------------------------------------------------------------------------

describe('extractROI', () => {
  const W = 512;
  const H = 512;
  const CH = 4;

  it('finds bounding box of non-black content in centre', () => {
    const { data } = createUniformImage(W, H, 0); // all black
    // Draw a bright rectangle from (160, 100) to (400, 400) — within the usable zone
    for (let y = 100; y <= 400; y++) {
      for (let x = 160; x <= 400; x++) {
        const idx = (y * W + x) * CH;
        data[idx] = 120;
        data[idx + 1] = 120;
        data[idx + 2] = 120;
      }
    }

    const roi = extractROI(data, W, H, CH);
    expect(roi.x).toBeLessThanOrEqual(160);
    expect(roi.y).toBeLessThanOrEqual(100);
    expect(roi.x + roi.width).toBeGreaterThanOrEqual(400);
    expect(roi.y + roi.height).toBeGreaterThanOrEqual(400);
  });

  it('returns full usable area when image is completely black', () => {
    const { data } = createUniformImage(W, H, 0);

    const roi = extractROI(data, W, H, CH);
    // Should return the full usable area (panel-excluded)
    expect(roi.width).toBeGreaterThan(0);
    expect(roi.height).toBe(H);
  });

  it('computes reasonable ROI coverage', () => {
    const { data } = createUniformImage(W, H, 0);
    // Content in a small central area
    for (let y = 200; y < 300; y++) {
      for (let x = 200; x < 300; x++) {
        const idx = (y * W + x) * CH;
        data[idx] = 100;
        data[idx + 1] = 100;
        data[idx + 2] = 100;
      }
    }

    const roi = extractROI(data, W, H, CH);
    const totalUsable = W * (1 - 0.25 - 0.12) * H;
    const roiArea = roi.width * roi.height;
    const coverage = (roiArea / totalUsable) * 100;
    // 100×100 content in ~323×512 usable → ~6%
    expect(coverage).toBeGreaterThan(3);
    expect(coverage).toBeLessThan(20);
  });
});

// ---------------------------------------------------------------------------
// Tests: selectHeartProfile
// ---------------------------------------------------------------------------

describe('selectHeartProfile', () => {
  it('returns strict when artifacts clean and analysis is confident', () => {
    const map = makeArtifactMap({ qualityClass: 'strict' });
    const analysis = makeAnalysis({});
    expect(selectHeartProfile(map, analysis)).toBe('strict');
  });

  it('returns salvage when measurement ring detected', () => {
    const map = makeArtifactMap({
      qualityClass: 'salvage',
      measurementRingPresent: true,
      measurementRingRadiusPx: 150,
    });
    const analysis = makeAnalysis({});
    expect(selectHeartProfile(map, analysis)).toBe('salvage');
  });

  it('returns salvage when analysis is null', () => {
    const map = makeArtifactMap({ qualityClass: 'strict' });
    expect(selectHeartProfile(map, null)).toBe('salvage');
  });

  it('returns salvage when anatomy confidence is low', () => {
    const map = makeArtifactMap({ qualityClass: 'strict' });
    const analysis = makeAnalysis({ anatomyConfidence: 'low' });
    expect(selectHeartProfile(map, analysis)).toBe('salvage');
  });

  it('returns salvage when overlay interference is heavy', () => {
    const map = makeArtifactMap({ qualityClass: 'strict' });
    const analysis = makeAnalysis({ overlayInterference: 'heavy' });
    expect(selectHeartProfile(map, analysis)).toBe('salvage');
  });

  it('returns salvage when too few structures are visible', () => {
    const map = makeArtifactMap({ qualityClass: 'strict' });
    const analysis = makeAnalysis({ structureCount: 2 });
    expect(selectHeartProfile(map, analysis)).toBe('salvage');
  });

  it('returns salvage when image quality is poor', () => {
    const map = makeArtifactMap({ qualityClass: 'strict' });
    const analysis = makeAnalysis({ imageQuality: 'poor' });
    expect(selectHeartProfile(map, analysis)).toBe('salvage');
  });

  it('returns salvage when ROI coverage is too low', () => {
    const map = makeArtifactMap({
      qualityClass: 'salvage', // coverage < 30 would set this
      roiCoveragePercent: 15,
    });
    const analysis = makeAnalysis({});
    expect(selectHeartProfile(map, analysis)).toBe('salvage');
  });
});

// ---------------------------------------------------------------------------
// Tests: preprocessHeart (integration)
// ---------------------------------------------------------------------------

describe('preprocessHeart', () => {
  it('processes a clean image and returns strict quality class', async () => {
    // Create a 512x512 image mostly filled with gray tissue (no rings, no bands)
    // Use uniform gray so no black bands are detected anywhere
    const W = 512;
    const H = 512;
    const { data } = createUniformImage(W, H, 80);

    // Black out only the panel zones (left 25%, right 12%) to match real preprocessing
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < Math.round(W * 0.25); x++) {
        const idx = (y * W + x) * 4;
        data[idx] = 0; data[idx + 1] = 0; data[idx + 2] = 0;
      }
      for (let x = Math.round(W * 0.88); x < W; x++) {
        const idx = (y * W + x) * 4;
        data[idx] = 0; data[idx + 1] = 0; data[idx + 2] = 0;
      }
    }

    const inputBuffer = await sharp(data, { raw: { width: W, height: H, channels: 4 } })
      .png()
      .toBuffer();

    const result = await preprocessHeart(inputBuffer);

    expect(result.cleanedBuffer).toBeInstanceOf(Buffer);
    expect(result.cleanedBuffer.length).toBeGreaterThan(0);
    expect(result.artifactMap.measurementRingPresent).toBe(false);
    expect(result.artifactMap.blackBandPresent).toBe(false);
    expect(result.artifactMap.qualityClass).toBe('strict');
    expect(result.artifactMap.roiCoveragePercent).toBeGreaterThan(30);
  });

  it('detects ring in a synthetic ultrasound and marks salvage', async () => {
    // Build a dark image with a dotted ring drawn on it
    const W = 512;
    const H = 512;
    const { data } = createUniformImage(W, H, 25);
    drawDottedRing(data, W, H, 4, 150, 5, 240);

    // Convert raw RGBA to PNG for preprocessHeart input
    const inputBuffer = await sharp(data, { raw: { width: W, height: H, channels: 4 } })
      .png()
      .toBuffer();

    const result = await preprocessHeart(inputBuffer);

    expect(result.artifactMap.measurementRingPresent).toBe(true);
    expect(result.artifactMap.qualityClass).toBe('salvage');
  });
});
