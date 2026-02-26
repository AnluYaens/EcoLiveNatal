'use client';

import { useTranslations } from 'next-intl';

export default function DisclaimerBanner() {
  const t = useTranslations('disclaimer');

  return (
    <div className="sticky bottom-0 w-full bg-[#FFF3CD] py-3 px-4 text-center text-xs text-text-primary z-40 border-t border-[#f0d080]">
      {t('text')}
    </div>
  );
}
