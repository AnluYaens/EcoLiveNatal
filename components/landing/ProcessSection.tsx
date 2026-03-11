'use client';

import { useTranslations } from 'next-intl';

const steps = [
  {
    num: '01',
    key: 'step1',
    icon: (
      <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    num: '02',
    key: 'step2',
    icon: (
      <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
      </svg>
    ),
  },
  {
    num: '03',
    key: 'step3',
    icon: (
      <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.798-1.414 2.798H4.212c-1.444 0-2.414-1.798-1.414-2.798L4.2 15.3" />
      </svg>
    ),
  },
  {
    num: '04',
    key: 'step4',
    icon: (
      <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
  },
] as const;

export default function ProcessSection() {
  const t = useTranslations('landing.process');

  return (
    <section id="proceso" className="bg-white py-16 scroll-mt-16">
      <div className="max-w-5xl mx-auto px-5">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-3">{t('title')}</h2>
          <p className="text-text-secondary text-sm md:text-base">{t('subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {steps.map(({ num, key, icon }) => (
            <div key={key} className="flex flex-col items-center text-center gap-4 bg-gray-50/50 rounded-2xl p-5">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-accent-light flex items-center justify-center">
                  {icon}
                </div>
                <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-accent text-white text-[11px] font-bold flex items-center justify-center shadow-sm">
                  {num}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-text-primary mb-1 text-sm">
                  {t(`${key}Title` as 'step1Title' | 'step2Title' | 'step3Title' | 'step4Title')}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {t(`${key}Desc` as 'step1Desc' | 'step2Desc' | 'step3Desc' | 'step4Desc')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
