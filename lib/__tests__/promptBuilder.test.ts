import { describe, expect, it, afterEach } from 'vitest';
import {
  buildAnatomicalPrompt,
  buildCanonicalPrompt,
  buildEnhancedPrompt,
  buildHeartPrompt,
  buildHeartSalvagePrompt,
  buildHeartStrictPrompt,
  buildPortraitPrompt,
  buildPrompt,
  buildShortPrompt,
  type CanonicalPromptInput,
} from '../promptBuilder';

const baseInput: CanonicalPromptInput = {
  creativity: 50,
  skinTone: 'normal',
  mode: 'portrait',
  scanType: '3d4d',
  anatomicalRegion: 'face',
  clinicalNotes: '',
};

function canonicalInput(
  overrides: Partial<CanonicalPromptInput>,
): CanonicalPromptInput {
  return {
    ...baseInput,
    ...overrides,
  };
}

function expectRemovedBranchMarkersAbsent(prompt: string): void {
  expect(prompt).not.toContain('BLOCK A');
  expect(prompt).not.toContain('BLOCK B');
  expect(prompt).not.toContain('VISION ANALYSIS');
  expect(prompt).not.toContain('PROFILE: STRICT');
  expect(prompt).not.toContain('PROFILE: SALVAGE');
  expect(prompt).not.toContain('GE Voluson');
}

afterEach(() => {
  delete process.env.USE_SHORT_PROMPTS;
});

describe('buildCanonicalPrompt', () => {
  it('returns portraitPrompt for face portrait', () => {
    const result = buildCanonicalPrompt(
      canonicalInput({ mode: 'portrait', anatomicalRegion: 'face' }),
    );

    expect(result.promptType).toBe('portraitPrompt');
    expect(result.prompt).toBe(
      buildPortraitPrompt(canonicalInput({ mode: 'portrait', anatomicalRegion: 'face' })),
    );
  });

  it('returns portraitPrompt for fullBody portrait', () => {
    const result = buildCanonicalPrompt(
      canonicalInput({ mode: 'portrait', anatomicalRegion: 'fullBody' }),
    );

    expect(result.promptType).toBe('portraitPrompt');
    expect(result.prompt).toContain('realistic newborn-style photographic illustration');
    expect(result.prompt).toContain('swaddled or dressed');
  });

  it('returns heartPrompt for heart realistic', () => {
    const result = buildCanonicalPrompt(
      canonicalInput({
        mode: 'realistic',
        anatomicalRegion: 'heart',
        scanType: '2d',
      }),
    );

    expect(result.promptType).toBe('heartPrompt');
    expect(result.prompt).toBe(
      buildHeartPrompt(
        canonicalInput({
          mode: 'realistic',
          anatomicalRegion: 'heart',
          scanType: '2d',
        }),
      ),
    );
  });

  it.each(['brain', 'spine', 'abdomen', 'fullBody'] as const)(
    'returns anatomicalPrompt for %s realistic',
    (anatomicalRegion) => {
      const result = buildCanonicalPrompt(
        canonicalInput({
          mode: 'realistic',
          anatomicalRegion,
          scanType: anatomicalRegion === 'fullBody' ? '3d4d' : '2d',
        }),
      );

      expect(result.promptType).toBe('anatomicalPrompt');
      expect(result.prompt).toBe(
        buildAnatomicalPrompt(
          canonicalInput({
            mode: 'realistic',
            anatomicalRegion,
            scanType: anatomicalRegion === 'fullBody' ? '3d4d' : '2d',
          }),
        ),
      );
    },
  );

  it('ignores USE_SHORT_PROMPTS for canonical routing and prompt text', () => {
    const input = canonicalInput({ mode: 'portrait', anatomicalRegion: 'face' });
    const baseline = buildCanonicalPrompt(input);

    process.env.USE_SHORT_PROMPTS = 'true';
    const withFlag = buildCanonicalPrompt(input);

    expect(withFlag).toEqual(baseline);
  });
});

describe('canonical prompt content', () => {
  it('keeps fidelity lock and removes old branch markers from portraitPrompt', () => {
    const prompt = buildPortraitPrompt(
      canonicalInput({ mode: 'portrait', anatomicalRegion: 'face' }),
    );

    expect(prompt).toContain('FIDELITY LOCK (first priority)');
    expect(prompt).toContain('source pose, rotation, tilt, direction, crop, scale, and framing');
    expect(prompt).toContain('not a real prediction');
    expect(prompt).toContain('realistic newborn-style photographic illustration');
    expect(prompt).toContain(
      'flat dark background, soft shadow, blurred neutral cloth-like negative space, or low-detail non-anatomical matte background',
    );
    expectRemovedBranchMarkersAbsent(prompt);
  });

  it('keeps portraitPrompt away from sensitive wording', () => {
    const prompt = buildPortraitPrompt(
      canonicalInput({ mode: 'portrait', anatomicalRegion: 'fullBody' }),
    ).toLowerCase();

    expect(prompt).not.toContain('sexual');
    expect(prompt).not.toContain('nude');
    expect(prompt).not.toContain('naked');
    expect(prompt).not.toContain('genital');
    expect(prompt).not.toContain('breast');
    expect(prompt).not.toContain('erotic');
  });

  it('keeps heartPrompt controlled and non-graphic', () => {
    const prompt = buildHeartPrompt(
      canonicalInput({
        mode: 'realistic',
        anatomicalRegion: 'heart',
        scanType: '2d',
      }),
    );
    const lowerPrompt = prompt.toLowerCase();

    expect(prompt).toContain('FIDELITY LOCK (first priority)');
    expect(prompt).toContain('Preserve the exact contours, cavities, crop, orientation');
    expect(prompt).toContain('Do not add lungs, ribs, chest wall, spine');
    expect(prompt).toContain('labels, abbreviations, markers, measurements');
    expect(lowerPrompt).not.toContain('gore');
    expect(lowerPrompt).not.toContain('specimen');
    expect(lowerPrompt).not.toContain('meat');
    expect(lowerPrompt).not.toContain('raw tissue');
    expectRemovedBranchMarkersAbsent(prompt);
  });

  it('keeps anatomicalPrompt source-first without textbook completion', () => {
    const prompt = buildAnatomicalPrompt(
      canonicalInput({
        mode: 'realistic',
        anatomicalRegion: 'brain',
        scanType: '2d',
      }),
    );

    expect(prompt).toContain('FIDELITY LOCK (first priority)');
    expect(prompt).toContain('source-first anatomical visualization');
    expect(prompt).toContain('Do not invent organs, bones, vessels');
    expect(prompt).toContain('standard reference diagram');
    expect(prompt).toContain('no diagnosis, clinical claims, labels, or measurements');
    expectRemovedBranchMarkersAbsent(prompt);
  });
});

describe('deprecated OpenAI prompt wrappers', () => {
  it('buildPrompt delegates to the canonical prompt', () => {
    const canonical = buildCanonicalPrompt(
      canonicalInput({ mode: 'portrait', anatomicalRegion: 'face' }),
    ).prompt;

    expect(buildPrompt(50, 'normal', 'portrait', '3d4d', 'face', '')).toBe(canonical);
  });

  it('buildEnhancedPrompt ignores analysis for GPT Image 2 prompt text', () => {
    const canonical = buildCanonicalPrompt(
      canonicalInput({ mode: 'realistic', anatomicalRegion: 'brain', scanType: '2d' }),
    ).prompt;
    const enhanced = buildEnhancedPrompt(
      50,
      'normal',
      'realistic',
      '2d',
      'brain',
      '',
    );

    expect(enhanced).toBe(canonical);
    expect(enhanced).not.toContain('VISION ANALYSIS');
  });

  it('buildShortPrompt no longer creates a separate runtime prompt', () => {
    const canonical = buildCanonicalPrompt(
      canonicalInput({ mode: 'portrait', anatomicalRegion: 'fullBody' }),
    ).prompt;

    expect(buildShortPrompt('normal', 'portrait', '3d4d', 'fullBody', '')).toBe(canonical);
  });

  it('OpenAI heart strict and salvage wrappers both call the canonical heart prompt', () => {
    const canonical = buildCanonicalPrompt(
      canonicalInput({
        mode: 'realistic',
        anatomicalRegion: 'heart',
        scanType: '2d',
      }),
    ).prompt;

    expect(buildHeartStrictPrompt('2d', '', 50)).toBe(canonical);
    expect(buildHeartSalvagePrompt('2d', '', 50)).toBe(canonical);
  });
});
