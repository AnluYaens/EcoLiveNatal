# EcoLiveNatal Current Architecture

This file is the single source of truth for the current project state. If code and docs diverge, update this file or explicitly flag the mismatch in the same task. Do not use legacy docs as implementation guidance.

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

The app is not a single root-page wizard anymore. The current product has two layers:

1. Public marketing layer at `/` for the default Spanish locale and `/en` for English (`next-intl` `localePrefix: 'as-needed'`).
2. Protected generation flow at `/app` for Spanish and `/en/app` for English.

The protected flow is a client-side wizard with these steps:

- `upload`: select ultrasound file, including client-side HEIC/HEIF conversion before upload.
- `crop`: choose the anatomical region, then crop and rotate on the client with region-specific framing guidance.
- `generate`: refine generation options using the shared anatomical-region selection, receive lightweight client-side crop-quality warnings, select region-dependent clinical conditions from a dropdown (conditions change per anatomical region) plus free-text notes, and call `/api/generate`.
  The UI also warns when the selected scan type is atypical for the chosen region, and the API rejects invalid region/mode combinations server-side.
- `result`: compare, download, share, regenerate, or start a new session.

Session access is gated by `components/TokenGate.tsx`, which stores:

- `ecln_token`
- `ecln_account_id`
- `ecln_daily_limit`

## API Contracts

### `POST /api/verify-token`

- Accepts JSON with `{ token }`.
- Validates UUID shape with Zod.
- Applies a global rate limit and per-IP lockout protection.
- Resolves account metadata through `lib/accountStore.ts`.
- Returns structured API errors from `lib/apiErrors.ts`.

### `POST /api/generate`

- Accepts `multipart/form-data`.
- Requires `image`, `style`, `creativity`, `skinTone`, `mode`, `scanType`, `anatomicalRegion`, `clinicalNotes`, `token`, and `accountId`.
- `clinicalNotes` now carries both predefined condition labels and optional free-text notes, capped at 400 characters after server sanitization.
- Validates input through `lib/validation.ts`.
- Enforces file-size and mime checks before processing.
- Uses OpenAI or Gemini branching based on anatomical region and environment flags.
- Region-dependent clinical condition tags (face, heart, brain, spine, abdomen, fullBody) are available as a structured way to populate `clinicalNotes` via `lib/clinicalConditions.ts`; they do not override pose, direction, or geometric fidelity rules.
- Applies usage limits through `lib/accountStore.ts` and `lib/usageStore.ts`.
- Returns structured API errors with Spanish messages sourced from `messages/es.json`.

## Core Modules

- `lib/promptBuilder.ts`: prompt assembly for portrait and anatomical generation variants.
- `lib/openaiClient.ts`: OpenAI image generation/edit integration. Seed file; avoid edits unless required.
- `lib/geminiClient.ts`: Gemini generation path for enabled anatomical flows.
- `lib/imagePreprocess.ts`: ultrasound cleanup for the OpenAI path. Seed file; avoid edits unless required.
- `lib/cropUtils.ts`: client-side crop extraction. Seed file; avoid edits unless required.
- `lib/clinicalConditions.ts`: region-dependent clinical condition definitions and payload builder.
- `lib/generationProfiles.ts`: shared region metadata, crop guidance, and generation defaults used by the wizard UI.
- `lib/clientImageQuality.ts`: client-side crop heuristics used to warn about dark, low-contrast, or undersized subjects before generation.
- `lib/validation.ts`: Zod validation plus cross-field compatibility rules for region, mode, and scan-type expectations.
- `lib/visionAnalysis.ts`: optional analysis used to enrich prompts, now including organ confidence, overlay interference, and sidedness/layout cues for anatomical flows.
- `lib/generationTelemetry.ts`: non-image generation telemetry store and aggregation helpers using Redis-or-file fallback.
- `lib/apiErrors.ts`: server/client-safe error code mapping and Spanish message generation.
- `lib/constants.ts`: operational constants and env-backed app metadata.
- `components/AnatomicalRegionSelector.tsx`: shared anatomical-region selector used in crop and generate steps.

## Non-Negotiable Rules

- All visible UI copy comes from `messages/*.json` through `next-intl`.
- Zero `any` types.
- Never log or persist uploaded/generated image payloads.
- Never write image data to disk.
- `DisclaimerBanner` has no close button.
- Client-side `fetch` calls must use `AbortController` timeouts.
- OpenAI calls must remain capped at 60 seconds.
- HEIC/HEIF conversion stays client-side.
- API inputs must be server-validated with Zod.
- Finish work by running `npm run build` and confirming a clean result.

## Seed / Restricted Files

These files are treated as seed or high-risk infra files. Only change them when the task requires it or when they block build/runtime correctness:

- `lib/openaiClient.ts`
- `lib/imagePreprocess.ts`
- `lib/cropUtils.ts`
- `middleware.ts`
- `next.config.mjs`
- `tailwind.config.ts`
- `i18n/request.ts`
- `messages/es.json`
- `messages/en.json`

## Visual System

Canonical theme tokens:

- Background: `#FAFAF8`
- Accent: `#1B3A5C`
- Accent hover: `#152E4A`
- Accent light: `#E8EEF4`
- Text primary: `#3D3535`
- Text secondary: `#888888`
- Font: Plus Jakarta Sans with Inter fallback
- Cards: rounded 2xl with soft shadow
- Buttons: rounded xl or rounded full depending on pattern

Use Tailwind semantic tokens like `bg-background`, `bg-accent`, `text-text-primary`, `text-text-secondary`, or CSS custom properties. Do not introduce new raw hex values in UI components unless the code is non-visual image processing.

## Legacy Docs

- `docs/archive/ecolivenatal_architecture_legacy.md`: archived snapshot of the original architecture document. Historical reference only.
- `ecolivenatal_architecture.md`: current architecture source of truth.

## Roadmap Docs

- `docs/v1_5_plan.md`: approved near-term execution plan for strengthening the current prompt/preprocess pipeline before any dedicated v2 diffusion backend.
- `docs/review_rubric.md`: internal review rubric for evaluating real output batches against geometry, overlay leakage, artifacts, and clinical plausibility.
