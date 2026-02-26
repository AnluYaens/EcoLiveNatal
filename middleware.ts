import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['es', 'en'],
  defaultLocale: 'es',
  localePrefix: 'as-needed', // "/" serves Spanish directly, "/en" for English
});

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
};
