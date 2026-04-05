import type { AnatomicalRegion } from './validation';

export type ImageQualityWarning = 'darkCrop' | 'lowContrast' | 'subjectTooSmall';

interface QualityThresholds {
  readonly minBrightness: number;
  readonly minContrast: number;
  readonly minSubjectRatio: number;
}

export interface ImageQualityAssessment {
  readonly warnings: ImageQualityWarning[];
  readonly brightness: number;
  readonly contrast: number;
  readonly subjectRatio: number;
}

function getThresholds(region: AnatomicalRegion): QualityThresholds {
  if (region === 'face' || region === 'fullBody') {
    return {
      minBrightness: 28,
      minContrast: 22,
      minSubjectRatio: 0.16,
    };
  }

  return {
    minBrightness: 20,
    minContrast: 16,
    minSubjectRatio: 0.1,
  };
}

export async function analyzeClientImageQuality(
  blob: Blob,
  region: AnatomicalRegion,
): Promise<ImageQualityAssessment> {
  const bitmap = await createImageBitmap(blob);

  try {
    const maxDimension = 256;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return {
        warnings: [],
        brightness: 0,
        contrast: 0,
        subjectRatio: 0,
      };
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);

    let brightnessSum = 0;
    let brightnessSquaredSum = 0;
    let subjectPixels = 0;
    const pixelCount = width * height;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      brightnessSum += luma;
      brightnessSquaredSum += luma * luma;

      if (luma > 26 || Math.max(r, g, b) > 38) {
        subjectPixels += 1;
      }
    }

    const brightness = brightnessSum / pixelCount;
    const variance = Math.max(0, brightnessSquaredSum / pixelCount - brightness * brightness);
    const contrast = Math.sqrt(variance);
    const subjectRatio = subjectPixels / pixelCount;
    const thresholds = getThresholds(region);
    const warnings: ImageQualityWarning[] = [];

    if (brightness < thresholds.minBrightness) {
      warnings.push('darkCrop');
    }

    if (contrast < thresholds.minContrast) {
      warnings.push('lowContrast');
    }

    if (subjectRatio < thresholds.minSubjectRatio) {
      warnings.push('subjectTooSmall');
    }

    return {
      warnings,
      brightness,
      contrast,
      subjectRatio,
    };
  } finally {
    bitmap.close();
  }
}
