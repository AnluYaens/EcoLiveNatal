'use client';

import { useTranslations } from 'next-intl';
import { APP_NAME, CLINIC_NAME, CLINIC_LOGO } from '@/lib/constants';

export default function BrandHeader() {
  const t = useTranslations('app');

  return (
    <header className="w-full py-4 px-6 border-b border-gray-200 flex flex-col items-center gap-1">
      {CLINIC_LOGO && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={CLINIC_LOGO}
          alt={CLINIC_NAME || APP_NAME}
          className="h-10 object-contain"
        />
      )}
      <h1 className="text-2xl font-bold text-text-primary">{APP_NAME}</h1>
      {CLINIC_NAME && (
        <p className="text-sm text-text-secondary">{CLINIC_NAME}</p>
      )}
      <p className="text-sm text-text-secondary">{t('tagline')}</p>
    </header>
  );
}
