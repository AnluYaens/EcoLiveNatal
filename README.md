# EcoLiveNatal

EcoLiveNatal is a Next.js application for clinics that turns fetal ultrasound images into AI-generated outputs:

- Newborn portrait renders for fetal face and full-body scans
- Anatomical HDlive-style visualizations for heart, brain, spine, abdomen, and other non-portrait regions

The product includes a public marketing site, a token-gated generation app, bilingual UI (`es` / `en`), and per-account daily usage limits.

> **Medical disclaimer:** All generated images are illustrative and for emotional or educational use only. They are not diagnostic and must not be used for medical decision-making.

---

## What the app does

- Public landing pages at localized routes such as `/es` and `/en`
- Protected generation app at `/[locale]/app`
- Token-based access gate backed by Upstash Redis
- Upload -> crop -> generate -> result flow
- Client-side HEIC/HEIF conversion via `heic2any`
- OpenAI-powered portrait generation for face and full-body portrait mode
- Optional vision-analysis-assisted prompting for better geometry retention
- Optional Google GenAI path for non-face anatomical renders
- Daily per-account limits plus burst rate limiting and brute-force protection

---

## Current flow

1. User opens the landing page and requests access if needed.
2. User enters an access token in the app gate.
3. User uploads an ultrasound image and crops it.
4. User selects region, scan type, generation mode, skin tone, and optional clinical notes.
5. The server preprocesses the image, validates inputs, builds the prompt, and generates the output.
6. User downloads, shares, regenerates, or starts a new session.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16.2.4, React 19.2.5, TypeScript |
| Styling | Tailwind CSS |
| i18n | `next-intl` |
| Portrait generation | OpenAI image editing API |
| Vision analysis | OpenAI multimodal analysis |
| Optional anatomical generation | Google GenAI |
| Image processing | `sharp`, `react-easy-crop`, `heic2any` |
| Validation | `zod` |
| Auth and quota storage | Upstash Redis |
| Tests | Vitest |
| Package manager | pnpm |

---

## Quick start

This repo uses `pnpm` as its package manager.

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create your env file

```bash
cp .env.example .env
```

Fill in the required secrets before running the app.

### 3. Configure Upstash Redis

EcoLiveNatal currently expects token authentication data in Redis. Create an Upstash Redis database and set:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### 4. Create access tokens

Use the included script to generate a token and store the account metadata in Redis:

```bash
pnpm dlx tsx scripts/generate-token.ts --name "Dr. Garcia" --id dr-garcia --limit 50
```

This stores the token payload in Redis under the app namespace and prints the UUID token you can share with the clinic user.

### 5. Run the app

```bash
pnpm dev
```

Then open:

- Landing page: `http://localhost:3000/es`
- App: `http://localhost:3000/es/app`

---

## Environment variables

Reference: [`.env.example`](./.env.example)

| Variable | Required | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes | Required for portrait generation and vision analysis |
| `UPSTASH_REDIS_REST_URL` | Yes | Redis REST URL for token lookup and usage tracking |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Redis REST token |
| `NEXT_PUBLIC_APP_TITLE` | No | App title shown in the UI |
| `NEXT_PUBLIC_CLINIC_NAME` | No | Clinic branding label |
| `NEXT_PUBLIC_CLINIC_LOGO_URL` | No | Clinic logo shown in the header |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | No | WhatsApp number used in landing CTA and token-request links |
| `MOCK_API` | No | Set to `true` to return a mock image instead of calling OpenAI |
| `ENABLE_SESSION_IMAGE_CACHE` | No | Enables in-memory caching for identical requests |
| `ENABLE_VISION_ANALYSIS` | No | Enables ultrasound analysis before prompt assembly |
| `USE_GEMINI_FOR_ORGANS` | No | Routes non-face anatomical renders through Google GenAI |
| `GOOGLE_GENAI_API_KEY` | Only if `USE_GEMINI_FOR_ORGANS=true` | API key for Google GenAI |

---

## Token and account model

Access is token-based, not PIN-file-based.

- Tokens are UUIDs stored in Redis.
- Each token maps to an account payload with `id`, `name`, and `dailyLimit`.
- `/api/verify-token` validates the token and returns the resolved account metadata.
- `/api/generate` re-validates the token and enforces the account quota.

Relevant Redis key patterns:

- `ecln:token:<uuid>`
- `ecln:account:<accountId>`
- `ecln:usage:<YYYY-MM-DD>:<accountId>`

`dailyLimit: 0` means unlimited usage.

---

## Security model

| Layer | Mechanism |
| --- | --- |
| Access control | UUID token required for app access |
| Token verification | Server-side Redis lookup on every protected request |
| Burst protection | In-memory IP limiter on `/api/generate` |
| Brute-force protection | Per-IP lockout logic on `/api/verify-token` |
| Daily quota | Per-account request limit |
| Input safety | Zod validation plus server-side image validation |
| Privacy | No intentional image persistence by the app |

---

## Project structure

```text
ecolivenatal/
├── app/
│   ├── api/
│   │   ├── generate/
│   │   └── verify-token/
│   ├── [locale]/
│   │   ├── app/
│   │   └── faq/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── landing/
│   ├── CropStep.tsx
│   ├── GenerateStep.tsx
│   ├── TokenGate.tsx
│   ├── ResultStep.tsx
│   └── UploadStep.tsx
├── lib/
│   ├── accountStore.ts
│   ├── bruteForce.ts
│   ├── constants.ts
│   ├── cropUtils.ts
│   ├── geminiClient.ts
│   ├── imagePreprocess.ts
│   ├── openaiClient.ts
│   ├── promptBuilder.ts
│   ├── usageStore.ts
│   ├── validation.ts
│   └── visionAnalysis.ts
├── messages/
├── scripts/
│   └── generate-token.ts
└── config/
    └── accounts.example.json
```

Note: `config/accounts.example.json` remains in the repo as sample material, but the current runtime auth flow uses Redis-backed tokens.

---

## Deployment notes

### Recommended

Deploy with:

- Redis configured
- HTTPS enabled
- `OPENAI_API_KEY` present
- `NEXT_PUBLIC_WHATSAPP_NUMBER` configured if you want the request-access CTA

### Vercel

Works on Vercel, but note:

- in-memory rate limiting resets on cold starts
- in-memory session image cache is per instance
- Redis is required for shared token and usage state

---

## Privacy notes

- The app does not intentionally persist uploaded ultrasound images.
- Generated outputs are returned directly to the client.
- External AI providers may apply their own data retention or policy controls.
- Review hosting logs, CDN logs, and provider policies before production use with patient data.

---

## Useful commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm test
```

---

## Verification

Before shipping changes:

- `pnpm build` must pass
- token verification flow must work against Redis
- generation flow should be tested with `MOCK_API=true` before live API usage

---

## License

Copyright (c) 2026. All rights reserved. See [LICENSE](./LICENSE).
