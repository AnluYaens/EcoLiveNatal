'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import LoadingOverlay from '@/components/LoadingOverlay';
import ErrorMessage from '@/components/ErrorMessage';
import { SESSION_KEY } from '@/components/PinGate';

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

  useEffect(() => {
    const url = URL.createObjectURL(croppedBlob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [croppedBlob]);

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);

    try {
      const formData = new FormData();
      formData.append('image', croppedBlob, 'crop.png');
      formData.append('style', 'ultra');
      formData.append('creativity', '50');
      formData.append('skinTone', skinTone);
      formData.append('pin', sessionStorage.getItem(SESSION_KEY) ?? '');

      const res = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      const data = (await res.json()) as ApiResponse;

      if (!res.ok || !data.image) {
        setError(data.error ?? tErrors('generic'));
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
          className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors text-text-primary"
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
          <img
            src={previewUrl}
            alt=""
            className="max-w-48 w-full rounded-xl mx-auto shadow-md"
          />
        )}
        <div>
          <h3 className="text-2xl font-bold text-text-primary">
            {tGenerate('confirmTitle')}
          </h3>
          <p className="text-sm text-text-secondary mt-2 max-w-xs mx-auto leading-relaxed">
            {tGenerate('confirmSubtitle')}
          </p>
          <p className="text-xs text-text-secondary/60 mt-3">{tGenerate('estimatedTime')}</p>
        </div>

        {/* Skin tone selector */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-text-primary">{tGenerate('skinToneLabel')}</p>
          <div className="inline-flex rounded-xl overflow-hidden border border-gray-200">
            {(['normal', 'moreno'] as const).map((tone) => (
              <button
                key={tone}
                type="button"
                onClick={() => setSkinTone(tone)}
                className={`px-5 py-2 text-sm font-medium transition-colors ${
                  skinTone === tone
                    ? 'bg-accent text-white'
                    : 'bg-white text-text-secondary hover:bg-gray-50'
                }`}
              >
                {tGenerate(tone === 'normal' ? 'skinToneNormal' : 'skinToneMoreno')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <ErrorMessage message={error} onRetry={handleGenerate} />
      )}

      <button
        type="button"
        className="w-full bg-accent hover:bg-accent-hover text-white font-bold py-5 text-lg rounded-full transition-all duration-200 disabled:opacity-50"
        onClick={handleGenerate}
        disabled={loading}
      >
        {tGenerate('button')}
      </button>

      <LoadingOverlay visible={loading} />
    </section>
  );
}
