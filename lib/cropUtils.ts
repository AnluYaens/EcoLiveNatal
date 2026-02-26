/**
 * Canvas-based crop utility with rotation support for react-easy-crop.
 *
 * DO NOT REWRITE THIS FILE. Canvas crop + rotation has multiple buggy variants
 * in circulation. This implementation correctly handles:
 * - Rotated bounding box calculation (prevents clipping)
 * - Full-size temporary canvas → getImageData → output canvas pattern
 * - Proper resource cleanup
 */

interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Create an off-screen image element from a source URL.
 */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (err) => reject(err));
    img.crossOrigin = 'anonymous';
    img.src = url;
  });
}

/**
 * Convert degrees to radians.
 */
function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Calculate the bounding box of a rectangle after rotation.
 * When an image is rotated, its bounding box grows — we need the new
 * width/height so we can size the canvas correctly before cropping.
 */
function rotatedBoundingBox(
  width: number,
  height: number,
  rotation: number
): { width: number; height: number } {
  const rad = degToRad(rotation);
  const sinAbs = Math.abs(Math.sin(rad));
  const cosAbs = Math.abs(Math.cos(rad));
  return {
    width: Math.floor(width * cosAbs + height * sinAbs),
    height: Math.floor(width * sinAbs + height * cosAbs),
  };
}

/**
 * Extract the cropped region from an image, applying rotation.
 *
 * @param imageSrc  - Object URL or data URL of the source image
 * @param pixelCrop - Crop area in pixels (from react-easy-crop onCropComplete)
 * @param rotation  - Rotation angle in degrees (default: 0)
 * @returns PNG Blob of the cropped region
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: PixelCrop,
  rotation = 0
): Promise<Blob> {
  const image = await createImage(imageSrc);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // Step 1: Draw the full image rotated onto a canvas sized to the
  // rotated bounding box, so crop coordinates align correctly.
  const bb = rotatedBoundingBox(
    image.naturalWidth,
    image.naturalHeight,
    rotation
  );

  canvas.width = bb.width;
  canvas.height = bb.height;

  // Move origin to center, rotate, draw image centered
  ctx.translate(bb.width / 2, bb.height / 2);
  ctx.rotate(degToRad(rotation));
  ctx.translate(-image.naturalWidth / 2, -image.naturalHeight / 2);
  ctx.drawImage(image, 0, 0);

  // Step 2: Extract the cropped pixel data from the rotated canvas
  const croppedData = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  );

  // Step 3: Write cropped pixels onto a correctly-sized output canvas
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.putImageData(croppedData, 0, 0);

  // Step 4: Export as PNG Blob
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Canvas toBlob returned null'));
      }
    }, 'image/png');
  });
}
