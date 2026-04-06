'use client';

import { useLocale, useTranslations } from 'next-intl';
import { defaultLocale, isValidLocale } from '@/i18n/config';
import { usePathname, useRouter } from '@/i18n/navigation';

export default function LocaleSwitcher() {
  const localeValue = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('common');
  const locale = isValidLocale(localeValue) ? localeValue : defaultLocale;
  const targetLocale = locale === 'es' ? 'en' : 'es';
  const targetLabel = targetLocale.toUpperCase();
  const ariaLabel = targetLocale === 'en' ? t('switchToEnglish') : t('switchToSpanish');

  const handleSwitch = () => {
    const targetHref = `${pathname}${window.location.search}${window.location.hash}`;
    router.replace(targetHref, {
      locale: targetLocale,
      scroll: false,
    });
  };

  return (
    <button
      type="button"
      onClick={handleSwitch}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-semibold text-text-primary bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
    >
      {targetLabel}
    </button>
  );
}
