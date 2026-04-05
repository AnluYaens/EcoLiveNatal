import { defaultLocale, type AppLocale } from '@/i18n/config';

export function getLocalizedPath(locale: AppLocale, path: `/${string}`): string {
  if (path === '/') {
    return locale === defaultLocale ? '/' : `/${locale}`;
  }

  return locale === defaultLocale ? path : `/${locale}${path}`;
}

export function getLocalizedHash(locale: AppLocale, hash: string): string {
  const normalizedHash = hash.startsWith('#') ? hash : `#${hash}`;
  return `${getLocalizedPath(locale, '/')}${normalizedHash}`;
}
