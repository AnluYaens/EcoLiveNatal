'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { APP_NAME } from '@/lib/constants';
import { stripDecorativeEmoji } from '@/lib/stripDecorativeEmoji';

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
  const tSteps = useTranslations('steps');
  const title = stripDecorativeEmoji(t('title'));
  const downloadLabel = stripDecorativeEmoji(t('download'));
  const shareLabel = stripDecorativeEmoji(t('whatsapp'));
  const regenerateLabel = stripDecorativeEmoji(t('regenerate'));
  const newSessionLabel = stripDecorativeEmoji(t('newSession'));
  const beforeLabel = stripDecorativeEmoji(tSteps('crop'));
  const afterLabel = stripDecorativeEmoji(tSteps('result'));
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'eco' | 'result' | 'split'>('split');

  useEffect(() => {
    if (!sourceBlob) {
      setBeforeUrl(null);
      return;
    }
    const url = URL.createObjectURL(sourceBlob);
    setBeforeUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [sourceBlob]);

  const effectiveViewMode = beforeUrl ? viewMode : 'result';

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

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image for split download'));
      img.src = src;
    });

  const drawCover = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => {
    const imageAspect = img.width / img.height;
    const boxAspect = width / height;

    let sx = 0;
    let sy = 0;
    let sw = img.width;
    let sh = img.height;

    if (imageAspect > boxAspect) {
      sw = img.height * boxAspect;
      sx = (img.width - sw) / 2;
    } else {
      sh = img.width / boxAspect;
      sy = (img.height - sh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, x, y, width, height);
  };

  const createSplitBlob = async (): Promise<Blob | null> => {
    const resultSrc = `data:image/png;base64,${imageBase64}`;
    let ecoUrl = beforeUrl;
    let shouldRevokeEcoUrl = false;

    if (!ecoUrl && sourceBlob) {
      ecoUrl = URL.createObjectURL(sourceBlob);
      shouldRevokeEcoUrl = true;
    }

    if (!ecoUrl) return null;

    try {
      const [ecoImage, resultImage] = await Promise.all([
        loadImage(ecoUrl),
        loadImage(resultSrc),
      ]);

      const canvas = document.createElement('canvas');
      const padding = 16;
      const gap = 8;
      canvas.width = 2048;
      canvas.height = 1024;

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const panelWidth = (canvas.width - padding * 2 - gap) / 2;
      const panelHeight = canvas.height - padding * 2;

      ctx.fillStyle = '#FAFAF8';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawCover(ctx, ecoImage, padding, padding, panelWidth, panelHeight);
      drawCover(
        ctx,
        resultImage,
        padding + panelWidth + gap,
        padding,
        panelWidth,
        panelHeight,
      );

      return await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((blob) => resolve(blob), 'image/png'),
      );
    } finally {
      if (shouldRevokeEcoUrl && ecoUrl) {
        URL.revokeObjectURL(ecoUrl);
      }
    }
  };

  const buildAllFiles = async (): Promise<File[]> => {
    const files: File[] = [];
    const resultBlob = base64ToBlob();
    files.push(new File([resultBlob], 'retrato-ecolivenatal-resultado.png', { type: 'image/png' }));
    if (sourceBlob) {
      files.push(new File([sourceBlob], 'retrato-ecolivenatal-eco.png', { type: 'image/png' }));
    }
    const splitBlob = await createSplitBlob();
    if (splitBlob) {
      files.push(new File([splitBlob], 'retrato-ecolivenatal-split.png', { type: 'image/png' }));
    }
    return files;
  };

  const isMobile = () => /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  const handleDownload = async () => {
    const files = await buildAllFiles();

    // iOS Safari and Android Chrome only: use Web Share API (saves to photos/files)
    if (isMobile() && navigator.canShare?.({ files })) {
      try {
        await navigator.share({ files });
        return;
      } catch {
        // User cancelled or share failed — fall through to anchor download
      }
    }

    // Desktop (and mobile fallback): trigger individual file downloads
    files.forEach((file) => downloadBlob(file, file.name));
  };

  const handleWhatsApp = async () => {
    const files = await buildAllFiles();

    // Mobile (iOS + Android): share all 3 images via native share sheet
    if (isMobile() && navigator.canShare?.({ files })) {
      try {
        await navigator.share({ files });
        return;
      } catch {
        // User cancelled or share failed — fall through to WhatsApp link
      }
    }

    // Desktop fallback: open WhatsApp web
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
        <div className="border-b border-white/60 bg-background px-3 py-2">
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                effectiveViewMode === 'eco'
                  ? 'bg-accent text-white'
                  : 'bg-white text-text-primary border border-gray-200'
              }`}
              onClick={() => setViewMode('eco')}
              disabled={!beforeUrl}
            >
              {t('eco')}
            </button>
            <button
              type="button"
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                effectiveViewMode === 'result'
                  ? 'bg-accent text-white'
                  : 'bg-white text-text-primary border border-gray-200'
              }`}
              onClick={() => setViewMode('result')}
            >
              {t('result')}
            </button>
            <button
              type="button"
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                effectiveViewMode === 'split'
                  ? 'bg-accent text-white'
                  : 'bg-white text-text-primary border border-gray-200'
              }`}
              onClick={() => setViewMode('split')}
              disabled={!beforeUrl}
            >
              {t('split')}
            </button>
          </div>
        </div>

        <div className="relative aspect-square w-full bg-white">
          {effectiveViewMode === 'eco' && beforeUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={beforeUrl}
                alt={beforeLabel}
                className="h-full w-full object-cover"
              />
            </>
          )}

          {effectiveViewMode === 'result' && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${imageBase64}`}
                alt={title}
                className="h-full w-full object-cover"
              />
            </>
          )}

          {effectiveViewMode === 'split' && beforeUrl && (
            <div className="grid h-full grid-cols-2 gap-1 bg-background p-1">
              <div className="relative overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={beforeUrl}
                  alt={beforeLabel}
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute left-2 top-2 rounded-lg bg-white/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-primary">
                  {t('eco')}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${imageBase64}`}
                  alt={afterLabel}
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute right-2 top-2 rounded-lg bg-white/85 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-primary">
                  {t('result')}
                </div>
              </div>
            </div>
          )}
        </div>
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
