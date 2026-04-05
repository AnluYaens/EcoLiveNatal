import type {
  AnatomicalRegion,
  GenerationMode,
  GenerationStyle,
  ScanType,
  SkinTone,
} from "./validation";
import type { UltrasoundAnalysis } from "./visionAnalysis";

export type Style = GenerationStyle;
export type { AnatomicalRegion, GenerationMode, ScanType, SkinTone };

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

Framing rule: treat the crop as a hard boundary. Do not zoom out to reveal missing anatomy, do not beautify the pose, and do not complete limbs that are not actually visible. If part of the fetus is cut off in the crop, keep it cut off.

Composition: portrait orientation (vertical). The baby fills the frame from head to feet. Soft natural studio lighting, neutral or soft pastel background, shallow depth of field with gentle bokeh.

Likeness requirement: this is a portrait of a SPECIFIC baby — not a generic newborn. Faithfully reproduce the body proportions, limb positions, and any visible facial features from the ultrasound. If the face is visible, reproduce the exact facial geometry.

Skin texture: real newborn skin with fine peach fuzz, tiny pores visible at close inspection, natural color variation, soft mottling. NOT airbrushed, NOT plastic, NOT porcelain.

Quality requirements: individually defined fingers and toes (no fused or webbed digits), anatomically correct proportions for gestational age, realistic newborn skin imperfections (milia, stork bites acceptable). ZERO plastic or waxy skin, ZERO doll-like eyes, ZERO uncanny valley smoothness, ZERO extra limbs or fingers, ZERO text, ZERO logos, ZERO watermarks, ZERO medical equipment, ZERO ultrasound artifacts.

Priority rule: identity and geometry come before aesthetics. If you must choose, match the specific baby's pose, proportions, and visible features instead of making the image prettier or more generic.${scanType === "2d" ? "\n\nNote: this is a 2D ultrasound with limited geometric detail. Infer 3D body structure from the visible cross-section while maintaining fidelity to what is shown. Do not invent features that are not visible." : ""}`
      : `Edit this image: replace the ultrasound texture with photorealistic newborn skin. Keep the EXACT same silhouette, contours, face position, head angle, tilt, and scale. Do not change the composition or framing — this is a texture swap, not a new portrait.

Preserve THIS baby's specific facial features exactly as they appear — nose shape, lip shape, chin, forehead, cheeks. If a hand or arm is visible near the face, keep it at the same position. Do not add body or shoulders not visible in the input.

Hard constraints: treat the crop as a fixed frame. Do NOT center the face if it is off-center. Do NOT rotate the head upright. Do NOT symmetrize, beautify, or idealize facial proportions. If the face is partially obscured, preserve that same occlusion rather than inventing missing anatomy.

Skin: realistic newborn with peach fuzz, pores, natural color variation. Light cream background. Family-safe close-up. No text, no logos, no medical equipment.${scanType === "2d" ? " 2D ultrasound — infer 3D structure from visible cross-section." : ""}`;

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

  heart: `Edit this image: replace the ultrasound texture with photorealistic OPAQUE fetal tissue in GE Voluson HDlive style. Keep the EXACT same cross-sectional shape, composition, and spatial layout as the input. This is a texture swap, not a new illustration.

Ignore any yellow measurement text or crosshairs. All tissue must be SOLID and OPAQUE. Cardiac chambers are deep dark open cavities, myocardium is solid rose-pink with muscular striations, lungs are solid opaque amber with spongy texture, chest wall is solid warm amber, spine is solid ivory bone. Warm HDlive 3D directional lighting with depth and specular highlights. NO TEXT, no labels, no annotations.`,

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
      ? buildSpatialAnchorBlock(analysis)
      : analysis && anatomicalRegion !== "face"
        ? buildGeminiOrganAnchorBlock(anatomicalRegion, analysis)
        : null;

  return joinPromptSections(regionPrompt + scanNote, anchorBlock, clinicalBlock);
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
    lines.push(`- Chin at: (${sl.chinX.toFixed(2)}, ${sl.chinY.toFixed(2)})`);
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
        `- Conservative mode: where the scan shows amorphous dark/bright blobs rather than clear anatomy, preserve those blobs as localized soft tissue masses instead of forcing named chambers or vessels.`,
        `- Conservative mode: if a dotted or faint circular measurement guide is present, ignore it completely. Never turn that guide into a circular myocardial wall, enclosing ring, or donut-shaped chamber.`,
        `- Conservative mode: if a black horizontal band or masked gap is present, treat it as removed overlay/background only. Never interpret it as septum, vessel wall, or tissue plane.`,
      );
    }
  }

  return lines.join("\n");
}

function buildEnhancedPortraitPrompt(
  style: Style,
  creativity: number,
  skinTone: SkinTone,
  scanType: ScanType,
  clinicalNotes: string,
  analysis: UltrasoundAnalysis,
): string {
  const spatialBlock = buildSpatialAnchorBlock(analysis);
  const visionBlock = buildVisionFaceBlock(analysis);
  const viewAngleInstruction =
    analysis.viewAngle === "frontal"
      ? "render a frontal view"
      : analysis.viewAngle.includes("profile")
        ? "render a profile view from the same side"
        : "render a 3/4 view from the same side";

  const base = `Edit this image: replace the ultrasound texture with photorealistic newborn skin. Keep the EXACT same silhouette, face position, head angle, tilt, and scale. This is a texture swap, not a new portrait.

${spatialBlock ? `${spatialBlock}\n\n` : ""}View angle: "${analysis.viewAngle}" — ${viewAngleInstruction}.${analysis.spatialLayout ? ` Head tilt: ${analysis.spatialLayout.headTiltDegrees}° — preserve exactly.` : ""}

${visionBlock}

Reproduce THIS baby's specific features exactly as analyzed above. If a hand is visible, keep it at the same position. Do not add body or shoulders not in the input. Treat the crop as a fixed frame: do not center the face, do not rotate it upright, and do not invent hidden anatomy. Family-safe close-up. Realistic newborn skin with peach fuzz and natural color variation. Light cream background. No text, no logos.${scanType === "2d" ? " 2D ultrasound — use analysis descriptions to guide reconstruction." : ""}`;

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

// ---------- Heart-specific prompt builders (strict / salvage) ----------

/**
 * Reduced organ anchor block for the salvage profile. Omits cardiacDetails
 * entirely and adds artifact-awareness lines.
 */
function buildSalvageOrganAnchorBlock(
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
    `- Visible structures (treat as anonymous tissue masses): ${visibleStructures}`,
  ];

  if (organDetails.sidedness) {
    lines.push(`- Sidedness/layout: ${organDetails.sidedness}`);
  }

  lines.push(
    `- Anatomy note: ${organDetails.visibleAnatomyDescription}`,
    `- Hard rule: do NOT name specific chambers (LV, RV, LA, RA), valves, or vessels. Treat all visible structures as anonymous tissue masses with varying density.`,
    `- Hard rule: residual bright dots from cleaned measurement rings are non-anatomical — ignore any circular or elliptical dot patterns.`,
    `- Hard rule: black bands or gaps are removed background/overlay — do NOT fill them with tissue or interpret them as septum, vessel wall, or tissue plane.`,
    `- Hard rule: preserve the same asymmetry, incompleteness, and crop boundaries as the ultrasound.`,
  );

  return lines.join("\n");
}

const heartSalvageBase = `Edit this image: replace the ultrasound texture with a restrained photorealistic tissue translation in GE Voluson HDlive style. Keep the EXACT same cross-sectional shape, composition, and spatial layout as the input. This is a local texture translation, not a new illustration or anatomical reconstruction.

CRITICAL RESTRICTIONS:
- Do NOT name or label specific chambers, valves, or vessels. Treat all visible structures as anonymous tissue masses with varying density.
- Do NOT complete anatomy — preserve ambiguity and partial structures exactly as they appear.
- Do NOT create concentric rings, donut-like chambers, smooth circular walls, or a large enclosing oval. These are hallucination patterns.
- Do NOT turn black gaps, black bands, or masked regions into tissue boundaries. Areas from removed overlays remain absent/background.
- Do NOT present this as a dissected specimen, pathology sample, or polished anatomical cutaway.
- Do NOT generate a uniform meat-like slab filling the entire frame.
- If residual bright dots from cleaned measurement rings remain, ignore them — they are non-anatomical.

Where the scan shows amorphous dark/bright blobs rather than clear anatomy, preserve those blobs as localised soft tissue masses vs fluid-filled spaces. Keep uncertain tissue soft and unresolved.

All tissue must be SOLID and OPAQUE, not translucent or gelatinous. Dark open spaces remain as cavities. Rose-pink tissue with subtle texture. Warm HDlive 3D directional lighting with controlled depth and very restrained specular highlights. NO TEXT, no labels, no annotations.`;

type HeartProfile = "strict" | "salvage";

function buildHeartOpenAiPrompt(
  profile: HeartProfile,
  scanType: ScanType,
  clinicalNotes: string,
  analysisBlock: string | null,
  promptBody: string,
): string {
  const scanDesc = scanTypeDescription(scanType);
  const profileHeader =
    profile === "strict"
      ? "PROFILE: STRICT — this scan has been verified as clean with high anatomical confidence. Render all confirmed structures with full HDlive tissue detail."
      : "PROFILE: SALVAGE — this scan has artifacts or ambiguous anatomy. Apply a very restrained HDlive translation only.";
  const contextBlock =
    profile === "strict"
      ? `CONTEXT: Transform this obstetric ultrasound into a photorealistic 3D anatomical visualization. The input is ${scanDesc} showing an amorphous biological tissue cross-section. This is a direct texture translation of the input scan, not a reconstruction or new illustration.`
      : `CONTEXT: The input is ${scanDesc} showing an amorphous biological tissue cross-section. Apply a restrained local texture translation preserving the exact ROI silhouette.`;
  const spatialFidelity =
    profile === "strict"
      ? `SPATIAL FIDELITY (non-negotiable): Every structure must be in the EXACT same position, proportion, and orientation as in the ultrasound. Do NOT recompose, recenter, or generate a generic diagram. Render ONLY what is visible in this specific scan.`
      : `SPATIAL FIDELITY (non-negotiable): Every structure must be in the EXACT same position as in the ultrasound. Do NOT recompose, recenter, or generate a generic diagram.`;
  const scanNote =
    scanType === "2d"
      ? profile === "strict"
        ? "Note: 2D ultrasound. Reconstruct 3D depth from the visible slice while preserving the exact same spatial layout."
        : "Note: 2D ultrasound — preserve the cross-sectional geometry exactly."
      : null;

  return joinPromptSections(
    profileHeader,
    `CONTENT CLASSIFICATION: This is a strictly clinical medical illustration for obstetrics education — an anatomical diagram of internal fetal structures. No nudity, no sexual content, no human subjects depicted as people.`,
    contextBlock,
    analysisBlock,
    spatialFidelity,
    promptBody,
    scanNote,
    buildClinicalNotesBlock(clinicalNotes),
  );
}

function buildHeartGeminiPrompt(
  profile: HeartProfile,
  scanType: ScanType,
  clinicalNotes: string,
  anchorBlock: string | null,
  promptBody: string,
): string {
  const profileHeader =
    profile === "strict"
      ? "PROFILE: STRICT — clean scan, high anatomical confidence."
      : "PROFILE: SALVAGE — artifacts or ambiguous anatomy detected. Apply very restrained HDlive translation.";
  const scanNote =
    scanType === "2d"
      ? profile === "strict"
        ? " This is a 2D ultrasound — reconstruct 3D depth from the visible cross-section."
        : " This is a 2D ultrasound — preserve the cross-sectional geometry exactly."
      : "";

  return joinPromptSections(
    `${profileHeader}\n\n${promptBody}${scanNote}`,
    anchorBlock,
    buildClinicalNotesBlock(clinicalNotes),
  );
}

/**
 * Heart strict prompt for OpenAI path.
 * Used when preprocessing is clean AND vision analysis is confident.
 */
export function buildHeartStrictPrompt(
  scanType: ScanType,
  clinicalNotes: string,
  analysis: UltrasoundAnalysis | null,
): string {
  const visionBlock = analysis ? buildVisionOrganBlock(analysis) : "";

  return buildHeartOpenAiPrompt(
    "strict",
    scanType,
    clinicalNotes,
    visionBlock,
    `${realisticRegionDetails.heart}

ZERO text of any kind — no anatomical labels, ZERO measurement markers, ZERO arrows, ZERO watermarks. Pure visual rendering.`,
  );
}

/**
 * Heart salvage prompt for OpenAI path.
 * Used when artifacts are present or analysis is not confident.
 * Much more restrictive — anonymous tissue, no anatomy completion.
 */
export function buildHeartSalvagePrompt(
  scanType: ScanType,
  clinicalNotes: string,
  analysis: UltrasoundAnalysis | null,
): string {
  const visionBlock = analysis ? buildSalvageOrganAnchorBlock(analysis) : "";
  return buildHeartOpenAiPrompt(
    "salvage",
    scanType,
    clinicalNotes,
    visionBlock,
    heartSalvageBase,
  );
}

/**
 * Heart strict prompt for Gemini path.
 */
export function buildGeminiHeartStrictPrompt(
  scanType: ScanType,
  clinicalNotes: string,
  analysis: UltrasoundAnalysis | null,
): string {
  const anchorBlock = analysis
    ? buildGeminiOrganAnchorBlock("heart", analysis)
    : null;

  return buildHeartGeminiPrompt(
    "strict",
    scanType,
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
): string {
  const anchorBlock = analysis
    ? buildSalvageOrganAnchorBlock(analysis)
    : null;

  return buildHeartGeminiPrompt(
    "salvage",
    scanType,
    clinicalNotes,
    anchorBlock,
    heartSalvageBase,
  );
}
