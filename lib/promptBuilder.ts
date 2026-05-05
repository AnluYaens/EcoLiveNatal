import type {
  AnatomicalRegion,
  GenerationMode,
  ScanType,
  SkinTone,
} from "./validation";
import type { UltrasoundAnalysis } from "./visionAnalysis";

export type { AnatomicalRegion, GenerationMode, ScanType, SkinTone };

export type CanonicalPromptType =
  | "portraitPrompt"
  | "heartPrompt"
  | "anatomicalPrompt";

export type CanonicalPromptInput = {
  creativity: number;
  skinTone: SkinTone;
  mode: GenerationMode;
  scanType: ScanType;
  anatomicalRegion: AnatomicalRegion;
  clinicalNotes: string;
};

export type BuiltCanonicalPrompt = {
  prompt: string;
  promptType: CanonicalPromptType;
};

function scanTypeDescription(scanType: ScanType): string {
  return scanType === "2d"
    ? "a 2D obstetric ultrasound (grayscale cross-sectional imaging)"
    : "a 3D/4D obstetric ultrasound (volumetric surface rendering)";
}

function buildClinicalNotesBlock(clinicalNotes: string): string | null {
  const trimmed = clinicalNotes.trim();
  if (!trimmed) return null;
  return `[CLINICAL CONTEXT provided by the operator: ${trimmed}]

Clinical context is supportive only. It must NEVER override the visible geometry, sidedness, view plane, pose, crop, or spatial layout in the image. If the operator notes conflict with the scan, follow the scan. Do not add standard anatomy that is not visibly supported by the input.`;
}

function joinPromptSections(
  ...sections: Array<string | null | undefined>
): string {
  return sections
    .filter((section): section is string => Boolean(section))
    .join("\n\n");
}

function buildFidelityLockBlock(): string {
  return `FIDELITY LOCK (first priority): preserve the source crop, orientation, pose, scale, major contours, and visible structural relationships. Do NOT rotate, mirror, reframe, zoom out, or invent missing anatomy. Material realism is allowed only inside this source lock.`;
}

const babyMaterialTranslationBlock = `MATERIAL REALISM: translate only visible source-supported baby face/body surfaces into realistic newborn-style skin and soft newborn facial features, not a fetal ultrasound render. Only the baby face/body surfaces receive newborn skin material. Do not apply newborn skin texture to unresolved surrounding ultrasound tissue. Use natural skin texture, fine pores, subtle skin mottling, peach fuzz, realistic lips/nose/cheeks, and closed/resting eyes when appropriate on those baby surfaces only. Surrounding non-baby tissue must not have pores, skin mottling, skin shine, body-wall texture, or anatomical tissue texture. Preserve the specific source proportions so the baby does not become generic.`;

const surroundingTissueNeutralizationBlock = `SURROUNDING AREA: unresolved surrounding ultrasound tissue becomes flat dark background, soft shadow, blurred neutral cloth-like negative space, or low-detail non-anatomical matte background while preserving the crop, scale, and dark frame. It must NOT become a skin wall, body wall, torso, placenta-like body tissue, peach body surface, anatomical wall, anatomical tissue, or extra baby body parts.`;

const heartMaterialTranslationBlock = `MATERIAL REALISM: remove ultrasound speckle/scan texture and translate only the visible cardiac contours into realistic anatomical heart tissue. Use deep rose-red myocardium, burgundy/dark red soft tissue, darker blood-filled cavities, subtle wet highlights, controlled clinical lighting, and natural tissue variation. Target appearance is not peach skin, not baby skin, not amber HDlive, not ultrasound colorization, not a scan-like render. Keep exact source contours, cavities, crop, orientation, and spatial layout. Do not add labels, findings, disease markers, measurements, or unsupported anatomy.`;

// ---------- Gemini-optimized prompts (concise, DeeVid-style) ----------

const geminiRegionPrompts: Record<AnatomicalRegion, string> = {
  face: `A high-resolution, ultra-realistic medical visualization macro photograph of a fetal face, derived from the input image. The output image must have the EXACT same dimensions, framing, composition, and aspect ratio as the input — do not crop, zoom, pad, or reframe. The granular ultrasound texture is entirely replaced with detailed, lifelike skin and tissue textures. The facial features (nose, lips, chin, cheeks, forehead, eyes) are rendered with warm peach/skin tones, realistic newborn skin texture with fine detail. All features are in the identical position and orientation as in the input image. CRITICAL: preserve the EXACT head tilt angle, profile direction, and spatial position of the face within the frame. If the face is off-center, keep it off-center. If the head is tilted, keep the same tilt. The overall scene is clean, detailed, and photorealistic.`,

  heart: `Edit this image: replace the ultrasound grayscale texture with photorealistic OPAQUE fetal tissue in GE Voluson HDlive Silhouette style. Remove ultrasound speckle/scan texture while keeping the EXACT same shape, composition, and spatial layout as the input — same oval/circular cross-section, same positions for all structures. This is a texture swap, not a new illustration.

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
  if (lock.chinSource !== "generic" && lock.chinElevDeg !== null) {
    lines.splice(
      2,
      0,
      `- Chin elevation: ${lock.chinElevDeg}° → chin ${lock.chinBucket}  [source: ${lock.chinSource}]`,
    );
  }
  if (
    lock.facingSource === "coordinates" ||
    lock.chinSource === "coordinates"
  ) {
    lines.push(
      `- Landmark geometry is derived from spatial analysis — use as structural guidance, not a pixel-accurate target.`,
    );
  }
  return lines.join("\n");
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
      ? " This is a 2D ultrasound — add restrained depth and texture only where the visible cross-section supports it."
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

function canonicalSkinTone(skinTone: SkinTone): string {
  return skinTone === "moreno"
    ? "Skin tone: warm brown newborn skin with rich melanin and warm undertones."
    : "Skin tone: natural newborn skin with warm peach-pink undertones.";
}

function portraitSubject(anatomicalRegion: AnatomicalRegion): string {
  return anatomicalRegion === "fullBody"
    ? "the complete visible baby pose"
    : "the fetal face";
}

function portraitCoverageRule(anatomicalRegion: AnatomicalRegion): string | null {
  if (anatomicalRegion !== "fullBody") return null;

  return "Coverage: if the visible source includes the body, render the baby gently swaddled or dressed in a simple soft newborn outfit. Do not add missing limbs, hands, feet, shoulders, torso, or scene details that are not supported by the source crop.";
}

export function buildPortraitPrompt(input: CanonicalPromptInput): string {
  const scanDesc = scanTypeDescription(input.scanType);

  return joinPromptSections(
    "CONTENT CLASSIFICATION: family-safe illustrative prenatal-to-newborn visualization for expecting parents. This is an artistic image transformation, not a real prediction, identity claim, or clinical forecast.",
    `The input is ${scanDesc} showing ${portraitSubject(input.anatomicalRegion)}. Transform the visible source-supported baby face/body surfaces into a realistic newborn-style photographic illustration of this same visible subject.`,
    `SOURCE FIDELITY FIRST:
- ${buildFidelityLockBlock()}
- Preserve the exact source pose, rotation, tilt, direction, crop, scale, and framing.
- Do not straighten, rotate, mirror, recenter, zoom out, beautify the pose, or complete hidden areas.
- Preserve visible hands, fingers, limbs, occlusions, and crop cutoffs exactly where they appear. Do not remove them or complete anatomy behind them.
- Do not invent a room, studio scene, extra body parts, or unsupported background elements.`,
    "IDENTITY AND LIKENESS: reproduce the specific visible nose shape, chin shape, forehead slope, cheek volume, lip shape, body proportions, and limb positions from the scan. Keep distinctive source cues instead of normalizing toward a generic newborn.",
    `${babyMaterialTranslationBlock} Use realistic soft natural light and a photographic newborn illustration finish.`,
    surroundingTissueNeutralizationBlock,
    portraitCoverageRule(input.anatomicalRegion),
    canonicalSkinTone(input.skinTone),
    input.scanType === "2d"
      ? "2D note: add restrained surface depth only where the visible slice supports it. Do not invent features that are not visible."
      : null,
    buildClinicalNotesBlock(input.clinicalNotes),
  );
}

export function buildHeartPrompt(input: CanonicalPromptInput): string {
  return joinPromptSections(
    "CONTENT CLASSIFICATION: controlled educational fetal cardiac visualization derived from an obstetric ultrasound. It is illustrative only and must not imply diagnosis, clinical interpretation, or measurement.",
    `The input is ${scanTypeDescription(input.scanType)} showing a partial fetal cardiac ultrasound slice. Create a restrained realistic anatomical visualization of only the visible cardiac contours.`,
    `SOURCE FIDELITY FIRST:
- ${buildFidelityLockBlock()}
- Preserve the exact contours, cavities, crop, orientation, scale, asymmetry, and spatial layout.
- Keep dark/open cavities dark and keep uncertain boundaries partial or ambiguous.
- Do not rotate, mirror, recenter, reframe, zoom out, repair, or complete missing cardiac anatomy.`,
    "MATERIAL STYLE: use controlled clinical lighting, deep red-burgundy myocardium, darker blood-filled cavities, subtle natural surface variation, and restrained highlights. The result should read as a clean anatomical visualization, not a scan colorization or a generic textbook diagram.",
    "CARDIAC CONSTRAINTS: render only source-supported cardiac structures. Do not add lungs, ribs, chest wall, spine, pericardium, surrounding anatomy, labels, abbreviations, markers, measurements, disease indicators, interpretive statements, or unsupported anatomy.",
    "ARTIFACT RULE: ignore text, crosshairs, dotted measurement rings, device UI, yellow overlays, black bands, masked gaps, and annotation cutouts. These areas remain background/absent space and must not become cardiac walls, vessels, septum, or tissue planes.",
    input.scanType === "2d"
      ? "2D note: preserve the cross-sectional geometry exactly. Add depth only inside visible source-supported contours."
      : null,
    buildClinicalNotesBlock(input.clinicalNotes),
  );
}

function anatomicalRegionSubject(anatomicalRegion: AnatomicalRegion): string {
  const subjects: Record<AnatomicalRegion, string> = {
    face: "fetal facial anatomy",
    heart: "fetal cardiac anatomy",
    brain: "fetal intracranial anatomy",
    spine: "fetal spinal anatomy",
    abdomen: "fetal abdominal anatomy",
    fullBody: "the visible fetal body",
  };

  return subjects[anatomicalRegion];
}

export function buildAnatomicalPrompt(input: CanonicalPromptInput): string {
  return joinPromptSections(
    "CONTENT CLASSIFICATION: educational fetal anatomical visualization derived from an obstetric ultrasound. It is illustrative only, with no diagnosis, clinical claims, labels, or measurements.",
    `The input is ${scanTypeDescription(input.scanType)} showing ${anatomicalRegionSubject(input.anatomicalRegion)}. Create a source-first anatomical visualization that translates only visible source-supported contours and structures.`,
    `SOURCE FIDELITY FIRST:
- ${buildFidelityLockBlock()}
- Preserve the exact crop, view plane, orientation, scale, contours, cavities, spatial relationships, and dark background.
- Render only what is visible in the scan, in the same position, proportion, and orientation.
- Do not rotate, mirror, recenter, recompose, zoom out, complete missing anatomy, or turn the image into a standard reference diagram.`,
    "ANATOMICAL CONSTRAINTS: keep incomplete, noisy, or obscured regions incomplete or ambiguous. Do not invent organs, bones, vessels, ribs, spine segments, brain structures, limbs, symmetric shapes, or surrounding body context unless the source crop clearly supports them.",
    "STYLE: restrained realistic anatomical visualization with controlled depth and clean lighting. Remove ultrasound speckle as a target texture while preserving the source geometry and layout.",
    "OUTPUT RESTRICTIONS: zero text, labels, abbreviations, arrows, measurement markers, watermarks, device UI, diagnosis, clinical interpretation, disease indicators, or unsupported anatomy.",
    input.scanType === "2d"
      ? "2D note: add restrained depth and texture only where the visible slice supports it."
      : null,
    buildClinicalNotesBlock(input.clinicalNotes),
  );
}

export function buildCanonicalPrompt(
  input: CanonicalPromptInput,
): BuiltCanonicalPrompt {
  if (
    input.mode === "portrait" &&
    (input.anatomicalRegion === "face" ||
      input.anatomicalRegion === "fullBody")
  ) {
    return {
      prompt: buildPortraitPrompt(input),
      promptType: "portraitPrompt",
    };
  }

  if (input.anatomicalRegion === "heart") {
    return {
      prompt: buildHeartPrompt(input),
      promptType: "heartPrompt",
    };
  }

  return {
    prompt: buildAnatomicalPrompt(input),
    promptType: "anatomicalPrompt",
  };
}

export function buildPrompt(
  creativity: number,
  skinTone: SkinTone = "normal",
  mode: GenerationMode = "portrait",
  scanType: ScanType = "3d4d",
  anatomicalRegion: AnatomicalRegion = "face",
  clinicalNotes: string = "",
): string {
  return buildCanonicalPrompt({
    creativity,
    skinTone,
    mode,
    scanType,
    anatomicalRegion,
    clinicalNotes,
  }).prompt;
}

// ---------- Legacy helper text (not used by the canonical OpenAI path) ----------

// Kept for Gemini rollback helpers and historical context. GPT Image 2 prompt
// assembly must go through buildCanonicalPrompt above.

type FacingValue =
  | "facing-left"
  | "facing-right"
  | "facing-camera"
  | "preserve-as-is";
type ChinBucket = "raised" | "level" | "tucked";
type DataSource = "coordinates" | "label" | "generic";
type LabelSource = "label" | "generic";

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
  faceCenter: { x: number; y: number } | null; // letterbox-corrected 0–1
  faceCenterSource: "coordinates" | "generic";
  occupancyPercent: number | null; // letterbox-corrected %, null when no coords
  handLock: string | null; // spatial hand constraint or null
  facingDesc: string; // explicit geometric description, no convention ambiguity
};

type SpatialLayoutShape = NonNullable<UltrasoundAnalysis["spatialLayout"]>;

const FACING_THRESHOLD = 0.07;

function deriveFacingFromCoords(
  sl: SpatialLayoutShape,
): "facing-left" | "facing-right" | null {
  if (sl.noseTipX === undefined || sl.foreheadX === undefined) return null;
  const diff = sl.foreheadX - sl.noseTipX;
  if (Math.abs(diff) < FACING_THRESHOLD) return null;
  return diff > 0 ? "facing-left" : "facing-right";
}

function deriveChinElevFromCoords(sl: SpatialLayoutShape): number | null {
  if (
    sl.noseTipY === undefined ||
    sl.chinY === undefined ||
    sl.foreheadY === undefined
  )
    return null;
  const faceHeight = Math.abs(sl.chinY - sl.foreheadY);
  if (faceHeight <= 0.05) return null;
  const midFaceY = (sl.foreheadY + sl.chinY) / 2;
  const raw = (-(sl.noseTipY - midFaceY) / (faceHeight / 2)) * 45;
  return Math.round(Math.max(-45, Math.min(45, raw)));
}

function toChinBucket(deg: number): ChinBucket {
  if (deg >= 12) return "raised";
  if (deg <= -12) return "tucked";
  return "level";
}

function viewAngleToHuman(viewAngle: UltrasoundAnalysis["viewAngle"]): string {
  switch (viewAngle) {
    case "frontal":
      return "frontal (face-on)";
    case "profile-left":
      return "left profile";
    case "profile-right":
      return "right profile";
    case "three-quarter-left":
      return "three-quarter view from the left";
    case "three-quarter-right":
      return "three-quarter view from the right";
    default:
      return viewAngle;
  }
}

function headTiltToDesc(deg: number): string {
  if (deg > 5) return `${deg}° tilted clockwise (right ear down)`;
  if (deg < -5)
    return `${Math.abs(deg)}° tilted counter-clockwise (left ear down)`;
  return "approximately upright (no significant tilt)";
}

function buildFacingDesc(
  facing: FacingValue,
  noseTipX?: number,
  foreheadX?: number,
): string {
  const coordHint =
    noseTipX !== undefined && foreheadX !== undefined
      ? ` (Spatial evidence: nose tip at ~${Math.round(noseTipX * 100)}% from left, forehead at ~${Math.round(foreheadX * 100)}% from left in the source frame.)`
      : "";
  switch (facing) {
    case "facing-left":
      return `Facing orientation: The face is turned LEFT from the viewer's perspective — the baby's nose points toward the LEFT edge of the frame, the baby's RIGHT cheek faces the camera, the LEFT ear and temple are turned away.${coordHint}`;
    case "facing-right":
      return `Facing orientation: The face is turned RIGHT from the viewer's perspective — the baby's nose points toward the RIGHT edge of the frame, the baby's LEFT cheek faces the camera, the RIGHT ear and temple are turned away.${coordHint}`;
    case "facing-camera":
      return `Facing orientation: The face is looking directly at the camera (frontal view) — both cheeks are approximately equally visible, nose pointing toward the lens.${coordHint}`;
    default:
      return `Facing orientation: Preserve the exact face orientation and side presentation shown in the source image — do not flip or mirror any side.`;
  }
}

function getSpatialLock(analysis: UltrasoundAnalysis | null): SpatialLock {
  const sl = analysis?.spatialLayout ?? null;

  // --- facing ---
  let facing: FacingValue = "preserve-as-is";
  let facingSource: DataSource = "generic";
  if (sl) {
    const fromCoords = deriveFacingFromCoords(sl);
    if (fromCoords !== null) {
      facing = fromCoords;
      facingSource = "coordinates";
    } else {
      facing = sl.facingDirection;
      facingSource = "label";
    }
  }

  // --- chin ---
  let chinElevDeg: number | null = null;
  let chinSource: DataSource = "generic";
  let chinBucket: ChinBucket = "level";
  if (sl) {
    const fromCoords = deriveChinElevFromCoords(sl);
    if (fromCoords !== null) {
      chinElevDeg = fromCoords;
      chinSource = "coordinates";
      chinBucket = toChinBucket(fromCoords);
    } else {
      chinElevDeg = sl.chinElevationDegrees;
      chinSource = "label";
      chinBucket = toChinBucket(sl.chinElevationDegrees);
    }
  }

  // --- view angle ---
  let viewAngle: string;
  let viewAngleSource: LabelSource;
  if (analysis) {
    viewAngle = viewAngleToHuman(analysis.viewAngle);
    viewAngleSource = "label";
  } else {
    viewAngle = "preserve the existing viewing class as shown in the source";
    viewAngleSource = "generic";
  }

  // --- head tilt ---
  let headTiltDeg: number | null = null;
  let headTiltDesc: string;
  let headTiltSource: LabelSource;
  if (sl) {
    headTiltDeg = sl.headTiltDegrees;
    headTiltDesc = headTiltToDesc(sl.headTiltDegrees);
    headTiltSource = "label";
  } else {
    headTiltDesc = "preserve the head tilt as shown";
    headTiltSource = "generic";
  }

  // --- letterbox-corrected face center and occupancy ---
  let faceCenter: { x: number; y: number } | null = null;
  let faceCenterSource: "coordinates" | "generic" = "generic";
  let occupancyPercent: number | null = null;
  if (sl) {
    faceCenter = {
      x: sl.subjectCenterX,
      y: sl.subjectCenterY,
    };
    faceCenterSource = "coordinates";
    occupancyPercent = sl.subjectOccupancyPercent;
  }

  // --- hand spatial lock ---
  let handLock: string | null = null;
  if (analysis?.faceDetails?.handPosition) {
    const coordSuffix =
      sl?.handTipX !== undefined && sl?.handTipY !== undefined
        ? ` The hand tip is at approximately (${Math.round(sl.handTipX * 100)}%, ${Math.round(sl.handTipY * 100)}%) of the frame.`
        : '';
    handLock = `${analysis.faceDetails.handPosition}${coordSuffix} — this hand MUST appear in the output at the same relative location as in the source image. Do NOT remove, relocate, or merge the hand with the face.`;
  }

  // --- explicit facing description (no convention ambiguity) ---
  const facingDesc = buildFacingDesc(facing, sl?.noseTipX, sl?.foreheadX);

  console.log("[SpatialLock]", {
    facing,
    facingSource,
    facingDesc,
    chinElevDeg,
    chinBucket,
    chinSource,
    viewAngleSource,
    headTiltDeg,
    headTiltSource,
    faceCenter,
    occupancyPercent: occupancyPercent?.toFixed(1),
    handLock: handLock ? "yes" : "null",
  });

  return {
    facing,
    facingSource,
    chinElevDeg,
    chinBucket,
    chinSource,
    viewAngle,
    viewAngleSource,
    headTiltDeg,
    headTiltDesc,
    headTiltSource,
    faceCenter,
    faceCenterSource,
    occupancyPercent,
    handLock,
    facingDesc,
  };
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

export function buildEnhancedPrompt(
  creativity: number,
  skinTone: SkinTone = "normal",
  mode: GenerationMode = "portrait",
  scanType: ScanType = "3d4d",
  anatomicalRegion: AnatomicalRegion = "face",
  clinicalNotes: string = "",
): string {
  return buildCanonicalPrompt({
    creativity,
    skinTone,
    mode,
    scanType,
    anatomicalRegion,
    clinicalNotes,
  }).prompt;
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
    `- Hard rule: if a chamber, septum, valve, or vessel is explicitly supported by the scan, you may render it conservatively. Do NOT upgrade uncertain anatomy into a complete idealized diagram.`,
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

const heartSalvageBase = `Edit this image: replace the ultrasound texture with a restrained photorealistic anatomical tissue translation of a partial fetal cardiac ultrasound slice. Keep the EXACT same cross-sectional shape, composition, and spatial layout as the input. This is a local texture translation, not a new illustration or anatomical reconstruction.

${buildFidelityLockBlock()}

${heartMaterialTranslationBlock}

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

All tissue must be SOLID and OPAQUE, not translucent or gelatinous. Dark open spaces remain as cavities. Deep rose-red myocardial tissue and burgundy/dark red soft tissue may have subtle natural variation, but the frame must not read as a specimen slab. Use controlled clinical lighting with very restrained wet highlights. NO TEXT, no labels, no annotations.`;

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
        ? " This is a 2D ultrasound — add restrained depth and texture only where the visible cross-section supports it."
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
  creativity: number = 50,
): string {
  return buildHeartPrompt({
    creativity,
    skinTone: "normal",
    mode: "realistic",
    scanType,
    anatomicalRegion: "heart",
    clinicalNotes,
  });
}

/**
 * Heart salvage prompt for OpenAI path.
 * Uses reduced anchor block (no cardiacDetails) and adds artifact constraints.
 */
export function buildHeartSalvagePrompt(
  scanType: ScanType,
  clinicalNotes: string,
  creativity: number = 50,
): string {
  return buildHeartPrompt({
    creativity,
    skinTone: "normal",
    mode: "realistic",
    scanType,
    anatomicalRegion: "heart",
    clinicalNotes,
  });
}

// ---------- Deprecated OpenAI prompt wrapper ----------

// Kept only for older imports. It no longer creates a separate short prompt
// variant or reads USE_SHORT_PROMPTS.

export function buildShortPrompt(
  skinTone: SkinTone,
  mode: GenerationMode,
  scanType: ScanType,
  anatomicalRegion: AnatomicalRegion,
  clinicalNotes: string,
): string {
  return buildCanonicalPrompt({
    creativity: 50,
    skinTone,
    mode,
    scanType,
    anatomicalRegion,
    clinicalNotes,
  }).prompt;
}
