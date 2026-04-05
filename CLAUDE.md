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
- Before claiming completion, run `npm run build` and verify it passes cleanly.

## Project Commands

```bash
npm run dev
npm run build
npm run lint
```
