import sharp from 'sharp';

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
  inputBuffer: Buffer
): Promise<Buffer> {
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();
  const width = metadata.width ?? 1024;
  const height = metadata.height ?? 1024;

  const maskHeight = Math.floor(height * 0.12);

  // Create black strip using sharp.create() — no librsvg dependency
  const blackStrip = await sharp({
    create: {
      width,
      height: maskHeight,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .png()
    .toBuffer();

  return image
    .flatten({ background: { r: 0, g: 0, b: 0 } }) // remove alpha channel
    .composite([
      // Black-fill top 12% — removes ultrasound text overlays
      {
        input: blackStrip,
        top: 0,
        left: 0,
      },
      // Black-fill bottom 12% — removes probe data/timestamps
      {
        input: blackStrip,
        top: height - maskHeight,
        left: 0,
      },
    ])
    .normalize() // auto-levels contrast enhancement
    .resize(1024, 1024, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
}
