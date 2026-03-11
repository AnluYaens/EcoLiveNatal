'use client';

import { useTranslations } from 'next-intl';

const WA_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '').replace(/\D/g, '');
const WA_TEXT = encodeURIComponent('Hola, quisiera solicitar acceso a EcoLiveNatal.');

export default function PricingSection() {
  const t = useTranslations('landing.pricing');
  const waHref = WA_NUMBER ? `https://wa.me/${WA_NUMBER}?text=${WA_TEXT}` : '#cta';

  return (
    <section className="bg-white py-16">
      <div className="max-w-5xl mx-auto px-5">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-3">{t('title')}</h2>
          <p className="text-text-secondary text-sm md:text-base">{t('subtitle')}</p>
        </div>

        {/* Invite-only card */}
        <div className="max-w-xl mx-auto rounded-2xl border border-accent/20 bg-white p-8 shadow-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-accent-light flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h3 className="font-bold text-text-primary text-lg mb-2">{t('badge')}</h3>
          <p className="text-sm text-text-secondary leading-relaxed mb-6">{t('badgeDesc')}</p>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-semibold px-8 py-3.5 rounded-full transition-all shadow-sm text-sm"
          >
            {t('cta')}
          </a>
        </div>
      </div>
    </section>
  );
}
