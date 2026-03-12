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
  face: `This scan shows fetal facial anatomy. Transform it into a photorealistic HDlive-style 3D rendering preserving the EXACT same view angle and spatial layout as the input scan (profile, frontal, or 3/4). Every facial feature must occupy the same position as in the ultrasound. Warm peach/amber skin tones, soft translucent tissue revealing underlying structure. Render skin surface, subcutaneous fat, nasal cartilage, orbital structures, lips and chin with depth.`,

  heart: `This scan shows fetal cardiac anatomy.

ANNOTATION RULE: The image may contain yellow measurement text and crosshair overlays (Card-circ, Heart-A, Th-circ, etc.) — COMPLETELY IGNORE THEM. Do not reproduce any text, labels, or crosshairs.

SPATIAL FIDELITY (highest priority): This is a direct visual translation of the input scan. Every structure must occupy the EXACT same position in the output as it does in the input. If the heart is left of center in the echo, it must be left of center in the output. If the spine appears at the bottom, it stays at the bottom. Do NOT center, rotate, or recompose.

WHAT TO RENDER: Show the FULL thoracic cross-section at the cardiac level — exactly as seen in the scan:
- The rounded thoracic silhouette with semi-transparent chest wall (faint rib arches in warm ivory at the periphery)
- Lung fields in their exact positions flanking the heart, rendered as warm translucent amber/golden tissue
- The cardiac chambers (with walls, septa, atrioventricular valves) rendered in warm rose/amber tones with near-black blood-pool lumens — in the exact same position and proportion as in the echo
- Pericardial layer surrounding the heart
- Spine and descending aorta as a posterior dark rounded structure, in the same position as in the scan

COLOR PALETTE: warm amber/golden for lung fields, rose-pink/warm red for myocardium, near-black for blood-pool lumens, warm ivory for ribs, dark background

STYLE: photorealistic 3D HDlive-enhanced fetal visualization — the same warm amber aesthetic as a high-quality 3D obstetric ultrasound but with perfect anatomical clarity. NOT an isolated heart specimen. NOT a dark atlas plate.

NO TEXT: no labels (LV, RV, LA, RA, IVS), no arrows, no annotations.`,

  brain: `This scan shows fetal intracranial anatomy.

SPATIAL FIDELITY (highest priority): Every structure must occupy the EXACT same position in the output as in the input scan. The view plane must match exactly (sagittal→sagittal, axial→axial, coronal→coronal). Do NOT rotate, recenter, or recompose.

WHAT TO RENDER: Show the FETAL HEAD with a cut-away view revealing the intracranial structures — in the exact same orientation as the scan:
- If sagittal: fetal head in profile, warm peach/skin exterior visible, mid-sagittal cut revealing brain (cerebral cortex, corpus callosum, brainstem, cerebellum, vermis)
- If axial/transverse: fetal skull as ovoid form, horizontal cross-section revealing internal structures (cerebral hemispheres, thalami, cavum septum pellucidum, or posterior fossa) in their exact positions from the scan
- Exterior: warm peach/skin and ivory bone tones; Brain parenchyma: warm beige/tan; CSF/ventricles: darker translucent
- Dark background, warm HDlive aesthetic throughout`,

  spine: `This scan shows fetal spinal anatomy.

SPATIAL FIDELITY (highest priority): Every structure must occupy the EXACT same position in the output as in the input scan. The fetal pose and orientation must match exactly. Do NOT recenter or repose the figure.

WHAT TO RENDER: Show the FETAL BODY with semi-transparent skin revealing the skeletal anatomy — in the exact same position and orientation as the ultrasound:
- Skin: warm translucent amber/peach, transparent enough to see through to the bones
- Vertebral column: individual vertebral bodies, pedicles, spinous processes in warm ivory/golden tones, in their exact position and curvature as shown in the scan
- Ribcage if visible: curved warm ivory arches extending from spine
- Skull if visible: smooth warm ivory cranium
- Limbs and soft tissue: warm amber translucent forms
- Dark background, warm HDlive aesthetic throughout`,

  abdomen: `This scan shows fetal abdominal anatomy.

SPATIAL FIDELITY (highest priority): Every structure must occupy the EXACT same position in the output as in the input scan. Do NOT recenter or recompose.

WHAT TO RENDER: Show the ABDOMINAL CROSS-SECTION with body context — matching the exact layout of the scan:
- Abdominal ovoid silhouette with semi-transparent abdominal wall in warm amber/skin tones
- Internal organs in their exact positions from the scan: stomach (fluid-filled dark sphere), liver (warm amber right lobe), kidneys if visible, umbilical vein tracking to liver
- Spine posteriorly as warm ivory bone
- Color palette: warm amber/golden for soft tissue, near-black fluid for hollow organs, warm ivory for bone
- Dark background, warm HDlive aesthetic`,

  fullBody: `This scan shows the full fetal body.

SPATIAL FIDELITY (highest priority): The fetal pose, curl, orientation, and position must match the input scan EXACTLY. Do NOT repose or recenter.

WHAT TO RENDER: Show the COMPLETE FETAL FIGURE with warm translucent skin revealing underlying anatomy:
- Skin: warm translucent amber/peach tones
- Skeletal system (spine, ribs, skull, limbs) visible through the skin in warm ivory/golden bone tones
- Major organs visible where appropriate
- Same fetal position and orientation as the input scan
- Dark background, warm HDlive 3D ultrasound aesthetic throughout`,
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

  const base = `CONTEXT: Transform this obstetric ultrasound into a photorealistic 3D anatomical visualization in the style of HDlive enhanced 3D fetal rendering. The output must look like the same scan but rendered with perfect anatomical clarity and warm amber/skin-tone colors — like a high-fidelity render from professional fetal visualization software. The input is ${scanDesc} ${regionSubject}.

SPATIAL FIDELITY (non-negotiable): The output is a direct visual translation of the input scan. Every structure must be in the EXACT same position, proportion, and orientation as in the ultrasound. If something is on the left in the echo, it stays on the left. If something is at the top, it stays at the top. Do NOT recompose, recenter, or generate a generic diagram. Render ONLY what is visible in this specific scan.

${regionDetail}

ZERO text of any kind — no anatomical labels (no "LV", "RV", "LA", "RA", "IVS" or any abbreviations), ZERO measurement markers, ZERO arrows, ZERO watermarks, ZERO medical equipment, ZERO annotation overlays, ZERO crosshairs. Pure visual rendering with no text whatsoever.${scanType === '2d' ? '\n\nNote: 2D ultrasound. Reconstruct 3D depth from the visible slice while preserving the exact same spatial layout. Do not fabricate structures not visible in the scan.' : ''}`;

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

// ---------- Enhanced prompt (with vision analysis) ----------

import type { UltrasoundAnalysis } from './visionAnalysis';

function buildVisionFaceBlock(analysis: UltrasoundAnalysis): string {
  const fd = analysis.faceDetails;
  if (!fd) return '';

  const lines: string[] = [
    `VISION ANALYSIS — the following describes THIS specific baby as seen in the ultrasound:`,
    `- View angle: ${analysis.viewAngle}`,
    `- Estimated gestational age: ${analysis.estimatedGestationalWeeks ? `~${analysis.estimatedGestationalWeeks} weeks` : 'unknown'}`,
    `- Image quality: ${analysis.imageQuality}`,
    `- Visible structures: ${analysis.visibleStructures.join(', ')}`,
    '',
    `SPECIFIC FACIAL FEATURES (reproduce these EXACTLY):`,
    `- Nose: ${fd.noseDescription}`,
    `- Lips: ${fd.lipDescription}`,
    `- Chin: ${fd.chinDescription}`,
    `- Forehead: ${fd.foreheadDescription}`,
    `- Cheeks: ${fd.cheekDescription}`,
    `- Eyes: ${fd.eyeDescription}`,
  ];

  if (fd.handPosition) {
    lines.push(`- Hand position: ${fd.handPosition}`);
  }
  if (fd.earVisible) {
    lines.push(`- Ear: visible`);
  }
  if (fd.hairVisible) {
    lines.push(`- Hair: visible`);
  }

  lines.push(`- Expression: ${fd.expression}`);
  lines.push('');
  lines.push(`Overall: ${analysis.overallDescription}`);

  return lines.join('\n');
}

function buildVisionOrganBlock(analysis: UltrasoundAnalysis): string {
  const od = analysis.organDetails;
  if (!od) return '';

  const lines: string[] = [
    `VISION ANALYSIS — the following describes exactly what is visible in this ultrasound:`,
    `- View plane: ${od.viewPlane}`,
    `- Estimated gestational age: ${analysis.estimatedGestationalWeeks ? `~${analysis.estimatedGestationalWeeks} weeks` : 'unknown'}`,
    `- Image quality: ${analysis.imageQuality}`,
    `- Visible structures: ${analysis.visibleStructures.join(', ')}`,
    '',
    `DETAILED ANATOMY:`,
    od.visibleAnatomyDescription,
  ];

  const cd = od.cardiacDetails;
  if (cd) {
    lines.push('');
    lines.push(`CARDIAC STRUCTURE DETAILS (render these specifically):`);
    if (cd.visibleChambers.length > 0) {
      lines.push(`- Visible chambers: ${cd.visibleChambers.join(', ')}`);
    }
    lines.push(`- Septal integrity: ${cd.septalIntegrity}`);
    if (cd.valvesVisible.length > 0) {
      lines.push(`- Valves visible: ${cd.valvesVisible.join(', ')}`);
    }
    if (cd.greatVessels) {
      lines.push(`- Great vessels: ${cd.greatVessels}`);
    }
    lines.push(`- Pericardium visible: ${cd.pericardiumVisible ? 'yes' : 'no'}`);
    if (cd.structuralAnomalyFlag) {
      lines.push(`- Structural note: ${cd.structuralAnomalyFlag}`);
    }
  }

  // measurements omitted — cardiac overlays are annotation noise, not anatomy
  lines.push(`\nOverall: ${analysis.overallDescription}`);

  return lines.join('\n');
}

const NEGATIVE_PROMPT = `ABSOLUTELY DO NOT:
- Generate a generic stock baby photo that could be any baby
- Ignore the specific features described above from the ultrasound
- Create perfectly symmetric, idealized features — real babies have natural asymmetry
- Produce plastic, waxy, or airbrushed skin
- Add any text, watermarks, logos, or medical equipment to the image`;

function buildEnhancedPortraitPrompt(
  style: Style,
  creativity: number,
  skinTone: SkinTone,
  scanType: ScanType,
  clinicalNotes: string,
  analysis: UltrasoundAnalysis,
): string {
  const scanDesc = scanTypeDescription(scanType);
  const visionBlock = buildVisionFaceBlock(analysis);

  const base = `The input image is ${scanDesc} showing a fetal face. Transform this medical scan into an ultra-realistic newborn portrait photograph of THIS SPECIFIC baby.

${visionBlock}

Clothing requirement: the baby must be fully clothed in a soft cotton onesie or gently swaddled in a clean white or pastel blanket — no exposed skin below the shoulders, no nudity of any kind.

Likeness requirement: this is a portrait of THIS SPECIFIC baby as described above — not a generic newborn. Every facial feature must match the analysis: the exact nose shape, lip fullness, chin contour, forehead slope, and cheek volume described. If the analysis mentions a hand near the face, include it in the same position. The resulting portrait must be visually recognizable as the same baby seen in the ultrasound.

Pose requirement: the analysis identifies the view angle as "${analysis.viewAngle}". The portrait MUST match this exact angle — ${analysis.viewAngle === 'frontal' ? 'render a frontal view' : analysis.viewAngle.includes('profile') ? 'render a profile view from the same side' : 'render a 3/4 view from the same side'}.

Composition: fill the frame with the baby's face and upper body. Use shallow depth of field with soft bokeh background. Soft natural studio lighting.

Skin texture: real newborn skin with fine peach fuzz, tiny pores visible at close inspection, natural color variation (slightly redder on cheeks, paler on forehead), soft mottling. NOT airbrushed, NOT plastic, NOT porcelain.

${NEGATIVE_PROMPT}${scanType === '2d' ? '\n\nNote: this is a 2D ultrasound with limited geometric detail. The vision analysis has already interpreted the visible features — use those descriptions to guide the reconstruction.' : ''}`;

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

function buildEnhancedRealisticPrompt(
  creativity: number,
  skinTone: SkinTone,
  scanType: ScanType,
  anatomicalRegion: AnatomicalRegion,
  clinicalNotes: string,
  analysis: UltrasoundAnalysis,
): string {
  const scanDesc = scanTypeDescription(scanType);
  const regionSubject = regionScanSubject[anatomicalRegion];
  const regionDetail = realisticRegionDetails[anatomicalRegion];
  const visionBlock = buildVisionOrganBlock(analysis);

  const base = `CONTEXT: Transform this obstetric ultrasound into a photorealistic 3D anatomical visualization in the style of HDlive enhanced 3D fetal rendering. The output must look like the same scan but rendered with perfect anatomical clarity and warm amber/skin-tone colors — like a high-fidelity render from professional fetal visualization software. The input is ${scanDesc} ${regionSubject}.

${visionBlock}

SPATIAL FIDELITY (non-negotiable): The output is a direct visual translation of the input scan. Every structure must be in the EXACT same position, proportion, and orientation as in the ultrasound — as confirmed by the vision analysis above. The view plane identified is "${analysis.organDetails?.viewPlane ?? 'unknown'}". Do NOT recompose, recenter, or generate a generic diagram. Render ONLY what is visible in this specific scan.

${regionDetail}

ZERO text of any kind — no anatomical labels (no "LV", "RV", "LA", "RA", "IVS" or any abbreviations), ZERO measurement markers, ZERO arrows, ZERO watermarks, ZERO medical equipment, ZERO annotation overlays, ZERO crosshairs. Pure visual rendering with no text whatsoever.${scanType === '2d' ? '\n\nNote: 2D ultrasound. The vision analysis has already identified the visible structures — use those descriptions to guide the 3D reconstruction while preserving exact spatial layout.' : ''}`;

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

export function buildEnhancedPrompt(
  style: Style,
  creativity: number,
  skinTone: SkinTone = 'normal',
  mode: GenerationMode = 'portrait',
  scanType: ScanType = '3d4d',
  anatomicalRegion: AnatomicalRegion = 'face',
  clinicalNotes: string = '',
  analysis: UltrasoundAnalysis | null = null,
): string {
  // If no analysis, fall back to standard prompt
  if (!analysis) {
    return buildPrompt(style, creativity, skinTone, mode, scanType, anatomicalRegion, clinicalNotes);
  }

  // Portrait mode is only valid for face region
  if (mode === 'portrait' && anatomicalRegion === 'face') {
    return buildEnhancedPortraitPrompt(style, creativity, skinTone, scanType, clinicalNotes, analysis);
  }

  return buildEnhancedRealisticPrompt(creativity, skinTone, scanType, anatomicalRegion, clinicalNotes, analysis);
}
