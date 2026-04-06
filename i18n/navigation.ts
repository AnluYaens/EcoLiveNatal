import { createNavigation } from 'next-intl/navigation';
import { defaultLocale, locales } from '@/i18n/config';

export const { Link, usePathname, useRouter, getPathname, redirect } = createNavigation({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
});
