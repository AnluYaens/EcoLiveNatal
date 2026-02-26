'use client';

import { useTranslations } from 'next-intl';
import { APP_NAME } from '@/lib/constants';

interface ResultStepProps {
  imageBase64: string;
  onRegenerate: () => void;
  onNewSession: () => void;
}

export default function ResultStep({
  imageBase64,
  onRegenerate,
  onNewSession,
}: ResultStepProps) {
  const t = useTranslations('result');

  const base64ToBlob = (): Blob => {
    const binary = atob(imageBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: 'image/png' });
  };

  const handleDownload = () => {
    const blob = base64ToBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'retrato-ecolivenatal.png';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleWhatsApp = async () => {
    try {
      const blob = base64ToBlob();
      const file = new File([blob], 'retrato-ecolivenatal.png', {
        type: 'image/png',
      });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
    } catch {
      // fall through to link fallback
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(APP_NAME)}`,
      '_blank'
    );
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-text-primary mb-4 text-center">
        {t('title')}
      </h2>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`data:image/png;base64,${imageBase64}`}
        alt={t('title')}
        className="w-full max-w-lg mx-auto rounded-2xl shadow-md"
      />

      <div className="grid grid-cols-2 gap-3 mt-6 sm:grid-cols-4">
        <button
          type="button"
          className="bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          onClick={handleDownload}
        >
          {t('download')}
        </button>
        <button
          type="button"
          className="bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          onClick={handleWhatsApp}
        >
          {t('whatsapp')}
        </button>
        <button
          type="button"
          className="border border-gray-300 text-text-primary py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm"
          onClick={onRegenerate}
        >
          {t('regenerate')}
        </button>
        <button
          type="button"
          className="border border-gray-300 text-text-primary py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm"
          onClick={onNewSession}
        >
          {t('newSession')}
        </button>
      </div>
    </div>
  );
}
