import OpenAI, { toFile } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generatePortrait(
  imageBuffer: Buffer,
  prompt: string
): Promise<string> {
  const imageFile = await toFile(imageBuffer, 'ultrasound.png', {
    type: 'image/png',
  });

  // CRITICAL: Use images.edit (NOT images.generate) — the ultrasound image
  // must be passed as input so the model uses it as reference.
  // Do NOT add input_fidelity or quality params — unsupported by images.edit.
  const response = await openai.images.edit({
    model: 'gpt-image-1',
    image: imageFile,
    prompt,
    n: 1, // NEVER change this value
    size: '1024x1024',
    response_format: 'b64_json',
  });

  // NOTE: If the SDK types complain about response_format on images.edit,
  // check the latest SDK version. If truly unsupported, remove it and read
  // response.data[0]?.url instead, then fetch that URL and convert to base64.
  // The critical requirement is that we return a base64 string to the client.
  const b64 = response.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image returned from OpenAI');
  return b64;
}
