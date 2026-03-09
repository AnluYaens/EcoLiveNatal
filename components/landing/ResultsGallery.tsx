'use client';

import { useTranslations } from 'next-intl';

// Placeholder pairs — replace with real before/after images in public/examples/
const PAIRS = [
  { id: 1, beforeBg: 'from-amber-900 to-amber-700', afterBg: 'from-pink-100 to-rose-200' },
  { id: 2, beforeBg: 'from-stone-800 to-amber-800', afterBg: 'from-amber-50 to-orange-100' },
  { id: 3, beforeBg: 'from-neutral-800 to-stone-700', afterBg: 'from-rose-50 to-pink-100' },
];

export default function ResultsGallery() {
  const t = useTranslations('landing.results');

  return (
    <section id="resultados" className="max-w-5xl mx-auto px-5 py-16 scroll-mt-16">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-3">{t('title')}</h2>
        <p className="text-text-secondary text-sm md:text-base">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {PAIRS.map(({ id, beforeBg, afterBg }) => (
          <div key={id} className="rounded-2xl shadow-sm overflow-hidden bg-white">
            {/* Before */}
            <div className="relative">
              <div className={`h-40 bg-gradient-to-br ${beforeBg} flex items-center justify-center`}>
                <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="absolute top-2 left-2 text-[10px] font-bold text-white/80 bg-black/30 px-2 py-0.5 rounded-full">
                {t('before')}
              </span>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2 px-4 py-2">
              <div className="flex-1 h-px bg-gray-100" />
              <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* After */}
            <div className="relative">
              <div className={`h-40 bg-gradient-to-br ${afterBg} flex items-center justify-center`}>
                <svg className="w-10 h-10 text-text-primary/20" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
                </svg>
              </div>
              <span className="absolute top-2 left-2 text-[10px] font-bold text-accent bg-accent-light px-2 py-0.5 rounded-full">
                {t('after')}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder note */}
      <p className="text-center text-xs text-text-secondary mt-6 italic">{t('placeholderNote')}</p>

      {/* Disclaimer */}
      <p className="text-center text-xs text-text-secondary mt-2">{t('disclaimer')}</p>
    </section>
  );
}
