'use client';

import { useTranslations } from 'next-intl';

export default function DisclaimerBanner() {
  const t = useTranslations('disclaimer');

  return (
    <div className="w-full border-t border-amber-200 bg-amber-50 px-4 py-2 pb-16 text-center text-xs text-amber-800">
      {t('text')}
    </div>
  );
}
