import createMiddleware from 'next-intl/middleware';
import { defaultLocale, locales } from '@/i18n/config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // "/" serves Spanish directly, "/en" for English
});

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
