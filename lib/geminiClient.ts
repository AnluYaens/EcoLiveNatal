import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });

const MODEL_ID = 'gemini-3-pro-image-preview';
// ---------- Aspect ratio mapping ----------

type GeminiAspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '9:16' | '16:9';

const ASPECT_OPTIONS: Array<{ label: GeminiAspectRatio; value: number }> = [
  { label: '1:1', value: 1 },
  { label: '3:4', value: 0.75 },
  { label: '4:3', value: 1.333 },
  { label: '2:3', value: 0.667 },
  { label: '3:2', value: 1.5 },
  { label: '9:16', value: 0.5625 },
  { label: '16:9', value: 1.778 },
];

function getClosestAspectRatio(width: number, height: number): GeminiAspectRatio {
  const ratio = width / height;
  let closest = ASPECT_OPTIONS[0];
  let minDiff = Infinity;
  for (const opt of ASPECT_OPTIONS) {
    const diff = Math.abs(ratio - opt.value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = opt;
    }
  }
  return closest.label;
}

/**
 * Generate an anatomical HDlive-style visualization from an ultrasound image
 * using Google Gemini (Nano Banana Pro) image-to-image generation.
 *
 * Pass inputWidth/inputHeight to force the output aspect ratio to match the input.
 * Returns a base64-encoded PNG string.
 */
export async function generateAnatomicalImage(
  imageBuffer: Buffer,
  prompt: string,
  inputWidth?: number,
  inputHeight?: number,
): Promise<string> {
  const base64Image = imageBuffer.toString('base64');

  const aspectRatio = inputWidth && inputHeight
    ? getClosestAspectRatio(inputWidth, inputHeight)
    : undefined;

  const response = await ai.models.generateContent({
    model: MODEL_ID,
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: 'image/png',
              data: base64Image,
            },
          },
        ],
      },
    ],
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: aspectRatio ? { aspectRatio } : undefined,
    },
  });

  const candidate = response.candidates?.[0];
  if (!candidate?.content?.parts) {
    throw new Error('No response from Gemini image generation');
  }

  for (const part of candidate.content.parts) {
    if (part.inlineData?.data) {
      return part.inlineData.data;
    }
  }

  throw new Error('No image returned from Gemini response');
}
