import OpenAI from 'openai';
import { z } from 'zod';
import type { AnatomicalRegion, ScanType } from './promptBuilder';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const VISION_MODEL = 'gpt-4o' as const;
const VISION_TIMEOUT_MS = 15_000;

// ---------- Schemas ----------

const FaceDetailsSchema = z.object({
  noseDescription: z.string(),
  lipDescription: z.string(),
  chinDescription: z.string(),
  foreheadDescription: z.string(),
  cheekDescription: z.string(),
  eyeDescription: z.string(),
  handPosition: z.string().nullable(),
  earVisible: z.boolean(),
  hairVisible: z.boolean(),
  expression: z.string(),
});

const SpatialLayoutSchema = z.object({
  headTiltDegrees: z.number(),
  chinElevationDegrees: z.number(),
  facingDirection: z.enum(['facing-left', 'facing-right', 'facing-camera']),
  subjectCenterX: z.number(),
  subjectCenterY: z.number(),
  subjectOccupancyPercent: z.number(),
  noseTipX: z.number().optional(),
  noseTipY: z.number().optional(),
  chinX: z.number().optional(),
  chinY: z.number().optional(),
  foreheadX: z.number().optional(),
  foreheadY: z.number().optional(),
});

const CardiacDetailsSchema = z.object({
  visibleChambers: z.array(z.string()),
  septalIntegrity: z.string(),
  valvesVisible: z.array(z.string()),
  greatVessels: z.string(),
  pericardiumVisible: z.boolean(),
  structuralAnomalyFlag: z.string().nullable(),
});

const OrganDetailsSchema = z.object({
  viewPlane: z.string(),
  visibleAnatomyDescription: z.string(),
  measurements: z.string().nullable(),
  cardiacDetails: CardiacDetailsSchema.optional(),
});

const UltrasoundAnalysisSchema = z.object({
  estimatedGestationalWeeks: z.number().nullable(),
  viewAngle: z.enum([
    'frontal',
    'profile-left',
    'profile-right',
    'three-quarter-left',
    'three-quarter-right',
    'axial',
    'coronal',
    'sagittal',
    'unknown',
  ]),
  imageQuality: z.enum(['excellent', 'good', 'fair', 'poor']),
  visibleStructures: z.array(z.string()),
  spatialLayout: SpatialLayoutSchema.optional(),
  faceDetails: FaceDetailsSchema.optional(),
  organDetails: OrganDetailsSchema.optional(),
  overallDescription: z.string(),
});

export type UltrasoundAnalysis = z.infer<typeof UltrasoundAnalysisSchema>;

// ---------- Region-specific vision prompts ----------

const FACE_VISION_PROMPT = `Analyze this obstetric ultrasound showing a fetal face. Describe ONLY what you can clearly see — do not invent or assume features that are not visible.

HAND DETECTION (important): Carefully examine the entire image for any hand, fingers, forearm, or limb-like shape touching or adjacent to the face. Hands in 3D/4D ultrasounds often appear as small rounded protrusions with finger-like subdivisions near the chin, cheek, or forehead. If you see ANY structure that could be a hand — even partially visible — report it in the handPosition field with its position relative to the face. Err on the side of reporting a possible hand rather than missing one.

SPATIAL ANALYSIS (critical): You must also provide precise spatial layout data. Imagine the image as a coordinate system where (0,0) is the top-left corner and (1,1) is the bottom-right corner. Estimate the normalized (x, y) position of key facial landmarks within the image frame.

Return a JSON object with this exact structure:
{
  "estimatedGestationalWeeks": <number or null if unclear>,
  "viewAngle": <"frontal" | "profile-left" | "profile-right" | "three-quarter-left" | "three-quarter-right" | "unknown">,
  "imageQuality": <"excellent" | "good" | "fair" | "poor">,
  "visibleStructures": [<list of visible anatomical structures, e.g. "nose", "lips", "forehead", "right hand", "chin", "left ear">],
  "spatialLayout": {
    "headTiltDegrees": <number from -90 to +90. 0 = upright, positive = tilted clockwise (right ear down), negative = tilted counter-clockwise (left ear down). E.g. if the head is tilted 20 degrees to the right, use 20>,
    "chinElevationDegrees": <number from -45 to +45. 0 = face looking straight ahead, positive = chin raised / face looking UPWARD, negative = chin tucked / face looking DOWNWARD. E.g. if the baby's face is angled slightly upward with chin raised, use +10 to +20. If the chin is tucked down, use -10 to -20>,
    "facingDirection": <"facing-left" | "facing-right" | "facing-camera">,
    "subjectCenterX": <0.0–1.0, horizontal center of the face in the frame. 0.0 = left edge, 0.5 = center, 1.0 = right edge>,
    "subjectCenterY": <0.0–1.0, vertical center of the face in the frame. 0.0 = top edge, 0.5 = center, 1.0 = bottom edge>,
    "subjectOccupancyPercent": <0–100, approximate percentage of the image area that the face/head occupies>,
    "noseTipX": <0.0–1.0, X coordinate of the nose tip>,
    "noseTipY": <0.0–1.0, Y coordinate of the nose tip>,
    "chinX": <0.0–1.0, X coordinate of the chin>,
    "chinY": <0.0–1.0, Y coordinate of the chin>,
    "foreheadX": <0.0–1.0, X coordinate of the top of the forehead>,
    "foreheadY": <0.0–1.0, Y coordinate of the top of the forehead>
  },
  "faceDetails": {
    "noseDescription": "<specific shape: bridge curvature, tip shape, width — e.g. 'small button nose with rounded tip and narrow bridge'>",
    "lipDescription": "<specific shape: fullness, bow, parting — e.g. 'full lips, slightly parted, prominent upper lip bow'>",
    "chinDescription": "<contour, prominence — e.g. 'small receding chin typical of early third trimester'>",
    "foreheadDescription": "<shape, prominence — e.g. 'prominent rounded forehead with smooth contour'>",
    "cheekDescription": "<volume, shape — e.g. 'full rounded cheeks with visible fat pads'>",
    "eyeDescription": "<what you see — e.g. 'eyes closed, smooth eyelids, slight orbital ridges visible'>",
    "handPosition": "<position relative to face or null — e.g. 'right hand resting near chin at 2 o'clock position'>",
    "earVisible": <true/false>,
    "hairVisible": <true/false>,
    "expression": "<overall expression — e.g. 'peaceful, relaxed, mouth slightly open'>"
  },
  "overallDescription": "<2-3 sentence natural language summary of the entire image, describing the baby's position, visible features, and overall impression>"
}`;

const ORGAN_VISION_PROMPT_MAP: Record<Exclude<AnatomicalRegion, 'face'>, string> = {
  heart: `Analyze this obstetric ultrasound showing fetal cardiac anatomy. Describe ONLY the underlying anatomical structures.

IMPORTANT: This scan may contain yellow measurement overlays and annotation text (such as "Card-circ", "Heart-A", "Th-circ", dimension numbers, gestational age labels, crosshair markers). IGNORE all text, numerical labels, and measurement lines completely. Analyze ONLY the anatomical tissue structures visible beneath those overlays.

Return a JSON object:
{
  "estimatedGestationalWeeks": <number or null>,
  "viewAngle": <"axial" | "coronal" | "sagittal" | "unknown">,
  "imageQuality": <"excellent" | "good" | "fair" | "poor">,
  "visibleStructures": [<list: e.g. "left ventricle", "right ventricle", "interventricular septum", "mitral valve", "tricuspid valve", "aorta", "pulmonary artery">],
  "organDetails": {
    "viewPlane": "<exact cardiac view: 'four-chamber', '3-vessel', '3-vessel-trachea', 'LVOT', 'RVOT', 'aortic arch', 'ductal arch', 'short axis', or description>",
    "visibleAnatomyDescription": "<detailed paragraph describing all visible cardiac structures, their spatial relationships, wall thicknesses, chamber sizes — ignore any text overlays>",
    "measurements": null,
    "cardiacDetails": {
      "visibleChambers": [<list of chamber abbreviations visible: "LV", "RV", "LA", "RA">],
      "septalIntegrity": "<describe interventricular and interatrial septum — e.g. 'IVS appears intact throughout', 'IVS not clearly visible', 'possible perimembranous defect'>",
      "valvesVisible": [<list of valves clearly visible: "mitral", "tricuspid", "aortic", "pulmonary">],
      "greatVessels": "<describe aorta and pulmonary artery as visible — position, relative size — or 'not visible in this plane'>",
      "pericardiumVisible": <true/false>,
      "structuralAnomalyFlag": "<brief description of any suspected structural anomaly, or null if none>"
    }
  },
  "overallDescription": "<2-3 sentence summary of cardiac anatomy visible>"
}`,

  brain: `Analyze this obstetric ultrasound showing fetal intracranial structures. Describe ONLY what you can clearly see.

Return a JSON object:
{
  "estimatedGestationalWeeks": <number or null>,
  "viewAngle": <"axial" | "coronal" | "sagittal" | "unknown">,
  "imageQuality": <"excellent" | "good" | "fair" | "poor">,
  "visibleStructures": [<list: e.g. "cerebral hemispheres", "cavum septum pellucidum", "thalami", "cerebellum", "vermis", "corpus callosum">],
  "organDetails": {
    "viewPlane": "<exact brain view: 'transthalamic axial', 'transcerebellar axial', 'mid-sagittal', 'parasagittal', 'coronal anterior', 'coronal posterior', or description>",
    "visibleAnatomyDescription": "<detailed paragraph describing visible intracranial structures and spatial relationships>",
    "measurements": "<any visible measurements, or null>"
  },
  "overallDescription": "<2-3 sentence summary>"
}`,

  spine: `Analyze this obstetric ultrasound showing fetal spinal anatomy. Describe ONLY what you can clearly see.

Return a JSON object:
{
  "estimatedGestationalWeeks": <number or null>,
  "viewAngle": <"sagittal" | "coronal" | "axial" | "unknown">,
  "imageQuality": <"excellent" | "good" | "fair" | "poor">,
  "visibleStructures": [<list: e.g. "vertebral bodies", "pedicles", "spinal cord", "sacrum", "cervical spine">],
  "organDetails": {
    "viewPlane": "<exact spine view: 'sagittal full', 'sagittal lumbar', 'coronal', 'axial single vertebra', or description>",
    "visibleAnatomyDescription": "<detailed paragraph describing visible spinal structures>",
    "measurements": "<any visible measurements, or null>"
  },
  "overallDescription": "<2-3 sentence summary>"
}`,

  abdomen: `Analyze this obstetric ultrasound showing fetal abdominal structures. Describe ONLY what you can clearly see.

Return a JSON object:
{
  "estimatedGestationalWeeks": <number or null>,
  "viewAngle": <"axial" | "coronal" | "sagittal" | "unknown">,
  "imageQuality": <"excellent" | "good" | "fair" | "poor">,
  "visibleStructures": [<list: e.g. "stomach", "liver", "kidneys", "umbilical vein", "bowel", "abdominal wall">],
  "organDetails": {
    "viewPlane": "<exact abdominal view: 'AC plane', 'renal axial', 'sagittal', or description>",
    "visibleAnatomyDescription": "<detailed paragraph describing visible abdominal structures>",
    "measurements": "<any visible measurements, or null>"
  },
  "overallDescription": "<2-3 sentence summary>"
}`,

  fullBody: `Analyze this obstetric ultrasound showing the full fetal body. Describe ONLY what you can clearly see.

Return a JSON object:
{
  "estimatedGestationalWeeks": <number or null>,
  "viewAngle": <"sagittal" | "coronal" | "axial" | "unknown">,
  "imageQuality": <"excellent" | "good" | "fair" | "poor">,
  "visibleStructures": [<list of all visible body parts and structures>],
  "organDetails": {
    "viewPlane": "<description of the body orientation and view>",
    "visibleAnatomyDescription": "<detailed paragraph describing the fetal position, limb positions, and all visible structures>",
    "measurements": "<any visible measurements, or null>"
  },
  "overallDescription": "<2-3 sentence summary>"
}`,
};

// ---------- System message ----------

const SYSTEM_MESSAGE = `You are an expert obstetric sonographer with 20+ years of experience reading ultrasound images. Your task is to analyze this ultrasound and describe exactly what you see in structured JSON format.

CRITICAL RULES:
- Only describe what is CLEARLY VISIBLE in the image. Never invent, assume, or hallucinate features.
- If a structure is partially visible or unclear, say so (e.g. "partially visible right ear" not just "right ear").
- Be specific about shapes, angles, and spatial relationships.
- If you cannot determine something, use null or "unknown".
- Your analysis will be used to generate a realistic reconstruction, so accuracy is paramount — a wrong description is worse than saying "unclear".
- Respond ONLY with valid JSON. No markdown, no code blocks, no extra text.`;

// ---------- Main function ----------

export async function analyzeUltrasound(
  imageBuffer: Buffer,
  anatomicalRegion: AnatomicalRegion,
  scanType: ScanType,
  clinicalNotes: string,
): Promise<UltrasoundAnalysis | null> {
  const scanContext = scanType === '2d'
    ? 'This is a 2D obstetric ultrasound (grayscale cross-sectional imaging).'
    : 'This is a 3D/4D obstetric ultrasound (volumetric surface rendering).';

  const regionPrompt = anatomicalRegion === 'face'
    ? FACE_VISION_PROMPT
    : ORGAN_VISION_PROMPT_MAP[anatomicalRegion];

  const clinicalBlock = clinicalNotes.trim()
    ? `\n\nClinical notes from the operator: ${clinicalNotes.trim()}`
    : '';

  const userPrompt = `${scanContext}${clinicalBlock}\n\n${regionPrompt}`;

  const base64Image = imageBuffer.toString('base64');

  try {
    const response = await Promise.race([
      openai.chat.completions.create({
        model: VISION_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_MESSAGE },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${base64Image}`,
                  detail: 'high',
                },
              },
              { type: 'text', text: userPrompt },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1000,
        temperature: 0.1,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('vision_timeout')), VISION_TIMEOUT_MS),
      ),
    ]);

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.warn('Vision analysis: empty response from GPT-4o');
      return null;
    }

    const parsed = JSON.parse(content);
    const result = UltrasoundAnalysisSchema.safeParse(parsed);

    if (!result.success) {
      console.warn('Vision analysis: Zod validation failed:', result.error.issues);
      return null;
    }

    return result.data;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`Vision analysis failed (${message}), falling back to standard prompt`);
    return null;
  }
}
