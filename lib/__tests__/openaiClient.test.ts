import { describe, expect, it, vi } from 'vitest';
import { chooseGptImage2OutputSize, isGptImage2Model } from '../openaiClient';

vi.mock('openai', () => {
  class APIError extends Error {
    code?: string;
  }

  class OpenAIMock {
    static APIError = APIError;
    images = {
      edit: vi.fn(),
    };
  }

  return {
    default: OpenAIMock,
    toFile: vi.fn(),
  };
});

describe('chooseGptImage2OutputSize', () => {
  it('preserves a 1280x720 landscape input', () => {
    expect(chooseGptImage2OutputSize(1280, 720)).toBe('1280x720');
  });

  it('preserves a 720x1280 portrait input', () => {
    expect(chooseGptImage2OutputSize(720, 1280)).toBe('720x1280');
  });

  it('preserves a square input', () => {
    expect(chooseGptImage2OutputSize(1024, 1024)).toBe('1024x1024');
  });

  it('upscales tiny inputs only enough to satisfy the minimum pixel count', () => {
    expect(chooseGptImage2OutputSize(64, 64)).toBe('816x816');
  });

  it('downscales large inputs to the conservative reliable maximum', () => {
    expect(chooseGptImage2OutputSize(3000, 2000)).toBe('1536x1024');
  });

  it('clamps aspect ratios above 3:1', () => {
    expect(chooseGptImage2OutputSize(4000, 1000)).toBe('2160x720');
  });
});

describe('isGptImage2Model', () => {
  it('detects base and snapshot GPT Image 2 model names', () => {
    expect(isGptImage2Model('gpt-image-2')).toBe(true);
    expect(isGptImage2Model('gpt-image-2-2026-04-01')).toBe(true);
    expect(isGptImage2Model('gpt-image-1.5')).toBe(false);
  });
});
