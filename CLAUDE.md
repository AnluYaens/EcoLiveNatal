# CLAUDE.md — Rules for Claude Code

## Read First

Before writing ANY code, read `ecolivenatal_architecture.md` in the project root. That is the single source of truth for what to build, how modules connect, and what the component contracts are. Everything below supplements that document — it does not replace or contradict it.

---

## Non-Negotiable Rules

### Seed Files
The following files are pre-written and committed. **Do not modify or rewrite them** unless they fail to compile — in that case, fix the minimum necessary to resolve the error while preserving the logic and intent.

- `lib/openaiClient.ts`
- `lib/imagePreprocess.ts`
- `lib/cropUtils.ts`
- `middleware.ts`
- `next.config.mjs`
- `tailwind.config.ts`
- `i18n/request.ts`
- `messages/es.json`
- `messages/en.json`

### Design Tokens
- Background: `#FAFAF8` — never pure white.
- Accent: `#E8A0A0` — never blue.
- Text: `#3D3535` — never pure black.
- Cards: `rounded-2xl shadow-sm`.
- Buttons: `rounded-xl`.
- Font: Plus Jakarta Sans → Inter fallback.
- Mobile-first, responsive.
- Use Tailwind classes from `tailwind.config.ts` — do not hardcode hex values in components.

### Code Quality
- Zero `any` types. Ever.
- All user-facing text comes from `messages/*.json` via `useTranslations()`. Zero hardcoded strings in components.
- Never log or persist image data (base64 or binary).
- Never write images to disk (`fs.writeFile` never used with image data).
- `DisclaimerBanner` has no close button. This is a legal requirement.

### Error Handling
- All API errors return Spanish messages matching the keys in `messages/es.json` → `errors.*`.
- Client-side: all `fetch` calls use `AbortController` with timeout.
- Server-side: all OpenAI calls have a 60s timeout.
- Always show `ErrorMessage` component for API failures — never silently fail.

### Security
- Rate limit the API route (5 req/IP/min).
- Validate all inputs server-side with Zod.
- Validate image size (≤10 MB) and mime type before processing.
- HEIC/HEIF conversion happens **client-side** via `heic2any` — the server never receives or processes HEIC files.

### Verification Before Completion
Run `npm run build` before declaring any task done. The build must pass with zero TypeScript errors. Check the full checklist in Section 7 of `ecolivenatal_architecture.md`.

---

## Project Commands

```bash
npm run dev     # Start dev server
npm run build   # Production build (must pass clean)
npm run lint    # ESLint check
```
