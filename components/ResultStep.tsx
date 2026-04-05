'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { APP_NAME } from '@/lib/constants';
import { stripDecorativeEmoji } from '@/lib/stripDecorativeEmoji';
import { buildWhatsAppShareUrl } from '@/lib/whatsapp';

interface ResultStepProps {
  imageBase64: string;
  sourceBlob: Blob | null;
  onRegenerate: () => void;
  onNewSession: () => void;
}

export default function ResultStep({
  imageBase64,
  sourceBlob,
  onRegenerate,
  onNewSession,
}: ResultStepProps) {
  const t = useTranslations('result');
  const tDisclaimer = useTranslations('disclaimer');
  const tWhatsApp = useTranslations('whatsapp');
  const title = stripDecorativeEmoji(t('title'));
  const downloadLabel = stripDecorativeEmoji(t('download'));
  const shareLabel = stripDecorativeEmoji(t('whatsapp'));
  const regenerateLabel = stripDecorativeEmoji(t('regenerate'));
  const newSessionLabel = stripDecorativeEmoji(t('newSession'));
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'eco' | 'result'>('result');

  useEffect(() => {
    if (!sourceBlob) {
      setBeforeUrl(null);
      setViewMode('result');
      return;
    }
    const url = URL.createObjectURL(sourceBlob);
    setBeforeUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [sourceBlob]);

  const canCompare = beforeUrl !== null;
  const showingEco = canCompare && viewMode === 'eco';

  const base64ToBlob = (): Blob => {
    const binary = atob(imageBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: 'image/png' });
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const buildShareFiles = (): File[] => {
    const files: File[] = [];
    const resultBlob = base64ToBlob();
    files.push(
      new File([resultBlob], 'retrato-ecolivenatal-resultado.png', {
        type: 'image/png',
      }),
    );
    if (sourceBlob) {
      files.push(new File([sourceBlob], 'retrato-ecolivenatal-eco.png', { type: 'image/png' }));
    }
    return files;
  };

  const isMobile = () => /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  const handleDownload = async () => {
    const files = buildShareFiles();

    if (isMobile() && navigator.canShare?.({ files })) {
      try {
        await navigator.share({ files });
        return;
      } catch {
        // User cancelled or share failed — fall through to anchor download
      }
    }

    files.forEach((file) => downloadBlob(file, file.name));
  };

  const handleWhatsApp = async () => {
    const files = buildShareFiles();

    if (isMobile() && navigator.canShare?.({ files })) {
      try {
        await navigator.share({ files });
        return;
      } catch {
        // User cancelled or share failed — fall through to WhatsApp link
      }
    }

    window.open(
      buildWhatsAppShareUrl(tWhatsApp('shareResult', { appName: APP_NAME })),
      '_blank'
    );
  };

  return (
    <section className="space-y-5 pb-4">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary">{title}</h2>
        <p className="text-sm text-text-secondary mt-1">{t('subtitle')}</p>
      </div>

      {/* Result image */}
      <div className="rounded-2xl overflow-hidden shadow-lg bg-white">
        {canCompare && (
          <div className="px-3 py-2.5">
            <div className="grid grid-cols-2 gap-1.5 bg-gray-100 rounded-full p-1">
              <button
                type="button"
                className={`rounded-full px-3 py-2 text-sm font-semibold transition-all ${
                  showingEco
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                onClick={() => setViewMode('eco')}
              >
                {t('eco')}
              </button>
              <button
                type="button"
                className={`rounded-full px-3 py-2 text-sm font-semibold transition-all ${
                  !showingEco
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                onClick={() => setViewMode('result')}
              >
                {t('result')}
              </button>
            </div>
          </div>
        )}

        <div className="relative aspect-[3/4] w-full bg-white">
          {showingEco && beforeUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={beforeUrl}
                alt={t('eco')}
                className="h-full w-full object-contain"
              />
            </>
          )}

          {!showingEco && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${imageBase64}`}
                alt={title}
                className="h-full w-full object-contain"
              />
            </>
          )}
        </div>
      </div>
      
      {/* Banner underneath image */}
      <div className="bg-accent-light/60 text-text-primary text-xs font-medium px-4 py-2.5 rounded-xl text-center shadow-sm">
        {t('downloadHint')}
      </div>

      {/* Two action buttons side by side: Guardar + WhatsApp */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="flex items-center justify-center gap-2.5 bg-white rounded-2xl border border-gray-200 px-4 py-3.5 shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
          onClick={handleDownload}
        >
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span className="text-sm font-semibold text-text-primary">{downloadLabel}</span>
        </button>

        <button
          type="button"
          className="flex items-center justify-center gap-2.5 bg-white rounded-2xl border border-gray-200 px-4 py-3.5 shadow-sm hover:shadow-md hover:border-green-300 transition-all"
          onClick={handleWhatsApp}
        >
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.531 5.849L.058 23.447a.75.75 0 00.918.964l5.878-1.537A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.75 9.75 0 01-4.964-1.356l-.355-.212-3.69.965.982-3.589-.232-.369A9.75 9.75 0 0112 2.25c5.385 0 9.75 4.365 9.75 9.75S17.385 21.75 12 21.75z" />
          </svg>
          <span className="text-sm font-semibold text-text-primary">{shareLabel}</span>
        </button>
      </div>

      {/* Full-width regenerate button */}
      <button
        type="button"
        className="w-full flex items-center justify-center gap-2 border-2 border-accent text-accent font-semibold py-3.5 rounded-2xl hover:bg-accent/5 transition-all"
        onClick={onRegenerate}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {regenerateLabel}
      </button>

      {/* New session text link */}
      <div className="text-center">
        <button
          type="button"
          className="text-sm text-text-secondary hover:text-text-primary transition-colors underline underline-offset-2"
          onClick={onNewSession}
        >
          {newSessionLabel}
        </button>
      </div>

      {/* Disclaimer */}
      <p className="text-[11px] text-text-secondary/60 text-center leading-relaxed px-2">
        {tDisclaimer('text')}
      </p>
    </section>
  );
}
