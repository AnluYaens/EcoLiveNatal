'use client';

import { useTranslations } from 'next-intl';

export default function DisclaimerBanner() {
  const t = useTranslations('disclaimer');

  return (
    <div className="w-full text-center text-[10px] text-gray-400 py-2">
      {t('footerText')}
    </div>
  );
}
