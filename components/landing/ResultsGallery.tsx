'use client';

import { useTranslations } from 'next-intl';

export default function ResultsGallery() {
  const t = useTranslations('landing.results');

  return (
    <section id="resultados" className="max-w-5xl mx-auto px-5 py-16 scroll-mt-16">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-3">{t('title')}</h2>
        <p className="text-text-secondary text-sm md:text-base">{t('subtitle')}</p>
      </div>

      {/* Coming soon placeholder */}
      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white py-16 px-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-light">
          <svg className="h-7 w-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-text-primary font-semibold text-lg mb-1">{t('placeholderNote')}</p>
        <p className="text-text-secondary text-sm max-w-md mx-auto">{t('subtitle')}</p>
      </div>

      {/* Disclaimer */}
      <p className="text-center text-xs text-text-secondary mt-6">{t('disclaimer')}</p>
    </section>
  );
}
