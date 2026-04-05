# CLAUDE.md — Claude Wrapper

## Read First

Before making changes, read `ecolivenatal_architecture.md`. That file is the only project source of truth.

## Agent Rules

- Treat `ecolivenatal_architecture.md` as canonical for architecture, routes, contracts, visual tokens, and restrictions.
- If you discover drift between the repo and `ecolivenatal_architecture.md`, update the current doc in the same task or explicitly call out the mismatch.
- Keep user-facing copy in `messages/*.json` and consume it through `next-intl`.
- Do not introduce `any`.
- Do not log or persist image payloads.
- Keep `DisclaimerBanner` non-dismissible.
- Preserve client-side HEIC conversion and server-side Zod validation.
- Be conservative with seed/high-risk files listed in `ecolivenatal_architecture.md`.
- The generation pipeline is dual-provider: face/portrait stays on OpenAI, while anatomical flows may route through Gemini based on region and env flags.
- `app/api/internal/generation-telemetry/route.ts` is a protected internal endpoint and must never expose raw image data.
- Keep feature-flag behavior aligned with the documented env vars in `.env.example`.
- Prefer adding tests around pure libs and route handlers first; client DOM coverage is still intentionally lighter than backend/lib coverage.
- Before claiming completion, run `npm run build` and verify it passes cleanly.

## Project Commands

```bash
npm run dev
npm run build
npm run lint
```
