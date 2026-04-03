import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });

const MODEL_ID = 'gemini-3-pro-image-preview';
const VISION_MODEL_ID = 'gemini-2.5-flash';

// ---------- Annotation extraction (vision) ----------

export interface UltrasoundAnnotations {
  measurements: string[];
  labels: string[];
  patientInfo: string[];
  viewDescription: string;
}

const ANNOTATION_EXTRACTION_PROMPT = `You are analyzing an obstetric ultrasound image. Extract ALL visible text, measurements, labels, and annotations overlaid on the image.

Return a JSON object with this exact structure:
{
  "measurements": ["<each measurement as shown, e.g. 'Card-circ: 8.23cm', 'Heart-A: 3.42cm²', 'BPD: 7.2cm'>"],
  "labels": ["<each label/abbreviation visible, e.g. 'Card-circ', 'Heart-A', 'Th-circ', '4CH', 'LV', 'RV'>"],
  "patientInfo": ["<any patient/doctor/facility text, e.g. 'Dr. Hector Quiroga', 'GE Voluson E10', date strings>"],
  "viewDescription": "<brief description of what the ultrasound shows anatomically, e.g. 'Four-chamber cardiac view at ~28 weeks showing heart cross-section with measurement calipers'>"
}

RULES:
- Extract EVERY piece of text visible in the image, no matter how small
- Include measurement values with their units exactly as displayed
- Include crosshair/caliper labels and their associated values
- If text is partially visible or unclear, include it with a note like "(partial)"
- Respond ONLY with valid JSON, no markdown, no code blocks`;

const ANNOTATION_EXTRACTION_TIMEOUT_MS = 20_000;

/**
 * Use Gemini vision to extract all text annotations, measurements,
 * and labels from an ultrasound image.
 * Returns null on failure (non-blocking).
 */
export async function extractAnnotations(
  imageBuffer: Buffer,
): Promise<UltrasoundAnnotations | null> {
  const base64Image = imageBuffer.toString('base64');

  try {
    const response = await Promise.race([
      ai.models.generateContent({
        model: VISION_MODEL_ID,
        contents: [
          {
            role: 'user',
            parts: [
              { text: ANNOTATION_EXTRACTION_PROMPT },
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
          responseMimeType: 'application/json',
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('annotation_extraction_timeout')), ANNOTATION_EXTRACTION_TIMEOUT_MS),
      ),
    ]);

    const candidate = response.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;
    if (!text) {
      console.warn('Annotation extraction: empty response from Gemini');
      return null;
    }

    const parsed = JSON.parse(text) as UltrasoundAnnotations;

    // Basic validation
    if (!parsed.measurements || !parsed.labels || !parsed.viewDescription) {
      console.warn('Annotation extraction: missing required fields');
      return null;
    }

    return parsed;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`Annotation extraction failed (${message}), proceeding without annotations`);
    return null;
  }
}

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
