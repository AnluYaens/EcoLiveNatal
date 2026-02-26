# EcoLiveNatal — Architecture Document

## Instructions for the Agent

You are building **EcoLiveNatal**, a web app that transforms 3D/4D fetal ultrasound photos into photorealistic newborn portraits using the OpenAI `gpt-image-1` model.

Read `CLAUDE.md` (if using Claude Code) or `AGENTS.md` (if using Codex) before writing any code. All rules there are non-negotiable.

### How to read this document

- **This document describes architecture, not implementation.** It tells you *what* each module does, *what* it receives, *what* it returns, and *why* key decisions were made. You decide *how* to implement it.
- **Seed files exist in the repo.** Several files are already written and committed (`lib/openaiClient.ts`, `lib/imagePreprocess.ts`, `lib/cropUtils.ts`, configs). **Do not modify or rewrite them** unless they fail to compile — in that case, fix the minimum necessary to resolve the error while preserving the logic.
- **All visible text must come from `messages/*.json` files.** Zero hardcoded user-facing strings in components. The JSON files are provided as seed files — copy them exactly.

---

## 1. Project Setup

### Scaffold

```bash
npx create-next-app@14 . --typescript --tailwind --app --src-dir=false --eslint --import-alias "@/*"
npm install openai sharp react-easy-crop next-intl zod heic2any
npm install -D @types/node
```

### Environment

See `.env.example` (seed file) for required variables. Create `.env.local` with real values.

### Seed files already in the repo

Copy these into their correct locations before writing any new code:

```
seed/lib/openaiClient.ts      → lib/openaiClient.ts
seed/lib/imagePreprocess.ts    → lib/imagePreprocess.ts
seed/lib/cropUtils.ts          → lib/cropUtils.ts
seed/next.config.mjs           → next.config.mjs
seed/middleware.ts              → middleware.ts
seed/tailwind.config.ts        → tailwind.config.ts
seed/i18n/request.ts           → i18n/request.ts
seed/messages/es.json          → messages/es.json
seed/messages/en.json          → messages/en.json
seed/.env.example              → .env.example
```

---

## 2. User Flow

The app is a single-page wizard with 4 sequential steps. State is managed with React `useState` — no URL params, no router navigation.

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Upload   │ ──▶ │   Crop   │ ──▶ │ Generate │ ──▶ │  Result  │
│           │     │          │     │          │     │          │
│ file: File│     │blob: Blob│     │ POST API │     │ base64   │
│ (HEIC→PNG)│     │          │     │          │     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                   ◀── back          ◀── back        ◀── regen
                                                     ◀── reset (→ Upload)
```

**HEIC handling:** HEIC/HEIF files are converted to PNG **client-side** using `heic2any` at the Upload step, before any other processing. The server always receives JPEG or PNG — it never handles HEIC. This avoids `libheif` dependency issues in serverless environments.

**Data flow between steps:**

| Transition        | Data passed                       |
| ----------------- | --------------------------------- |
| Upload → Crop     | `File` (original image)           |
| Crop → Generate   | `Blob` (cropped PNG)              |
| Generate → Result | `string` (base64 PNG from API)    |
| Regenerate        | Go back to Generate, keep `Blob`  |
| New Session       | Reset everything, go to Upload    |

**Always visible regardless of step:**

- `BrandHeader` — top of page
- `DisclaimerBanner` — sticky bottom on mobile, never dismissable

---

## 3. Module Responsibilities

### `app/page.tsx` — Step Orchestrator

Manages the wizard state and the data shared between steps. Renders the correct step component based on current state.

**State shape:**

```typescript
type Step = 'upload' | 'crop' | 'generate' | 'result';

// Managed state:
step: Step
originalFile: File | null
croppedBlob: Blob | null
resultBase64: string | null
```

Each step component receives only what it needs via props and communicates back via callbacks.

---

### `app/layout.tsx` — Shell

- Font: Plus Jakarta Sans via `next/font/google`, fallback Inter.
- Background: `#FAFAF8`.
- Wraps children with `NextIntlClientProvider`.
- Renders `<BrandHeader />` above children, `<DisclaimerBanner />` below.
- `<html lang="es">`.

---

### `app/globals.css` — Base Styles

Tailwind directives (`@tailwind base/components/utilities`) plus:

```css
:root { --color-accent: #E8A0A0; }
body { background-color: #FAFAF8; color: #3D3535; }
```

---

### `app/api/generate/route.ts` — API Endpoint

`POST` handler. This is where all server-side logic converges.

**Pipeline:**

```
Request (FormData)
  │
  ├─ 1. Rate limit check (5 req/IP/min, in-memory Map)
  ├─ 2. Validate Content-Type is multipart/form-data
  ├─ 3. Parse FormData: image (File), style (string), creativity (string)
  ├─ 4. Validate style + creativity with Zod (GenerateSchema)
  ├─ 5. Validate image: ≤10 MB, mime in SUPPORTED_MIME_TYPES
  ├─ 6. preprocessUltrasound(buffer) → cleaned Buffer
  ├─ 7. buildPrompt(style, creativity) → prompt string
  ├─ 8. generatePortrait(buffer, prompt) → base64 string (60s timeout)
  │
  └─ Response: { image: string } or { error: string }
```

**Error mapping** (all messages come from `messages/*.json` keys for reference, but the API returns plain Spanish strings):

| Condition                       | HTTP | Error message key    |
| ------------------------------- | ---- | -------------------- |
| Rate limit exceeded             | 429  | `errors.rateLimit`   |
| OpenAI content_policy_violation | 400  | `errors.contentBlock` |
| OpenAI timeout (60s)            | 504  | `errors.timeout`     |
| Any other error                 | 500  | `errors.generic`     |

**Hard rules:**
- Never log or persist image data (base64 or binary).
- The server always receives JPEG or PNG — HEIC is converted client-side before upload.
- Rate limit Map must include this comment:
  ```
  // ⚠️ In-memory rate limiting — resets on each serverless cold start.
  // For production multi-instance deployments, replace with Redis/Upstash.
  ```

---

### `lib/constants.ts` — Single Source of Truth

All magic numbers and config values live here. Other files import from here — no duplication.

**Exports:**

```typescript
MAX_FILE_SIZE_MB: 10
MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024
SUPPORTED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']
DEFAULT_CREATIVITY: 50
DEFAULT_STYLE: 'soft'
APP_NAME: string    // from NEXT_PUBLIC_APP_TITLE env var, default 'EcoLiveNatal'
CLINIC_NAME: string // from NEXT_PUBLIC_CLINIC_NAME env var, default ''
CLINIC_LOGO: string // from NEXT_PUBLIC_CLINIC_LOGO_URL env var, default ''
```

---

### `lib/validation.ts` — Zod Schemas

Imports constants from `lib/constants.ts`.

**Exports:**

```typescript
GenerateSchema: z.ZodObject  // { style: 'soft'|'ultra'|'cinematic', creativity: number 0-100 }
GenerateInput: type           // inferred from GenerateSchema
```

---

### `lib/promptBuilder.ts` — Prompt Assembly

Pure function, no side effects.

**Signature:** `buildPrompt(style: Style, creativity: number) → string`

**Prompt structure** (4 sections joined with double newlines):

1. **Base prompt** — transform ultrasound to newborn portrait, preserve facial geometry, realistic skin, peaceful sleeping baby, remove all ultrasound artifacts, neutral background.
2. **Style modifier** — varies by selection:
   - `soft`: warm, gentle, pastel, tender
   - `ultra`: sharp details, natural texture, studio lighting
   - `cinematic`: dramatic lighting, shallow depth of field, bokeh
3. **Creativity modifier** — varies by range:
   - 0–30: strict geometry preservation
   - 31–70: balance fidelity with quality
   - 71–100: enhance realism, maintain unique features
4. **Negative constraints** — no adult features, no teeth, no makeup, no cartoon eyes, no deformations, no watermarks, no text, no medical equipment, no scan artifacts.

---

### `lib/openaiClient.ts` — ⚠️ SEED FILE, DO NOT MODIFY

Calls `openai.images.edit()` with the ultrasound image as input. See seed file for exact implementation.

**Key decisions baked into the seed file (do not change):**
- Uses `images.edit`, not `images.generate` — the ultrasound must be passed as input reference.
- `n: 1` — always, never change.
- `response_format: 'b64_json'` — returns base64 directly, not a temporary URL.
- Does NOT pass `input_fidelity` or `quality` — unsupported by `images.edit`.

---

### `lib/imagePreprocess.ts` — ⚠️ SEED FILE, DO NOT MODIFY

Cleans the ultrasound image before sending to OpenAI. See seed file for exact implementation.

**Key decisions baked into the seed file (do not change):**
- Black-fills top/bottom 12% to remove patient data overlays. Uses black (not transparency) because the model interprets alpha as "inpaint here".
- Uses `sharp.create()` for black strips instead of inline SVG — works in serverless environments without `librsvg`.
- Pipeline: flatten → composite black strips → normalize (auto-levels) → resize to max 1024px → export PNG buffer.

---

### `lib/cropUtils.ts` — ⚠️ SEED FILE, DO NOT MODIFY

Client-side canvas utility for extracting the cropped region with rotation support. See seed file for exact implementation.

**Key decisions baked into the seed file (do not change):**
- Calculates the rotated bounding box before drawing — prevents clipping on rotated images.
- Uses a temporary full-size canvas → `getImageData` → correctly-sized output canvas pattern.
- Returns a PNG `Blob`.

---

## 4. Component Contracts

Every component is a React client component (`'use client'`). All visible text uses `useTranslations()` from `next-intl`.

---

### `BrandHeader`

| Prop | Type | Notes |
| ---- | ---- | ----- |
| *(none)* | — | Reads from env vars via constants |

- Shows app title (from `APP_NAME`).
- Conditionally shows clinic logo (`next/image`) and clinic name if env vars are set.
- Styling: centered, `text-primary` color, subtle bottom border.

---

### `DisclaimerBanner`

| Prop | Type | Notes |
| ---- | ---- | ----- |
| *(none)* | — | Text from `t('disclaimer.text')` |

- Sticky bottom on mobile. Background `#FFF3CD`. Small centered text.
- **NO close button. NO dismiss. EVER.** This is a legal requirement.

---

### `UploadStep`

| Prop | Type | Notes |
| ---- | ---- | ----- |
| `onFileSelected` | `(file: File) => void` | Called after validation and HEIC conversion |

- Full-width drag & drop zone, min-height 200px on mobile.
- Two buttons: file picker (`📁`) and camera (`📷` with `capture="environment"`).
- Privacy badge: `🔒` + translated text.
- Client-side validation: file size ≤ 10MB, mime type in supported list. Shows translated errors.
- **HEIC conversion:** If the selected file is `image/heic` or `image/heif`, convert it client-side using `heic2any` before calling `onFileSelected`. Show a brief loading indicator during conversion. Wrap in try/catch — if conversion fails, show `t('uploadZone.errorHeic')` and do not proceed. After conversion, the `File` passed to `onFileSelected` is always JPEG or PNG.

---

### `CropStep`

| Prop | Type | Notes |
| ---- | ---- | ----- |
| `file` | `File` | The uploaded image |
| `onCropped` | `(blob: Blob) => void` | Called with cropped PNG blob |
| `onBack` | `() => void` | Return to Upload |

- Uses `react-easy-crop` (`import Cropper from 'react-easy-crop'`).
- Zoom slider: 1–3, step 0.1. Rotate slider: -180 to 180, step 1.
- Shows tip text from translations.
- Confirm button calls `getCroppedImg` from `lib/cropUtils.ts`.
- Creates `URL.createObjectURL(file)` on mount, revokes on unmount.

---

### `GenerateStep`

| Prop | Type | Notes |
| ---- | ---- | ----- |
| `croppedBlob` | `Blob` | The cropped image |
| `onResult` | `(base64: string) => void` | Called with API result |
| `onBack` | `() => void` | Return to Crop |

- Renders 3 `StyleCard` components (row ≥640px, stack on smaller).
- Renders `CreativitySlider`.
- Generate button: full width, accent color, `rounded-xl`.
- On click: shows `LoadingOverlay`, builds FormData, fetches `/api/generate` with `AbortController` (90s timeout).
- On error: hides overlay, shows `ErrorMessage` with retry callback.

---

### `ResultStep`

| Prop | Type | Notes |
| ---- | ---- | ----- |
| `imageBase64` | `string` | The generated portrait as base64 |
| `onRegenerate` | `() => void` | Go back to Generate |
| `onNewSession` | `() => void` | Reset to Upload |

- Shows image: `<img src="data:image/png;base64,..." />`, `w-full max-w-lg mx-auto rounded-2xl shadow-md`.
- 4 action buttons (2×2 grid on mobile, row on desktop):
  - **Download**: base64 → `atob` → `Uint8Array` → `Blob` → `URL.createObjectURL` → `<a download="retrato-ecolivenatal.png">`.
  - **WhatsApp**: try `navigator.share({ files: [...] })` first. Fallback: `https://wa.me/?text=<encoded>`.
  - **Regenerate**: calls `onRegenerate()`.
  - **New session**: calls `onNewSession()`.

---

### `StyleCard`

| Prop | Type | Notes |
| ---- | ---- | ----- |
| `styleKey` | `string` | e.g. `'soft'` |
| `label` | `string` | Translated name |
| `description` | `string` | Translated description |
| `selected` | `boolean` | |
| `onSelect` | `() => void` | |

- Selected: `border-2 border-accent bg-[#fff5f5]`.
- Unselected: `border border-gray-200 bg-white`.
- `rounded-2xl`, padding, pointer cursor, transition.

---

### `CreativitySlider`

| Prop | Type | Notes |
| ---- | ---- | ----- |
| `value` | `number` | Current 0–100 |
| `onChange` | `(v: number) => void` | |

- `<input type="range">` styled with accent color.
- Numeric value display.
- Three labels: Faithful (0) — Balanced (50) — Creative (100).

---

### `LoadingOverlay`

| Prop | Type | Notes |
| ---- | ---- | ----- |
| `visible` | `boolean` | Show/hide |

- Full-screen overlay: `fixed inset-0 bg-black/50 z-50`.
- Centered card with CSS spinner in accent color.
- Rotating messages every 4s from translations (`generate.loading1/2/3`).
- Estimated time from `t('generate.estimatedTime')`.

---

### `ErrorMessage`

| Prop | Type | Notes |
| ---- | ---- | ----- |
| `message` | `string` | Error text to display |
| `onRetry` | `(() => void) \| undefined` | Optional retry handler |

- Soft red/pink card, rounded, centered.
- Shows retry button (`t('errors.retry')`) if `onRetry` provided.

---

## 5. Design Tokens (from CLAUDE.md)

| Token                  | Value                       | Rule                 |
| ---------------------- | --------------------------- | -------------------- |
| Background             | `#FAFAF8`                   | Never pure white     |
| Accent                 | `#E8A0A0`                   | Never blue           |
| Accent hover           | `#d98f8f`                   |                      |
| Primary text           | `#3D3535`                   | Never pure black     |
| Secondary text         | `#888888`                   |                      |
| Card radius            | `rounded-2xl` + `shadow-sm` |                      |
| Button radius          | `rounded-xl`                |                      |
| Font primary           | Plus Jakarta Sans           |                      |
| Font fallback          | Inter → sans-serif          |                      |
| Layout                 | Mobile-first, responsive    |                      |
| Upload zone min height | 200 px on mobile            |                      |
| Result image           | `w-full` on mobile          |                      |

All tokens are pre-configured in the seed `tailwind.config.ts`. Use the Tailwind classes (`bg-background`, `text-text-primary`, `bg-accent`, etc.) — do not hardcode hex values in components.

---

## 6. Execution Order

1. Copy all seed files to their target locations.
2. Run `npx create-next-app@14` (if not already scaffolded).
3. Run `npm install` for additional dependencies.
4. Create `lib/constants.ts` and `lib/validation.ts`.
5. Create `lib/promptBuilder.ts`.
6. Create `app/globals.css`.
7. Create all components in `components/`.
8. Create `app/api/generate/route.ts`.
9. Create `app/layout.tsx` and `app/page.tsx`.
10. Run `npm run build` — fix any TypeScript errors until clean.
11. Run `npm run dev` — verify app loads at `localhost:3000`.
12. Test: upload → crop → generate → result.

---

## 7. Verification Checklist

Do NOT declare the task complete until every item passes.

### Build & Types
- [ ] `npm run build` — zero TypeScript errors.
- [ ] Zero `any` types in the entire codebase.

### Seed File Integrity
- [ ] `lib/openaiClient.ts` is unmodified from seed (uses `images.edit`, `n: 1`, `response_format: 'b64_json'`, no `input_fidelity`, no `quality`).
- [ ] `lib/imagePreprocess.ts` is unmodified from seed (uses `sharp.create()`, no SVG strings).
- [ ] `lib/cropUtils.ts` is unmodified from seed (full `getCroppedImg` with rotation support).
- [ ] `middleware.ts` is unmodified from seed (has `localePrefix: 'as-needed'`).

### Functionality
- [ ] All visible text comes from `messages/*.json` — zero hardcoded strings in components.
- [ ] `DisclaimerBanner` has no close/dismiss button.
- [ ] Rate limiting is active in API route with `⚠️` production comment.
- [ ] Client fetch in `GenerateStep` uses `AbortController` with 90s timeout.
- [ ] `ErrorMessage` is shown for all API error states.
- [ ] WhatsApp share uses Web Share API with `wa.me` fallback.
- [ ] Download converts base64 → Blob → `<a download>`.
- [ ] HEIC files are converted client-side via `heic2any` in `UploadStep` — server never receives HEIC.

### Security & Privacy
- [ ] No image data (base64 or binary) is logged to console.
- [ ] No images are written to disk (`fs.writeFile` never used with image data).
- [ ] `.env.example` exists with all required keys (no real values).

### Responsive
- [ ] App renders correctly at 375px viewport width (iPhone SE).
- [ ] `messages/en.json` has the exact same key structure as `messages/es.json`.
- [ ] Constants are defined only in `lib/constants.ts`, imported everywhere else.
