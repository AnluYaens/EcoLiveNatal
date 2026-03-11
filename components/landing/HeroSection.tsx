'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

const WA_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '').replace(/\D/g, '');
const WA_TEXT = encodeURIComponent('Hola, quisiera solicitar acceso a EcoLiveNatal.');

export default function HeroSection() {
  const t = useTranslations('landing.hero');
  const waHref = WA_NUMBER ? `https://wa.me/${WA_NUMBER}?text=${WA_TEXT}` : '#cta';

  return (
    <section className="relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent-light/30 to-transparent" />

      <div className="relative max-w-5xl mx-auto px-5 pt-24 pb-20 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white text-accent text-xs font-semibold px-4 py-2 rounded-full mb-8 shadow-sm border border-accent/10">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          {t('badge')}
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-6xl font-bold text-text-primary leading-tight mb-6">
          {t('headline')}
        </h1>

        <p className="text-base md:text-xl text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
          {t('subheadline')}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto bg-accent hover:bg-accent-hover text-white font-semibold px-8 py-4 rounded-full transition-all shadow-sm text-sm text-center"
          >
            {t('ctaPrimary')}
          </a>
          <Link
            href="/app"
            className="w-full sm:w-auto border-2 border-accent text-accent hover:bg-accent-light font-semibold px-8 py-4 rounded-full transition-all text-sm text-center"
          >
            {t('ctaSecondary')}
          </Link>
        </div>
      </div>
    </section>
  );
}
