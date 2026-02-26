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

      if (file.type === 'image/heic' || file.type === 'image/heif') {
        setConverting(true);
        try {
          const heic2anyModule = await import('heic2any');
          const heic2any = heic2anyModule.default as HeicConverter;
          const result = await heic2any({ blob: file, toType: 'image/jpeg' });
          const convertedBlob = Array.isArray(result) ? result[0] : result;
          const convertedFile = new File(
            [convertedBlob],
            file.name.replace(/\.(heic|heif)$/i, '.jpg'),
            { type: 'image/jpeg' }
          );
          onFileSelected(convertedFile);
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
    <div className="max-w-lg mx-auto">
      <h2 className="text-xl font-bold text-text-primary mb-4">{t('title')}</h2>

      <div
        role="button"
        tabIndex={0}
        className={`min-h-[200px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 cursor-pointer transition-colors ${
          dragging
            ? 'border-accent bg-[#fff5f5]'
            : 'border-gray-300 bg-background'
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
        <span className="text-5xl mb-3" aria-hidden>📷</span>
        <p className="text-text-secondary text-sm text-center">{t('hint')}</p>
      </div>

      <div className="flex gap-3 mt-4">
        <button
          type="button"
          className="flex-1 bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-xl transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
        >
          📁 {t('chooseFile')}
        </button>
        <button
          type="button"
          className="flex-1 bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-xl transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            cameraInputRef.current?.click();
          }}
        >
          📷 {t('takePhoto')}
        </button>
      </div>

      <p className="mt-3 text-center text-xs text-text-secondary">
        🔒 {t('privacyBadge')}
      </p>

      {converting && (
        <p className="mt-3 text-center text-sm text-text-secondary animate-pulse">
          ⏳
        </p>
      )}

      {error && (
        <p className="mt-3 text-center text-sm text-red-500">{error}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".jpg,.jpeg,.png,.heic,.heif,.webp,image/jpeg,image/png,image/heic,image/heif,image/webp"
        onChange={handleInputChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={handleInputChange}
      />
    </div>
  );
}
