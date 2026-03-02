'use client';

import { useTranslations } from 'next-intl';

type Step = 'upload' | 'crop' | 'generate' | 'result';

interface BottomNavProps {
  activeStep: Step;
}

export default function BottomNav({ activeStep }: BottomNavProps) {
  const t = useTranslations('nav');

  const isUploadPhase = activeStep === 'upload' || activeStep === 'crop' || activeStep === 'generate';
  const isResultPhase = activeStep === 'result';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-gray-100/80 pb-safe">
      <div className="relative flex items-center h-16 px-2">

        {/* Inicio */}
        <button
          type="button"
          className={`flex-1 flex flex-col items-center gap-1 py-1 ${isResultPhase ? 'text-accent' : 'text-text-secondary'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isResultPhase ? 2 : 1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[10px] font-medium">{t('home')}</span>
        </button>

        {/* Galería — activo en result */}
        <button
          type="button"
          disabled={!isResultPhase}
          className={`flex-1 flex flex-col items-center gap-1 py-1 ${isResultPhase ? 'text-accent' : 'text-text-secondary opacity-35'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isResultPhase ? 2 : 1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-[10px] font-medium">{t('gallery')}</span>
        </button>

        {/* Spacer for elevated center button */}
        <div className="flex-1" />

        {/* Historial — decorativo */}
        <button
          type="button"
          disabled
          className="flex-1 flex flex-col items-center gap-1 py-1 text-text-secondary opacity-35"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-[10px] font-medium">{t('history')}</span>
        </button>

        {/* Ajustes — decorativo */}
        <button
          type="button"
          disabled
          className="flex-1 flex flex-col items-center gap-1 py-1 text-text-secondary opacity-35"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-[10px] font-medium">{t('settings')}</span>
        </button>

        {/* Elevated center button — absolutely positioned */}
        <button
          type="button"
          className="absolute left-1/2 -translate-x-1/2 -top-6 flex flex-col items-center gap-0.5"
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${isUploadPhase ? 'bg-accent' : 'bg-gray-300'}`}>
            <svg className={`w-6 h-6 ${isUploadPhase ? 'text-white' : 'text-text-secondary'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className={`text-[10px] font-medium ${isUploadPhase ? 'text-accent' : 'text-text-secondary'}`}>{t('upload')}</span>
        </button>

      </div>
    </nav>
  );
}
