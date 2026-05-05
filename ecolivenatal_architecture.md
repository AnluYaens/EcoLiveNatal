# EcoLiveNatal Current Architecture

Single source of truth for the current project state. If code and docs diverge, update this file or explicitly flag the mismatch in the same task. Do not use legacy docs as implementation guidance.

## Current Surface Area

- `app/[locale]/page.tsx`: public landing page.
- `app/[locale]/faq/page.tsx`: public FAQ page.
- `app/[locale]/app/page.tsx`: authenticated wizard app behind `TokenGate`.
- `app/[locale]/icon.tsx`: locale-scoped generated app icon.
- `app/manifest.ts`: web app manifest metadata.
- `app/api/verify-token/route.ts`: token verification endpoint with global throttling and per-IP brute-force protection.
- `app/api/generate/route.ts`: generation endpoint for the ultrasound-to-image pipeline.
- `app/api/internal/generation-telemetry/route.ts`: protected internal telemetry snapshot endpoint for non-image observability.

## App Structure

- `app/layout.tsx`: root shell, global font, analytics, speed insights, global body classes.
- `app/[locale]/layout.tsx`: validates locale, sets request locale for static rendering, and provides `NextIntlClientProvider`.
- `app/[locale]/app/layout.tsx`: wizard shell with `BrandHeader`, decorative background, and required `DisclaimerBanner`.
- `components/landing/PublicPageShell.tsx`: shared marketing shell for the public landing and FAQ pages.
- `i18n/config.ts`: canonical locale list and default locale.
- `lib/localePaths.ts`: localized path helpers used by public navigation links.
- `messages/es.json` and `messages/en.json`: source for user-facing copy.
- `tailwind.config.ts` plus `app/globals.css`: semantic theme tokens and shared visual rules.

## Main User Flow

Two layers:

1. Public marketing at `/` for Spanish and `/en` for English (`next-intl` `localePrefix: 'as-needed'`).
2. Protected generation flow at `/app` for Spanish and `/en/app` for English.

Wizard steps (client-side):

- `upload`: select ultrasound, including client-side HEIC/HEIF conversion before upload.
- `crop`: choose the anatomical region, then crop and rotate with region-specific framing guidance.
- `generate`: refine generation options, receive client-side crop-quality warnings, select region-dependent clinical conditions plus free-text notes, and call `/api/generate`. The UI warns when the scan type is atypical for the region; the API rejects invalid region/mode combinations server-side.
- `result`: compare, download, share, regenerate, or start a new session.

Session access is gated by `components/TokenGate.tsx`, which stores:

- `ecln_token`
- `ecln_account_id`
- `ecln_daily_limit`

## API Contracts

### `POST /api/verify-token`

- JSON `{ token }`, UUID-validated with Zod.
- Global rate limit and per-IP lockout.
- Resolves account metadata via `lib/accountStore.ts`.
- Returns structured errors from `lib/apiErrors.ts`.

### `POST /api/generate`

- `multipart/form-data`.
- Requires `image`, `style`, `creativity`, `skinTone`, `mode`, `scanType`, `anatomicalRegion`, `clinicalNotes`, `token`, `accountId`.
- `clinicalNotes` carries both predefined condition labels and optional free-text, capped at 400 characters after server sanitization.
- Validates via `lib/validation.ts` (Zod + cross-field region/mode/scanType rules).
- File-size and mime checks before processing.
- Provider branching: `IMAGE_PROVIDER_STRATEGY=openai_all` is the recommended GPT Image 2 path for both portrait and anatomical flows. Gemini remains available for rollback via `dual` plus `USE_GEMINI_FOR_ORGANS=true`, or explicitly via `gemini_organs`.
- Usage limits via `lib/accountStore.ts` and `lib/usageStore.ts`.
- Returns structured errors with Spanish messages sourced from `messages/es.json`.

## Core Modules

- `lib/promptBuilder.ts`: canonical OpenAI/GPT Image 2 prompt assembly via `buildCanonicalPrompt`, with exactly one prompt per generation type: `portraitPrompt`, `heartPrompt`, and `anatomicalPrompt`. Gemini-specific prompt builders remain for rollback until Phase 9. Deprecated wrappers (`buildPrompt`, `buildEnhancedPrompt`, `buildShortPrompt`, OpenAI heart strict/salvage wrappers) delegate to the canonical API and do not create active GPT Image 2 prompt variants.
- `lib/openaiClient.ts`: OpenAI image generation/edit integration. Seed file; avoid edits unless required. Defaults to `gpt-image-2`, honors `OPENAI_PORTRAIT_MODEL` as a rollback/evaluation override, and uses native aspect-ratio output sizing for GPT Image 2.
- `lib/geminiClient.ts`: Gemini generation path for enabled anatomical flows.
- `lib/imagePreprocess.ts`: ultrasound cleanup for the OpenAI path. Seed file; avoid edits unless required.
- `lib/heartPreprocess.ts`: heart-specific artifact detection and profile selection (strict/salvage). Seed file; avoid edits unless required.
- `lib/cropUtils.ts`: client-side crop extraction. Seed file; avoid edits unless required.
- `lib/clinicalConditions.ts`: region-dependent clinical condition definitions and payload builder.
- `lib/generationProfiles.ts`: shared region metadata, crop guidance, and generation defaults used by the wizard UI.
- `lib/clientImageQuality.ts`: client-side crop heuristics that warn about dark, low-contrast, or undersized subjects before generation.
- `lib/validation.ts`: Zod validation plus cross-field compatibility rules for region/mode/scan-type expectations.
- `lib/visionAnalysis.ts`: optional diagnostics/telemetry analysis. In the canonical GPT Image 2 path, analysis must not create separate prompt variants or enrich prompt text.
- `lib/generationTelemetry.ts`: non-image generation telemetry store and aggregation with Redis-or-file fallback.
- `lib/apiErrors.ts`: server/client-safe error code mapping and Spanish message generation.
- `lib/constants.ts`: operational constants and env-backed app metadata.
- `components/AnatomicalRegionSelector.tsx`: shared anatomical-region selector used in crop and generate steps.

## Non-Negotiable Rules

- All visible UI copy comes from `messages/*.json` via `next-intl`.
- Zero `any` types.
- Never log or persist uploaded/generated image payloads.
- Never write image data to disk.
- `DisclaimerBanner` has no close button.
- Client-side `fetch` calls must use `AbortController` timeouts.
- OpenAI image calls must remain explicitly timed out. The default cap is 120 seconds and can be adjusted with `OPENAI_IMAGE_TIMEOUT_MS` for local/provider evaluation.
- HEIC/HEIF conversion stays client-side.
- API inputs must be server-validated with Zod.
- Finish work by running `npm run build` and confirming a clean result.

## Seed / Restricted Files

Treat as seed or high-risk infra. Only change when the task requires it or they block build/runtime correctness:

- `lib/openaiClient.ts`
- `lib/geminiClient.ts`
- `lib/imagePreprocess.ts`
- `lib/heartPreprocess.ts`
- `lib/cropUtils.ts`
- `middleware.ts`
- `next.config.mjs`
- `tailwind.config.ts`
- `i18n/request.ts`
- `messages/es.json`
- `messages/en.json`

## Diagnostic Flags (Fase A — 2026-04)

Temporary env flags for the fidelity diagnostic. All default off; see `docs/diagnosis_2026_04.md`.

- `OPENAI_PORTRAIT_MODEL` — overrides the OpenAI image edit model (default/recommended `gpt-image-2`).
- `OPENAI_ANATOMICAL_MODEL` — overrides the OpenAI anatomical image edit model when `IMAGE_PROVIDER_STRATEGY=openai_all` (default/recommended `gpt-image-2`).
- `OPENAI_IMAGE_TIMEOUT_MS` — overrides the OpenAI image edit timeout in milliseconds (default `120000`, clamped to `60000`-`300000`).
- `USE_SHORT_PROMPTS` — deprecated in Phase 8; no longer changes GPT Image 2 prompt routing.
- `SKIP_IMAGE_PREPROCESS` — bypasses `preprocessUltrasound`/`stripYellowOverlay`/heart preprocess. GPT Image 2 keeps native aspect-ratio sizing; legacy OpenAI image models may still use the square letterbox path.
- `ENABLE_VISION_ANALYSIS` — optional/default-off analysis for difficult images, debugging, or telemetry. It no longer creates enhanced GPT Image 2 prompt text.

After the diagnostic closes, these flags are expected to be either adopted as defaults, removed, or migrated to a v2 plan (`docs/v2_plan.md`).

## Visual System

Canonical theme tokens live in `tailwind.config.ts` (semantic tokens: `bg-background`, `bg-accent`, `text-text-primary`, `text-text-secondary`, etc.) and `app/globals.css` (CSS custom properties). Do not introduce new raw hex values in UI components unless the code is non-visual image processing.

## Legacy Docs

- `docs/archive/`: historical snapshots and completed plans. Reference only.
- `ecolivenatal_architecture.md`: this file — current architecture source of truth.

## Roadmap Docs

- `docs/v1_5_plan.md`: status snapshot plus remaining near-term work for the v1.5 line.
- `docs/review_rubric.md`: internal review rubric for evaluating real output batches.
- `docs/diagnosis_2026_04.md`: active Fase A diagnostic plan and scoring template.
- `docs/v2_plan.md`: conditional — written only if Fase A triggers a v2 gate (ControlNet + hosted SDXL/Flux).

Real output testing strongly preferred `gpt-image-2`; the recommended path is now to use it as the unified image provider for both portrait/face generation and anatomical/organ visualization.

Recommended behavior:

- OpenAI GPT Image 2 handles face/portrait generation.
- OpenAI GPT Image 2 handles non-face anatomical/organ flows when `IMAGE_PROVIDER_STRATEGY=openai_all`.
- GPT Image 2 uses native aspect-ratio sizing for image edits instead of forcing a 1024×1024 cyan-letterboxed canvas. Legacy OpenAI image models may still use square letterboxing and post-crop restoration.
- GPT Image 2 prompt architecture is canonical: `portraitPrompt` for face/fullBody portrait, `heartPrompt` for heart realistic, and `anatomicalPrompt` for brain/spine/abdomen/fullBody realistic. `USE_SHORT_PROMPTS`, enhanced/vision-analysis prompts, and OpenAI heart strict/salvage prompts are not active branches in the recommended path.
- Gemini remains as rollback/fallback and must not be removed yet.

This phase should not remove the existing dual-provider architecture. Keep provider strategy flags so GPT Image 2 can be the preferred path while Gemini remains available for rollback.

Recommended provider strategy:

```env
IMAGE_PROVIDER_STRATEGY=openai_all

Supported strategy values:

IMAGE_PROVIDER_STRATEGY=openai_all     # recommended: use gpt-image-2 for portrait and anatomical/organ flows
IMAGE_PROVIDER_STRATEGY=dual           # rollback: OpenAI for portrait, Gemini for organs when USE_GEMINI_FOR_ORGANS=true
IMAGE_PROVIDER_STRATEGY=gemini_organs  # explicit anatomical/organ fallback through Gemini

Recommended GPT Image 2 config:

OPENAI_PORTRAIT_MODEL=gpt-image-2
OPENAI_ANATOMICAL_MODEL=gpt-image-2
IMAGE_PROVIDER_STRATEGY=openai_all
SKIP_IMAGE_PREPROCESS=false
ENABLE_VISION_ANALYSIS=false

Stabilization goals:

Keep GPT Image 2 as the preferred source-image fidelity path.
Keep vision analysis available but default-off for diagnostics/telemetry. It must not add competing GPT Image 2 prompt text.
Preserve the current /api/generate request contract unless an implementation plan explicitly approves a change.
Preserve server-side Zod validation.
Preserve client-side HEIC/HEIF conversion.
Preserve the non-dismissible DisclaimerBanner.
Do not log, persist, or write image payloads to disk.
Do not introduce diagnosis, disease detection, clinical recommendations, or medical advice.
Do not modify UI, CSS, layout, landing pages, or wizard visual design during this evaluation.

Success criteria:

gpt-image-2 preserves source orientation, major contours, and visible structure better than or equal to the legacy provider path.
Anatomical/organ outputs do not invent unsupported findings, labels, diseases, damage, or clinical markers.
Portrait outputs do not claim to be real predictions of the baby’s face.
Existing dual-provider behavior can be restored by changing env flags.
npm run build passes cleanly.
No high-risk files are modified unless the implementation plan explicitly requires it.

Rollback strategy:

Set IMAGE_PROVIDER_STRATEGY=dual.
Keep USE_GEMINI_FOR_ORGANS=true if anatomical/organ flows need to return to the previous Gemini path.
Revert OPENAI_PORTRAIT_MODEL and OPENAI_ANATOMICAL_MODEL to the previous stable model values if needed.
Set ENABLE_VISION_ANALYSIS=true only when analysis is needed for difficult images or diagnostics.

Notes:

gpt-image-2 supports image input/output and high-fidelity image inputs, which makes it a strong candidate for image-to-image fidelity evaluation.
Gemini remains a valid fallback during the evaluation because it also supports native image generation and editing workflows.
```
