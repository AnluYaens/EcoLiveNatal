# EcoLiveNatal

AI-powered web application that transforms 3D/4D fetal ultrasound photos into photorealistic newborn portrait illustrations — built for clinics and fertility specialists.

> **Medical Disclaimer:** All generated images are illustrative and for emotional purposes only. They are not diagnostic, do not represent the actual appearance of the baby, and must not be used for any medical or clinical decision-making.

---

## Features

- Mobile-first experience optimized for clinic staff (iOS, Android, desktop)
- AI portrait generation powered by OpenAI
- Multi-tenant support — independent accounts per doctor or clinic with configurable daily limits
- Guided 4-step wizard: upload, crop, generate, result
- Bilingual interface (Spanish / English) with full i18n
- Privacy-first processing — no server-side image storage
- Clinic white-label branding via environment variables

---

## How It Works

1. Clinic staff uploads a 3D/4D ultrasound image (JPG, PNG, HEIC supported)
2. User adjusts the crop area to center the baby's face
3. Staff selects skin tone and confirms generation
4. AI generates an illustrative newborn portrait
5. Staff downloads or shares the result

---

## Tech Stack

| Layer            | Technology                                         |
| ---------------- | -------------------------------------------------- |
| Framework        | Next.js 14 (App Router, TypeScript)                |
| Styling          | Tailwind CSS                                       |
| AI               | OpenAI API — image generation                      |
| Image processing | sharp (server-side), react-easy-crop (client-side) |
| Validation       | Zod                                                |
| i18n             | next-intl (ES / EN)                                |
| HEIC conversion  | heic2any (client-side, no server dependency)       |

---

## Security Architecture

Security is layered across multiple levels. The system follows Kerckhoffs' principle.

| Layer                     | Mechanism                                                      |
| ------------------------- | -------------------------------------------------------------- |
| Access control            | 6-digit PIN per account, verified server-side on every request |
| Brute-force protection    | IP lockout after 5 failed attempts (15-minute cooldown)        |
| Per-account rate limiting | Configurable daily request limit per doctor/clinic             |
| Cross-account isolation   | PIN and account ID are cross-validated on every API call       |
| Burst protection          | In-memory IP rate limiter (5 requests/minute)                  |
| Input validation          | Zod schema validation on all API inputs                        |
| Secret management         | All credentials stored outside the repository (`.gitignore`)   |

---

## Quick Start

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

Edit `.env` and add your `OPENAI_API_KEY`. Never commit this file.

### 4. Configure accounts

```bash
cp config/accounts.example.json config/accounts.json
```

Edit `config/accounts.json` with your accounts (see [Multi-Tenant Configuration](#multi-tenant-configuration)). Never commit this file — it contains PINs.

### 5. Run in development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Multi-Tenant Configuration

Each doctor or clinic gets an independent account with its own PIN and daily generation limit. Accounts are defined in `config/accounts.json` (server-side only, never committed).

```json
{
  "accounts": [
    {
      "id": "clinic-a",
      "pin": "123456",
      "name": "Dr. García",
      "dailyLimit": 100
    },
    {
      "id": "clinic-b",
      "pin": "654321",
      "name": "Dr. López",
      "dailyLimit": 10
    },
    {
      "id": "clinic-c",
      "pin": "112233",
      "name": "Dra. Martínez",
      "dailyLimit": 40
    }
  ]
}
```

**Rules:**

- PINs must be exactly 6 digits and unique across all accounts
- `dailyLimit: 0` means unlimited
- `id` is the stable internal identifier — never change it once set, as it keys usage tracking
- Usage resets automatically at UTC midnight each day
- Runtime usage data is stored in `data/usage.json` (auto-created, git-ignored)

To add or update an account: edit `config/accounts.json` and restart the server.

---

## Environment Variables

| Variable                      | Required | Description                                                           |
| ----------------------------- | -------- | --------------------------------------------------------------------- |
| `OPENAI_API_KEY`              | Yes      | API key for image generation                                          |
| `NEXT_PUBLIC_APP_TITLE`       | No       | App title displayed in the UI (default: `EcoLiveNatal`)               |
| `NEXT_PUBLIC_CLINIC_NAME`     | No       | Clinic name for white-label branding                                  |
| `NEXT_PUBLIC_CLINIC_LOGO_URL` | No       | Clinic logo URL shown in the header                                   |
| `MOCK_API`                    | No       | Set to `true` to skip OpenAI and return a mock image (for UI testing) |
| `ENABLE_SESSION_IMAGE_CACHE`  | No       | Set to `true` to cache identical generation requests in memory        |

Reference: `.env.example`

---

## Project Structure

```
ecolivenatal/
├── app/
│   ├── api/
│   │   ├── generate/        # Portrait generation endpoint
│   │   └── verify-pin/      # Account authentication endpoint
│   └── [locale]/            # Localized pages (ES / EN)
├── components/              # UI components and wizard steps
├── config/
│   ├── accounts.json        # Account definitions — git-ignored
│   └── accounts.example.json
├── data/
│   └── usage.json           # Runtime daily usage tracking — git-ignored
├── i18n/                    # next-intl configuration
├── lib/
│   ├── accountStore.ts      # Multi-tenant account management
│   ├── bruteForce.ts        # Brute-force protection
│   ├── constants.ts         # Shared configuration constants
│   ├── imagePreprocess.ts   # Ultrasound preprocessing
│   ├── openaiClient.ts      # OpenAI wrapper
│   ├── promptBuilder.ts     # AI prompt assembly
│   └── validation.ts        # Zod schemas
├── messages/
│   ├── es.json              # Spanish translations
│   └── en.json              # English translations
├── .env.example
└── LICENSE
```

---

## Deployment

### Vercel

1. Push to GitHub
2. Import the repository into Vercel
3. Add environment variables in the Vercel dashboard
4. Deploy — **note:** Vercel is serverless; `config/accounts.json` and `data/usage.json` require a persistent filesystem or an alternative storage backend (e.g., Upstash Redis) in this deployment model

### Self-Hosted (Recommended for this project)

This project is optimized for self-hosted deployments (VPS, dedicated server) where a persistent filesystem is available.

Minimum production requirements:

- HTTPS enabled
- `config/accounts.json` present and configured
- Secrets managed outside the repository
- Process manager (e.g., PM2) for uptime

---

## Privacy & Security Notes

- Ultrasound images are processed per request and are not intentionally stored server-side by this application
- Images submitted to the OpenAI API are subject to OpenAI's data retention and privacy policies — review these before patient-facing deployment
- All sensitive configuration (`config/accounts.json`, `.env`) is excluded from version control via `.gitignore`
- Review your hosting provider's logging and retention settings before going live

---

## Production Checklist

- `npm run build` passes with no TypeScript errors
- `config/accounts.json` configured with real 6-digit PINs
- `OPENAI_API_KEY` set in production environment
- Clinic branding variables configured (optional)
- Medical disclaimer visible in the UI
- HTTPS enabled on the deployment
- Deployment tested with `MOCK_API=true` before enabling live generation

---

## Roadmap

- [ ] Animated video portrait from 4D scan
- [ ] Shareable patient link (time-limited)
- [ ] Twin workflow support
- [ ] Custom clinic watermark on downloads
- [ ] Admin dashboard for usage analytics

---

## License

Copyright (c) 2026. All rights reserved. See [LICENSE](./LICENSE) for details.
