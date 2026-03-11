'use client';

import { useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { MAX_FILE_SIZE_BYTES, SUPPORTED_MIME_TYPES } from '@/lib/constants';

interface UploadStepProps {
  onFileSelected: (file: File) => void;
}

type HeicConverter = (opts: { blob: Blob; toType: string }) => Promise<Blob | Blob[]>;

export default function UploadStep({ onFileSelected }: UploadStepProps) {
  const t = useTranslations('uploadZone');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [dragging, setDragging] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(t('errorSize'));
        return;
      }

      const supportedTypes: readonly string[] = SUPPORTED_MIME_TYPES;
      if (!supportedTypes.includes(file.type)) {
        setError(t('errorFormat'));
        return;
      }

      if (['image/heic', 'image/heif', 'image/hevc'].includes(file.type)) {
        setConverting(true);
        try {
          const outName = file.name.replace(/\.(heic|heif|hevc)$/i, '.jpg');
          let convertedBlob: Blob | null = null;

          // Stage 1: native browser decoding (Android 12+ / iOS — no WASM)
          try {
            const bitmap = await createImageBitmap(file);
            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(bitmap, 0, 0);
              bitmap.close();
              convertedBlob = await new Promise<Blob | null>((res) =>
                canvas.toBlob(res, 'image/jpeg', 0.92)
              );
            }
          } catch {
            // Stage 1 failed — fall through to heic2any
          }

          // Stage 2: heic2any WASM fallback
          if (!convertedBlob) {
            const heic2anyModule = await import('heic2any');
            const heic2any = heic2anyModule.default as HeicConverter;
            const result = await heic2any({ blob: file, toType: 'image/jpeg' });
            convertedBlob = Array.isArray(result) ? result[0] : result;
          }

          if (!convertedBlob) throw new Error('conversion failed');
          onFileSelected(new File([convertedBlob], outName, { type: 'image/jpeg' }));
        } catch {
          setError(t('errorHeic'));
        } finally {
          setConverting(false);
        }
        return;
      }

      onFileSelected(file);
    },
    [onFileSelected, t]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-text-primary">{t('title')}</h2>
        <p className="text-sm text-text-secondary leading-relaxed max-w-xs mx-auto">{t('subtitle')}</p>
      </div>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 ${
          dragging
            ? 'border-accent bg-accent-light/40 scale-[1.01]'
            : 'border-gray-300 bg-white hover:border-accent/50 hover:bg-accent-light/20'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <svg className="w-10 h-10 text-accent/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-sm font-medium text-text-primary">{t('dragHint')}</p>
          <p className="text-xs text-text-secondary/70">{t('formatHint')}</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-4 rounded-full transition-all duration-200 shadow-sm flex items-center justify-center gap-2"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {t('chooseFile')}
        </button>
        <button
          type="button"
          className="w-full bg-white border-2 border-gray-200 text-text-primary font-medium py-4 rounded-full transition-all duration-200 hover:border-accent/40 hover:bg-accent-light/10 flex items-center justify-center gap-2"
          onClick={(e) => {
            e.stopPropagation();
            cameraInputRef.current?.click();
          }}
        >
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {t('takePhoto')}
        </button>
      </div>

      {/* Tip card */}
      <div className="bg-accent-light/40 rounded-2xl p-4 flex gap-3 items-start">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
          <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          <span className="font-semibold text-text-primary">{t('tipLabel')}: </span>
          {t('tip')}
        </p>
      </div>

      {converting && (
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="h-5 w-5 rounded-full border-2 border-gray-200 border-t-accent animate-spin" />
          <span className="text-sm text-text-secondary">{t('converting')}</span>
        </div>
      )}

      {error && (
        <p className="text-center text-sm text-red-600 bg-red-50 rounded-2xl px-4 py-3 border border-red-100">{error}</p>
      )}

      {/* Privacy badge */}
      <div className="flex items-center justify-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-text-secondary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-xs text-text-secondary/50">
          {t('privacyBadge')}
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        aria-label={t('chooseFile')}
        className="hidden"
        accept=".jpg,.jpeg,.png,.heic,.heif,.hevc,.webp,image/jpeg,image/png,image/heic,image/heif,image/hevc,image/webp"
        onChange={handleInputChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        aria-label={t('takePhoto')}
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={handleInputChange}
      />
    </section>
  );
}
