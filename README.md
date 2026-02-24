# 🍼 EcoLiveNatal

AI-powered web app that transforms 3D/4D fetal ultrasound photos into photorealistic newborn portraits — built for fertility specialists to offer patients an emotional, meaningful preview of their baby.

> ⚕️ **Medical Disclaimer:** All generated images are illustrative and for emotional purposes only. They are not diagnostic, do not represent the actual appearance of the baby, and must not be used for any medical or clinical decision-making.

---

## ✨ Features

- 📱 Fully responsive — works on desktop and mobile
- 🚀 Powered by OpenAI gpt-image-1 for high quality results
- 🔒 Zero server-side image storage — privacy first
- 💬 Share results directly via WhatsApp
- 🌎 Spanish (es-LA) UI by default with English toggle
- 🏥 Customizable clinic branding via environment variables
- ⚡ Full flow in under 3 taps on mobile

---

## 🧠 How It Works

1. Doctor uploads a 3D/4D ultrasound photo
2. App preprocesses the image (crop, contrast, color normalization via `sharp`)
3. OpenAI gpt-image-1 generates a photorealistic newborn portrait
4. Doctor downloads or shares the result with the patient via WhatsApp

---

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/your-username/ecolivenatal.git
cd ecolivenatal
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
```bash
cp .env.example .env
```
Edit `.env` and add your `OPENAI_API_KEY` (at [platform.openai.com](https://platform.openai.com) → API Keys)

### 4. Run in development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `OPENAI_API_KEY` | **Yes** | OpenAI API key — get it at platform.openai.com |
| `NEXT_PUBLIC_APP_TITLE` | No | App name shown in the UI (default: EcoLiveNatal) |
| `NEXT_PUBLIC_CLINIC_NAME` | No | Clinic name for branding (shown in header) |
| `NEXT_PUBLIC_CLINIC_LOGO_URL` | No | Clinic logo URL |
| `NEXT_PUBLIC_PRIMARY_COLOR` | No | Primary accent color (default: `#E8A0A0`) |
| `MAX_GENERATIONS_PER_SESSION` | No | Max generations per session as cost guardrail |

---

## 📁 Project Structure

```
ecolivenatal/
├── app/
│   ├── layout.tsx              # Root layout, fonts, providers
│   ├── page.tsx                # Main single-page app
│   ├── globals.css
│   └── api/generate/
│       └── route.ts            # POST handler — OpenAI pipeline
├── components/
│   ├── UploadZone.tsx          # Drag & drop + camera capture
│   ├── CropEditor.tsx          # react-easy-crop wrapper
│   ├── StyleSelector.tsx       # 3 style preset cards (Soft / Ultra / Cinematic)
│   ├── GenerateButton.tsx      # With loading state + progress messages
│   ├── ResultImage.tsx         # Single result image display
│   ├── ImageLightbox.tsx       # Full-screen viewer
│   ├── ShareActions.tsx        # WhatsApp + Download
│   ├── DisclaimerBanner.tsx    # Always-visible legal banner (never closable)
│   ├── InfoModal.tsx           # Consent/info overlay
│   └── BrandHeader.tsx         # Clinic logo + name
├── lib/
│   ├── promptBuilder.ts        # Prompt construction with style + creativity
│   ├── imagePreprocess.ts      # sharp preprocessing pipeline
│   ├── openaiClient.ts         # OpenAI gpt-image-1 integration
│   ├── validation.ts           # Zod schemas
│   └── constants.ts            # App-wide constants
├── messages/
│   ├── es.json                 # Spanish strings (default)
│   └── en.json                 # English strings
├── .agents/skills/             # Agent skills (skills.sh)
├── AGENTS.md                   # Codex agent instructions
├── .env.example                # Environment variable template
└── README.md
```

---

## 🎨 Style Presets

| Style | Description |
|---|---|
| **Soft** (default) | Warm, gentle lighting. Pastel tones. Emotional and tender mood. |
| **Ultra Realistic** | Sharp details. Natural skin texture. Studio lighting. |
| **Cinematic** | Dramatic soft lighting. Professional photography. Bokeh background. |

---

## 🚢 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import project at [vercel.com](https://vercel.com)
3. Add `OPENAI_API_KEY` and optional variables in the Vercel dashboard
4. Every push to `main` triggers an automatic deploy

---

## 💰 Cost Estimates

| Usage | Estimated Cost |
|---|---|
| Development & testing (light) | ~$2–5 / month |
| 5 patients/day | ~$6–12 / month |
| 10 patients/day | ~$12–25 / month |
| 20 patients/day | ~$25–50 / month |

*Based on OpenAI gpt-image-1 at ~$0.04–0.08 per image, n=1.*

---

## 🔒 Privacy & Security

- Images are **never stored** on any server — processed in memory only
- No cookies, no analytics, no tracking by default
- HTTPS enforced in production
- Rate limiting: max 10 requests per IP per hour
- Session data stored only in React state + sessionStorage (cleared on tab close)
- Images are sent to OpenAI under their terms of service

---

## ⚖️ Legal Disclaimer

This software generates illustrative images using artificial intelligence for emotional and informational purposes only. **It is not a medical device**, does not provide diagnostic information, and must not be used for clinical decision-making. Generated images are artistic approximations and do not represent the actual appearance of the baby.

Suggested disclaimer text for clinic display to patients:
> *"This image was generated by artificial intelligence based on your ultrasound. It is an artistic illustration for emotional purposes only and does not represent the actual appearance of your baby. It has no diagnostic value."*

---

## 🗺️ Roadmap

- [ ] Animated video from 4D scan
- [ ] Before/after slider (ultrasound → portrait)
- [ ] Shareable patient link (view result from home)
- [ ] Twin detection and dual portrait
- [ ] Custom clinic watermark on downloaded images

---

## 🛠️ Tech Stack

- [Next.js 14](https://nextjs.org/) — App Router + TypeScript strict
- [Tailwind CSS](https://tailwindcss.com/) — Styling
- [OpenAI API](https://platform.openai.com/) — gpt-image-1 image generation
- [sharp](https://sharp.pixelplumbing.com/) — Server-side image preprocessing
- [react-easy-crop](https://github.com/ValentinH/react-easy-crop) — Image cropping UI
- [next-intl](https://next-intl-docs.vercel.app/) — Internationalization (es/en)
- [Zod](https://zod.dev/) — Schema validation
