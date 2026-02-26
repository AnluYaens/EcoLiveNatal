'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import StyleCard from '@/components/StyleCard';
import CreativitySlider from '@/components/CreativitySlider';
import LoadingOverlay from '@/components/LoadingOverlay';
import ErrorMessage from '@/components/ErrorMessage';
import { DEFAULT_STYLE, DEFAULT_CREATIVITY } from '@/lib/constants';

type Style = 'soft' | 'ultra' | 'cinematic';

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
  const tStyles = useTranslations('styles');
  const tGenerate = useTranslations('generate');
  const tErrors = useTranslations('errors');

  const [selectedStyle, setSelectedStyle] = useState<Style>(
    DEFAULT_STYLE as Style
  );
  const [creativity, setCreativity] = useState(DEFAULT_CREATIVITY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styleOptions: { key: Style; label: string; description: string }[] = [
    {
      key: 'soft',
      label: tStyles('soft'),
      description: tStyles('softDesc'),
    },
    {
      key: 'ultra',
      label: tStyles('ultra'),
      description: tStyles('ultraDesc'),
    },
    {
      key: 'cinematic',
      label: tStyles('cinematic'),
      description: tStyles('cinematicDesc'),
    },
  ];

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);

    try {
      const formData = new FormData();
      formData.append('image', croppedBlob, 'crop.png');
      formData.append('style', selectedStyle);
      formData.append('creativity', String(creativity));

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
    <div className="max-w-lg mx-auto">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {styleOptions.map((s) => (
          <StyleCard
            key={s.key}
            styleKey={s.key}
            label={s.label}
            description={s.description}
            selected={selectedStyle === s.key}
            onSelect={() => setSelectedStyle(s.key)}
          />
        ))}
      </div>

      <CreativitySlider value={creativity} onChange={setCreativity} />

      {error && (
        <ErrorMessage message={error} onRetry={handleGenerate} />
      )}

      <div className="flex gap-3 mt-6">
        <button
          type="button"
          className="px-6 py-3 border border-gray-300 text-text-primary rounded-xl hover:bg-gray-50 transition-colors"
          onClick={onBack}
        >
          ←
        </button>
        <button
          type="button"
          className="flex-1 bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
          onClick={handleGenerate}
          disabled={loading}
        >
          {tGenerate('button')}
        </button>
      </div>

      <LoadingOverlay visible={loading} />
    </div>
  );
}
