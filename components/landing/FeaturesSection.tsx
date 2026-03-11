'use client';

import { useTranslations } from 'next-intl';

const features = [
  {
    key: 'precision',
    icon: (
      <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    key: 'speed',
    icon: (
      <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    key: 'privacy',
    icon: (
      <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
] as const;

export default function FeaturesSection() {
  const t = useTranslations('landing.features');

  return (
    <section className="max-w-5xl mx-auto px-5 py-16">
      <h2 className="text-2xl md:text-3xl font-bold text-text-primary text-center mb-10">
        {t('title')}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {features.map(({ key, icon }) => (
          <div key={key} className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4 border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200">
            <div className="w-12 h-12 rounded-2xl bg-accent-light flex items-center justify-center">
              {icon}
            </div>
            <div>
              <h3 className="font-bold text-text-primary mb-1">
                {t(`${key}Title` as 'precisionTitle' | 'speedTitle' | 'privacyTitle')}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                {t(`${key}Desc` as 'precisionDesc' | 'speedDesc' | 'privacyDesc')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
