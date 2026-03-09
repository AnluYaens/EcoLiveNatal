'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;

export default function FaqSection() {
  const t = useTranslations('landing.faq');
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section id="faq" className="max-w-3xl mx-auto px-5 py-16 scroll-mt-16">
      <h2 className="text-2xl md:text-3xl font-bold text-text-primary text-center mb-10">
        {t('title')}
      </h2>

      <div className="flex flex-col gap-3">
        {FAQ_KEYS.map((key) => {
          const answerKey = key.replace('q', 'a') as 'a1' | 'a2' | 'a3' | 'a4' | 'a5';
          const isOpen = open === key;

          return (
            <div key={key} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : key)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
                aria-expanded={isOpen}
              >
                <span className="font-semibold text-text-primary text-sm pr-4">{t(key)}</span>
                <svg
                  className={`w-5 h-5 text-accent flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isOpen && (
                <div className="px-5 pb-4">
                  <p className="text-sm text-text-secondary leading-relaxed">{t(answerKey)}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
