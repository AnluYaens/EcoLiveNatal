export type Style = 'soft' | 'ultra' | 'cinematic';

const styleModifiers: Record<Style, string> = {
  soft: 'Style preference: soft natural lighting and gentle tones, while preserving the exact original geometry.',
  ultra:
    'Style preference: ultra-realistic details and natural skin texture, while preserving the exact original geometry.',
  cinematic:
    'Style preference: cinematic lighting kept subtle, while preserving the exact original geometry.',
};

function creativityModifier(creativity: number): string {
  if (creativity <= 30) {
    return 'Strict mode: preserve geometry and identity cues exactly. Do not alter pose, angle, or proportions.';
  }
  if (creativity <= 70) {
    return 'Balanced mode: improve realism only, without changing identity cues, head shape, pose, or hand placement.';
  }
  return 'High mode: increase photorealism only; keep the same identity cues, pose, and facial proportions from the reference.';
}

export function buildPrompt(style: Style, creativity: number): string {
  const base =
    'The input image is a 3D/4D obstetric ultrasound (medical diagnostic imaging) showing a fetal face. Transform this medical scan into an ultra-realistic newborn portrait photograph.\n\nClothing requirement: the baby must be fully clothed in a soft cotton onesie or gently swaddled in a clean white or pastel blanket — no exposed skin below the shoulders, no nudity of any kind.\n\nLikeness requirement: this is a portrait of a SPECIFIC baby — not a generic newborn. Faithfully reproduce the exact facial geometry visible in the ultrasound — nose bridge curvature, nose tip shape and width, upper lip bow, lower lip fullness, chin contour, forehead height and slope, and cheek volume. If any features appear prominent or unusual compared to an average face, reproduce them exactly as seen — do NOT normalize, soften, or average them toward a generic baby face. The resulting portrait must be visually distinguishable from any other baby.\n\nPose requirement: match the exact head orientation from the ultrasound. If the scan shows a profile or 3/4 view, the portrait must show the same profile or 3/4 angle — never convert a profile view into a frontal view.\n\nRender with soft natural studio lighting, neutral or soft pastel background, photorealistic newborn skin texture. No text, no logos, no watermarks, no medical equipment, no ultrasound artifacts, no extra objects.';

  return [
    base,
    styleModifiers[style],
    creativityModifier(creativity),
  ].join('\n\n');
}
