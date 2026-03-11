'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import LoadingOverlay from '@/components/LoadingOverlay';
import ErrorMessage from '@/components/ErrorMessage';
import { SESSION_KEY, ACCOUNT_ID_KEY } from '@/components/PinGate';

type GenerationMode = 'portrait' | 'realistic';
type ScanType = '3d4d' | '2d';
type AnatomicalRegion = 'face' | 'heart' | 'brain' | 'spine' | 'abdomen' | 'fullBody';

const REGIONS: ReadonlyArray<{ key: AnatomicalRegion; emoji: string; labelKey: string; descKey: string }> = [
  { key: 'face', emoji: '\u{1F476}', labelKey: 'regionFace', descKey: 'regionFaceDesc' },
  { key: 'heart', emoji: '\u{2764}\u{FE0F}', labelKey: 'regionHeart', descKey: 'regionHeartDesc' },
  { key: 'brain', emoji: '\u{1F9E0}', labelKey: 'regionBrain', descKey: 'regionBrainDesc' },
  { key: 'spine', emoji: '\u{1F9B4}', labelKey: 'regionSpine', descKey: 'regionSpineDesc' },
  { key: 'abdomen', emoji: '\u{1FA7A}', labelKey: 'regionAbdomen', descKey: 'regionAbdomenDesc' },
  { key: 'fullBody', emoji: '\u{1F52C}', labelKey: 'regionFullBody', descKey: 'regionFullBodyDesc' },
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

  const portraitDisabled = anatomicalRegion !== 'face';

  useEffect(() => {
    const url = URL.createObjectURL(croppedBlob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [croppedBlob]);

  const handleRegionChange = (region: AnatomicalRegion) => {
    setAnatomicalRegion(region);
    if (region !== 'face' && mode === 'portrait') {
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
      const formData = new FormData();
      formData.append('image', imageBlob, 'crop.jpg');
      formData.append('style', 'ultra');
      formData.append('creativity', '50');
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
        const errorKey = data.error === 'dailyLimitExceeded' ? 'dailyLimitExceeded' : 'generic';
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
    <section className="space-y-5">
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

      {/* Crop preview + confirmation text */}
      <div className="text-center space-y-4">
        {previewUrl && (
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 inline-block mx-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt=""
              className="max-w-44 w-full rounded-xl"
            />
          </div>
        )}
        <div>
          <h3 className="text-xl font-bold text-text-primary">
            {tGenerate('confirmTitle')}
          </h3>
          <p className="text-sm text-text-secondary mt-1.5 max-w-xs mx-auto leading-relaxed">
            {tGenerate('confirmSubtitle')}
          </p>
        </div>

        {/* Anatomical region selector */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-text-primary">{tGenerate('regionTitle')}</p>
          <div className="grid grid-cols-3 gap-2">
            {REGIONS.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => handleRegionChange(r.key)}
                className={`p-3 rounded-2xl border-2 text-center transition-all ${
                  anatomicalRegion === r.key
                    ? 'border-accent bg-accent/5'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <span className="text-xl block mb-0.5">{r.emoji}</span>
                <span className="text-xs font-semibold text-text-primary block leading-tight">
                  {tGenerate(r.labelKey)}
                </span>
                <span className="text-[10px] text-text-secondary block mt-0.5 leading-tight">
                  {tGenerate(r.descKey)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Clinical notes */}
        <div className="space-y-1.5 text-left">
          <label className="text-sm font-medium text-text-primary block">
            {tGenerate('clinicalNotesLabel')}
          </label>
          <textarea
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value.slice(0, 200))}
            maxLength={200}
            rows={2}
            placeholder={tGenerate('clinicalNotesPlaceholder')}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
          />
          <p className="text-[10px] text-text-secondary/60 text-right">
            {clinicalNotes.length}/200
          </p>
        </div>

        {/* Generation mode selector */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-text-primary">{tGenerate('modeTitle')}</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => !portraitDisabled && setMode('portrait')}
              disabled={portraitDisabled}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                portraitDisabled
                  ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                  : mode === 'portrait'
                    ? 'border-accent bg-accent/5'
                    : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className="text-2xl block mb-1">&#x1F476;</span>
              <span className="text-sm font-semibold text-text-primary block">{tGenerate('modePortrait')}</span>
              <span className="text-xs text-text-secondary block mt-0.5">
                {portraitDisabled ? tGenerate('portraitDisabledHint') : tGenerate('modePortraitDesc')}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMode('realistic')}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                mode === 'realistic'
                  ? 'border-accent bg-accent/5'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className="text-2xl block mb-1">&#x1F52C;</span>
              <span className="text-sm font-semibold text-text-primary block">{tGenerate('modeRealistic')}</span>
              <span className="text-xs text-text-secondary block mt-0.5">{tGenerate('modeRealisticDesc')}</span>
            </button>
          </div>
        </div>

        {/* Scan type toggle */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-text-primary">{tGenerate('scanTypeTitle')}</p>
          <div className="inline-flex rounded-full overflow-hidden border border-gray-200 bg-gray-50 p-0.5">
            {(['2d', '3d4d'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setScanType(type)}
                className={`px-5 py-2 text-sm font-medium transition-all rounded-full ${
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

        {/* Skin tone selector */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-text-primary">{tGenerate('skinToneLabel')}</p>
          <div className="inline-flex rounded-full overflow-hidden border border-gray-200 bg-gray-50 p-0.5">
            {(['normal', 'moreno'] as const).map((tone) => (
              <button
                key={tone}
                type="button"
                onClick={() => setSkinTone(tone)}
                className={`px-5 py-2 text-sm font-medium transition-all rounded-full ${
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

        <p className="text-xs text-text-secondary/60">{tGenerate('estimatedTime')}</p>
      </div>

      {error && (
        <ErrorMessage message={error} onRetry={handleGenerate} />
      )}

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
