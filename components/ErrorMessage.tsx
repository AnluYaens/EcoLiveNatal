'use client';

import { useTranslations } from 'next-intl';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  const t = useTranslations('errors');

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
      <p className="text-red-700 text-sm">{message}</p>
      {onRetry && (
        <button
          className="mt-3 text-sm font-medium text-red-600 underline underline-offset-2 hover:text-red-700 transition-colors"
          onClick={onRetry}
        >
          {t('retry')}
        </button>
      )}
    </div>
  );
}
