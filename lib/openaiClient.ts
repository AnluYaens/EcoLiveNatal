import OpenAI, { toFile } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODERATION_RETRY_SUFFIX =
  'Safety requirements: non-sexual newborn portrait only. Keep the baby fully swaddled or wearing a onesie, with no nudity and no exposed chest or genital area.';
const PORTRAIT_MODEL = 'gpt-image-1.5' as const;
type OpenAIAPIError = InstanceType<typeof OpenAI.APIError>;
type AttemptPhase =
  | 'attempt_1_primary'
  | 'attempt_2_safe_retry';

function isModerationBlockedError(err: unknown): err is OpenAIAPIError {
  return (
    err instanceof OpenAI.APIError &&
    (err.code === 'moderation_blocked' || err.code === 'content_policy_violation')
  );
}

function logOpenAIError(
  err: OpenAIAPIError,
  phase: AttemptPhase,
): void {
  console.error('OpenAI image generation failed:', {
    phase,
    model: PORTRAIT_MODEL,
    status: err.status,
    code: err.code,
    type: err.type,
    requestID: err.requestID,
    message: err.message,
  });
}

export async function generatePortrait(
  imageBuffer: Buffer,
  prompt: string,
): Promise<string> {
  const imageFile = await toFile(imageBuffer, 'ultrasound.png', {
    type: 'image/png',
  });

  const runEdit = async (
    editPrompt: string,
    phase: AttemptPhase,
  ): Promise<string> => {
    try {
      const response = await openai.images.edit({
        model: PORTRAIT_MODEL,
        image: imageFile,
        prompt: editPrompt,
        n: 1, // NEVER change this value
        size: '1024x1024',
        output_format: 'png',
        input_fidelity: 'high',
      });

      const b64 = response.data?.[0]?.b64_json;
      if (b64) return b64;

      const url = response.data?.[0]?.url;
      if (!url) throw new Error('No image returned from OpenAI');

      const imageResponse = await fetch(url);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download generated image: ${imageResponse.status}`);
      }

      return Buffer.from(await imageResponse.arrayBuffer()).toString('base64');
    } catch (err: unknown) {
      if (err instanceof OpenAI.APIError) {
        logOpenAIError(err, phase);
      }
      throw err;
    }
  };

  try {
    return await runEdit(prompt, 'attempt_1_primary');
  } catch (err: unknown) {
    if (isModerationBlockedError(err)) {
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
