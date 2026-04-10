import sharp from 'sharp';
import type { AnatomicalRegion, ScanType } from './validation';

interface PreprocessOptions {
  anatomicalRegion?: AnatomicalRegion;
  scanType?: ScanType;
}

interface PreprocessConfig {
  readonly topMaskRatio: number;
  readonly bottomMaskRatio: number;
  readonly sideMaskRatio: number;
  readonly normalize: boolean;
}

function getPreprocessConfig(options: PreprocessOptions): PreprocessConfig {
  const anatomicalRegion = options.anatomicalRegion ?? 'face';
  const scanType = options.scanType ?? '3d4d';

  if (anatomicalRegion === 'fullBody') {
    return {
      topMaskRatio: 0,
      bottomMaskRatio: 0,
      sideMaskRatio: 0,
      normalize: true,
    };
  }

  if (anatomicalRegion !== 'face') {
    return {
      topMaskRatio: scanType === '2d' ? 0.06 : 0.08,
      bottomMaskRatio: 0.06,
      sideMaskRatio: 0.03,
      normalize: true,
    };
  }

  // face: no padding — face/fullBody scans never have patient info overlays
  return {
    topMaskRatio: 0,
    bottomMaskRatio: 0,
    sideMaskRatio: scanType === '2d' ? 0.02 : 0,
    normalize: true,
  };
}

/**
 * Returns true if preprocessUltrasound will composite black mask strips for
 * the given region/scanType. Used by the generation route to decide whether
 * post-generation trimming is needed.
 */
export function hasMaskStrips(
  anatomicalRegion: AnatomicalRegion,
  scanType: ScanType,
): boolean {
  const config = getPreprocessConfig({ anatomicalRegion, scanType });
  return config.topMaskRatio > 0 || config.bottomMaskRatio > 0 || config.sideMaskRatio > 0;
}

/**
 * Preprocess an ultrasound image before sending to OpenAI.
 *
 * Pipeline:
 * 1. Flatten (remove alpha) — black background
 * 2. Resize — max 1024px on longest side, proportional (no letterboxing)
 * 3. Black-fill top/bottom/side strips — removes patient info, timestamps, probe data
 * 4. Normalize — auto-levels contrast enhancement
 * 5. Export as PNG buffer
 *
 * WHY RESIZE BEFORE BLACK-FILL?
 * sharp applies resize before composite internally, so composites must be
 * sized to the output dimensions, not the original. Materializing the
 * resized buffer first lets us compute correct strip dimensions.
 *
 * WHY 'inside' FIT (not 'contain')?
 * 'inside' resizes proportionally without adding black letterbox padding.
 * This preserves the original aspect ratio in the output dimensions so
 * vision analysis coordinates match exactly what the model receives.
 *
 * WHY BLACK-FILL (not transparent)?
 * gpt-image-1 interprets transparent/alpha regions as "areas to inpaint".
 * Black-filling prevents accidental content generation in overlay zones.
 *
 * WHY sharp.create() (not inline SVG)?
 * Inline SVG compositing requires librsvg support in the sharp build.
 * This is available locally but often missing in serverless environments
 * (Vercel, AWS Lambda). sharp.create() with raw pixel buffers is
 * universally compatible and avoids silent deployment failures.
 */
export async function preprocessUltrasound(
  inputBuffer: Buffer,
  options: PreprocessOptions = {},
): Promise<Buffer> {
  const config = getPreprocessConfig(options);

  // Step 1: Flatten alpha and resize proportionally (no letterboxing)
  const resizedBuffer = await sharp(inputBuffer)
    .flatten({ background: { r: 0, g: 0, b: 0 } })
    .resize(1024, 1024, {
      fit: 'inside',
      background: { r: 0, g: 0, b: 0 },
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();

  // Step 2: Read actual output dimensions (needed for correct strip sizing)
  const resizedMeta = await sharp(resizedBuffer).metadata();
  const width = resizedMeta.width ?? 1024;
  const height = resizedMeta.height ?? 1024;

  // Step 3: Compute and composite black mask strips
  const topMaskHeight = Math.max(1, Math.floor(height * config.topMaskRatio));
  const bottomMaskHeight = Math.max(1, Math.floor(height * config.bottomMaskRatio));
  const sideMaskWidth = Math.max(0, Math.floor(width * config.sideMaskRatio));

  const blackStripTop = await sharp({
    create: {
      width,
      height: topMaskHeight,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .png()
    .toBuffer();

  const composites: sharp.OverlayOptions[] = [
    {
      input: blackStripTop,
      top: 0,
      left: 0,
    },
  ];

  const blackStripBottom = await sharp({
    create: {
      width,
      height: bottomMaskHeight,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .png()
    .toBuffer();

  composites.push({
    input: blackStripBottom,
    top: height - bottomMaskHeight,
    left: 0,
  });

  if (sideMaskWidth > 0) {
    const sideStrip = await sharp({
      create: {
        width: sideMaskWidth,
        height,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();

    composites.push(
      {
        input: sideStrip,
        top: 0,
        left: 0,
      },
      {
        input: sideStrip,
        top: 0,
        left: width - sideMaskWidth,
      },
    );
  }

  // Step 4: Apply composites and normalize
  let pipeline = sharp(resizedBuffer).composite(composites);

  if (config.normalize) {
    pipeline = pipeline.normalize(); // auto-levels contrast enhancement
  }

  return pipeline.png().toBuffer();
}

/**
 * Remove yellow annotation overlays (measurement text, calipers, crosshairs)
 * by painting those pixels black. This is intentionally conservative and only
 * targets saturated yellow overlays that do not belong to tissue structures.
 */
export async function stripYellowOverlay(inputBuffer: Buffer): Promise<Buffer> {
  const image = sharp(inputBuffer);
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const isYellowOverlay =
      r > 170 &&
      g > 150 &&
      b < 140 &&
      Math.abs(r - g) < 65;

    if (isYellowOverlay) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 255;
    }
  }

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png()
    .toBuffer();
}
