'use client';

import { useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { APP_NAME, CLINIC_LOGO, CLINIC_NAME } from '@/lib/constants';
import { defaultLocale, isValidLocale } from '@/i18n/config';
import { getLocalizedHash, getLocalizedPath } from '@/lib/localePaths';

/** Smooth-scroll to an element by ID, or navigate home first if on a different page. */
function useSectionNav(homePath: string, locale: string) {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === homePath || (homePath === '/' && pathname === `/${locale}`);

  return useCallback(
    (sectionId: string) => {
      if (isHome) {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }
      router.push(getLocalizedHash(isValidLocale(locale) ? locale : defaultLocale, sectionId));
    },
    [isHome, locale, router],
  );
}

export default function LandingNav() {
  const t = useTranslations('landing.nav');
  const localeValue = useLocale();
  const locale = isValidLocale(localeValue) ? localeValue : defaultLocale;
  const [menuOpen, setMenuOpen] = useState(false);
  const homePath = getLocalizedPath(locale, '/');
  const faqPath = getLocalizedPath(locale, '/faq');
  const appPath = getLocalizedPath(locale, '/app');
  const scrollTo = useSectionNav(homePath, locale);

  const linkClass = 'hover:text-accent transition-colors cursor-pointer';

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100/80">
      <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between">
        {/* Logo — links to home */}
        <Link href={homePath} className="flex items-center gap-2.5">
          {CLINIC_LOGO ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={CLINIC_LOGO} alt={CLINIC_NAME || APP_NAME} className="h-8 object-contain" />
          ) : (
            <>
              <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center flex-shrink-0 shadow-sm">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
                </svg>
              </div>
              <span className="text-base font-bold text-text-primary tracking-tight">{APP_NAME}</span>
            </>
          )}
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-text-secondary">
          <Link href={homePath} className={linkClass}>{t('home')}</Link>
          <button type="button" onClick={() => scrollTo('proceso')} className={linkClass}>{t('process')}</button>
          <button type="button" onClick={() => scrollTo('resultados')} className={linkClass}>{t('results')}</button>
          <Link href={faqPath} className={linkClass}>{t('faq')}</Link>
        </div>

        {/* CTA + hamburger */}
        <div className="flex items-center gap-3">
          <Link
            href={appPath}
            className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-colors shadow-sm"
          >
            {t('access')}
          </Link>
          <button
            type="button"
            className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-text-secondary border border-gray-200 hover:bg-gray-50 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={t('menu')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 px-5 py-4 flex flex-col gap-4 text-sm font-medium text-text-secondary bg-white">
          <Link href={homePath} onClick={() => setMenuOpen(false)} className={linkClass}>{t('home')}</Link>
          <button type="button" onClick={() => { scrollTo('proceso'); setMenuOpen(false); }} className={`${linkClass} text-left`}>{t('process')}</button>
          <button type="button" onClick={() => { scrollTo('resultados'); setMenuOpen(false); }} className={`${linkClass} text-left`}>{t('results')}</button>
          <Link href={faqPath} onClick={() => setMenuOpen(false)} className={linkClass}>{t('faq')}</Link>
        </div>
      )}
    </nav>
  );
}
