'use client';

import { useTranslations } from 'next-intl';
import { APP_NAME } from '@/lib/constants';

export default function LandingFooter() {
  const t = useTranslations('landing.footer');
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-100 py-10">
      <div className="max-w-5xl mx-auto px-5">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-text-primary">{APP_NAME}</span>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-text-secondary">
            <a href="#proceso" className="hover:text-accent transition-colors">{t('process')}</a>
            <a href="#resultados" className="hover:text-accent transition-colors">{t('results')}</a>
            <a href="#faq" className="hover:text-accent transition-colors">FAQ</a>
            <span className="text-gray-200">|</span>
            <a href="/privacidad" className="hover:text-accent transition-colors">{t('privacy')}</a>
            <a href="/terminos" className="hover:text-accent transition-colors">{t('terms')}</a>
          </nav>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-text-secondary">
          <span>© {year} {APP_NAME}. {t('rights')}</span>
          <span className="italic">{t('disclaimer')}</span>
        </div>
      </div>
    </footer>
  );
}
