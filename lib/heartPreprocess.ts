import sharp from 'sharp';
import type { UltrasoundAnalysis } from './visionAnalysis';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HeartRenderProfile = 'strict' | 'salvage';

export interface BoundingBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface BlackBand {
  readonly orientation: 'horizontal' | 'vertical';
  readonly startPx: number;
  readonly endPx: number;
  readonly spanPercent: number;
}

export interface HeartArtifactMap {
  readonly roiBounds: BoundingBox;
  readonly measurementRingPresent: boolean;
  readonly measurementRingRadiusPx: number | null;
  readonly blackBands: readonly BlackBand[];
  readonly blackBandPresent: boolean;
  readonly roiCoveragePercent: number;
  readonly qualityClass: HeartRenderProfile;
}

export interface HeartPreprocessResult {
  readonly cleanedBuffer: Buffer;
  readonly artifactMap: HeartArtifactMap;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum luminance to count a pixel as "bright" for ring detection. */
const BRIGHT_THRESHOLD = 180;

/** Maximum luminance for a neighbour to be considered "dark". */
const DARK_THRESHOLD = 60;

/**
 * Fraction of radial sectors (out of 36) that must contain bright isolated
 * pixels at a consistent radius for us to flag a measurement ring.
 */
const SECTOR_COVERAGE_MIN = 0.55;

/** Minimum ring radius as a fraction of the shorter image dimension. */
const MIN_RING_RADIUS_FRAC = 0.08;

/** Radius tolerance band as fraction of image width. */
const RADIUS_TOLERANCE_FRAC = 0.05;

/** Number of radial sectors for ring scan. */
const NUM_SECTORS = 36;

/** Half-size of the neighbourhood used to clean ring pixels (7×7 → 3). */
const CLEAN_RADIUS = 3;

/**
 * Mean luminance below which a row/column is considered "black" for band
 * detection.
 */
const BAND_LUMINANCE_MAX = 5;

/** Maximum variance for a row/column to be considered truly black (not tissue). */
const BAND_VARIANCE_MAX = 25;

/**
 * Minimum fraction of usable width that a horizontal black band must span
 * (measured on the central 63 % of the image, after panel removal).
 */
const H_BAND_SPAN_MIN = 0.80;

/** Minimum height of a horizontal band as a fraction of image height. */
const H_BAND_HEIGHT_MIN_FRAC = 0.02;

/** Minimum fraction of image height a vertical band must span. */
const V_BAND_SPAN_MIN = 0.50;

/** Minimum width of a vertical band as a fraction of image width. */
const V_BAND_WIDTH_MIN_FRAC = 0.05;

/** Luminance above which a pixel counts as "content" for ROI extraction. */
const ROI_CONTENT_THRESHOLD = 10;

/** Left panel fraction already blacked out by blackOutAnnotationPanels. */
const PANEL_LEFT_FRAC = 0.25;

/** Right panel fraction already blacked out. */
const PANEL_RIGHT_FRAC = 0.12;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function pixelIndex(x: number, y: number, width: number, channels: number): number {
  return (y * width + x) * channels;
}

// ---------------------------------------------------------------------------
// Measurement ring detection
// ---------------------------------------------------------------------------

interface RingDetectionResult {
  readonly present: boolean;
  readonly radiusPx: number | null;
  readonly cleanedData: Buffer;
}

/**
 * Detect dotted/dashed measurement rings (circular/elliptical bright overlays)
 * in a cardiac ultrasound, and clean them by replacing ring pixels with the
 * local neighbourhood average.
 *
 * Strategy:
 * 1. Build a boolean mask of "bright isolated pixels" — pixels whose luminance
 *    exceeds BRIGHT_THRESHOLD while the majority of their 3×3 neighbours are
 *    dark (< DARK_THRESHOLD). This isolates dots/dashes from continuous tissue.
 * 2. Divide the image into NUM_SECTORS radial sectors from the image centre.
 *    For each sector, bucket bright-isolated pixels by their distance from the
 *    centre.
 * 3. A measurement ring shows up as a consistent band of bright pixels at
 *    roughly the same radius across many sectors. If ≥ SECTOR_COVERAGE_MIN of
 *    sectors contain bright isolated pixels within a narrow radius band, we
 *    flag the ring.
 * 4. Clean detected ring pixels by replacing them with the weighted average of
 *    their non-ring 7×7 neighbourhood.
 */
export function detectMeasurementRings(
  rawData: Buffer,
  width: number,
  height: number,
  channels: number,
): RingDetectionResult {
  const data = Buffer.from(rawData); // work on a copy
  const totalPixels = width * height;

  // --- Step 1: build bright-isolated mask ---
  const isBrightIsolated = new Uint8Array(totalPixels);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = pixelIndex(x, y, width, channels);
      const lum = luminance(data[idx], data[idx + 1], data[idx + 2]);
      if (lum < BRIGHT_THRESHOLD) continue;

      // Count dark neighbours in 3×3
      let darkCount = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nIdx = pixelIndex(x + dx, y + dy, width, channels);
          const nLum = luminance(data[nIdx], data[nIdx + 1], data[nIdx + 2]);
          if (nLum < DARK_THRESHOLD) darkCount++;
        }
      }

      // Majority of 8 neighbours are dark → isolated bright pixel
      if (darkCount >= 5) {
        isBrightIsolated[y * width + x] = 1;
      }
    }
  }

  // --- Step 2: radial sector bucketing ---
  const cx = width / 2;
  const cy = height / 2;
  const minDim = Math.min(width, height);
  const minRadius = minDim * MIN_RING_RADIUS_FRAC;
  const maxRadius = minDim * 0.6; // rings won't exceed 60% of image
  const radiusBinSize = Math.max(1, Math.round(width * RADIUS_TOLERANCE_FRAC));

  // For each sector, collect the set of radius bins that contain ≥1 bright pixel
  const sectorAngle = (2 * Math.PI) / NUM_SECTORS;

  // radius bin → count of sectors that have at least one bright pixel in that bin
  const radiusBins = new Map<number, number>();

  for (let s = 0; s < NUM_SECTORS; s++) {
    const angleMin = s * sectorAngle;
    const angleMax = (s + 1) * sectorAngle;
    const binsHitThisSector = new Set<number>();

    // Scan pixels in this sector's angular range (approximate via bounding box)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!isBrightIsolated[y * width + x]) continue;

        const dx = x - cx;
        const dy = y - cy;
        const r = Math.sqrt(dx * dx + dy * dy);
        if (r < minRadius || r > maxRadius) continue;

        let angle = Math.atan2(dy, dx);
        if (angle < 0) angle += 2 * Math.PI;

        if (angle >= angleMin && angle < angleMax) {
          const bin = Math.round(r / radiusBinSize);
          binsHitThisSector.add(bin);
        }
      }
    }

    binsHitThisSector.forEach((bin) => {
      radiusBins.set(bin, (radiusBins.get(bin) ?? 0) + 1);
    });
  }

  // --- Step 3: find the best radius bin ---
  let bestBin = -1;
  let bestCount = 0;
  radiusBins.forEach((count, bin) => {
    if (count > bestCount) {
      bestCount = count;
      bestBin = bin;
    }
  });

  const sectorThreshold = Math.ceil(NUM_SECTORS * SECTOR_COVERAGE_MIN);
  const ringDetected = bestCount >= sectorThreshold && bestBin >= 0;
  const detectedRadius = ringDetected ? bestBin * radiusBinSize : null;

  if (!ringDetected) {
    return { present: false, radiusPx: null, cleanedData: data };
  }

  // --- Step 4: clean ring pixels ---
  // Mark pixels that lie on the detected ring (within tolerance of the radius)
  const ringMask = new Uint8Array(totalPixels);
  const tolerance = radiusBinSize * 1.5;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isBrightIsolated[y * width + x]) continue;

      const dx = x - cx;
      const dy = y - cy;
      const r = Math.sqrt(dx * dx + dy * dy);

      if (Math.abs(r - detectedRadius!) < tolerance) {
        ringMask[y * width + x] = 1;
      }
    }
  }

  // Replace ring pixels with weighted neighbourhood average
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!ringMask[y * width + x]) continue;

      let sumR = 0, sumG = 0, sumB = 0, count = 0;

      for (let dy = -CLEAN_RADIUS; dy <= CLEAN_RADIUS; dy++) {
        for (let dx = -CLEAN_RADIUS; dx <= CLEAN_RADIUS; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          if (ringMask[ny * width + nx]) continue; // skip other ring pixels

          const nIdx = pixelIndex(nx, ny, width, channels);
          sumR += rawData[nIdx];     // use original (pre-clean) values
          sumG += rawData[nIdx + 1];
          sumB += rawData[nIdx + 2];
          count++;
        }
      }

      if (count > 0) {
        const idx = pixelIndex(x, y, width, channels);
        data[idx] = Math.round(sumR / count);
        data[idx + 1] = Math.round(sumG / count);
        data[idx + 2] = Math.round(sumB / count);
      }
    }
  }

  return { present: true, radiusPx: detectedRadius, cleanedData: data };
}

// ---------------------------------------------------------------------------
// Black band detection
// ---------------------------------------------------------------------------

interface BandDetectionResult {
  readonly bands: BlackBand[];
}

/**
 * Detect horizontal and vertical black bands left behind by overlay removal
 * or UI panel masking. True black bands have near-zero mean luminance AND
 * near-zero variance (distinguishing them from dark cardiac chambers which
 * have some texture variation).
 */
export function detectBlackBands(
  rawData: Buffer,
  width: number,
  height: number,
  channels: number,
): BandDetectionResult {
  const bands: BlackBand[] = [];

  // Usable region (central area after panel removal)
  const xStart = Math.round(width * PANEL_LEFT_FRAC);
  const xEnd = Math.round(width * (1 - PANEL_RIGHT_FRAC));
  const usableWidth = xEnd - xStart;

  // --- Horizontal bands ---
  const rowMeanLum = new Float64Array(height);
  const rowVariance = new Float64Array(height);

  for (let y = 0; y < height; y++) {
    let sum = 0;
    let sumSq = 0;
    let blackPixelCount = 0;
    const rowPixelCount = usableWidth;

    for (let x = xStart; x < xEnd; x++) {
      const idx = pixelIndex(x, y, width, channels);
      const lum = luminance(rawData[idx], rawData[idx + 1], rawData[idx + 2]);
      sum += lum;
      sumSq += lum * lum;
      if (lum < BAND_LUMINANCE_MAX) blackPixelCount++;
    }

    rowMeanLum[y] = sum / rowPixelCount;
    rowVariance[y] = sumSq / rowPixelCount - (rowMeanLum[y] * rowMeanLum[y]);

    // Also check span: what fraction of usable width is truly black?
    const spanFrac = blackPixelCount / rowPixelCount;
    // Store span info — we re-check below when forming contiguous runs
    (rowMeanLum as unknown as Record<string, number>)[`span_${y}`] = spanFrac;
  }

  // Find contiguous runs of black rows
  const minBandHeight = Math.max(2, Math.round(height * H_BAND_HEIGHT_MIN_FRAC));
  let runStart = -1;

  for (let y = 0; y <= height; y++) {
    const isBlackRow =
      y < height &&
      rowMeanLum[y] < BAND_LUMINANCE_MAX &&
      rowVariance[y] < BAND_VARIANCE_MAX;

    if (isBlackRow && runStart < 0) {
      runStart = y;
    } else if (!isBlackRow && runStart >= 0) {
      const runHeight = y - runStart;
      if (runHeight >= minBandHeight) {
        // Verify that the majority of rows in this run span enough of the width
        let qualifyingRows = 0;
        for (let ry = runStart; ry < y; ry++) {
          // Recompute span for this row
          let blackCount = 0;
          for (let x = xStart; x < xEnd; x++) {
            const idx = pixelIndex(x, ry, width, channels);
            const lum = luminance(rawData[idx], rawData[idx + 1], rawData[idx + 2]);
            if (lum < BAND_LUMINANCE_MAX) blackCount++;
          }
          if (blackCount / usableWidth >= H_BAND_SPAN_MIN) qualifyingRows++;
        }

        if (qualifyingRows / runHeight >= 0.7) {
          bands.push({
            orientation: 'horizontal',
            startPx: runStart,
            endPx: y - 1,
            spanPercent: (runHeight / height) * 100,
          });
        }
      }
      runStart = -1;
    }
  }

  // --- Vertical bands ---
  const minBandWidth = Math.max(2, Math.round(width * V_BAND_WIDTH_MIN_FRAC));

  let colRunStart = -1;
  for (let x = xStart; x <= xEnd; x++) {
    let isBlackCol = false;

    if (x < xEnd) {
      let sum = 0;
      let sumSq = 0;
      let blackCount = 0;

      for (let y = 0; y < height; y++) {
        const idx = pixelIndex(x, y, width, channels);
        const lum = luminance(rawData[idx], rawData[idx + 1], rawData[idx + 2]);
        sum += lum;
        sumSq += lum * lum;
        if (lum < BAND_LUMINANCE_MAX) blackCount++;
      }

      const mean = sum / height;
      const variance = sumSq / height - mean * mean;
      const spanFrac = blackCount / height;

      isBlackCol =
        mean < BAND_LUMINANCE_MAX &&
        variance < BAND_VARIANCE_MAX &&
        spanFrac >= V_BAND_SPAN_MIN;
    }

    if (isBlackCol && colRunStart < 0) {
      colRunStart = x;
    } else if (!isBlackCol && colRunStart >= 0) {
      const runWidth = x - colRunStart;
      if (runWidth >= minBandWidth) {
        bands.push({
          orientation: 'vertical',
          startPx: colRunStart,
          endPx: x - 1,
          spanPercent: (runWidth / width) * 100,
        });
      }
      colRunStart = -1;
    }
  }

  return { bands };
}

// ---------------------------------------------------------------------------
// ROI extraction
// ---------------------------------------------------------------------------

/**
 * Find the bounding box of the non-black cardiac content within the central
 * region of the image (excluding already-blacked panels).
 */
export function extractROI(
  rawData: Buffer,
  width: number,
  height: number,
  channels: number,
): BoundingBox {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  const xStart = Math.round(width * PANEL_LEFT_FRAC);
  const xEnd = Math.round(width * (1 - PANEL_RIGHT_FRAC));

  for (let y = 0; y < height; y++) {
    for (let x = xStart; x < xEnd; x++) {
      const idx = pixelIndex(x, y, width, channels);
      const lum = luminance(rawData[idx], rawData[idx + 1], rawData[idx + 2]);
      if (lum > ROI_CONTENT_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If no content found, return full usable area
  if (maxX <= minX || maxY <= minY) {
    return { x: xStart, y: 0, width: xEnd - xStart, height };
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

// ---------------------------------------------------------------------------
// Profile selection
// ---------------------------------------------------------------------------

/**
 * Combine artifact-map signals with vision-analysis signals to select the
 * final heart rendering profile.
 *
 * `strict` — only when the image is clean AND the analysis is confident.
 * `salvage` — everything else (always produces output, never blocks).
 */
export function selectHeartProfile(
  artifactMap: HeartArtifactMap,
  analysis: UltrasoundAnalysis | null,
): HeartRenderProfile {
  // Preprocessing must consider it clean
  if (artifactMap.qualityClass !== 'strict') return 'salvage';

  // Analysis must exist and be confident
  if (!analysis) return 'salvage';

  const od = analysis.organDetails;
  if (!od) return 'salvage';

  const strongQuality =
    analysis.imageQuality === 'excellent' || analysis.imageQuality === 'good';
  const highConfidence = od.anatomyConfidence === 'high';
  const lowOverlay =
    od.overlayInterference === 'none' || od.overlayInterference === 'mild';
  const enoughStructures = analysis.visibleStructures.length >= 4;

  if (strongQuality && highConfidence && lowOverlay && enoughStructures) {
    return 'strict';
  }

  return 'salvage';
}

// ---------------------------------------------------------------------------
// Main orchestrator
// ---------------------------------------------------------------------------

/**
 * Heart-specific preprocessing pipeline. Runs AFTER the general preprocessing
 * (blackOutAnnotationPanels + preprocessUltrasound + stripYellowOverlay) and
 * BEFORE vision analysis.
 *
 * 1. Extract raw pixels.
 * 2. Detect & clean measurement rings.
 * 3. Detect black bands.
 * 4. Extract cardiac ROI bounding box.
 * 5. Compute quality classification.
 * 6. Reassemble cleaned PNG buffer.
 */
export async function preprocessHeart(
  inputBuffer: Buffer,
): Promise<HeartPreprocessResult> {
  const { data, info } = await sharp(inputBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  // 1. Measurement rings
  const ringResult = detectMeasurementRings(data, width, height, channels);

  // 2. Black bands (run on original data — bands are not affected by ring cleaning)
  const bandResult = detectBlackBands(data, width, height, channels);

  // 3. ROI (run on ring-cleaned data to avoid ring pixels skewing the box)
  const roi = extractROI(ringResult.cleanedData, width, height, channels);

  // 4. Compute coverage
  const totalUsableArea =
    (width * (1 - PANEL_LEFT_FRAC - PANEL_RIGHT_FRAC)) * height;
  const roiArea = roi.width * roi.height;
  const roiCoveragePercent =
    totalUsableArea > 0 ? (roiArea / totalUsableArea) * 100 : 0;

  // 5. Quality class
  const qualityClass: HeartRenderProfile =
    !ringResult.present &&
    bandResult.bands.length === 0 &&
    roiCoveragePercent > 30
      ? 'strict'
      : 'salvage';

  // 6. Reassemble
  const cleanedBuffer = await sharp(ringResult.cleanedData, {
    raw: { width, height, channels },
  })
    .png()
    .toBuffer();

  return {
    cleanedBuffer,
    artifactMap: {
      roiBounds: roi,
      measurementRingPresent: ringResult.present,
      measurementRingRadiusPx: ringResult.radiusPx,
      blackBands: bandResult.bands,
      blackBandPresent: bandResult.bands.length > 0,
      roiCoveragePercent,
      qualityClass,
    },
  };
}
