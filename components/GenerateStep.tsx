'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import LoadingOverlay from '@/components/LoadingOverlay';
import ErrorMessage from '@/components/ErrorMessage';
import { isApiErrorCode } from '@/lib/apiErrors';
import { SESSION_KEY, ACCOUNT_ID_KEY } from '@/components/TokenGate';

type GenerationMode = 'portrait' | 'realistic';
type ScanType = '3d4d' | '2d';
type AnatomicalRegion = 'face' | 'heart' | 'brain' | 'spine' | 'abdomen' | 'fullBody';

const REGIONS: ReadonlyArray<{ key: AnatomicalRegion; iconPath: string; labelKey: string; descKey: string }> = [
  { key: 'face', iconPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z', labelKey: 'regionFace', descKey: 'regionFaceDesc' },
  { key: 'heart', iconPath: 'M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z', labelKey: 'regionHeart', descKey: 'regionHeartDesc' },
  { key: 'brain', iconPath: 'M12 2a9 9 0 00-9 9c0 3.87 2.46 7.16 5.9 8.42.07-.34.2-.68.38-1 .3-.53.76-.97 1.32-1.22a3.5 3.5 0 01-.6-1.95 3.5 3.5 0 013.5-3.5h.5a3.5 3.5 0 013.5 3.5c0 .72-.22 1.39-.6 1.95.56.25 1.02.69 1.32 1.22.18.32.31.66.38 1A9.004 9.004 0 0021 11a9 9 0 00-9-9z', labelKey: 'regionBrain', descKey: 'regionBrainDesc' },
  { key: 'spine', iconPath: 'M12 2L9.5 5H11v3H9.5L12 11l2.5-3H13V5h1.5L12 2zm0 11l-2.5 3H11v3H9.5L12 22l2.5-3H13v-3h1.5L12 13z', labelKey: 'regionSpine', descKey: 'regionSpineDesc' },
  { key: 'abdomen', iconPath: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z', labelKey: 'regionAbdomen', descKey: 'regionAbdomenDesc' },
  { key: 'fullBody', iconPath: 'M12 2a2 2 0 110 4 2 2 0 010-4zM10 8a2 2 0 00-2 2v4h2v8h4v-8h2v-4a2 2 0 00-2-2h-4z', labelKey: 'regionFullBody', descKey: 'regionFullBodyDesc' },
];

interface GenerateStepProps {
  croppedBlob: Blob;
  onResult: (base64: string) => void;
  onBack: () => void;
}

interface ApiResponse {
  image?: string;
  error?: string;
}

function getGenerationDefaults(
  mode: GenerationMode,
  anatomicalRegion: AnatomicalRegion,
): { style: 'soft' | 'ultra'; creativity: number } {
  if (mode === 'portrait' && anatomicalRegion === 'face') {
    return {
      style: 'ultra',
      creativity: 15,
    };
  }

  return {
    style: 'ultra',
    creativity: 50,
  };
}

export default function GenerateStep({
  croppedBlob,
  onResult,
  onBack,
}: GenerateStepProps) {
  const tGenerate = useTranslations('generate');
  const tErrors = useTranslations('errors');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [skinTone, setSkinTone] = useState<'normal' | 'moreno'>('normal');
  const [mode, setMode] = useState<GenerationMode>('portrait');
  const [scanType, setScanType] = useState<ScanType>('3d4d');
  const [anatomicalRegion, setAnatomicalRegion] = useState<AnatomicalRegion>('face');
  const [clinicalNotes, setClinicalNotes] = useState('');

  const portraitDisabled = anatomicalRegion !== 'face' && anatomicalRegion !== 'fullBody';

  useEffect(() => {
    const url = URL.createObjectURL(croppedBlob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [croppedBlob]);

  const handleRegionChange = (region: AnatomicalRegion) => {
    setAnatomicalRegion(region);
    if (region !== 'face' && region !== 'fullBody' && mode === 'portrait') {
      setMode('realistic');
    }
  };

  const compressBlob = async (blob: Blob): Promise<Blob> => {
    const MAX_DIM = 1280;
    try {
      const bitmap = await createImageBitmap(blob);
      const { width, height } = bitmap;
      const scale = Math.min(1, MAX_DIM / Math.max(width, height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { bitmap.close(); return blob; }
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      return await new Promise<Blob>((res) =>
        canvas.toBlob((b) => res(b ?? blob), 'image/jpeg', 0.88)
      );
    } catch {
      return blob;
    }
  };

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);

    try {
      const imageBlob = await compressBlob(croppedBlob);
      const generationDefaults = getGenerationDefaults(mode, anatomicalRegion);
      const formData = new FormData();
      formData.append('image', imageBlob, 'crop.jpg');
      formData.append('style', generationDefaults.style);
      formData.append('creativity', String(generationDefaults.creativity));
      formData.append('skinTone', skinTone);
      formData.append('mode', mode);
      formData.append('scanType', scanType);
      formData.append('anatomicalRegion', anatomicalRegion);
      formData.append('clinicalNotes', clinicalNotes);
      formData.append('token', sessionStorage.getItem(SESSION_KEY) ?? '');
      formData.append('accountId', sessionStorage.getItem(ACCOUNT_ID_KEY) ?? '');

      const res = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      const data = (await res.json()) as ApiResponse;

      if (!res.ok || !data.image) {
        const errorKey = data.error && isApiErrorCode(data.error)
          ? data.error
          : 'generic';
        setError(tErrors(errorKey));
        return;
      }

      onResult(data.image);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError(tErrors('timeout'));
      } else {
        setError(tErrors('generic'));
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <section className="space-y-5 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="w-9 h-9 rounded-full flex items-center justify-center bg-white border border-gray-200 hover:bg-gray-50 transition-colors text-text-primary shadow-sm"
          onClick={onBack}
          aria-label={tGenerate('back')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-text-primary flex-1 text-center pr-9">
          {tGenerate('title')}
        </h2>
      </div>

      {/* Horizontal preview card */}
      {previewUrl && (
        <div className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-text-primary">
              {tGenerate('confirmTitle')}
            </h3>
            <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
              {tGenerate('confirmSubtitle')}
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt=""
            className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
          />
        </div>
      )}

      {/* Anatomical region selector — circular icons */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-text-primary">{tGenerate('regionTitle')}</p>
        <div className="grid grid-cols-3 gap-3">
          {REGIONS.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => handleRegionChange(r.key)}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all ${
                  anatomicalRegion === r.key
                    ? 'border-accent bg-accent/10'
                    : 'border-gray-200 bg-white group-hover:border-gray-300'
                }`}
              >
                <svg
                  className={`w-6 h-6 transition-colors ${
                    anatomicalRegion === r.key ? 'text-accent' : 'text-text-secondary'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d={r.iconPath} />
                </svg>
              </div>
              <span className="text-xs font-medium text-text-primary leading-tight text-center">
                {tGenerate(r.labelKey)}
              </span>
              <span className="text-[10px] text-text-secondary leading-tight text-center">
                {tGenerate(r.descKey)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Scan type + Skin tone — side by side */}
      <div className="grid grid-cols-2 gap-4">
        {/* Scan type */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-text-primary">{tGenerate('scanTypeTitle')}</p>
          <div className="flex rounded-full overflow-hidden border border-gray-200 bg-gray-50 p-0.5">
            {(['2d', '3d4d'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setScanType(type)}
                className={`flex-1 px-3 py-1.5 text-xs font-medium transition-all rounded-full ${
                  scanType === type
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tGenerate(type === '2d' ? 'scan2d' : 'scan3d4d')}
              </button>
            ))}
          </div>
        </div>

        {/* Skin tone */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-text-primary">{tGenerate('skinToneLabel')}</p>
          <div className="flex rounded-full overflow-hidden border border-gray-200 bg-gray-50 p-0.5">
            {(['normal', 'moreno'] as const).map((tone) => (
              <button
                key={tone}
                type="button"
                onClick={() => setSkinTone(tone)}
                className={`flex-1 px-3 py-1.5 text-xs font-medium transition-all rounded-full ${
                  skinTone === tone
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tGenerate(tone === 'normal' ? 'skinToneNormal' : 'skinToneMoreno')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Image type selector — pill cards with descriptions + checkmark */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-text-primary">{tGenerate('modeTitle')}</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => !portraitDisabled && setMode('portrait')}
            disabled={portraitDisabled}
            className={`relative p-3 rounded-2xl border-2 text-left transition-all ${
              portraitDisabled
                ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                : mode === 'portrait'
                  ? 'border-accent bg-accent/5'
                  : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            {mode === 'portrait' && !portraitDisabled && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <span className="text-sm font-semibold text-text-primary block">{tGenerate('modePortrait')}</span>
            <span className="text-[11px] text-text-secondary block mt-0.5 leading-snug">
              {portraitDisabled ? tGenerate('portraitDisabledHint') : tGenerate('modePortraitDesc')}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMode('realistic')}
            className={`relative p-3 rounded-2xl border-2 text-left transition-all ${
              mode === 'realistic'
                ? 'border-accent bg-accent/5'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            {mode === 'realistic' && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            <span className="text-sm font-semibold text-text-primary block">{tGenerate('modeRealistic')}</span>
            <span className="text-[11px] text-text-secondary block mt-0.5 leading-snug">{tGenerate('modeRealisticDesc')}</span>
          </button>
        </div>
      </div>

      {/* Clinical notes */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-text-primary block">
          {tGenerate('clinicalNotesLabel')}
        </label>
        <textarea
          value={clinicalNotes}
          onChange={(e) => setClinicalNotes(e.target.value.slice(0, 200))}
          maxLength={200}
          rows={2}
          placeholder={tGenerate('clinicalNotesPlaceholder')}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
        />
        <p className="text-[10px] text-text-secondary/60 text-right">
          {clinicalNotes.length}/200
        </p>
      </div>

      <p className="text-xs text-text-secondary/60 text-center">{tGenerate('estimatedTime')}</p>

      {error && (
        <ErrorMessage message={error} onRetry={handleGenerate} />
      )}

      {/* Generate button */}
      <button
        type="button"
        className="w-full bg-accent hover:bg-accent-hover text-white font-bold py-4 text-lg rounded-full transition-all duration-200 shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
        onClick={handleGenerate}
        disabled={loading}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        {tGenerate('button')}
      </button>

      <LoadingOverlay visible={loading} />
    </section>
  );
}
