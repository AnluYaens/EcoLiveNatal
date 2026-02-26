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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-background rounded-2xl shadow-lg p-8 flex flex-col items-center gap-4 max-w-xs mx-4">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-text-primary font-medium text-center">
          {loadingMessages[messageIndex]}
        </p>
        <p className="text-text-secondary text-sm">{t('estimatedTime')}</p>
      </div>
    </div>
  );
}
