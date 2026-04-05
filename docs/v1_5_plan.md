# EcoLiveNatal v1.5 Plan

This document defines the next product/engineering phase for EcoLiveNatal using the current stack. It is intentionally scoped to improve fidelity, control, and observability without introducing a dedicated diffusion backend yet.

## Why v1.5 First

The current app already has the critical base flow in place:

- client-side upload with HEIC/HEIF conversion
- client-side crop and rotation
- server-side preprocessing and validation
- prompt-driven generation with OpenAI/Gemini branching
- optional vision analysis used to anchor prompts

The next step should improve reliability inside that architecture before introducing GPU orchestration, segmentation services, or ControlNet infrastructure.

## Goals

- Increase structural fidelity for face and anatomical outputs using the current providers.
- Reduce bad generations caused by overlays, loose region selection, and weak region-specific instructions.
- Make quality measurable so the team can decide with evidence whether a v2 backend is justified.
- Preserve existing safety, privacy, and validation constraints.

## Non-Goals

- No dedicated diffusion server in v1.5.
- No SAM, MedSAM, ControlNet, ComfyUI, or self-hosted GPU queue in v1.5.
- No claim of diagnostic reconstruction.
- No storage of uploaded or generated image payloads.

## Current Constraints To Preserve

- `DisclaimerBanner` remains non-dismissible.
- HEIC/HEIF conversion remains client-side.
- API inputs remain Zod-validated server-side.
- No image payload logging or persistence.
- OpenAI timeout remains capped at 60 seconds.
- User-facing copy continues to live in `messages/*.json`.

## v1.5 Scope

### 1. Input Conditioning

Objective: make the cropped input cleaner and more intentional before it reaches generation.

Work:

- Strengthen overlay removal for non-face scans beyond the current top/bottom and side blackout strategy.
- Add region-aware crop guidance in the UI so users frame face, heart, brain, spine, abdomen, or full body differently.
- Add light input-quality heuristics before generation:
  - crop too wide
  - crop too dark
  - subject too small
  - likely wrong scan type for selected region

Likely touchpoints:

- `components/CropStep.tsx`
- `components/GenerateStep.tsx`
- `lib/imagePreprocess.ts`
- `lib/visionAnalysis.ts`
- `messages/es.json`
- `messages/en.json`

### 2. Region-Specific Generation Profiles

Objective: stop treating all regions as minor prompt variants.

Work:

- Define explicit generation presets per region:
  - provider path
  - mode defaults
  - creativity defaults
  - scan-type assumptions
  - stricter negative instructions
- Split `face` and `fullBody` portrait behavior more clearly.
- Harden organ prompts to prefer anatomical consistency over visual richness.
- Keep condition tags as context only, never as instructions that change geometry.

Likely touchpoints:

- `components/GenerateStep.tsx`
- `lib/promptBuilder.ts`
- `lib/clinicalConditions.ts`
- `lib/validation.ts`

### 3. Better Analysis-Driven Anchoring

Objective: use the existing analysis pipeline as a stronger control layer.

Work:

- Improve how `visionAnalysis` output feeds prompt construction for each region.
- For face:
  - preserve off-center framing
  - preserve tilt and facing direction
  - preserve hand-near-face information
- For organs:
  - push view plane, visible structures, and exact layout more aggressively into prompts
  - reject ambiguous analysis rather than overcommitting to anatomy

Likely touchpoints:

- `lib/visionAnalysis.ts`
- `lib/promptBuilder.ts`
- `app/api/generate/route.ts`

### 4. UX Clarity And Wait-State Handling

Objective: make the workflow feel deliberate and trustworthy.

Work:

- Add region-specific helper copy during crop and generation.
- Make loading text reflect the selected path, for example:
  - cleaning scan
  - analyzing structure
  - generating portrait
  - rendering anatomy
- Surface actionable retry guidance when input quality is low.

Likely touchpoints:

- `components/CropStep.tsx`
- `components/GenerateStep.tsx`
- `components/LoadingOverlay.tsx`
- `messages/es.json`
- `messages/en.json`

### 5. Measurement And Decision Support

Objective: create a hard gate for whether v2 is worth building.

Work:

- Add non-image telemetry around:
  - selected region
  - selected mode
  - selected scan type
  - provider chosen
  - preprocessing path used
  - timeout/error category
  - generation duration bucket
  - cache hit/miss
- Add an internal review rubric for output quality:
  - geometry fidelity
  - region correctness
  - overlay leakage
  - uncanny artifacts
  - clinical plausibility for anatomy mode

Rules:

- Telemetry must never include raw image data, base64 payloads, or user-entered PHI beyond already accepted textual notes.

Likely touchpoints:

- `app/api/generate/route.ts`
- internal review process documentation

## Suggested Delivery Order

### Phase 1. Crop and prompt tightening

- Add crop guidance by region.
- Refactor region presets out of `GenerateStep`.
- Tighten `promptBuilder` defaults and negative rules.

Success signal:

- better consistency without API contract changes

### Phase 2. Preprocess and analysis upgrades

- Improve overlay suppression.
- Strengthen analysis-to-prompt anchoring.
- Add low-quality input rejection or warning paths where confidence is weak.

Success signal:

- fewer structurally wrong generations for organ views

### Phase 3. Telemetry and review loop

- Add structured non-image telemetry.
- Review real outputs against a shared rubric.
- Decide whether failure patterns are prompt/preprocess problems or hard provider limits.

Success signal:

- evidence-based v2 decision instead of intuition

## Acceptance Criteria For v1.5

- Face generations preserve framing and head orientation more consistently than the current baseline.
- Organ generations leak fewer annotations and fewer obviously misplaced structures.
- The user gets region-appropriate guidance before generation.
- The team can identify which failures come from input quality, provider behavior, or prompt weakness.
- No privacy regression is introduced.

## v2 Trigger Criteria

Proceed to v2 only if one or more of these remain true after v1.5:

- organ outputs still drift structurally even with stronger preprocessing and analysis anchoring
- face outputs still lose identity cues too often
- provider behavior is too inconsistent to control with prompts alone
- the team needs deterministic structural control rather than probabilistic text guidance

## v2 Direction

If v1.5 proves the product value but exposes control limits, v2 should add:

- dedicated async job orchestration
- explicit segmentation or masking stage
- ControlNet-style structural conditioning
- per-region generation pipelines
- GPU-backed worker isolation from the Next.js request lifecycle

## Implementation Notes

- v1.5 should stay compatible with the current `POST /api/generate` contract wherever possible.
- Any new user-visible messaging must be added via `next-intl`.
- Seed files should only be changed when the phase explicitly requires it.
