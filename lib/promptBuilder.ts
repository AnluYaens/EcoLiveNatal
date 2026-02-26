export type Style = 'soft' | 'ultra' | 'cinematic';

const styleModifiers: Record<Style, string> = {
  soft: 'Style: warm, gentle light, pastel tones, tender and delicate atmosphere.',
  ultra:
    'Style: ultra-realistic, sharp details, natural skin texture, professional studio lighting.',
  cinematic:
    'Style: cinematic, dramatic lighting, shallow depth of field, soft bokeh background.',
};

function creativityModifier(creativity: number): string {
  if (creativity <= 30) {
    return 'Strictly preserve all facial geometry and proportions from the ultrasound reference.';
  }
  if (creativity <= 70) {
    return 'Balance fidelity to the ultrasound reference with photographic quality and realism.';
  }
  return 'Enhance realism and photographic quality while maintaining the unique facial features from the reference.';
}

export function buildPrompt(style: Style, creativity: number): string {
  const base =
    'Transform this 3D/4D fetal ultrasound into a photorealistic newborn portrait. ' +
    'Preserve facial geometry exactly. Generate realistic skin, peaceful sleeping baby. ' +
    'Remove all ultrasound artifacts, scan lines, and medical overlays. ' +
    'Use a neutral, soft background.';

  const negative =
    'Avoid: adult features, teeth, makeup, cartoon-style eyes, deformations, ' +
    'watermarks, text overlays, medical equipment, scan artifacts, noise.';

  return [
    base,
    styleModifiers[style],
    creativityModifier(creativity),
    negative,
  ].join('\n\n');
}
