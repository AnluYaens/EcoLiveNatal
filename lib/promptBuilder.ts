import type {
  AnatomicalRegion,
  GenerationMode,
  ScanType,
  SkinTone,
} from "./validation";
import type { UltrasoundAnalysis } from "./visionAnalysis";

export type { AnatomicalRegion, GenerationMode, ScanType, SkinTone };

function creativityModifier(creativity: number): string {
  let modeDesc = "";
  if (creativity <= 30) {
    modeDesc =
      "Strict mode: preserve geometry and identity cues exactly. Do not alter pose, angle, or proportions.";
  } else if (creativity <= 70) {
    modeDesc =
      "Balanced mode: improve realism only, without changing identity cues, head shape, pose, or hand placement.";
  } else {
    modeDesc =
      "High mode: increase photorealism only; keep the same identity cues, pose, and facial proportions from the reference.";
  }
  return `${modeDesc}\n\nStrictly maintain the anatomical geometry of the original input image. If this is a transverse/axial plane ultrasound, the fetal spine is located on the lateral side (left/right). DO NOT center the spine. DO NOT force a frontal coronal view. Respect the original spatial layout 100%.`;
}

function scanTypeDescription(scanType: ScanType): string {
  return scanType === "2d"
    ? "a 2D obstetric ultrasound (grayscale cross-sectional imaging)"
    : "a 3D/4D obstetric ultrasound (volumetric surface rendering)";
}

const regionScanSubject: Record<AnatomicalRegion, string> = {
  face: "showing a fetal face",
  heart: "showing a partial fetal cardiac ultrasound slice",
  brain: "showing an amorphous biological tissue cross-section",
  spine: "showing an amorphous biological tissue cross-section",
  abdomen: "showing an amorphous biological tissue cross-section",
  fullBody: "showing the full fetal body",
};

function buildClinicalNotesBlock(clinicalNotes: string): string | null {
  const trimmed = clinicalNotes.trim();
  if (!trimmed) return null;
  return `[CLINICAL CONTEXT provided by the operator: ${trimmed}]

Clinical context is supportive only. It must NEVER override the visible geometry, sidedness, view plane, pose, crop, or spatial layout in the image. If the operator notes conflict with the scan, follow the scan. Do not add textbook anatomy that is not visibly supported by the input.`;
}

function joinPromptSections(
  ...sections: Array<string | null | undefined>
): string {
  return sections
    .filter((section): section is string => Boolean(section))
    .join("\n\n");
}

function buildFullBodyPortraitPrompt(
  creativity: number,
  skinTone: SkinTone,
  scanType: ScanType,
  clinicalNotes: string,
): string {
  const scanDesc = scanTypeDescription(scanType);

  const base = `CONTENT CLASSIFICATION: This is a clinical prenatal-to-postnatal prediction for expecting parents — a medical imaging transformation of an obstetric ultrasound into a newborn portrait illustration. Strictly educational and family-oriented.

The input image is ${scanDesc} showing the full fetal body. Transform this medical scan into an ultra-realistic newborn portrait photograph of THIS SPECIFIC baby — a full-body shot in portrait orientation.

Clothing requirement: the baby must be fully dressed in a soft cotton onesie or sleeper suit, or gently swaddled in a clean white or pastel blanket — fully covered below the wrists and ankles. Do NOT invent a body, shoulders, or hands if they are not literally visible in the input crop.

SPATIAL AND POSE REQUIREMENT (CRITICAL): You MUST maintain the EXACT same body pose, rotation, crop, framing, and scale as the input image. If the baby is curled, lying on its side, diagonal, or upside down in the ultrasound, reproduce that EXACT same rotation and orientation in the frame. DO NOT rotate the subject to make them upright. DO NOT re-center them. DO NOT straighten or repose the baby. The head and limbs must occupy the exact same spatial coordinates as the input.

Framing rule: treat the crop as a hard boundary. Do not zoom out to reveal missing anatomy, do not beautify the pose, and do not complete limbs that are not actually visible. If part of the fetus is cut off in the crop, keep it cut off.

Composition: portrait orientation (vertical). The baby fills the frame from head to feet. Soft natural studio lighting, neutral or soft pastel background, shallow depth of field with gentle bokeh.

Likeness requirement: this is a portrait of a SPECIFIC baby — not a generic newborn. Faithfully reproduce the body proportions, limb positions, and any visible facial features from the ultrasound. If the face is visible, reproduce the exact facial geometry.

Skin texture: real newborn skin with fine peach fuzz, tiny pores visible at close inspection, natural color variation, soft mottling. NOT airbrushed, NOT plastic, NOT porcelain.

Quality requirements: individually defined fingers and toes (no fused or webbed digits), anatomically correct proportions for gestational age, realistic newborn skin imperfections (milia, stork bites acceptable). ZERO plastic or waxy skin, ZERO doll-like eyes, ZERO uncanny valley smoothness, ZERO extra limbs or fingers, ZERO text, ZERO logos, ZERO watermarks, ZERO medical equipment, ZERO ultrasound artifacts.

Priority rule: identity and geometry come before aesthetics. If you must choose, match the specific baby's pose, proportions, and visible features instead of making the image prettier or more generic.${scanType === "2d" ? "\n\nNote: this is a 2D ultrasound with limited geometric detail. Infer 3D body structure from the visible cross-section while maintaining fidelity to what is shown. Do not invent features that are not visible." : ""}`;

  const skinToneModifier =
    skinTone === "moreno"
      ? "Skin tone requirement: the newborn has warm brown skin with a naturally dark complexion. Render the skin tone accurately: rich melanin, warm undertones, darker coloring consistent with a moreno infant."
      : null;

  return [
    base,
    buildClinicalNotesBlock(clinicalNotes),
    skinToneModifier,
    "Style preference: ultra-realistic details and natural skin texture, while preserving the exact original geometry.",
    creativityModifier(creativity),
  ]
    .filter(Boolean)
    .join("\n\n");
}

const realisticRegionDetails: Record<AnatomicalRegion, string> = {
  face: `This scan shows fetal facial anatomy. Transform it into a photorealistic HDlive-style 3D rendering preserving the EXACT same view angle and spatial layout as the input scan (profile, frontal, or 3/4). Every facial feature must occupy the same position as in the ultrasound. Warm peach/amber skin tones, soft translucent tissue revealing underlying structure. Render skin surface, subcutaneous fat, nasal cartilage, orbital structures, lips and chin with depth.`,

  heart: `Edit this image: replace the ultrasound texture with photorealistic OPAQUE fetal cardiac tissue in GE Voluson HDlive style. Keep the EXACT same cross-sectional shape, composition, and spatial layout as the input. This is a texture swap of a partial fetal echo slice, not a new illustration.

Ignore yellow measurement text, crosshairs, and overlay remnants. Preserve only the cardiac structures that are actually supported by the scan. Chambers remain dark open cavities, myocardium remains solid rose-pink with restrained muscular texture, and uncertain boundaries stay incomplete or visually ambiguous instead of being repaired.

Do NOT turn this into a generic textbook thoracic cross-section. Do NOT add lungs, ribs, chest wall, spine, or surrounding anatomy unless they are clearly visible in the scan. Do NOT turn black gaps, black bands, or masked regions into tissue boundaries or anatomical structures. Areas from removed overlays or preprocessing masks must remain absent background, not become muscle or chamber walls. NO TEXT, no labels, no annotations.`,

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

// ---------- Gemini-optimized prompts (concise, DeeVid-style) ----------

const geminiRegionPrompts: Record<AnatomicalRegion, string> = {
  face: `A high-resolution, ultra-realistic medical visualization macro photograph of a fetal face, derived from the input image. The output image must have the EXACT same dimensions, framing, composition, and aspect ratio as the input — do not crop, zoom, pad, or reframe. The granular ultrasound texture is entirely replaced with detailed, lifelike skin and tissue textures. The facial features (nose, lips, chin, cheeks, forehead, eyes) are rendered with warm peach/skin tones, realistic newborn skin texture with fine detail. All features are in the identical position and orientation as in the input image. CRITICAL: preserve the EXACT head tilt angle, profile direction, and spatial position of the face within the frame. If the face is off-center, keep it off-center. If the head is tilted, keep the same tilt. The overall scene is clean, detailed, and photorealistic.`,

  heart: `Edit this image: replace the ultrasound grayscale texture with photorealistic OPAQUE fetal tissue in GE Voluson HDlive Silhouette style. Keep the EXACT same shape, composition, and spatial layout as the input — same oval/circular cross-section, same positions for all structures. This is a texture swap, not a new illustration.

Ignore any measurement overlays completely: yellow text, crosshairs, dotted or faint circular/elliptical measurement rings, caliper guides, cursor marks, and device UI panels must not appear in the output and must never be converted into anatomy.

The output must be the same cross-sectional slice shape as the input. All tissue must be SOLID and OPAQUE, not translucent or gelatinous. Cardiac chambers are open cavities (deep dark hollow spaces) and myocardium is solid rose-pink with subtle muscular striations. Preserve the asymmetry and partial nature of the scan exactly as seen.

Do NOT turn this into a generic textbook thoracic cross-section. Do NOT add lungs, ribs, chest wall, spine, pericardium, or complete surrounding anatomy unless those structures are clearly visible in the input and explicitly supported by the analysis. If a chamber, vessel, valve, or septal boundary is incomplete or uncertain in the scan, keep it incomplete or visually ambiguous rather than repairing it.

Do NOT present this as a dissected specimen, pathology sample, surgical slice, or polished anatomical cutaway. The result must remain visually tied to the original ultrasound blobs and edges, with only a restrained HDlive-style tissue translation applied locally.

Do NOT create concentric rings, donut-like chambers, smooth circular walls, or a large enclosing oval just because the scan contains a measurement circle or rounded border. Measurement geometry is not anatomy.

Do NOT transform black gaps, black bands, masked regions, or annotation cutouts into tissue boundaries. Areas that come from overlays or removed UI should remain absent/background, not become muscle.

Warm HDlive 3D directional lighting with controlled depth and restrained specular highlights. NO TEXT.`,

  brain: `Fetal intracranial anatomy, cut-away view revealing brain structures. SPATIAL FIDELITY: every structure at the EXACT same position and orientation as the input. Match the scan plane exactly.

If axial: ovoid skull cross-section with cerebral hemispheres, midline falx, thalami, cavum septum pellucidum in their exact positions. If sagittal: profile head with mid-sagittal brain cut (cortex, corpus callosum, brainstem, cerebellum).

Colors: warm peach/skin exterior, ivory bone, warm beige brain parenchyma, darker translucent CSF/ventricles. Dark background, photorealistic HDlive aesthetic. NO TEXT.`,

  spine: `Fetal spinal anatomy with translucent skin view. SPATIAL FIDELITY: exact same curve, position, and orientation as the input — do not repose or recenter.

Render: warm translucent amber/peach skin revealing skeletal anatomy beneath. Vertebral bodies as individual warm ivory/golden segments with pedicles and spinous processes, following the exact curvature of the input. Ribcage arches in warm ivory if visible. Skull as smooth ivory cranium if visible.

Dark background, photorealistic HDlive aesthetic. NO TEXT.`,

  abdomen: `ANNOTATION RULE: ignore any measurement overlays — do not reproduce them.

Fetal abdominal cross-section. SPATIAL FIDELITY: every structure at the EXACT same position as the input — do not recenter or recompose.

Render: ovoid abdominal wall in semi-transparent warm amber/skin, stomach as dark fluid-filled sphere, liver as warm amber right lobe, kidneys if visible, umbilical vein tracking to liver. Spine posteriorly as warm ivory bone.

Colors: warm amber/golden soft tissue, near-black fluid for hollow organs, warm ivory bone. Dark background, photorealistic HDlive aesthetic. NO TEXT.`,

  fullBody: `A high-resolution, ultra-realistic medical visualization macro photograph of a complete fetal body, derived from the input image. The output image must have the EXACT same dimensions, framing, composition, and aspect ratio as the input — do not crop, zoom, pad, or reframe. The granular ultrasound texture is entirely replaced with detailed, lifelike tissue textures. The fetus is shown with warm translucent amber/peach skin revealing the skeletal system (spine, ribs, skull, limbs) and major organs underneath. Direct image translation via texture mapping. DO NOT hallucinate or infer missing anatomy. DO NOT center or normalize the layout. Treat the input image as a strict mask. Wherever you see granular ultrasound pixels, apply a photorealistic biomedical tissue texture. Preserve the EXACT asymmetrical shapes, blobs, and positions of the input image. If the spine or a specific organ is lateral in the input, KEEP it lateral. Do not attempt to draw a standard textbook anatomical frontal/coronal view. The overall scene is clean, detailed, and photorealistic.`,
};

function buildGeminiFaceAnchorBlock(analysis: UltrasoundAnalysis): string {
  const lock = getSpatialLock(analysis);
  const lines = [
    `POSE LOCK (highest priority):`,
    `- Facing direction: ${lock.facing}  [source: ${lock.facingSource}] — do NOT mirror or flip`,
    `- Head tilt: ${lock.headTiltDesc}`,
    `- View: ${lock.viewAngle} — render from the same side, not the mirror`,
    `- Crop: treat the source frame as a hard boundary. Do NOT recenter. Do NOT zoom out.`,
  ];
  if (lock.chinSource !== 'generic' && lock.chinElevDeg !== null) {
    lines.splice(2, 0, `- Chin elevation: ${lock.chinElevDeg}° → chin ${lock.chinBucket}  [source: ${lock.chinSource}]`);
  }
  if (lock.facingSource === 'coordinates' || lock.chinSource === 'coordinates') {
    lines.push(`- Landmark geometry is derived from spatial analysis — use as structural guidance, not a pixel-accurate target.`);
  }
  return lines.join('\n');
}

export function buildGeminiPrompt(
  anatomicalRegion: AnatomicalRegion,
  scanType: ScanType,
  clinicalNotes: string,
  analysis?: UltrasoundAnalysis | null,
): string {
  const regionPrompt = geminiRegionPrompts[anatomicalRegion];
  const scanNote =
    scanType === "2d"
      ? " This is a 2D ultrasound — reconstruct 3D depth from the visible cross-section."
      : "";
  const clinicalBlock = buildClinicalNotesBlock(clinicalNotes);
  const anchorBlock =
    analysis && anatomicalRegion === "face"
      ? buildGeminiFaceAnchorBlock(analysis)
      : analysis && anatomicalRegion !== "face"
        ? buildGeminiOrganAnchorBlock(anatomicalRegion, analysis)
        : null;

  return joinPromptSections(
    regionPrompt + scanNote,
    anchorBlock,
    clinicalBlock,
  );
}

function buildRealisticPromptBase(
  scanType: ScanType,
  anatomicalRegion: AnatomicalRegion,
  analysisBlock?: string | null,
  analysis?: UltrasoundAnalysis | null,
): string {
  const scanDesc = scanTypeDescription(scanType);
  const regionSubject = regionScanSubject[anatomicalRegion];
  const regionDetail = realisticRegionDetails[anatomicalRegion];
  const spatialFidelity = analysis
    ? `SPATIAL FIDELITY (non-negotiable): The output is a direct visual translation of the input scan. Every structure must be in the EXACT same position, proportion, and orientation as in the ultrasound — as confirmed by the vision analysis above. The view plane identified is "${analysis.organDetails?.viewPlane ?? "unknown"}". Do NOT recompose, recenter, or generate a generic diagram. Render ONLY what is visible in this specific scan.`
    : `SPATIAL FIDELITY (non-negotiable): The output is a direct visual translation of the input scan. Every structure must be in the EXACT same position, proportion, and orientation as in the ultrasound. If something is on the left in the echo, it stays on the left. If something is at the top, it stays at the top. Do NOT recompose, recenter, or generate a generic diagram. Render ONLY what is visible in this specific scan.`;
  const ambiguityRule = analysis
    ? `Ambiguity rule: keep uncertainty where the scan is uncertain. Do NOT replace a noisy or partial structure with a clean textbook anatomy just because the analysis suggests a likely diagnosis. If anatomy confidence is "${analysis.organDetails?.anatomyConfidence ?? "unknown"}", respect that confidence level. If overlay interference is "${analysis.organDetails?.overlayInterference ?? "unknown"}", do not hallucinate anatomy behind overlays.`
    : `Ambiguity rule: if the scan is incomplete, noisy, or partially obscured, keep that ambiguity. Do NOT "repair" the anatomy into a cleaner textbook view. Do NOT infer a symmetric heart, centered brain, straight spine, or balanced abdomen unless the input clearly shows it.`;
  const constraintRule = analysis
    ? `Constraint rule: prioritize ONLY the structures explicitly listed in the vision analysis. If a chamber, vessel, ventricle, organ, bone, or cavity is not clearly supported by the listed visible structures and anatomy description, omit it rather than inventing it.`
    : null;
  const reconstructionNote =
    scanType === "2d"
      ? analysis
        ? "Note: 2D ultrasound. The vision analysis has already identified the visible structures — use those descriptions to guide the 3D reconstruction while preserving exact spatial layout."
        : "Note: 2D ultrasound. Reconstruct 3D depth from the visible slice while preserving the exact same spatial layout. Do not fabricate structures not visible in the scan."
      : null;

  return joinPromptSections(
    `CONTENT CLASSIFICATION: This is a strictly clinical medical illustration for obstetrics education — an anatomical diagram of internal fetal structures. No nudity, no sexual content, no human subjects depicted as people. Equivalent to a medical textbook anatomical illustration.`,
    `CONTEXT: Transform this obstetric ultrasound into a photorealistic 3D anatomical visualization in the style of HDlive enhanced 3D fetal rendering. The output must look like the same scan but rendered with perfect anatomical clarity and warm amber/skin-tone colors — like a high-fidelity render from professional fetal visualization software. The input is ${scanDesc} ${regionSubject}.`,
    analysisBlock,
    spatialFidelity,
    ambiguityRule,
    constraintRule,
    regionDetail,
    `ZERO text of any kind — no anatomical labels (no "LV", "RV", "LA", "RA", "IVS" or any abbreviations), ZERO measurement markers, ZERO arrows, ZERO watermarks, ZERO medical equipment, ZERO annotation overlays, ZERO crosshairs. Pure visual rendering with no text whatsoever.`,
    reconstructionNote,
  );
}

function buildRealisticPrompt(
  creativity: number,
  skinTone: SkinTone,
  scanType: ScanType,
  anatomicalRegion: AnatomicalRegion,
  clinicalNotes: string,
): string {
  const skinToneModifier =
    skinTone === "moreno"
      ? "Color tone: use warm brown tones with rich melanin coloring for the anatomical rendering, consistent with a moreno complexion."
      : null;

  return joinPromptSections(
    buildRealisticPromptBase(scanType, anatomicalRegion),
    buildClinicalNotesBlock(clinicalNotes),
    skinToneModifier,
    creativityModifier(creativity),
  );
}

export function buildPrompt(
  creativity: number,
  skinTone: SkinTone = "normal",
  mode: GenerationMode = "portrait",
  scanType: ScanType = "3d4d",
  anatomicalRegion: AnatomicalRegion = "face",
  clinicalNotes: string = "",
): string {
  const portraitRegions: AnatomicalRegion[] = ["face", "fullBody"];
  if (mode === "realistic" || !portraitRegions.includes(anatomicalRegion)) {
    return buildRealisticPrompt(
      creativity,
      skinTone,
      scanType,
      anatomicalRegion,
      clinicalNotes,
    );
  }
  if (anatomicalRegion === "fullBody") {
    return buildFullBodyPortraitPrompt(creativity, skinTone, scanType, clinicalNotes);
  }
  return buildFacePortraitPrompt({ creativity, skinTone, scanType, clinicalNotes }, null);
}

// ---------- Enhanced prompt (with vision analysis) ----------

// ---------- Face portrait: strict pose lock ----------

type FacingValue = 'facing-left' | 'facing-right' | 'facing-camera' | 'preserve-as-is';
type ChinBucket = 'raised' | 'level' | 'tucked';
type DataSource = 'coordinates' | 'label' | 'generic';
type LabelSource = 'label' | 'generic';

type SpatialLock = {
  facing: FacingValue;
  facingSource: DataSource;
  chinElevDeg: number | null;
  chinBucket: ChinBucket;
  chinSource: DataSource;
  viewAngle: string;
  viewAngleSource: LabelSource;
  headTiltDeg: number | null;
  headTiltDesc: string;
  headTiltSource: LabelSource;
  faceCenter: { x: number; y: number } | null;  // letterbox-corrected 0–1
  faceCenterSource: 'coordinates' | 'generic';
  occupancyPercent: number | null;               // letterbox-corrected %, null when no coords
  handLock: string | null;                       // spatial hand constraint or null
  facingDesc: string;                            // explicit geometric description, no convention ambiguity
};

export type LetterboxGeometry = {
  proportionalW: number;  // width of pre-letterbox proportional image in px
  proportionalH: number;  // height of pre-letterbox proportional image in px
  // canvas is always 1024×1024 for the OpenAI path
};

type SpatialLayoutShape = NonNullable<UltrasoundAnalysis['spatialLayout']>;

const FACING_THRESHOLD = 0.07;

function deriveFacingFromCoords(sl: SpatialLayoutShape): 'facing-left' | 'facing-right' | null {
  if (sl.noseTipX === undefined || sl.foreheadX === undefined) return null;
  const diff = sl.foreheadX - sl.noseTipX;
  if (Math.abs(diff) < FACING_THRESHOLD) return null;
  return diff > 0 ? 'facing-left' : 'facing-right';
}

function deriveChinElevFromCoords(sl: SpatialLayoutShape): number | null {
  if (sl.noseTipY === undefined || sl.chinY === undefined || sl.foreheadY === undefined) return null;
  const faceHeight = Math.abs(sl.chinY - sl.foreheadY);
  if (faceHeight <= 0.05) return null;
  const midFaceY = (sl.foreheadY + sl.chinY) / 2;
  const raw = (-(sl.noseTipY - midFaceY) / (faceHeight / 2)) * 45;
  return Math.round(Math.max(-45, Math.min(45, raw)));
}

function toChinBucket(deg: number): ChinBucket {
  if (deg >= 12) return 'raised';
  if (deg <= -12) return 'tucked';
  return 'level';
}

function viewAngleToHuman(viewAngle: UltrasoundAnalysis['viewAngle']): string {
  switch (viewAngle) {
    case 'frontal': return 'frontal (face-on)';
    case 'profile-left': return 'left profile';
    case 'profile-right': return 'right profile';
    case 'three-quarter-left': return 'three-quarter view from the left';
    case 'three-quarter-right': return 'three-quarter view from the right';
    default: return viewAngle;
  }
}

function headTiltToDesc(deg: number): string {
  if (deg > 5) return `${deg}° tilted clockwise (right ear down)`;
  if (deg < -5) return `${Math.abs(deg)}° tilted counter-clockwise (left ear down)`;
  return 'approximately upright (no significant tilt)';
}

function buildFacingDesc(
  facing: FacingValue,
  noseTipX?: number,
  foreheadX?: number,
): string {
  const coordHint =
    noseTipX !== undefined && foreheadX !== undefined
      ? ` (Spatial evidence: nose tip at ~${Math.round(noseTipX * 100)}% from left, forehead at ~${Math.round(foreheadX * 100)}% from left in the source frame.)`
      : '';
  switch (facing) {
    case 'facing-left':
      return `Facing orientation: The face is turned LEFT from the viewer's perspective — the baby's nose points toward the LEFT edge of the frame, the baby's RIGHT cheek faces the camera, the LEFT ear and temple are turned away.${coordHint}`;
    case 'facing-right':
      return `Facing orientation: The face is turned RIGHT from the viewer's perspective — the baby's nose points toward the RIGHT edge of the frame, the baby's LEFT cheek faces the camera, the RIGHT ear and temple are turned away.${coordHint}`;
    case 'facing-camera':
      return `Facing orientation: The face is looking directly at the camera (frontal view) — both cheeks are approximately equally visible, nose pointing toward the lens.${coordHint}`;
    default:
      return `Facing orientation: Preserve the exact face orientation and side presentation shown in the source image — do not flip or mirror any side.`;
  }
}

function getSpatialLock(
  analysis: UltrasoundAnalysis | null,
  lbGeom?: LetterboxGeometry,
): SpatialLock {
  const sl = analysis?.spatialLayout ?? null;

  // --- facing ---
  let facing: FacingValue = 'preserve-as-is';
  let facingSource: DataSource = 'generic';
  if (sl) {
    const fromCoords = deriveFacingFromCoords(sl);
    if (fromCoords !== null) {
      facing = fromCoords;
      facingSource = 'coordinates';
    } else {
      facing = sl.facingDirection;
      facingSource = 'label';
    }
  }

  // --- chin ---
  let chinElevDeg: number | null = null;
  let chinSource: DataSource = 'generic';
  let chinBucket: ChinBucket = 'level';
  if (sl) {
    const fromCoords = deriveChinElevFromCoords(sl);
    if (fromCoords !== null) {
      chinElevDeg = fromCoords;
      chinSource = 'coordinates';
      chinBucket = toChinBucket(fromCoords);
    } else {
      chinElevDeg = sl.chinElevationDegrees;
      chinSource = 'label';
      chinBucket = toChinBucket(sl.chinElevationDegrees);
    }
  }

  // --- view angle ---
  let viewAngle: string;
  let viewAngleSource: LabelSource;
  if (analysis) {
    viewAngle = viewAngleToHuman(analysis.viewAngle);
    viewAngleSource = 'label';
  } else {
    viewAngle = 'preserve the existing viewing class as shown in the source';
    viewAngleSource = 'generic';
  }

  // --- head tilt ---
  let headTiltDeg: number | null = null;
  let headTiltDesc: string;
  let headTiltSource: LabelSource;
  if (sl) {
    headTiltDeg = sl.headTiltDegrees;
    headTiltDesc = headTiltToDesc(sl.headTiltDegrees);
    headTiltSource = 'label';
  } else {
    headTiltDesc = 'preserve the head tilt as shown';
    headTiltSource = 'generic';
  }

  // --- letterbox-corrected face center and occupancy ---
  // Vision runs on the proportional pre-letterbox image (pW × pH). The model
  // receives a 1024×1024 padded canvas. Coordinates must be remapped so that
  // the prompt values match what the model actually sees.
  const CANVAS = 1024;
  const pW = lbGeom?.proportionalW ?? CANVAS;
  const pH = lbGeom?.proportionalH ?? CANVAS;
  const scaleX = pW / CANVAS;
  const scaleY = pH / CANVAS;
  const offsetX = (1 - scaleX) / 2;
  const offsetY = (1 - scaleY) / 2;

  let faceCenter: { x: number; y: number } | null = null;
  let faceCenterSource: 'coordinates' | 'generic' = 'generic';
  let occupancyPercent: number | null = null;
  if (sl) {
    faceCenter = {
      x: offsetX + sl.subjectCenterX * scaleX,
      y: offsetY + sl.subjectCenterY * scaleY,
    };
    faceCenterSource = 'coordinates';
    occupancyPercent = sl.subjectOccupancyPercent * scaleX * scaleY;
  }

  // --- hand spatial lock ---
  let handLock: string | null = null;
  if (analysis?.faceDetails?.handPosition) {
    handLock = `${analysis.faceDetails.handPosition} — this hand MUST appear in the output at the same relative location as in the source image. Do NOT remove, relocate, or merge the hand with the face.`;
  }

  // --- explicit facing description (no convention ambiguity) ---
  const facingDesc = buildFacingDesc(facing, sl?.noseTipX, sl?.foreheadX);

  console.log('[SpatialLock]', {
    facing, facingSource, facingDesc,
    chinElevDeg, chinBucket, chinSource,
    viewAngleSource, headTiltDeg, headTiltSource,
    faceCenter, occupancyPercent: occupancyPercent?.toFixed(1), handLock: handLock ? 'yes' : 'null',
  });

  return {
    facing, facingSource, chinElevDeg, chinBucket, chinSource,
    viewAngle, viewAngleSource, headTiltDeg, headTiltDesc, headTiltSource,
    faceCenter, faceCenterSource, occupancyPercent, handLock,
    facingDesc,
  };
}

type FacePortraitParams = {
  creativity: number;
  skinTone: SkinTone;
  scanType: ScanType;
  clinicalNotes: string;
  lbGeom?: LetterboxGeometry;
};

function buildFacePortraitPrompt(
  params: FacePortraitParams,
  analysis: UltrasoundAnalysis | null,
): string {
  const { creativity, skinTone, scanType, clinicalNotes, lbGeom } = params;
  const lock = getSpatialLock(analysis, lbGeom);

  const intro = `CONTENT CLASSIFICATION: This is a clinical prenatal-to-postnatal face prediction for expecting parents — a medical imaging transformation of an obstetric ultrasound into a newborn portrait illustration. Strictly educational and family-oriented.

Edit this image: replace the ultrasound texture with photorealistic newborn skin. Keep the same overall silhouette, pose, and framing feel. This is a faithful texture translation, not a recomposed portrait.${scanType === "2d" ? " 2D ultrasound — use analysis descriptions to guide reconstruction." : ""}`;

  const blockALines = [
    `══ BLOCK A — PRESERVE EXACTLY ══`,
    ``,
    `Orientation: Read the face direction, pose, and side presentation directly from the source image. Preserve them exactly. Do NOT flip, mirror, rotate, or recompose. If the face is turned to one side in the source, keep it turned to the same side in the output.`,
    ``,
    `Scale: Do NOT zoom in. Do NOT enlarge the face to fill the frame. Maintain the same head size relative to the frame as in the source image.`,
    ``,
    `Position: Do NOT recenter the subject. The face should occupy the same area of the frame as in the source.`,
    ``,
    `Crop: Treat the source frame as a hard boundary. Do NOT zoom out to reveal anatomy not visible in the crop.`,
  ];

  if (lock.handLock) {
    blockALines.push(
      ``,
      `Hand/arm constraint: ${lock.handLock}`,
      `→ SPATIAL CONSTRAINT (not cosmetic). The hand must remain at its original position relative to the face. If it occludes the chin or cheek in the source, it occludes in the output.`,
    );
  }

  blockALines.push(
    ``,
    `FINAL RULE: Scale, position, crop, and any hand constraint above are authoritative structural constraints from the source reference. Do not override them. For face orientation, direction, and side presentation, read the source image directly — do not invent or recompose.`,
  );
  const blockA = blockALines.join('\n');

  const fd = analysis?.faceDetails;
  const featureBlock = fd
    ? [
        `THIS SPECIFIC BABY'S FEATURES (reproduce faithfully):`,
        `- Nose: ${fd.noseDescription}`,
        `- Lips: ${fd.lipDescription}`,
        `- Chin: ${fd.chinDescription}`,
        `- Forehead: ${fd.foreheadDescription}`,
        `- Cheeks: ${fd.cheekDescription}`,
        `- Eyes: ${fd.eyeDescription}`,
        `- Expression: ${fd.expression}`,
        `Overall: ${analysis?.overallDescription ?? ''}`,
      ].join('\n')
    : `Improve general realism only. No feature-specific guidance available.`;

  const blockB = [
    `══ BLOCK B — ALLOWED IMPROVEMENTS ══`,
    ``,
    `Improve realism without altering orientation, side presentation, chin angle, crop, or identity-defining facial structure (nose character, chin shape, forehead slope, cheek volume, lip shape).`,
    ``,
    `- Realistic newborn skin: peach fuzz, fine pores, natural tonal variation`,
    `- Soft natural lighting`,
    `- Anatomically plausible soft tissue rendering`,
    ``,
    featureBlock,
  ].join('\n');

  const skinToneModifier =
    skinTone === 'moreno'
      ? 'Skin tone requirement: the newborn has warm brown skin with a naturally dark complexion. Render the skin tone accurately: rich melanin, warm undertones, darker coloring consistent with a moreno infant.'
      : null;

  return joinPromptSections(
    intro,
    blockA,
    blockB,
    buildClinicalNotesBlock(clinicalNotes),
    skinToneModifier,
    creativityModifier(creativity),
  );
}

function buildVisionOrganBlock(analysis: UltrasoundAnalysis): string {
  const od = analysis.organDetails;
  if (!od) return "";

  const lines: string[] = [
    `VISION ANALYSIS — the following describes exactly what is visible in this ultrasound:`,
    `- View plane: ${od.viewPlane}`,
    `- Estimated gestational age: ${analysis.estimatedGestationalWeeks ? `~${analysis.estimatedGestationalWeeks} weeks` : "unknown"}`,
    `- Image quality: ${analysis.imageQuality}`,
    `- Anatomy confidence: ${od.anatomyConfidence}`,
    `- Overlay interference: ${od.overlayInterference}`,
    `- Visible structures: ${analysis.visibleStructures.join(", ")}`,
    "",
    `DETAILED ANATOMY:`,
    od.visibleAnatomyDescription,
  ];

  if (od.sidedness) {
    lines.push(`- Sidedness/layout note: ${od.sidedness}`);
  }

  const cd = od.cardiacDetails;
  if (cd) {
    lines.push("");
    lines.push(`CARDIAC STRUCTURE DETAILS (render these specifically):`);
    if (cd.visibleChambers.length > 0) {
      lines.push(`- Visible chambers: ${cd.visibleChambers.join(", ")}`);
    }
    lines.push(`- Septal integrity: ${cd.septalIntegrity}`);
    if (cd.valvesVisible.length > 0) {
      lines.push(`- Valves visible: ${cd.valvesVisible.join(", ")}`);
    }
    if (cd.greatVessels) {
      lines.push(`- Great vessels: ${cd.greatVessels}`);
    }
    lines.push(
      `- Pericardium visible: ${cd.pericardiumVisible ? "yes" : "no"}`,
    );
    if (cd.structuralAnomalyFlag) {
      lines.push(`- Structural note: ${cd.structuralAnomalyFlag}`);
    }
  }

  // measurements omitted — cardiac overlays are annotation noise, not anatomy
  lines.push(`\nOverall: ${analysis.overallDescription}`);

  lines.push("");
  lines.push(
    `ARTIFACT WARNING: Any solid black horizontal or vertical bands in the input are preprocessing artifacts (masked regions), NOT anatomical boundaries. Do NOT render them as tissue, chamber walls, or structural edges. Treat them as absent background.`,
  );

  return lines.join("\n");
}

function buildGeminiOrganAnchorBlock(
  anatomicalRegion: Exclude<AnatomicalRegion, "face">,
  analysis: UltrasoundAnalysis,
): string {
  const organDetails = analysis.organDetails;
  if (!organDetails) return "";

  const visibleStructures =
    analysis.visibleStructures.length > 0
      ? analysis.visibleStructures.join(", ")
      : "none confidently identified";

  const lines: string[] = [
    `VISION-ANCHORED CONSTRAINTS (highest priority):`,
    `- View plane: ${organDetails.viewPlane}`,
    `- Image quality: ${analysis.imageQuality}`,
    `- Anatomy confidence: ${organDetails.anatomyConfidence}`,
    `- Overlay interference: ${organDetails.overlayInterference}`,
    `- Visible structures only: ${visibleStructures}`,
  ];

  if (organDetails.sidedness) {
    lines.push(`- Sidedness/layout: ${organDetails.sidedness}`);
  }

  lines.push(
    `- Anatomy note: ${organDetails.visibleAnatomyDescription}`,
    `- Hard rule: render ONLY the structures explicitly supported above. If something is not listed, omit it.`,
    `- Hard rule: preserve the same asymmetry, incompleteness, and crop boundaries as the ultrasound.`,
  );

  if (anatomicalRegion === "heart" && organDetails.cardiacDetails) {
    const cardiac = organDetails.cardiacDetails;
    const visibleChambers =
      cardiac.visibleChambers.length > 0
        ? cardiac.visibleChambers.join(", ")
        : "no chambers confidently isolated";
    const visibleValves =
      cardiac.valvesVisible.length > 0
        ? cardiac.valvesVisible.join(", ")
        : "no valves confidently isolated";

    lines.push(
      `- Cardiac chambers confirmed: ${visibleChambers}`,
      `- Septal appearance: ${cardiac.septalIntegrity}`,
      `- Valves confirmed: ${visibleValves}`,
      `- Great vessels: ${cardiac.greatVessels}`,
      `- Pericardium visible: ${cardiac.pericardiumVisible ? "yes" : "no"}`,
    );

    if (cardiac.structuralAnomalyFlag) {
      lines.push(`- Structural note: ${cardiac.structuralAnomalyFlag}`);
    }

    if (
      organDetails.anatomyConfidence !== "high" ||
      organDetails.overlayInterference === "moderate" ||
      organDetails.overlayInterference === "heavy"
    ) {
      lines.push(
        `- Conservative mode: because confidence is ${organDetails.anatomyConfidence} and overlay interference is ${organDetails.overlayInterference}, do NOT complete a full thoracic ring or textbook four-chamber diagram. Stay close to the visible grayscale geometry and keep uncertain tissue soft and unresolved.`,
        `- Conservative mode: do NOT render a clean dissected-heart appearance. Keep the output as a restrained translation of the exact ultrasound silhouette, preserving partial walls, broken contours, and ambiguous cavities.`,
        `- Conservative mode: where the scan shows unresolved dark/bright blobs rather than crisp anatomy, preserve that ambiguity locally instead of forcing a repaired chamber, vessel, or wall.`,
        `- Conservative mode: if a dotted or faint circular measurement guide is present, ignore it completely. Never turn that guide into a circular myocardial wall, enclosing ring, or donut-shaped chamber.`,
        `- Conservative mode: if a black horizontal band or masked gap is present, treat it as removed overlay/background only. Never interpret it as septum, vessel wall, or tissue plane.`,
      );
    }
  }

  return lines.join("\n");
}


function buildEnhancedRealisticPrompt(
  creativity: number,
  skinTone: SkinTone,
  scanType: ScanType,
  anatomicalRegion: AnatomicalRegion,
  clinicalNotes: string,
  analysis: UltrasoundAnalysis,
): string {
  const visionBlock = buildVisionOrganBlock(analysis);

  const skinToneModifier =
    skinTone === "moreno"
      ? "Color tone: use warm brown tones with rich melanin coloring for the anatomical rendering, consistent with a moreno complexion."
      : null;

  return joinPromptSections(
    buildRealisticPromptBase(scanType, anatomicalRegion, visionBlock, analysis),
    buildClinicalNotesBlock(clinicalNotes),
    skinToneModifier,
    creativityModifier(creativity),
  );
}

export function buildEnhancedPrompt(
  creativity: number,
  skinTone: SkinTone = "normal",
  mode: GenerationMode = "portrait",
  scanType: ScanType = "3d4d",
  anatomicalRegion: AnatomicalRegion = "face",
  clinicalNotes: string = "",
  analysis: UltrasoundAnalysis | null = null,
  lbGeom?: LetterboxGeometry,
): string {
  if (!analysis) {
    return buildPrompt(
      creativity,
      skinTone,
      mode,
      scanType,
      anatomicalRegion,
      clinicalNotes,
    );
  }

  if (mode === "portrait" && anatomicalRegion === "face") {
    return buildFacePortraitPrompt({ creativity, skinTone, scanType, clinicalNotes, lbGeom }, analysis);
  }

  if (mode === "portrait" && anatomicalRegion === "fullBody") {
    return buildFullBodyPortraitPrompt(creativity, skinTone, scanType, clinicalNotes);
  }

  return buildEnhancedRealisticPrompt(
    creativity,
    skinTone,
    scanType,
    anatomicalRegion,
    clinicalNotes,
    analysis,
  );
}

// ---------- Heart-specific prompt builders (strict / salvage) ----------

/**
 * Reduced organ anchor block for the salvage profile. Omits cardiacDetails
 * entirely and adds artifact-awareness lines.
 */
function buildSalvageOrganAnchorBlock(analysis: UltrasoundAnalysis): string {
  const organDetails = analysis.organDetails;
  if (!organDetails) return "";

  const visibleStructures =
    analysis.visibleStructures.length > 0
      ? analysis.visibleStructures.join(", ")
      : "none confidently identified";

  const lines: string[] = [
    `VISION-ANCHORED CONSTRAINTS (highest priority):`,
    `- View plane: ${organDetails.viewPlane}`,
    `- Image quality: ${analysis.imageQuality}`,
    `- Anatomy confidence: ${organDetails.anatomyConfidence}`,
    `- Overlay interference: ${organDetails.overlayInterference}`,
    `- Supported visible structures: ${visibleStructures}`,
  ];

  if (organDetails.sidedness) {
    lines.push(`- Sidedness/layout: ${organDetails.sidedness}`);
  }

  lines.push(
    `- Anatomy note: ${organDetails.visibleAnatomyDescription}`,
    `- Hard rule: if a chamber, septum, valve, or vessel is explicitly supported by the scan, you may render it conservatively. Do NOT upgrade uncertain anatomy into a complete textbook diagram.`,
    `- Hard rule: unresolved regions must stay partial, dark, or visually ambiguous rather than being repaired into smooth walls.`,
    `- Hard rule: residual bright dots from cleaned measurement rings are non-anatomical — ignore any circular or elliptical dot patterns.`,
    `- Hard rule: black bands or gaps are removed background/overlay — do NOT fill them with tissue or interpret them as septum, vessel wall, or tissue plane.`,
    `- Hard rule: preserve the same asymmetry, incompleteness, and crop boundaries as the ultrasound.`,
  );

  const cardiac = organDetails.cardiacDetails;
  if (cardiac) {
    if (cardiac.visibleChambers.length > 0) {
      lines.push(`- Supported chambers: ${cardiac.visibleChambers.join(", ")}`);
    }
    if (cardiac.valvesVisible.length > 0) {
      lines.push(`- Supported valves: ${cardiac.valvesVisible.join(", ")}`);
    }
    lines.push(`- Septal appearance: ${cardiac.septalIntegrity}`);
  }

  return lines.join("\n");
}

const heartSalvageBase = `Edit this image: replace the ultrasound texture with a restrained photorealistic translation of a partial fetal cardiac ultrasound slice in GE Voluson HDlive style. Keep the EXACT same cross-sectional shape, composition, and spatial layout as the input. This is a local texture translation, not a new illustration or anatomical reconstruction.

CRITICAL RESTRICTIONS:
- Do NOT complete anatomy — preserve ambiguity and partial structures exactly as they appear.
- Do NOT create concentric rings, donut-like chambers, smooth circular walls, or a large enclosing oval. These are hallucination patterns.
- Do NOT turn black gaps, black bands, or masked regions into tissue boundaries. Areas from removed overlays remain absent/background.
- Do NOT present this as a dissected specimen, pathology sample, or polished anatomical cutaway.
- Do NOT generate a uniform meat-like slab filling the entire frame.
- If residual bright dots from cleaned measurement rings remain, ignore them — they are non-anatomical.
- If the scan supports only part of a chamber, septum, or valve, keep it partial. Unresolved areas should remain dark or soft-edged rather than repaired.
- If partial structures remain unidentified, render them as anonymous tissue masses without assigning chamber or vessel identity.

Preserve the exact asymmetry and partial geometry of the slice. Where the scan is noisy or incomplete, keep uncertain tissue soft and unresolved instead of inventing a clean thoracic diagram.

All tissue must be SOLID and OPAQUE, not translucent or gelatinous. Dark open spaces remain as cavities. Rose-pink myocardial tissue may have subtle texture, but the frame must not read as a specimen slab. Warm HDlive 3D directional lighting with controlled depth and very restrained specular highlights. NO TEXT, no labels, no annotations.`;

type HeartProfile = "strict" | "salvage";

function buildHeartGeminiPrompt(
  profile: HeartProfile,
  scanType: ScanType,
  creativity: number,
  clinicalNotes: string,
  anchorBlock: string | null,
  promptBody: string,
): string {
  const profileHeader =
    profile === "strict"
      ? "PROFILE: STRICT — clean scan, high anatomical confidence."
      : "PROFILE: SALVAGE — artifacts or ambiguous anatomy detected. Apply very restrained HDlive translation.";
  const creativityInstruction =
    creativity <= 30
      ? "HEART FIDELITY MODE: strict local translation only. Preserve exact partial geometry and unresolved anatomy."
      : creativity <= 70
        ? "HEART FIDELITY MODE: balanced realism only. Improve tissue appearance without changing the cardiac slice layout."
        : "HEART FIDELITY MODE: higher realism in lighting and texture only. Never invent missing anatomy.";
  const scanNote =
    scanType === "2d"
      ? profile === "strict"
        ? " This is a 2D ultrasound — reconstruct 3D depth from the visible cross-section."
        : " This is a 2D ultrasound — preserve the cross-sectional geometry exactly."
      : "";

  return joinPromptSections(
    `${profileHeader}\n\n${creativityInstruction}\n\n${promptBody}${scanNote}`,
    anchorBlock,
    buildClinicalNotesBlock(clinicalNotes),
  );
}

/**
 * Heart strict prompt for Gemini path.
 */
export function buildGeminiHeartStrictPrompt(
  scanType: ScanType,
  clinicalNotes: string,
  analysis: UltrasoundAnalysis | null,
  creativity: number,
): string {
  const anchorBlock = analysis
    ? buildGeminiOrganAnchorBlock("heart", analysis)
    : null;

  return buildHeartGeminiPrompt(
    "strict",
    scanType,
    creativity,
    clinicalNotes,
    anchorBlock,
    geminiRegionPrompts.heart,
  );
}

/**
 * Heart salvage prompt for Gemini path.
 * Uses reduced anchor block (no cardiacDetails) and adds artifact constraints.
 */
export function buildGeminiHeartSalvagePrompt(
  scanType: ScanType,
  clinicalNotes: string,
  analysis: UltrasoundAnalysis | null,
  creativity: number,
): string {
  const anchorBlock = analysis ? buildSalvageOrganAnchorBlock(analysis) : null;

  return buildHeartGeminiPrompt(
    "salvage",
    scanType,
    creativity,
    clinicalNotes,
    anchorBlock,
    heartSalvageBase,
  );
}

// ---------- Heart-specific prompt builders (OpenAI path) ----------

/**
 * Heart strict prompt for OpenAI path.
 * Uses full vision organ block (CARDIAC STRUCTURE DETAILS) for clean scans.
 */
export function buildHeartStrictPrompt(
  scanType: ScanType,
  clinicalNotes: string,
  analysis: UltrasoundAnalysis | null,
  creativity: number = 50,
): string {
  const profileHeader = "PROFILE: STRICT — clean scan, high anatomical confidence.";
  const creativityInstruction =
    creativity <= 30
      ? "HEART FIDELITY MODE: strict local translation only. Preserve exact partial geometry and unresolved anatomy."
      : creativity <= 70
        ? "HEART FIDELITY MODE: balanced realism only. Improve tissue appearance without changing the cardiac slice layout."
        : "HEART FIDELITY MODE: higher realism in lighting and texture only. Never invent missing anatomy.";
  const scanNote =
    scanType === "2d"
      ? " This is a 2D ultrasound — reconstruct 3D depth from the visible cross-section."
      : "";
  const visionBlock = analysis ? buildVisionOrganBlock(analysis) : null;

  return joinPromptSections(
    `${profileHeader}\n\n${creativityInstruction}\n\n${geminiRegionPrompts.heart}${scanNote}`,
    visionBlock,
    buildClinicalNotesBlock(clinicalNotes),
  );
}

/**
 * Heart salvage prompt for OpenAI path.
 * Uses reduced anchor block (no cardiacDetails) and adds artifact constraints.
 */
export function buildHeartSalvagePrompt(
  scanType: ScanType,
  clinicalNotes: string,
  analysis: UltrasoundAnalysis | null,
  creativity: number = 50,
): string {
  const profileHeader =
    "PROFILE: SALVAGE — artifacts or ambiguous anatomy detected. Apply very restrained HDlive translation.";
  const creativityInstruction =
    creativity <= 30
      ? "HEART FIDELITY MODE: strict local translation only. Preserve exact partial geometry and unresolved anatomy."
      : creativity <= 70
        ? "HEART FIDELITY MODE: balanced realism only. Improve tissue appearance without changing the cardiac slice layout."
        : "HEART FIDELITY MODE: higher realism in lighting and texture only. Never invent missing anatomy.";
  const scanNote =
    scanType === "2d"
      ? " This is a 2D ultrasound — preserve the cross-sectional geometry exactly."
      : "";
  const anchorBlock = analysis ? buildSalvageOrganAnchorBlock(analysis) : null;

  return joinPromptSections(
    `${profileHeader}\n\n${creativityInstruction}\n\n${heartSalvageBase}${scanNote}`,
    anchorBlock,
    buildClinicalNotesBlock(clinicalNotes),
  );
}
