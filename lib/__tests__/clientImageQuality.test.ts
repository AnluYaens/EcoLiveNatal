import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { analyzeClientImageQuality } from '../clientImageQuality';

interface FakeBitmap {
  readonly width: number;
  readonly height: number;
  close: ReturnType<typeof vi.fn>;
}

const createImageBitmapMock = vi.fn<() => Promise<FakeBitmap>>();
const getContextMock = vi.fn();
const drawImageMock = vi.fn();
const getImageDataMock = vi.fn();
const createElementMock = vi.fn();

function makeImageData(pixels: number[][]): Uint8ClampedArray {
  return new Uint8ClampedArray(pixels.flat());
}

function installCanvasMocks() {
  vi.stubGlobal('createImageBitmap', createImageBitmapMock);
  vi.stubGlobal('document', {
    createElement: createElementMock,
  });
}

describe('analyzeClientImageQuality', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    createImageBitmapMock.mockReset();
    getContextMock.mockReset();
    drawImageMock.mockReset();
    getImageDataMock.mockReset();
    createElementMock.mockReset();

    installCanvasMocks();
    createElementMock.mockImplementation((tagName: string) => {
      if (tagName !== 'canvas') {
        throw new Error(`Unexpected element request: ${tagName}`);
      }

      return {
        width: 0,
        height: 0,
        getContext: getContextMock,
      };
    });
    getContextMock.mockReturnValue({
      drawImage: drawImageMock,
      getImageData: getImageDataMock,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('warns when a face crop is dark, flat, and too small', async () => {
    const bitmap = { width: 2, height: 2, close: vi.fn() };
    createImageBitmapMock.mockResolvedValue(bitmap);
    getImageDataMock.mockReturnValue({
      data: makeImageData([
        [10, 10, 10, 255],
        [12, 12, 12, 255],
        [10, 10, 10, 255],
        [12, 12, 12, 255],
      ]),
    });

    const result = await analyzeClientImageQuality(new Blob(['x']), 'face');

    expect(result.warnings).toEqual([
      'darkCrop',
      'lowContrast',
      'subjectTooSmall',
    ]);
    expect(bitmap.close).toHaveBeenCalled();
  });

  it('accepts a bright, high-contrast anatomy crop without warnings', async () => {
    const bitmap = { width: 2, height: 2, close: vi.fn() };
    createImageBitmapMock.mockResolvedValue(bitmap);
    getImageDataMock.mockReturnValue({
      data: makeImageData([
        [0, 0, 0, 255],
        [255, 255, 255, 255],
        [240, 240, 240, 255],
        [20, 20, 20, 255],
      ]),
    });

    const result = await analyzeClientImageQuality(new Blob(['x']), 'heart');

    expect(result.warnings).toEqual([]);
    expect(result.subjectRatio).toBeGreaterThan(0.1);
  });

  it('returns a safe empty assessment when the canvas context is unavailable', async () => {
    const bitmap = { width: 4, height: 4, close: vi.fn() };
    createImageBitmapMock.mockResolvedValue(bitmap);
    getContextMock.mockReturnValue(null);

    const result = await analyzeClientImageQuality(new Blob(['x']), 'brain');

    expect(result).toEqual({
      warnings: [],
      brightness: 0,
      contrast: 0,
      subjectRatio: 0,
    });
    expect(bitmap.close).toHaveBeenCalled();
  });
});
