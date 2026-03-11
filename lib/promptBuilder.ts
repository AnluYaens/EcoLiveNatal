export type Style = 'soft' | 'ultra' | 'cinematic';
export type SkinTone = 'normal' | 'moreno';
export type GenerationMode = 'portrait' | 'realistic';
export type ScanType = '3d4d' | '2d';
export type AnatomicalRegion = 'face' | 'heart' | 'brain' | 'spine' | 'abdomen' | 'fullBody';

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

const regionScanSubject: Record<AnatomicalRegion, string> = {
  face: 'showing a fetal face',
  heart: 'showing a fetal cardiac cross-section',
  brain: 'showing fetal intracranial structures',
  spine: 'showing the fetal spine',
  abdomen: 'showing fetal abdominal structures',
  fullBody: 'showing the full fetal body',
};

function buildClinicalNotesBlock(clinicalNotes: string): string | null {
  const trimmed = clinicalNotes.trim();
  if (!trimmed) return null;
  return `[CLINICAL CONTEXT provided by the operator: ${trimmed}]`;
}

function buildPortraitPrompt(
  style: Style,
  creativity: number,
  skinTone: SkinTone,
  scanType: ScanType,
  clinicalNotes: string,
): string {
  const scanDesc = scanTypeDescription(scanType);
  const base = `The input image is ${scanDesc} showing a fetal face. Transform this medical scan into an ultra-realistic newborn portrait photograph.

Clothing requirement: the baby must be fully clothed in a soft cotton onesie or gently swaddled in a clean white or pastel blanket — no exposed skin below the shoulders, no nudity of any kind.

Likeness requirement: this is a portrait of a SPECIFIC baby — not a generic newborn. Faithfully reproduce the exact facial geometry visible in the ultrasound — nose bridge curvature, nose tip shape and width, upper lip bow, lower lip fullness, chin contour, forehead height and slope, and cheek volume. If any features appear prominent or unusual compared to an average face, reproduce them exactly as seen — do NOT normalize, soften, or average them toward a generic baby face. The resulting portrait must be visually distinguishable from any other baby.

Pose requirement: match the exact head orientation from the ultrasound. If the scan shows a profile or 3/4 view, the portrait must show the same profile or 3/4 angle — never convert a profile view into a frontal view.

Render with soft natural studio lighting, neutral or soft pastel background.

Skin texture: real newborn skin with fine peach fuzz, tiny pores visible at close inspection, natural color variation (slightly redder on cheeks, paler on forehead), soft mottling. NOT airbrushed, NOT plastic, NOT porcelain.

Quality requirements: natural asymmetry in facial features (no perfect mirror symmetry), individually defined fingers (no fused or webbed digits), anatomically correct ear placement and detail, realistic newborn skin imperfections (milia, stork bites acceptable). ZERO plastic or waxy skin, ZERO doll-like eyes, ZERO uncanny valley smoothness, ZERO extra limbs or fingers, ZERO text, ZERO logos, ZERO watermarks, ZERO medical equipment, ZERO ultrasound artifacts.${scanType === '2d' ? '\n\nNote: this is a 2D ultrasound with limited geometric detail. Infer 3D facial structure from the visible cross-section while maintaining fidelity to what is shown. Do not invent features that are not visible.' : ''}`;

  const skinToneModifier =
    skinTone === 'moreno'
      ? 'Skin tone requirement: the newborn has warm brown skin with a naturally dark complexion. Render the skin tone accurately: rich melanin, warm undertones, darker coloring consistent with a moreno infant.'
      : null;

  return [
    base,
    buildClinicalNotesBlock(clinicalNotes),
    skinToneModifier,
    styleModifiers[style],
    creativityModifier(creativity),
  ]
    .filter(Boolean)
    .join('\n\n');
}

const realisticRegionDetails: Record<AnatomicalRegion, string> = {
  face: `This scan shows fetal facial anatomy. Transform it into a 3D anatomical rendering of the face preserving the EXACT same view angle (profile, frontal, or 3/4). Render skin layers, subcutaneous fat, nasal cartilage, orbital structures, lip and chin soft tissue with anatomical depth — muscle layers beneath the skin, bone structure of the maxilla and mandible visible through semi-transparent tissue. Every facial feature must occupy the same position in the output as in the input scan.`,

  heart: `This scan shows fetal cardiac anatomy. CRITICAL: identify the exact cardiac view plane (4-chamber, 3-vessel, 3-vessel-trachea, short axis, LVOT, RVOT, aortic arch, ductal arch) and render that SAME cross-sectional plane — do NOT render a full 3D heart from a different angle. Transform the visible cardiac chambers, septa, valves, and great vessels into a 3D anatomical cross-section that matches the ultrasound composition 1:1. Show myocardial wall, pericardium, and surrounding thoracic structures only as they appear in this specific view. Do NOT render a full fetus.`,

  brain: `This scan shows fetal intracranial anatomy. CRITICAL: identify the exact brain view plane and preserve it. If this is a MID-SAGITTAL view (showing cerebral cortex profile, corpus callosum, brainstem, cerebellum, vermis in a side view), render the SAME sagittal cross-section — do NOT convert to coronal or axial. If this is an AXIAL view (transthalamic showing thalami and cavum septum pellucidum, or transcerebellar showing posterior fossa), maintain that exact axial plane. If CORONAL, keep coronal. Transform the visible intracranial structures into a 3D anatomical rendering that matches the ultrasound composition 1:1 — same structures, same spatial arrangement, same orientation. Do NOT render a full fetus.`,

  spine: `This scan shows fetal spinal anatomy. CRITICAL: identify the exact spine view (sagittal showing vertebral bodies in a line, coronal showing bilateral pedicles, or axial showing a single vertebral cross-section) and render that SAME plane. Transform the visible vertebral bodies, pedicles, spinal cord, and surrounding tissue into a 3D anatomical rendering matching the ultrasound composition 1:1. Do NOT render a full fetus — focus on the spinal structures as they appear in this view.`,

  abdomen: `This scan shows fetal abdominal anatomy. CRITICAL: identify the exact abdominal cross-section plane and render that SAME plane. Transform the visible structures (abdominal wall, stomach, liver, kidneys, umbilical vessels, bowel, aorta/IVC as applicable) into a 3D anatomical rendering matching the ultrasound composition 1:1. Only render organs and structures that are visible in this specific scan plane. Do NOT render a full fetus.`,

  fullBody: `This scan shows the full fetal body. Transform it into a 3D anatomical rendering preserving the EXACT same body position, orientation, and framing. Show skeletal system, major organs, and soft tissue layers as visible in the scan. The fetal pose and spatial arrangement must match the input 1:1.`,
};

function buildRealisticPrompt(
  creativity: number,
  skinTone: SkinTone,
  scanType: ScanType,
  anatomicalRegion: AnatomicalRegion,
  clinicalNotes: string,
): string {
  const scanDesc = scanTypeDescription(scanType);
  const regionSubject = regionScanSubject[anatomicalRegion];
  const regionDetail = realisticRegionDetails[anatomicalRegion];

  const base = `CONTEXT: This is a medical educational illustration for an obstetrics textbook. The input image is ${scanDesc} ${regionSubject}. Transform this clinical ultrasound into a 3D anatomical rendering in the style of a Netter-style medical atlas or professional anatomy app (Complete Anatomy, Visible Body). This is strictly a scientific medical visualization — no photographs, no real people.

COMPOSITION FIDELITY (highest priority):
- This is a VISUAL TRANSLATION of the input scan — NOT a free-form illustration.
- The output MUST preserve the EXACT same viewing plane as the input (sagittal→sagittal, axial→axial, coronal→coronal, 4-chamber→4-chamber).
- The structures must occupy the SAME spatial positions and proportions as in the ultrasound.
- Do NOT reinterpret the scan from a different angle or generate a generic textbook diagram.
- Render ONLY structures visible in this specific scan — do not invent anatomy not shown.

${regionDetail}

Rendering: clean medical illustration with warm tones for tissue, ivory for bone. Solid dark background (near black). Soft volumetric lighting emphasizing anatomical depth and layering.

ZERO ultrasound artifacts, ZERO measurement markers, ZERO text, ZERO watermarks, ZERO medical equipment.${scanType === '2d' ? '\n\nNote: 2D ultrasound cross-section. Reconstruct 3D depth from the visible slice while preserving the exact same cross-sectional plane and composition. Do not fabricate structures not visible in the scan.' : ''}`;

  const skinToneModifier =
    skinTone === 'moreno'
      ? 'Color tone: use warm brown tones with rich melanin coloring for the anatomical rendering, consistent with a moreno complexion.'
      : null;

  return [
    base,
    buildClinicalNotesBlock(clinicalNotes),
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
  anatomicalRegion: AnatomicalRegion = 'face',
  clinicalNotes: string = '',
): string {
  // Portrait mode is only valid for face region — fallback to realistic otherwise
  if (mode === 'realistic' || anatomicalRegion !== 'face') {
    return buildRealisticPrompt(creativity, skinTone, scanType, anatomicalRegion, clinicalNotes);
  }
  return buildPortraitPrompt(style, creativity, skinTone, scanType, clinicalNotes);
}
