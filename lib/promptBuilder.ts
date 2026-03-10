export type Style = 'soft' | 'ultra' | 'cinematic';
export type SkinTone = 'normal' | 'moreno';
export type GenerationMode = 'portrait' | 'realistic';
export type ScanType = '3d4d' | '2d';

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

function scanTypeDescription(scanType: ScanType): string {
  return scanType === '2d'
    ? 'a 2D obstetric ultrasound (grayscale cross-sectional imaging)'
    : 'a 3D/4D obstetric ultrasound (volumetric surface rendering)';
}

function buildPortraitPrompt(
  style: Style,
  creativity: number,
  skinTone: SkinTone,
  scanType: ScanType,
): string {
  const scanDesc = scanTypeDescription(scanType);
  const base = `The input image is ${scanDesc} showing a fetal face. Transform this medical scan into an ultra-realistic newborn portrait photograph.

Clothing requirement: the baby must be fully clothed in a soft cotton onesie or gently swaddled in a clean white or pastel blanket — no exposed skin below the shoulders, no nudity of any kind.

Likeness requirement: this is a portrait of a SPECIFIC baby — not a generic newborn. Faithfully reproduce the exact facial geometry visible in the ultrasound — nose bridge curvature, nose tip shape and width, upper lip bow, lower lip fullness, chin contour, forehead height and slope, and cheek volume. If any features appear prominent or unusual compared to an average face, reproduce them exactly as seen — do NOT normalize, soften, or average them toward a generic baby face. The resulting portrait must be visually distinguishable from any other baby.

Pose requirement: match the exact head orientation from the ultrasound. If the scan shows a profile or 3/4 view, the portrait must show the same profile or 3/4 angle — never convert a profile view into a frontal view.

Render with soft natural studio lighting, neutral or soft pastel background, photorealistic newborn skin texture. No text, no logos, no watermarks, no medical equipment, no ultrasound artifacts, no extra objects.${scanType === '2d' ? '\n\nNote: this is a 2D ultrasound with limited geometric detail. Infer 3D facial structure from the visible cross-section while maintaining fidelity to what is shown. Do not invent features that are not visible.' : ''}`;

  const skinToneModifier =
    skinTone === 'moreno'
      ? 'Skin tone requirement: the newborn has warm brown skin with a naturally dark complexion. Render the skin tone accurately: rich melanin, warm undertones, darker coloring consistent with a moreno infant.'
      : null;

  return [
    base,
    skinToneModifier,
    styleModifiers[style],
    creativityModifier(creativity),
  ]
    .filter(Boolean)
    .join('\n\n');
}

function buildRealisticPrompt(
  creativity: number,
  skinTone: SkinTone,
  scanType: ScanType,
): string {
  const scanDesc = scanTypeDescription(scanType);
  const base = `The input image is ${scanDesc}. Create an ultra-realistic 3D reconstruction of the fetus exactly as it appears in utero.

Anatomical fidelity: reproduce the exact fetal anatomy visible in the ultrasound. Match head shape, facial proportions, limb positions, and body curvature precisely. Do NOT idealize or beautify — show the fetus as it actually is.

Skin: render realistic fetal skin — thin, slightly translucent, with visible blood vessels beneath. Include vernix caseosa (waxy white coating) in skin folds and lanugo (fine body hair) appropriate for gestational age. Skin may appear reddish or purplish where thin.

Pose: maintain the exact fetal position from the ultrasound. Curled limbs, tucked chin, hands near face — whatever the scan shows.

Environment: dark background (black or very dark gray). No studio setup, no props, no clothing, no blankets. Lighting should be volumetric and clinical — as if illuminating the fetus inside the womb.

ZERO ultrasound artifacts, ZERO measurement markers, ZERO text overlays, ZERO watermarks, ZERO medical equipment, ZERO duplicate faces, ZERO extra limbs.${scanType === '2d' ? '\n\nNote: this is a 2D ultrasound with limited volumetric data. Reconstruct 3D anatomy from the visible cross-section while staying faithful to what is shown. Do not fabricate anatomy that is not visible in the scan.' : ''}`;

  const skinToneModifier =
    skinTone === 'moreno'
      ? 'Skin tone: the fetus has a naturally darker complexion with warm brown undertones. Render the skin with rich melanin appropriate for a moreno infant.'
      : null;

  return [
    base,
    skinToneModifier,
    creativityModifier(creativity),
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function buildPrompt(
  style: Style,
  creativity: number,
  skinTone: SkinTone = 'normal',
  mode: GenerationMode = 'portrait',
  scanType: ScanType = '3d4d',
): string {
  if (mode === 'realistic') {
    return buildRealisticPrompt(creativity, skinTone, scanType);
  }
  return buildPortraitPrompt(style, creativity, skinTone, scanType);
}
