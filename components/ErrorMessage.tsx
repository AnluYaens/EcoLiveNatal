'use client';

import { useTranslations } from 'next-intl';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  const t = useTranslations('errors');

  return (
    <div className="rounded-2xl bg-[#fff0f0] border border-[#f0c0c0] p-4 text-center mt-4">
      <p className="text-text-primary text-sm">{message}</p>
      {onRetry && (
        <button
          className="mt-3 bg-accent hover:bg-accent-hover text-white font-semibold py-2 px-6 rounded-xl text-sm transition-colors"
          onClick={onRetry}
        >
          {t('retry')}
        </button>
      )}
    </div>
  );
}
