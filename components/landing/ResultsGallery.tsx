'use client';

import { useTranslations } from 'next-intl';

/** Placeholder items — replace src with real image paths when available */
const placeholders = [
  { id: 1 },
  { id: 2 },
  { id: 3 },
];

export default function ResultsGallery() {
  const t = useTranslations('landing.results');

  return (
    <section id="resultados" className="max-w-5xl mx-auto px-5 py-16 scroll-mt-16">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {placeholders.map(({ id }) => (
          <div
            key={id}
            className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br from-white via-accent-light/10 to-white border border-gray-100 shadow-sm cursor-pointer"
          >
            {/* Hover gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-accent/60 via-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />

            {/* Placeholder icon */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-accent/30">
              <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>

            {/* Hover label — slides up from bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-4 z-20 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
              <p className="text-white text-sm font-semibold">{t('placeholderNote')}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-center text-xs text-text-secondary mt-6">{t('disclaimer')}</p>
    </section>
  );
}
