import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { preprocessUltrasound } from '../imagePreprocess';

describe('preprocessUltrasound', () => {
  it('preserves aspect ratio for non-face anatomical scans', async () => {
    const input = await sharp({
      create: {
        width: 2000,
        height: 1000,
        channels: 3,
        background: { r: 80, g: 80, b: 80 },
      },
    }).png().toBuffer();

    const output = await preprocessUltrasound(input, {
      anatomicalRegion: 'heart',
      scanType: '2d',
    });
    const metadata = await sharp(output).metadata();

    expect(metadata.width).toBe(1024);
    expect(metadata.height).toBe(512);
  });

  it('preserves aspect ratio for face scans (no square padding)', async () => {
    const input = await sharp({
      create: {
        width: 2000,
        height: 1000,
        channels: 3,
        background: { r: 80, g: 80, b: 80 },
      },
    }).png().toBuffer();

    const output = await preprocessUltrasound(input, {
      anatomicalRegion: 'face',
      scanType: '3d4d',
    });
    const metadata = await sharp(output).metadata();

    expect(metadata.width).toBe(1024);
    expect(metadata.height).toBe(512);
  });
});
