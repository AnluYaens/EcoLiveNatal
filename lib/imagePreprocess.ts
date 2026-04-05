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
      topMaskRatio: 0.1,
      bottomMaskRatio: 0.06,
      sideMaskRatio: 0.01,
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

  return {
    topMaskRatio: 0.12,
    bottomMaskRatio: 0.12,
    sideMaskRatio: scanType === '2d' ? 0.02 : 0,
    normalize: true,
  };
}

/**
 * Preprocess an ultrasound image before sending to OpenAI.
 *
 * Pipeline:
 * 1. Flatten (remove alpha) — black background
 * 2. Black-fill top/bottom 12% — removes patient info, timestamps, probe data
 * 3. Normalize — auto-levels contrast enhancement
 * 4. Resize — max 1024px on longest side, maintain aspect ratio
 * 5. Export as PNG buffer
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
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();
  const width = metadata.width ?? 1024;
  const height = metadata.height ?? 1024;
  const config = getPreprocessConfig(options);

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

  let pipeline = image
    .flatten({ background: { r: 0, g: 0, b: 0 } }) // remove alpha channel
    .composite(composites);

  if (config.normalize) {
    pipeline = pipeline.normalize(); // auto-levels contrast enhancement
  }

  return pipeline
    .resize(1024, 1024, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0 },
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
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

/**
 * Extract yellow overlays (text, crosshairs) from an ultrasound image.
 * Returns a transparent PNG buffer containing only the yellow pixels.
 */
export async function extractYellowOverlay(inputBuffer: Buffer): Promise<Buffer> {
  const image = sharp(inputBuffer);
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Detect yellow: high red, high green, low blue
    if (r > 180 && g > 180 && b < 100) {
      // Keep pixel, fully opaque
      data[i + 3] = 255;
    } else {
      // Make transparent
      data[i + 3] = 0;
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
