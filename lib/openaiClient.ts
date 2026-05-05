import OpenAI, { toFile } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODERATION_RETRY_SUFFIX =
  'CONTENT CLARIFICATION: This is a strictly family-safe clinical prenatal illustration for expecting parents — wholesome, non-graphic, educational medical content. All spatial constraints in the prompt above remain fully in effect.';
const GPT_IMAGE_2_MIN_PIXELS = 655_360;
const GPT_IMAGE_2_MAX_PIXELS = 8_294_400;
const GPT_IMAGE_2_RELIABLE_MAX_PIXELS = 1_572_864;
const GPT_IMAGE_2_MAX_EDGE_EXCLUSIVE = 3_840;
const GPT_IMAGE_2_MAX_EDGE = GPT_IMAGE_2_MAX_EDGE_EXCLUSIVE - 16;
const GPT_IMAGE_2_MAX_ASPECT_RATIO = 3;
const GPT_IMAGE_2_MIN_ASPECT_RATIO = 1 / GPT_IMAGE_2_MAX_ASPECT_RATIO;

// Default to the preferred GPT Image 2 path. Keep OPENAI_PORTRAIT_MODEL as a
// rollback/evaluation override without committing model changes.
const DEFAULT_PORTRAIT_MODEL = 'gpt-image-2';
const PORTRAIT_MODEL: string =
  process.env.OPENAI_PORTRAIT_MODEL?.trim() || DEFAULT_PORTRAIT_MODEL;
type OpenAIAPIError = InstanceType<typeof OpenAI.APIError>;
type ImageEditRequest = Parameters<typeof openai.images.edit>[0];
type GptImage2OutputSize = `${number}x${number}`;
type OpenAiImageSize =
  | '1024x1024'
  | '1536x1024'
  | '1024x1536'
  | 'auto'
  | GptImage2OutputSize;
type AttemptPhase =
  | 'attempt_1_primary'
  | 'attempt_2_safe_retry';

interface OpenAIImagesResponse {
  readonly data?: ReadonlyArray<{
    readonly b64_json?: string;
    readonly url?: string;
  }>;
}

interface SizeCandidate {
  readonly width: number;
  readonly height: number;
}

function isModerationBlockedError(err: unknown): err is OpenAIAPIError {
  return (
    err instanceof OpenAI.APIError &&
    (err.code === 'moderation_blocked' || err.code === 'content_policy_violation')
  );
}

function logOpenAIError(
  err: OpenAIAPIError,
  phase: AttemptPhase,
  model: string,
): void {
  console.error('OpenAI image generation failed:', {
    phase,
    model,
    status: err.status,
    code: err.code,
    type: err.type,
    requestID: err.requestID,
    message: err.message,
  });
}

export function isGptImage2Model(model: string): boolean {
  return model.trim().toLowerCase().startsWith('gpt-image-2');
}

function omitsInputFidelity(model: string): boolean {
  return isGptImage2Model(model);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToMultiple(value: number, multiple: number): number {
  return Math.round(value / multiple) * multiple;
}

function candidateIsValid(candidate: SizeCandidate): boolean {
  const pixels = candidate.width * candidate.height;
  const ratio = candidate.width / candidate.height;

  return (
    candidate.width > 0 &&
    candidate.height > 0 &&
    candidate.width % 16 === 0 &&
    candidate.height % 16 === 0 &&
    candidate.width <= GPT_IMAGE_2_MAX_EDGE &&
    candidate.height <= GPT_IMAGE_2_MAX_EDGE &&
    pixels >= GPT_IMAGE_2_MIN_PIXELS &&
    pixels <= GPT_IMAGE_2_MAX_PIXELS &&
    pixels <= GPT_IMAGE_2_RELIABLE_MAX_PIXELS &&
    ratio >= GPT_IMAGE_2_MIN_ASPECT_RATIO &&
    ratio <= GPT_IMAGE_2_MAX_ASPECT_RATIO
  );
}

function addCandidate(
  candidates: SizeCandidate[],
  width: number,
  height: number,
): void {
  const candidate = {
    width: clamp(roundToMultiple(width, 16), 16, GPT_IMAGE_2_MAX_EDGE),
    height: clamp(roundToMultiple(height, 16), 16, GPT_IMAGE_2_MAX_EDGE),
  };

  if (candidateIsValid(candidate)) {
    candidates.push(candidate);
  }
}

export function chooseGptImage2OutputSize(
  width: number,
  height: number,
): GptImage2OutputSize {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 1024;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 1024;
  const sourceRatio = safeWidth / safeHeight;
  const targetRatio = clamp(
    sourceRatio,
    GPT_IMAGE_2_MIN_ASPECT_RATIO,
    GPT_IMAGE_2_MAX_ASPECT_RATIO,
  );
  const targetPixels = clamp(
    safeWidth * safeHeight,
    GPT_IMAGE_2_MIN_PIXELS,
    GPT_IMAGE_2_RELIABLE_MAX_PIXELS,
  );
  const idealWidth = Math.sqrt(targetPixels * targetRatio);
  const idealHeight = idealWidth / targetRatio;
  const candidates: SizeCandidate[] = [];

  addCandidate(candidates, idealWidth, idealHeight);

  for (let candidateWidth = 16; candidateWidth <= GPT_IMAGE_2_MAX_EDGE; candidateWidth += 16) {
    const idealCandidateHeight = candidateWidth / targetRatio;
    addCandidate(candidates, candidateWidth, idealCandidateHeight - 16);
    addCandidate(candidates, candidateWidth, idealCandidateHeight);
    addCandidate(candidates, candidateWidth, idealCandidateHeight + 16);
  }

  for (let candidateHeight = 16; candidateHeight <= GPT_IMAGE_2_MAX_EDGE; candidateHeight += 16) {
    const idealCandidateWidth = candidateHeight * targetRatio;
    addCandidate(candidates, idealCandidateWidth - 16, candidateHeight);
    addCandidate(candidates, idealCandidateWidth, candidateHeight);
    addCandidate(candidates, idealCandidateWidth + 16, candidateHeight);
  }

  const best = candidates.reduce<SizeCandidate | null>((currentBest, candidate) => {
    if (!currentBest) return candidate;

    const candidatePixels = candidate.width * candidate.height;
    const currentPixels = currentBest.width * currentBest.height;
    const candidateRatio = candidate.width / candidate.height;
    const currentRatio = currentBest.width / currentBest.height;
    const candidateScore =
      Math.abs(Math.log(candidateRatio / targetRatio)) * 1_000_000 +
      Math.abs(Math.log(candidatePixels / targetPixels)) * 1_000 +
      Math.abs(candidate.width - idealWidth) +
      Math.abs(candidate.height - idealHeight);
    const currentScore =
      Math.abs(Math.log(currentRatio / targetRatio)) * 1_000_000 +
      Math.abs(Math.log(currentPixels / targetPixels)) * 1_000 +
      Math.abs(currentBest.width - idealWidth) +
      Math.abs(currentBest.height - idealHeight);

    return candidateScore < currentScore ? candidate : currentBest;
  }, null);

  const selected = best ?? { width: 1024, height: 1024 };
  return `${selected.width}x${selected.height}`;
}

export async function generatePortrait(
  imageBuffer: Buffer,
  prompt: string,
  options: {
    model?: string;
    signal?: AbortSignal;
    size?: OpenAiImageSize;
    timeoutMs?: number;
  } = {},
): Promise<string> {
  const selectedModel = options.model?.trim() || PORTRAIT_MODEL;
  const selectedSize = options.size ?? '1024x1024';
  const imageFile = await toFile(imageBuffer, 'ultrasound.png', {
    type: 'image/png',
  });

  const runEdit = async (
    editPrompt: string,
    phase: AttemptPhase,
  ): Promise<string> => {
    try {
      const editParams = {
        model: selectedModel,
        image: imageFile,
        prompt: editPrompt,
        n: 1, // NEVER change this value
        size: selectedSize,
        output_format: 'png' as const,
        ...(omitsInputFidelity(selectedModel)
          ? {}
          : { input_fidelity: 'high' as const }),
      };

      const response = await openai.images.edit(
        editParams as unknown as ImageEditRequest,
        {
          maxRetries: 0,
          signal: options.signal,
          timeout: options.timeoutMs,
        },
      ) as unknown as OpenAIImagesResponse;

      const b64 = response.data?.[0]?.b64_json;
      if (b64) return b64;

      const url = response.data?.[0]?.url;
      if (!url) throw new Error('No image returned from OpenAI');

      const imageResponse = await fetch(url, { signal: options.signal });
      if (!imageResponse.ok) {
        throw new Error(`Failed to download generated image: ${imageResponse.status}`);
      }

      return Buffer.from(await imageResponse.arrayBuffer()).toString('base64');
    } catch (err: unknown) {
      if (err instanceof OpenAI.APIError) {
        logOpenAIError(err, phase, selectedModel);
      }
      throw err;
    }
  };

  try {
    return await runEdit(prompt, 'attempt_1_primary');
  } catch (err: unknown) {
    if (isModerationBlockedError(err)) {
      console.log('[openai] moderation block on attempt 1, retrying with safe suffix...');
      return runEdit(
        `${prompt}\n\n${MODERATION_RETRY_SUFFIX}`,
        'attempt_2_safe_retry',
      );
    }

    if (!(err instanceof OpenAI.APIError)) {
      console.error('OpenAI image generation failed:', err);
    }
    throw err;
  }
}
