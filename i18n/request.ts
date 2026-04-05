import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, isValidLocale } from '@/i18n/config';

export default getRequestConfig(async ({ locale, requestLocale }) => {
  const requestedLocale = locale ?? await requestLocale;
  const resolvedLocale = isValidLocale(requestedLocale) ? requestedLocale : defaultLocale;

  return {
    locale: resolvedLocale,
    messages: (await import(`../messages/${resolvedLocale}.json`)).default,
  };
});
