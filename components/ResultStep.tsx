'use client';

import { useTranslations } from 'next-intl';
import { APP_NAME } from '@/lib/constants';
import { stripDecorativeEmoji } from '@/lib/stripDecorativeEmoji';

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
  const title = stripDecorativeEmoji(t('title'));
  const downloadLabel = stripDecorativeEmoji(t('download'));
  const shareLabel = stripDecorativeEmoji(t('whatsapp'));
  const regenerateLabel = stripDecorativeEmoji(t('regenerate'));
  const newSessionLabel = stripDecorativeEmoji(t('newSession'));

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
    <section className="space-y-5">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
        <p className="text-sm text-text-secondary mt-1">{t('subtitle')}</p>
      </div>

      {/* Result image */}
      <div className="rounded-2xl overflow-hidden shadow-lg ring-4 ring-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/png;base64,${imageBase64}`}
          alt={title}
          className="w-full object-cover"
        />
      </div>

      {/* Quick actions label */}
      <p className="text-xs font-semibold tracking-widest text-text-secondary uppercase px-1">
        {t('quickActions')}
      </p>

      {/* 2×2 action grid */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center gap-2 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200"
          onClick={handleDownload}
        >
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <span className="text-sm font-medium text-text-primary">{downloadLabel}</span>
        </button>

        <button
          type="button"
          className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center gap-2 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200"
          onClick={handleWhatsApp}
        >
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.531 5.849L.058 23.447a.75.75 0 00.918.964l5.878-1.537A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.75 9.75 0 01-4.964-1.356l-.355-.212-3.69.965.982-3.589-.232-.369A9.75 9.75 0 0112 2.25c5.385 0 9.75 4.365 9.75 9.75S17.385 21.75 12 21.75z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-text-primary">{shareLabel}</span>
        </button>

        <button
          type="button"
          className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center gap-2 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200"
          onClick={onRegenerate}
        >
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <span className="text-sm font-medium text-text-primary">{regenerateLabel}</span>
        </button>

        <button
          type="button"
          className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center gap-2 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200"
          onClick={onNewSession}
        >
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-text-primary">{newSessionLabel}</span>
        </button>
      </div>
    </section>
  );
}
