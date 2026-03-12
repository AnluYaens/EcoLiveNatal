'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;

export default function FaqSection() {
  const t = useTranslations('landing.faq');
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section className="max-w-3xl mx-auto px-5 py-16">
      <h2 className="text-2xl md:text-3xl font-bold text-text-primary text-center mb-10">
        {t('title')}
      </h2>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100 overflow-hidden">
        {FAQ_KEYS.map((key) => {
          const answerKey = key.replace('q', 'a') as 'a1' | 'a2' | 'a3' | 'a4' | 'a5';
          const isOpen = open === key;

          const chevronBg = isOpen ? 'bg-accent' : 'bg-gray-100';
          const chevronIcon = isOpen
            ? 'rotate-180 text-white'
            : 'text-text-secondary';

          return (
            <div key={key}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : key)}
                className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50/50 transition-colors"
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${key}`}
              >
                <span className="font-semibold text-text-primary text-sm pr-4">
                  {t(key as 'q1' | 'q2' | 'q3' | 'q4' | 'q5')}
                </span>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${chevronBg}`}
                >
                  <svg
                    className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${chevronIcon}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isOpen && (
                <div id={`faq-answer-${key}`} className="px-6 pb-5">
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
