'use client';

import { useTranslations } from 'next-intl';
import { APP_NAME } from '@/lib/constants';
import { buildWhatsAppUrl } from '@/lib/whatsapp';

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '';

export default function CtaSection() {
  const t = useTranslations('landing.cta');
  const tWhatsApp = useTranslations('whatsapp');
  const waHref = buildWhatsAppUrl(
    WA_NUMBER,
    tWhatsApp('requestAccess', { appName: APP_NAME }),
  ) || '#';

  return (
    <section id="cta" className="relative">
      {/* Layered mountain waves — 3 layers with depth */}
      <div className="relative -mb-px bg-background">
        <svg
          className="block w-full h-28 md:h-36"
          viewBox="0 0 1440 140"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Back layer — lightest */}
          <path
            fill="#1B3A5C"
            opacity="0.15"
            d="M0,140 L0,80 C200,30 400,50 600,40 C800,30 1000,60 1200,45 C1350,35 1440,50 1440,50 L1440,140 Z"
          />
          {/* Middle layer */}
          <path
            fill="#1B3A5C"
            opacity="0.4"
            d="M0,140 L0,95 C180,55 360,70 600,60 C840,50 1080,80 1280,65 C1380,58 1440,70 1440,70 L1440,140 Z"
          />
          {/* Front layer — solid accent */}
          <path
            fill="#1B3A5C"
            d="M0,140 L0,110 C240,75 480,90 720,80 C960,70 1200,95 1440,85 L1440,140 Z"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="bg-accent py-20">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">{t('title')}</h2>
          <p className="text-white/80 text-sm md:text-base mb-8 leading-relaxed max-w-xl mx-auto">{t('subtitle')}</p>

          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-white text-accent hover:bg-accent-light font-semibold px-8 py-4 rounded-full transition-all shadow-sm text-sm"
          >
            {/* WhatsApp icon */}
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            {t('button')}
          </a>
        </div>
      </div>
    </section>
  );
}
