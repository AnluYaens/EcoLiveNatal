export type Style = "soft" | "ultra" | "cinematic";
export type SkinTone = "normal" | "moreno";
export type GenerationMode = "portrait" | "realistic";
export type ScanType = "3d4d" | "2d";
export type AnatomicalRegion =
  | "face"
  | "heart"
  | "brain"
  | "spine"
  | "abdomen"
  | "fullBody";

const styleModifiers: Record<Style, string> = {
  soft: "Style preference: soft natural lighting and gentle tones, while preserving the exact original geometry.",
  ultra:
    "Style preference: ultra-realistic details and natural skin texture, while preserving the exact original geometry.",
  cinematic:
    "Style preference: cinematic lighting kept subtle, while preserving the exact original geometry.",
};

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
  heart: "showing an amorphous biological tissue cross-section",
  brain: "showing an amorphous biological tissue cross-section",
  spine: "showing an amorphous biological tissue cross-section",
  abdomen: "showing an amorphous biological tissue cross-section",
  fullBody: "showing the full fetal body",
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
  anatomicalRegion: AnatomicalRegion = "face",
): string {
  const scanDesc = scanTypeDescription(scanType);

  const base =
    anatomicalRegion === "fullBody"
      ? `The input image is ${scanDesc} showing the full fetal body. Transform this medical scan into an ultra-realistic newborn portrait photograph of THIS SPECIFIC baby — a full-body shot in portrait orientation.

Clothing requirement: the baby must be fully dressed in a soft cotton onesie or sleeper suit, or gently swaddled in a clean white or pastel blanket — no exposed skin below the wrists and ankles, no nudity of any kind. Do NOT invent a body, shoulders, or hands if they are not literally visible in the input crop.

SPATIAL AND POSE REQUIREMENT (CRITICAL): You MUST maintain the EXACT same body pose, rotation, crop, framing, and scale as the input image. If the baby is curled, lying on its side, diagonal, or upside down in the ultrasound, reproduce that EXACT same rotation and orientation in the frame. DO NOT rotate the subject to make them upright. DO NOT re-center them. DO NOT straighten or repose the baby. The head and limbs must occupy the exact same spatial coordinates as the input.

Composition: portrait orientation (vertical). The baby fills the frame from head to feet. Soft natural studio lighting, neutral or soft pastel background, shallow depth of field with gentle bokeh.

Likeness requirement: this is a portrait of a SPECIFIC baby — not a generic newborn. Faithfully reproduce the body proportions, limb positions, and any visible facial features from the ultrasound. If the face is visible, reproduce the exact facial geometry.

Skin texture: real newborn skin with fine peach fuzz, tiny pores visible at close inspection, natural color variation, soft mottling. NOT airbrushed, NOT plastic, NOT porcelain.

Quality requirements: individually defined fingers and toes (no fused or webbed digits), anatomically correct proportions for gestational age, realistic newborn skin imperfections (milia, stork bites acceptable). ZERO plastic or waxy skin, ZERO doll-like eyes, ZERO uncanny valley smoothness, ZERO extra limbs or fingers, ZERO text, ZERO logos, ZERO watermarks, ZERO medical equipment, ZERO ultrasound artifacts.

Priority rule: identity and geometry come before aesthetics. If you must choose, match the specific baby's pose, proportions, and visible features instead of making the image prettier or more generic.${scanType === "2d" ? "\n\nNote: this is a 2D ultrasound with limited geometric detail. Infer 3D body structure from the visible cross-section while maintaining fidelity to what is shown. Do not invent features that are not visible." : ""}`
      : `The input image is ${scanDesc} showing a fetal face. Transform this medical scan into an ultra-realistic newborn portrait photograph of THIS SPECIFIC baby.

Safety framing rule (highest priority): create a family-safe close-up portrait focused on the baby's face and any clearly visible hand only. Keep chest, torso, shoulders, and the rest of the body out of frame unless they are explicitly visible in the input. All non-facial areas should remain covered by soft fabric or stay outside the crop. Do NOT invent a body, shoulders, or hands if they are not literally visible in the input crop. However, if a hand, fingers, forearm, or any limb-like shape is visible near the face in the ultrasound, you MUST preserve it and render it as the baby's real hand/arm in the exact same position and scale.

Coverage rule: if soft fabric or swaddle is present, keep it at the outer border of the frame or below the chin. It must NEVER cover or cross the forehead, eyes, cheeks, nose, lips, or chin unless the ultrasound itself clearly occludes those features.

Likeness requirement: this is a portrait of a SPECIFIC baby — not a generic newborn. Faithfully reproduce the exact facial geometry visible in the ultrasound — nose bridge curvature, nose tip shape and width, upper lip bow, lower lip fullness, chin contour, forehead height and slope, and cheek volume. If any features appear prominent or unusual compared to an average face, reproduce them exactly as seen — do NOT normalize, soften, or average them toward a generic baby face. The resulting portrait must be visually distinguishable from any other baby.

Do NOT beautify or idealize the face. In particular, do NOT make the lips fuller, glossier, more defined, or more pouty than in the ultrasound. Do NOT make the chin rounder, smaller, cuter, or more recessed than in the ultrasound. Preserve the real jawline, chin projection, and mouth shape from the scan even if they look less conventionally pretty.

SPATIAL AND POSE REQUIREMENT (CRITICAL — read BEFORE generating): You MUST maintain the EXACT same head orientation, head tilt angle, rotation, crop, framing, and scale as the input image. If the head is tilted sideways, diagonal, or upside down in the ultrasound, the head MUST be tilted at the exact same angle in degrees in the generated portrait. DO NOT rotate the baby to be safely upright. DO NOT re-center the face if it is off-center. DO NOT zoom out to show a body. The face must occupy the exact same spatial coordinates and percentage of the frame as the input. If the scan shows a profile or 3/4 view, the portrait must perfectly match that angle — never convert a profile view into a frontal view. If the baby faces left in the ultrasound, it must face left in the portrait. Preserve the exact direction.

Composition: The output MUST be a tightly cropped macro or close-up matching the EXACT framing and boundary of the input image. DO NOT fill the frame with an imagined body. Preserve the visible surrounding shapes around the face. Do NOT replace those surrounding ultrasound forms with empty black negative space. If there are soft bright masses around the face, first interpret them as the baby's visible hand/arm or as anatomical support contours from the same scene. Only as a last resort may they read as soft bedding/support around the outer frame. Use swaddle minimally and only where it naturally stays outside the facial landmarks or below the chin. Prefer a light cream, ivory, or soft white surrounding background derived from the original image, not a dark studio backdrop.

Contour translation rule (highest priority): treat the ultrasound as a strict silhouette and contour map for the final portrait. Every visible outer contour and major inner boundary in the scan must stay in the same coordinates in the output: forehead curve, nose bridge, nose tip, upper lip, lower lip, chin, cheek edge, hand outline, and the surrounding bright forms. Replace texture only. Do NOT reinterpret the scene into a prettier or more standard newborn composition.

Skin texture: real newborn skin with fine peach fuzz, tiny pores visible at close inspection, natural color variation (slightly redder on cheeks, paler on forehead), soft mottling. NOT airbrushed, NOT plastic, NOT porcelain.

Quality requirements: natural asymmetry in facial features (no perfect mirror symmetry), anatomically correct ear placement and detail, realistic newborn skin imperfections (milia, stork bites acceptable). ZERO plastic or waxy skin, ZERO doll-like eyes, ZERO uncanny valley smoothness, ZERO extra limbs or fingers, ZERO text, ZERO logos, ZERO watermarks, ZERO medical equipment, ZERO ultrasound artifacts. ZERO isolated black studio background unless the input crop itself is mostly black.

Priority rule: identity and geometry come before aesthetics. The result must read as the same baby from the ultrasound, not as a polished stock newborn photo.${scanType === "2d" ? "\n\nNote: this is a 2D ultrasound with limited geometric detail. Infer 3D facial structure from the visible cross-section while maintaining fidelity to what is shown. Do not invent features that are not visible." : ""}`;

  const skinToneModifier =
    skinTone === "moreno"
      ? "Skin tone requirement: the newborn has warm brown skin with a naturally dark complexion. Render the skin tone accurately: rich melanin, warm undertones, darker coloring consistent with a moreno infant."
      : null;

  return [
    base,
    buildClinicalNotesBlock(clinicalNotes),
    skinToneModifier,
    styleModifiers[style],
    creativityModifier(creativity),
  ]
    .filter(Boolean)
    .join("\n\n");
}

const realisticRegionDetails: Record<AnatomicalRegion, string> = {
  face: `This scan shows fetal facial anatomy. Transform it into a photorealistic HDlive-style 3D rendering preserving the EXACT same view angle and spatial layout as the input scan (profile, frontal, or 3/4). Every facial feature must occupy the same position as in the ultrasound. Warm peach/amber skin tones, soft translucent tissue revealing underlying structure. Render skin surface, subcutaneous fat, nasal cartilage, orbital structures, lips and chin with depth.`,

  heart: `This scan shows fetal cardiac anatomy.

ANNOTATION RULE: The image may contain yellow measurement text and crosshair overlays (Card-circ, Heart-A, Th-circ, etc.) — COMPLETELY IGNORE THEM. Do not reproduce any text, labels, or crosshairs.

SPATIAL FIDELITY (highest priority): Every structure must occupy the EXACT same position in the output as in the input. If the heart is left of center in the echo, it must be left of center in the output. Do NOT center, rotate, or recompose.

CRITICAL — CROSS-SECTIONAL CUT VIEW: This is a SLICE through the thorax, like cutting the chest with a horizontal plane and looking straight down at the exposed interior. The cardiac chambers must be rendered as open cavities with visible interior walls — NOT as bumps or protrusions on a surface. The blood-pool lumens are OPEN dark spaces surrounded by myocardial walls, like looking into hollow rooms from above. The septa and valve tissue are visible as internal structures WITHIN the cut. This is NOT a surface rendering — it is an anatomical cross-section showing the inside of the thorax.

WHAT TO RENDER:
- Rounded thoracic ovoid silhouette with warm amber chest wall at the periphery (faint rib cross-sections visible as oval ivory shapes in the chest wall)
- Lung fields in their exact positions flanking the heart — warm translucent amber/golden, with faint bronchiole branching texture if visible
- Heart at its exact position: myocardial walls rendered in warm rose/amber, chamber lumens as OPEN near-black cavities (deep, hollow, clearly open to view), interventricular septum and atrioventricular valves as internal dividing structures
- Thin pericardial outline surrounding the heart
- Spine cross-section posteriorly as a warm ivory vertebral body with dark spinal canal

COLOR PALETTE: warm amber/golden for lung fields, rose-pink/warm red for myocardium, deep near-black (#1A0808) for open chamber lumens, warm ivory for ribs/vertebra, dark background

STYLE: photorealistic 3D HDlive cross-sectional rendering — like a high-fidelity anatomical cut through a 3D obstetric ultrasound volume. The chambers look like open hollows, not surface depressions.

NO TEXT: no labels, no arrows, no annotations.`,

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

  heart: `ANNOTATION RULE: ignore any yellow measurement text or crosshair overlays — do not reproduce them.

Fetal cardiac cross-section view — a horizontal SLICE through the thorax, looking straight down at exposed interior. SPATIAL FIDELITY: every structure at the EXACT same position as the input.

Render: rounded thoracic ovoid with warm amber chest wall (faint oval ivory rib cross-sections), lung fields flanking the heart in translucent amber/golden, heart chambers as OPEN near-black cavities with rose-pink myocardial walls, interventricular septum and valves as internal dividers, thin pericardial outline, spine cross-section posteriorly as warm ivory vertebra with dark spinal canal.

Colors: warm amber lungs, rose-pink myocardium, deep near-black open lumens, warm ivory bone. Dark background, photorealistic HDlive cross-sectional rendering. NO TEXT of any kind.`,

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
  const spatialBlock =
    analysis && anatomicalRegion === "face"
      ? buildSpatialAnchorBlock(analysis)
      : null;

  return [regionPrompt + scanNote, spatialBlock, clinicalBlock]
    .filter(Boolean)
    .join("\n\n");
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

  const base = `CONTENT CLASSIFICATION: This is a strictly clinical medical illustration for obstetrics education — an anatomical diagram of internal fetal structures. No nudity, no sexual content, no human subjects depicted as people. Equivalent to a medical textbook anatomical illustration.

CONTEXT: Transform this obstetric ultrasound into a photorealistic 3D anatomical visualization in the style of HDlive enhanced 3D fetal rendering. The output must look like the same scan but rendered with perfect anatomical clarity and warm amber/skin-tone colors — like a high-fidelity render from professional fetal visualization software. The input is ${scanDesc} ${regionSubject}.

SPATIAL FIDELITY (non-negotiable): The output is a direct visual translation of the input scan. Every structure must be in the EXACT same position, proportion, and orientation as in the ultrasound. If something is on the left in the echo, it stays on the left. If something is at the top, it stays at the top. Do NOT recompose, recenter, or generate a generic diagram. Render ONLY what is visible in this specific scan.

${regionDetail}

ZERO text of any kind — no anatomical labels (no "LV", "RV", "LA", "RA", "IVS" or any abbreviations), ZERO measurement markers, ZERO arrows, ZERO watermarks, ZERO medical equipment, ZERO annotation overlays, ZERO crosshairs. Pure visual rendering with no text whatsoever.${scanType === "2d" ? "\n\nNote: 2D ultrasound. Reconstruct 3D depth from the visible slice while preserving the exact same spatial layout. Do not fabricate structures not visible in the scan." : ""}`;

  const skinToneModifier =
    skinTone === "moreno"
      ? "Color tone: use warm brown tones with rich melanin coloring for the anatomical rendering, consistent with a moreno complexion."
      : null;

  return [
    base,
    buildClinicalNotesBlock(clinicalNotes),
    skinToneModifier,
    creativityModifier(creativity),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildPrompt(
  style: Style,
  creativity: number,
  skinTone: SkinTone = "normal",
  mode: GenerationMode = "portrait",
  scanType: ScanType = "3d4d",
  anatomicalRegion: AnatomicalRegion = "face",
  clinicalNotes: string = "",
): string {
  // Portrait mode is valid for face and fullBody regions
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
  return buildPortraitPrompt(
    style,
    creativity,
    skinTone,
    scanType,
    clinicalNotes,
    anatomicalRegion,
  );
}

// ---------- Enhanced prompt (with vision analysis) ----------

import type { UltrasoundAnalysis } from "./visionAnalysis";

function buildSpatialAnchorBlock(analysis: UltrasoundAnalysis): string {
  const sl = analysis.spatialLayout;
  if (!sl) return "";

  const tiltDirection =
    sl.headTiltDegrees > 5
      ? "tilted clockwise (right ear down)"
      : sl.headTiltDegrees < -5
        ? "tilted counter-clockwise (left ear down)"
        : "approximately upright";

  const chinElevation =
    sl.chinElevationDegrees > 5
      ? "looking UPWARD (chin raised)"
      : sl.chinElevationDegrees < -5
        ? "looking DOWNWARD (chin tucked)"
        : "looking straight ahead (level)";

  const horizontalPos =
    sl.subjectCenterX < 0.35
      ? "left third"
      : sl.subjectCenterX > 0.65
        ? "right third"
        : sl.subjectCenterX < 0.45
          ? "left-of-center"
          : sl.subjectCenterX > 0.55
            ? "right-of-center"
            : "center";

  const verticalPos =
    sl.subjectCenterY < 0.35
      ? "upper third"
      : sl.subjectCenterY > 0.65
        ? "lower third"
        : "vertically centered";

  const lines: string[] = [
    `SPATIAL ANCHOR DATA (HIGHEST PRIORITY — these coordinates define WHERE everything must be placed):`,
    `- Face center position: (${sl.subjectCenterX.toFixed(2)}, ${sl.subjectCenterY.toFixed(2)}) → the face is in the ${horizontalPos} of the frame, ${verticalPos}`,
    `- Head tilt: ${sl.headTiltDegrees}° → ${tiltDirection}`,
    `- Chin elevation: ${sl.chinElevationDegrees}° → ${chinElevation}`,
    `- Facing direction: ${sl.facingDirection}`,
    `- Face occupies ~${Math.round(sl.subjectOccupancyPercent)}% of the frame`,
  ];

  if (sl.noseTipX !== undefined && sl.noseTipY !== undefined) {
    lines.push(
      `- Nose tip at: (${sl.noseTipX.toFixed(2)}, ${sl.noseTipY.toFixed(2)})`,
    );
  }
  if (sl.chinX !== undefined && sl.chinY !== undefined) {
    lines.push(
      `- Chin at: (${sl.chinX.toFixed(2)}, ${sl.chinY.toFixed(2)})`,
    );
  }
  if (sl.foreheadX !== undefined && sl.foreheadY !== undefined) {
    lines.push(
      `- Forehead top at: (${sl.foreheadX.toFixed(2)}, ${sl.foreheadY.toFixed(2)})`,
    );
  }

  lines.push("");
  lines.push(
    `RULE: The generated portrait MUST place the face center, nose, chin, and forehead at these EXACT same normalized coordinates. The head tilt angle of ${sl.headTiltDegrees}° MUST be preserved — do NOT straighten or rotate the head. The chin elevation of ${sl.chinElevationDegrees}° MUST be preserved — if the face is ${chinElevation}, the portrait MUST show the face ${chinElevation} at the same angle. Do NOT flip the vertical orientation. The face must occupy approximately the same ${Math.round(sl.subjectOccupancyPercent)}% of the frame. If the face is off-center in the ultrasound, it must be off-center in the portrait at the same position.`,
  );

  return lines.join("\n");
}

function buildVisionFaceBlock(analysis: UltrasoundAnalysis): string {
  const fd = analysis.faceDetails;
  if (!fd) return "";

  const lines: string[] = [
    `VISION ANALYSIS — the following describes THIS specific baby as seen in the ultrasound:`,
    `- View angle: ${analysis.viewAngle}`,
    `- Estimated gestational age: ${analysis.estimatedGestationalWeeks ? `~${analysis.estimatedGestationalWeeks} weeks` : "unknown"}`,
    `- Image quality: ${analysis.imageQuality}`,
    `- Visible structures: ${analysis.visibleStructures.join(", ")}`,
    "",
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
  lines.push("");
  lines.push(`Overall: ${analysis.overallDescription}`);

  return lines.join("\n");
}

function buildVisionOrganBlock(analysis: UltrasoundAnalysis): string {
  const od = analysis.organDetails;
  if (!od) return "";

  const lines: string[] = [
    `VISION ANALYSIS — the following describes exactly what is visible in this ultrasound:`,
    `- View plane: ${od.viewPlane}`,
    `- Estimated gestational age: ${analysis.estimatedGestationalWeeks ? `~${analysis.estimatedGestationalWeeks} weeks` : "unknown"}`,
    `- Image quality: ${analysis.imageQuality}`,
    `- Visible structures: ${analysis.visibleStructures.join(", ")}`,
    "",
    `DETAILED ANATOMY:`,
    od.visibleAnatomyDescription,
  ];

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

  return lines.join("\n");
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
  const spatialBlock = buildSpatialAnchorBlock(analysis);
  const visionBlock = buildVisionFaceBlock(analysis);

  // Spatial data goes FIRST — models prioritize early instructions
  const viewAngleInstruction =
    analysis.viewAngle === "frontal"
      ? "render a frontal view"
      : analysis.viewAngle.includes("profile")
        ? "render a profile view from the same side"
        : "render a 3/4 view from the same side";

  const base = `The input image is ${scanDesc} showing a fetal face. Transform this medical scan into an ultra-realistic newborn portrait photograph of THIS SPECIFIC baby.

${spatialBlock ? `${spatialBlock}\n\n` : ""}SPATIAL AND POSE REQUIREMENT (CRITICAL — read this BEFORE generating):
The view angle is "${analysis.viewAngle}" — ${viewAngleInstruction}.
You MUST maintain the EXACT same head position, rotation, tilt angle, crop, framing, and scale as the input image.${analysis.spatialLayout ? ` The head is tilted ${analysis.spatialLayout.headTiltDegrees}° — reproduce this EXACT tilt.` : ""} If the head is tilted sideways or diagonal in the ultrasound, the head MUST be tilted at the exact same angle in the output. DO NOT rotate the baby to be upright. DO NOT re-center the face. DO NOT zoom out to show a body. The face must occupy the exact same spatial coordinates as the input.

Contour translation rule (highest priority): treat the ultrasound as a strict silhouette and contour map for the portrait. Every visible outer contour and major boundary confirmed by the analysis must remain in the same coordinates in the final image: forehead curve, nose bridge, nose tip, lips, chin, cheek edge, hand outline, and surrounding bright forms. Replace texture only. Do NOT reinterpret the scene into a more standard or more flattering newborn pose.

${visionBlock}

Safety framing rule (highest priority): create a family-safe close-up portrait focused on the baby's face and any clearly visible hand only. Keep chest, torso, shoulders, and the rest of the body out of frame unless they are explicitly visible in the input. All non-facial areas should remain covered by soft fabric or stay outside the crop. Do NOT invent a body, shoulders, or hands if they are not literally visible in the input crop. If the analysis or the input image indicates a hand, fingers, or forearm near the face, you MUST include it in the same position rather than replacing it with blanket or background.

Coverage rule: if soft fabric or swaddle is present, keep it at the outer border of the frame or below the chin. It must NEVER cover or cross the forehead, eyes, cheeks, nose, lips, or chin unless the ultrasound itself clearly occludes those features.

Likeness requirement: this is a portrait of THIS SPECIFIC baby as described above — not a generic newborn. Every facial feature must match the analysis: the exact nose shape, lip fullness, chin contour, forehead slope, and cheek volume described. If the analysis mentions a hand near the face, include it in the same position. The resulting portrait must be visually recognizable as the same baby seen in the ultrasound.

Do NOT beautify or idealize the face. In particular, do NOT make the lips fuller, glossier, more defined, or more pouty than in the ultrasound analysis. Do NOT make the chin rounder, smaller, cuter, or more recessed than described. Preserve the real jawline, chin projection, and mouth shape from the scan even if they look less conventionally pretty.

Composition: The output MUST be a strict direct 1:1 spatial translation of the input. Do NOT add an upper body, shoulders, or hands unless they are explicitly visible in the input crop. Preserve the visible surrounding shapes around the face. Do NOT replace surrounding ultrasound forms with empty black negative space. Where the crop shows bright surrounding masses, first reinterpret them as the baby's hand/arm or as anatomical support contours from the same scene while keeping the same silhouette and coordinates. Only as a last resort may they read as soft bedding/support around the outer frame. Use swaddle minimally and only where it stays outside the facial landmarks or below the chin. Use soft natural studio lighting with a light cream or white surrounding background derived from the input rather than a dark studio backdrop.

Skin texture: real newborn skin with fine peach fuzz, tiny pores visible at close inspection, natural color variation (slightly redder on cheeks, paler on forehead), soft mottling. NOT airbrushed, NOT plastic, NOT porcelain.

Priority rule: spatial layout and analyzed facial traits are more important than beauty, symmetry, or studio styling. The result must look like the same baby in the same position, not a generic newborn.

${NEGATIVE_PROMPT}${scanType === "2d" ? "\n\nNote: this is a 2D ultrasound with limited geometric detail. The vision analysis has already interpreted the visible features — use those descriptions to guide the reconstruction." : ""}`;

  const skinToneModifier =
    skinTone === "moreno"
      ? "Skin tone requirement: the newborn has warm brown skin with a naturally dark complexion. Render the skin tone accurately: rich melanin, warm undertones, darker coloring consistent with a moreno infant."
      : null;

  return [
    base,
    buildClinicalNotesBlock(clinicalNotes),
    skinToneModifier,
    styleModifiers[style],
    creativityModifier(creativity),
  ]
    .filter(Boolean)
    .join("\n\n");
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

  const base = `CONTENT CLASSIFICATION: This is a strictly clinical medical illustration for obstetrics education — an anatomical diagram of internal fetal structures. No nudity, no sexual content, no human subjects depicted as people. Equivalent to a medical textbook anatomical illustration.

CONTEXT: Transform this obstetric ultrasound into a photorealistic 3D anatomical visualization in the style of HDlive enhanced 3D fetal rendering. The output must look like the same scan but rendered with perfect anatomical clarity and warm amber/skin-tone colors — like a high-fidelity render from professional fetal visualization software. The input is ${scanDesc} ${regionSubject}.

${visionBlock}

SPATIAL FIDELITY (non-negotiable): The output is a direct visual translation of the input scan. Every structure must be in the EXACT same position, proportion, and orientation as in the ultrasound — as confirmed by the vision analysis above. The view plane identified is "${analysis.organDetails?.viewPlane ?? "unknown"}". Do NOT recompose, recenter, or generate a generic diagram. Render ONLY what is visible in this specific scan.

${regionDetail}

ZERO text of any kind — no anatomical labels (no "LV", "RV", "LA", "RA", "IVS" or any abbreviations), ZERO measurement markers, ZERO arrows, ZERO watermarks, ZERO medical equipment, ZERO annotation overlays, ZERO crosshairs. Pure visual rendering with no text whatsoever.${scanType === "2d" ? "\n\nNote: 2D ultrasound. The vision analysis has already identified the visible structures — use those descriptions to guide the 3D reconstruction while preserving exact spatial layout." : ""}`;

  const skinToneModifier =
    skinTone === "moreno"
      ? "Color tone: use warm brown tones with rich melanin coloring for the anatomical rendering, consistent with a moreno complexion."
      : null;

  return [
    base,
    buildClinicalNotesBlock(clinicalNotes),
    skinToneModifier,
    creativityModifier(creativity),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildEnhancedPrompt(
  style: Style,
  creativity: number,
  skinTone: SkinTone = "normal",
  mode: GenerationMode = "portrait",
  scanType: ScanType = "3d4d",
  anatomicalRegion: AnatomicalRegion = "face",
  clinicalNotes: string = "",
  analysis: UltrasoundAnalysis | null = null,
): string {
  // If no analysis, fall back to standard prompt
  if (!analysis) {
    return buildPrompt(
      style,
      creativity,
      skinTone,
      mode,
      scanType,
      anatomicalRegion,
      clinicalNotes,
    );
  }

  // Enhanced portrait with vision analysis is only available for face
  if (mode === "portrait" && anatomicalRegion === "face") {
    return buildEnhancedPortraitPrompt(
      style,
      creativity,
      skinTone,
      scanType,
      clinicalNotes,
      analysis,
    );
  }

  // fullBody portrait — no enhanced version yet, use standard portrait prompt
  if (mode === "portrait" && anatomicalRegion === "fullBody") {
    return buildPortraitPrompt(
      style,
      creativity,
      skinTone,
      scanType,
      clinicalNotes,
      anatomicalRegion,
    );
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
