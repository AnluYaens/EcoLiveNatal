'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { APP_NAME, CLINIC_NAME, CLINIC_LOGO } from '@/lib/constants';
import DisclaimerModal from '@/components/DisclaimerModal';

export default function BrandHeader() {
  const t = useTranslations('app');
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  return (
    <header className="w-full px-5 py-3.5 flex items-center justify-between border-b border-gray-100 bg-white">
      {CLINIC_LOGO ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={CLINIC_LOGO}
          alt={CLINIC_NAME || APP_NAME}
          className="h-8 object-contain"
        />
      ) : (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-accent-light flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
            </svg>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-base font-bold text-text-primary tracking-tight">{t('title')}</span>
            <span className="text-[10px] font-semibold tracking-widest text-accent uppercase mt-0.5">{t('tagline')}</span>
          </div>
        </div>
      )}

      <button
        type="button"
        className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-gray-100 transition-colors"
        aria-label="Info"
        onClick={() => setDisclaimerOpen(true)}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      <DisclaimerModal isOpen={disclaimerOpen} onClose={() => setDisclaimerOpen(false)} />
    </header>
  );
}
