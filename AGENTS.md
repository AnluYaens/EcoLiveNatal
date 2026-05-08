# AGENTS.md — Agent Rules

This file is the single source of truth for rules that all coding agents (Cursor, Claude Code, Codex, OpenAI Code Interpreter, etc.) must follow in this repo.

## Architecture Rules

- Treat `ecolivenatal_architecture.md` as canonical. If you discover drift between the repo and that file, update it in the same task or explicitly call out the mismatch.
- The generation pipeline is dual-provider: face/portrait stays on OpenAI, while anatomical flows may route through Gemini based on region and env flags.
- Keep feature-flag behavior aligned with the documented env vars in `.env.example`.
- `app/api/internal/generation-telemetry/route.ts` is a protected internal endpoint and must never expose raw image data.
- Be conservative with seed / high-risk files listed in `ecolivenatal_architecture.md`.

## Code Rules

- Do not introduce `any`.
- Keep user-facing copy in `messages/*.json` and consume it through `next-intl`.
- Preserve client-side HEIC/HEIF conversion (`heic2any`) and server-side Zod validation.
- Keep `DisclaimerBanner` non-dismissible.
- Do not log or persist image payloads. Do not write image data to disk.
- Client-side `fetch` calls must use `AbortController` timeouts.
- OpenAI image calls must remain explicitly timed out. The default cap is 120 seconds and can be adjusted with `OPENAI_IMAGE_TIMEOUT_MS` for local/provider evaluation.

## Testing Rules

- Prefer adding tests around pure libs and route handlers first; client DOM coverage is intentionally lighter than backend/lib coverage.
- Before claiming completion, run `pnpm build` and verify it passes cleanly.

## Tooling Rules

- The package manager for this repo is `pnpm`. Use `pnpm` commands in docs and verification instructions.

## Active Diagnostic Flags

See `docs/diagnosis_2026_04.md` for the current Fase A experiments. When working on fidelity issues, prefer toggling existing flags (`OPENAI_PORTRAIT_MODEL`, `USE_SHORT_PROMPTS`, `SKIP_IMAGE_PREPROCESS`, `ENABLE_VISION_ANALYSIS`) before introducing new architecture.

## Project Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm test
```

### Provider Strategy Evaluation

Do not assume Gemini must remain the final provider for anatomical/organ flows.

The current architecture is dual-provider, but this task should evaluate whether `gpt-image-2` can become the unified provider for both:

- fetal face / portrait generation
- organ / anatomical visualization generation

Preferred approach:

1. Do not delete Gemini yet.
2. Do not remove `lib/geminiClient.ts` yet.
3. Add or evaluate a provider strategy flag instead of hardcoding one provider.

Recommended flag:

```env
IMAGE_PROVIDER_STRATEGY=dual

Supported values:

IMAGE_PROVIDER_STRATEGY=dual        # current behavior: OpenAI portrait, Gemini organs when enabled
IMAGE_PROVIDER_STRATEGY=openai_all  # use gpt-image-2 for portrait and anatomical/organ flows
IMAGE_PROVIDER_STRATEGY=gemini_organs # explicit current organ behavior

Migration goal:

Test gpt-image-2 for all generation modes.
Compare portrait and anatomical outputs against the current dual-provider behavior.
Keep Gemini as fallback until real output batches prove that gpt-image-2 is better or equivalent for anatomical/organ flows.
Do not restructure the UI.
Do not change visual design.
Do not introduce diagnostic claims.
```
