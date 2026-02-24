# EcoLiveNatal — Agent Instructions
> Read this file completely before writing any code. These rules are non-negotiable.

---

## 1. TypeScript + Next.js App Router

### TypeScript
- Strict mode ALWAYS enabled. Zero `any` types anywhere in the project.
- Explicit types on all function parameters and return values.
- Prefer `interface` over `type` for objects. Use `type` only for unions and primitives.
- Never use type assertions (`as SomeType`) unless absolutely unavoidable.
- All errors must be typed: `catch (error: unknown)` then narrowing.

### Next.js App Router
- ONLY use App Router (`app/` folder). Never use Pages Router (`pages/`).
- Server Components are the default. Only add `'use client'` when necessary:
  - Component uses `useState`, `useEffect`, `useRef` or other React hooks
  - Component uses browser event listeners
  - Component uses browser APIs (`window`, `navigator`, etc.)
- API routes go in `app/api/[route]/route.ts` with `export async function POST/GET`.
- Use `next/image` for all images. Never use `<img>` directly.
- Use `next/link` for internal navigation. Never use `<a href>` for internal routes.

### File structure
- Components in `components/` with PascalCase: `UploadZone.tsx`, `ResultImage.tsx`
- Business logic in `lib/` with camelCase: `promptBuilder.ts`, `openaiClient.ts`
- i18n strings in `messages/es.json` and `messages/en.json` — NEVER hardcode visible text
- One component per file. Never export multiple components from the same file.

### Code conventions
- Arrow functions for components: `const MyComponent = () => {}`
- Always async/await. Never `.then().catch()` chains.
- Destructuring in params when object has 2+ used properties.
- Import order: 1) React/Next, 2) external libs, 3) components, 4) lib, 5) types
- Named exports for everything except `page.tsx` and `route.ts` which use default export.

---

## 2. OpenAI Pipeline Rules (CRITICAL — do not modify without authorization)

### Rule #1: n is ALWAYS 1
The `n` parameter in OpenAI API calls is ALWAYS `1`. Never change it to any other value.
Reason: cost. `n=4` would quadruple the monthly cost with insufficient benefit.
If you see `n > 1` anywhere in the code, it is a bug — fix immediately.

### Rule #2: Single pipeline — OpenAI only
This app uses ONE pipeline: **OpenAI gpt-image-1**.
- There is NO Hugging Face fallback.
- There is NO pipeline selector or toggle.
- Do NOT create `huggingfaceClient.ts` or `pipelineSelector.ts`.
- The only AI client file is `lib/openaiClient.ts`.

### Rule #3: Zero image storage
Images are NEVER saved to disk, database, or any storage.
Flow: receive image in memory → preprocess → send to API → receive response → return to client → discard everything.
- Do not create `uploads/`, `tmp/`, or similar folders.
- Do not use `fs.writeFile()` with images.
- Do not log base64 image data in any `console.log` or logger.

### Rule #4: Zod validation on the API route
Every request to `/api/generate` must be validated with the Zod schema in `lib/validation.ts`.
- Reject images > 10MB
- Reject `creativity` outside range 0–100
- Reject `style` that is not `'soft' | 'ultra' | 'cinematic'`

### Rule #5: API route output
The API route always returns:
```typescript
{ image: string; warning?: string; }
```
NEVER return arrays of images — only ONE image (`n=1`).

### Rule #6: Error handling
- Rate limit (429) → retry once after 2 seconds, then return user-friendly error
- Content policy block → return "La imagen no pudo procesarse. Intenta con una foto diferente."
- Timeout > 60s → return "La generación tardó demasiado. Intenta de nuevo."
- No connection → return retry button in UI

### Rule #7: Environment variables
```env
# Required — app will not start without this
OPENAI_API_KEY=sk-...

# Optional branding
NEXT_PUBLIC_APP_TITLE=EcoLiveNatal
NEXT_PUBLIC_CLINIC_NAME=
NEXT_PUBLIC_CLINIC_LOGO_URL=
NEXT_PUBLIC_PRIMARY_COLOR=#E8A0A0
MAX_GENERATIONS_PER_SESSION=10
```

---

## 3. Image Preprocessing Pipeline (sharp)

All images must be preprocessed server-side before sending to OpenAI:

1. Convert any format to PNG
2. Auto-crop to brightest/warmest region (baby's face area)
3. Remove overlays — mask top 12% and bottom 12% (ultrasound text/metadata)
4. Contrast enhancement (+15% midtones)
5. Resize to max 1024px on longest side
6. Color normalization (orange/gold ultrasound tones → neutral)

This preprocessing happens in `lib/imagePreprocess.ts` using the `sharp` package.

---

## 4. AI Prompt Engineering

### Base prompt (always included)
```
Transform this 3D/4D fetal ultrasound image into a photorealistic portrait of a newborn baby.
Preserve the facial geometry and structure visible in the ultrasound.
Render realistic newborn skin texture, soft lighting, neutral background.
The baby should appear peaceful, eyes closed, as if sleeping.
Remove all ultrasound artifacts, overlays, textures, and medical annotations.
```

### Style modifiers
- `soft` (default): "Soft, warm, gentle lighting. Pastel tones. Emotional and tender mood."
- `ultra`: "Ultra-realistic photography style. Sharp details. Natural skin texture. Studio lighting."
- `cinematic`: "Cinematic portrait. Dramatic soft lighting. Professional photography. Bokeh background."

### Creativity mapping
- 0–30: "Strictly preserve the facial geometry from the ultrasound."
- 31–70: "Balance fidelity to the ultrasound with photorealistic rendering."
- 71–100: "Enhance quality and realism while maintaining the baby's unique features."

### Negative constraints (always append)
```
No adult features, no teeth, no makeup, no anime or cartoon eyes,
no deformations, no watermarks, no medical equipment, no text overlays,
no ultrasound artifacts visible in final image.
```

---

## 5. Design System (warm and emotional — not clinical)

### Color palette (use EXACTLY these values)
- Main background: `#FAFAF8` (warm white, never pure white `#FFFFFF`)
- Primary accent: `#E8A0A0` (soft rose — buttons, highlights, progress)
- Main text: `#3D3535` (warm dark gray, never pure black `#000000`)
- Secondary text: `#888888`
- Card background: `#FFFFFF` with soft shadow
- Error: `#EF5350`
- Success: `#66BB6A`

### Typography
- Primary font: `'Plus Jakarta Sans'` or `'Inter'` (in that order of preference)
- Never use generic sans-serif without specifying

### Component style rules
- Border radius: `rounded-2xl` (16px) for cards, `rounded-xl` for buttons
- Shadows: `shadow-sm` or `shadow-md`. Never `shadow-xl` except on modals
- Primary button: `bg-[#E8A0A0] text-white hover:bg-[#d98f8f]` — never blue
- Secondary button: `border border-[#E8A0A0] text-[#E8A0A0] bg-transparent`
- Inputs: `border border-gray-200 rounded-xl focus:border-[#E8A0A0] focus:ring-1 focus:ring-[#E8A0A0]`
- NEVER use clinical blue colors (`#1976D2`, `#0288D1`, etc.)

### Disclaimer banner — absolute rule
`DisclaimerBanner.tsx` MUST always be rendered on all pages.
- Text: `⚕️ Imagen ilustrativa generada por IA. No es diagnóstica.`
- Style: `#FFF3CD` background, small centered text, sticky to bottom on mobile
- NEVER add a close/dismiss button under any circumstance

### Responsive
- Mobile-first on all components
- Upload drop zone minimum 200px height on mobile
- Result image is `w-full` on mobile
- Action buttons are `w-full` on mobile

---

## 6. i18n — Spanish first (es-LA)

### Fundamental rule
ZERO hardcoded strings in components. All visible text goes in:
- `messages/es.json` (Spanish — default language)
- `messages/en.json` (English — secondary toggle)

```typescript
// ✅ Correct
const t = useTranslations('uploadZone');
return <p>{t('hint')}</p>

// ❌ Wrong
return <p>Sube la foto del ultrasonido</p>
```

### Key structure in es.json
```json
{
  "app": {
    "title": "EcoLiveNatal",
    "tagline": "Del ultrasonido al retrato de tu bebé"
  },
  "uploadZone": {
    "title": "Sube la foto del ultrasonido",
    "hint": "Soporta JPG, PNG, HEIC · Máx 10MB",
    "chooseFile": "Elegir archivo",
    "takePhoto": "Tomar foto",
    "privacyBadge": "Tu imagen no se almacena en ningún servidor"
  },
  "generate": {
    "button": "✨ Generar retrato",
    "loading1": "Analizando estructura...",
    "loading2": "Renderizando piel...",
    "loading3": "Finalizando retrato...",
    "estimatedTime": "~15–25 segundos"
  },
  "errors": {
    "contentBlock": "La imagen no pudo procesarse. Intenta con una foto diferente.",
    "timeout": "La generación tardó demasiado. Intenta de nuevo.",
    "rateLimit": "Demasiadas solicitudes. Intenta en unos minutos.",
    "darkImage": "La imagen es muy oscura. Intenta con mejor iluminación.",
    "notUltrasound": "Esta imagen no parece ser un ultrasonido 3D/4D."
  },
  "result": {
    "download": "⬇ Descargar",
    "whatsapp": "💬 Compartir por WhatsApp",
    "regenerate": "🔄 Regenerar",
    "newSession": "🗑 Nueva sesión"
  },
  "disclaimer": {
    "text": "⚕️ Imagen ilustrativa generada por IA. No es diagnóstica. El resultado es una aproximación artística y no representa con exactitud al bebé real."
  }
}
```

### Latin American Spanish (es-LA)
- Use `usted` in clinical context
- Avoid single-country regionalisms
- Dates in `DD/MM/YYYY` format

### next-intl configuration
- `defaultLocale: 'es'` in `next.config.js`
- Language toggle saves preference in `sessionStorage`
- If `navigator.language` starts with `'es'` → use `es`. Otherwise → use `en`
