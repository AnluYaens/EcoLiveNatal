'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';

interface LoadingOverlayProps {
  visible: boolean;
}

export default function LoadingOverlay({ visible }: LoadingOverlayProps) {
  const t = useTranslations('generate');
  const [messageIndex, setMessageIndex] = useState(0);

  const loadingMessages = useMemo(
    () => [t('loading1'), t('loading2'), t('loading3')],
    [t]
  );

  useEffect(() => {
    if (!visible) {
      setMessageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % loadingMessages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [visible, loadingMessages.length]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-5 mx-4 w-full max-w-xs">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-accent rounded-full animate-spin" />
        <p
          key={messageIndex}
          className="text-lg font-medium text-text-primary text-center"
        >
          {loadingMessages[messageIndex]}
        </p>
        <p className="text-sm text-text-secondary">{t('estimatedTime')}</p>
      </div>
    </div>
  );
}
