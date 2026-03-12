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

  heart: `This scan shows fetal cardiac anatomy.

ANNOTATION RULE: The ultrasound image may contain yellow measurement text, crosshair markers, and numerical overlays (e.g. "Card-circ", "Heart-A", "Th-circ", dimension values, gestational age labels). These are machine annotations — COMPLETELY IGNORE THEM. Do not reproduce any text, labels, or crosshairs. Do not let overlay positions influence structure placement.

VIEW FIDELITY: identify the exact cardiac view plane (4-chamber, 3-vessel, 3-vessel-trachea, LVOT, RVOT, short axis, aortic arch, ductal arch) and render that SAME cross-sectional plane. Do NOT rotate or reinterpret the scan from a different angle.

FRAMING: the heart must fill 75–85% of the output frame as a close-up isolated cardiac atlas plate. Surrounding thoracic structures (lungs, spine, ribs) may appear only minimally at the frame edges. Do NOT render a full thoracic cross-section or a full fetus.

MYOCARDIUM: render with visible fiber architecture — subtle oblique striations indicating myocardial fiber bundles running through the ventricular wall. Subsurface scattering: tissue appears slightly translucent near the endocardial surface, warming toward the epicardium. Pericardium rendered as a thin slightly reflective fibrous membrane with a narrow pericardial space.

ENDOCARDIAL SURFACES: left ventricle interior shows trabeculae carneae — irregular muscular ridges projecting from the inner wall, more prominent near the apex. Right ventricle shows moderator band as a muscular bridge if visible. Chamber lumens: deep maroon/near-black blood-pool color contrasting against warm myocardial walls.

VALVES: atrioventricular valves (mitral / tricuspid) rendered as thin slightly translucent fibrous leaflets. Chordae tendineae as hair-thin white fibrous strands connecting leaflet edges to papillary muscle tips — subtle but visible. Papillary muscles as conical prominences projecting into the ventricular cavity.

GREAT VESSELS: aortic and pulmonary artery walls with three visible layers (intima bright highlight, media warm muscular tone, adventitia blending into surrounding tissue). Vessel lumens dark maroon with specular highlight on inner curve.

LIGHTING: directional illumination from upper-left. Ambient occlusion darkens chamber corners and valve crevices. Structures closer to the viewer: warmer and brighter. Receding structures: cooler and darker. Soft specular highlights on epicardial surface.

STYLE: photorealistic 3D medical visualization — indistinguishable from a high-resolution render from Complete Anatomy (3D4Medical) or Zygote Body. NOT a hand-drawn illustration. NOT a cartoon.

COLOR PALETTE: myocardium deep red (#8B1A1A–#C94040), blood pool near-black (#2D0A0A), fibrous structures ivory-white (#F5F0E8), background near-black (#0A0A0A).`,

  brain: `This scan shows fetal intracranial anatomy. CRITICAL: identify the exact brain view plane and preserve it. If this is a MID-SAGITTAL view (showing cerebral cortex profile, corpus callosum, brainstem, cerebellum, vermis in a side view), render the SAME sagittal cross-section — do NOT convert to coronal or axial. If this is an AXIAL view (transthalamic showing thalami and cavum septum pellucidum, or transcerebellar showing posterior fossa), maintain that exact axial plane. If CORONAL, keep coronal. Transform the visible intracranial structures into a 3D anatomical rendering that matches the ultrasound composition 1:1 — same structures, same spatial arrangement, same orientation. Do NOT render a full fetus.`,

  spine: `This scan shows fetal spinal anatomy. CRITICAL: identify the exact spine view (sagittal showing vertebral bodies in a line, coronal showing bilateral pedicles, or axial showing a single vertebral cross-section) and render that SAME plane. Transform the visible vertebral bodies, pedicles, spinal cord, and surrounding tissue into a 3D anatomical rendering matching the ultrasound composition 1:1. Do NOT render a full fetus — focus on the spinal structures as they appear in this view.`,

  abdomen: `This scan shows fetal abdominal anatomy. CRITICAL: identify the exact abdominal cross-section plane and render that SAME plane. Transform the visible structures (abdominal wall, stomach, liver, kidneys, umbilical vessels, bowel, aorta/IVC as applicable) into a 3D anatomical rendering matching the ultrasound composition 1:1. Only render organs and structures that are visible in this specific scan plane. Do NOT render a full fetus.`,

  fullBody: `This scan shows the full fetal body. Transform it into a 3D anatomical rendering preserving the EXACT same body position, orientation, and framing. Show skeletal system, major organs, and soft tissue layers as visible in the scan. The fetal pose and spatial arrangement must match the input 1:1.`,
};

function buildRenderingInstruction(anatomicalRegion: AnatomicalRegion): string {
  if (anatomicalRegion === 'heart') {
    // Heart rendering style is fully specified in realisticRegionDetails.heart
    return '';
  }
  return 'Rendering: clean medical illustration with warm tones for tissue, ivory for bone. Solid dark background (near black). Soft volumetric lighting emphasizing anatomical depth and layering.';
}

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

${buildRenderingInstruction(anatomicalRegion)}

ZERO ultrasound artifacts, ZERO measurement markers, ZERO text, ZERO watermarks, ZERO medical equipment, ZERO annotation overlays, ZERO crosshairs.${scanType === '2d' ? '\n\nNote: 2D ultrasound cross-section. Reconstruct 3D depth from the visible slice while preserving the exact same cross-sectional plane and composition. Do not fabricate structures not visible in the scan.' : ''}`;

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

  const base = `CONTEXT: This is a medical educational illustration for an obstetrics textbook. The input image is ${scanDesc} ${regionSubject}. Transform this clinical ultrasound into a 3D anatomical rendering in the style of a Netter-style medical atlas or professional anatomy app (Complete Anatomy, Visible Body). This is strictly a scientific medical visualization — no photographs, no real people.

${visionBlock}

COMPOSITION FIDELITY (highest priority):
- This is a VISUAL TRANSLATION of the input scan — NOT a free-form illustration.
- The analysis above identifies the exact view plane as "${analysis.organDetails?.viewPlane ?? 'unknown'}". Render that SAME plane.
- The structures must occupy the SAME spatial positions and proportions as in the ultrasound.
- Do NOT reinterpret the scan from a different angle or generate a generic textbook diagram.
- Render ONLY structures visible in this specific scan — do not invent anatomy not shown.

${regionDetail}

${buildRenderingInstruction(anatomicalRegion)}

ZERO ultrasound artifacts, ZERO measurement markers, ZERO text, ZERO watermarks, ZERO medical equipment, ZERO annotation overlays, ZERO crosshairs.${scanType === '2d' ? '\n\nNote: 2D ultrasound cross-section. The vision analysis has already identified the visible structures — use those descriptions to guide the 3D reconstruction.' : ''}`;

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
