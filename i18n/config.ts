export const locales = ['es', 'en'] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = 'es';

export function isValidLocale(locale: string | undefined): locale is AppLocale {
  return locale !== undefined && locales.includes(locale as AppLocale);
}
