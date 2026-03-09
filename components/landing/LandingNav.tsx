'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { APP_NAME, CLINIC_LOGO, CLINIC_NAME } from '@/lib/constants';

export default function LandingNav() {
  const t = useTranslations('landing.nav');
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-5 py-3.5 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          {CLINIC_LOGO ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={CLINIC_LOGO} alt={CLINIC_NAME || APP_NAME} className="h-8 object-contain" />
          ) : (
            <>
              <div className="w-9 h-9 rounded-full bg-accent-light flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
                </svg>
              </div>
              <span className="text-base font-bold text-text-primary tracking-tight">{APP_NAME}</span>
            </>
          )}
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-text-secondary">
          <a href="#proceso" className="hover:text-accent transition-colors">{t('process')}</a>
          <a href="#resultados" className="hover:text-accent transition-colors">{t('results')}</a>
          <a href="#faq" className="hover:text-accent transition-colors">{t('faq')}</a>
        </div>

        {/* CTA + hamburger */}
        <div className="flex items-center gap-3">
          <Link
            href="/app"
            className="bg-accent hover:bg-accent-hover text-white text-sm font-semibold px-4 py-2 rounded-button transition-colors"
          >
            {t('access')}
          </Link>
          <button
            type="button"
            className="md:hidden w-8 h-8 flex items-center justify-center text-text-secondary"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
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
        <div className="md:hidden border-t border-gray-100 px-5 py-4 flex flex-col gap-4 text-sm font-medium text-text-secondary">
          <a href="#proceso" onClick={() => setMenuOpen(false)} className="hover:text-accent transition-colors">{t('process')}</a>
          <a href="#resultados" onClick={() => setMenuOpen(false)} className="hover:text-accent transition-colors">{t('results')}</a>
          <a href="#faq" onClick={() => setMenuOpen(false)} className="hover:text-accent transition-colors">{t('faq')}</a>
        </div>
      )}
    </nav>
  );
}
