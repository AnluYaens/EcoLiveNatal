'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import AnatomicalRegionSelector from '@/components/AnatomicalRegionSelector';
import LoadingOverlay from '@/components/LoadingOverlay';
import ErrorMessage from '@/components/ErrorMessage';
import { isApiErrorCode } from '@/lib/apiErrors';
import { analyzeClientImageQuality, type ImageQualityWarning } from '@/lib/clientImageQuality';
import { SESSION_KEY, ACCOUNT_ID_KEY } from '@/components/TokenGate';
import { buildClinicalNotesPayload, getConditionsForRegion } from '@/lib/clinicalConditions';
import {
  getDefaultScanTypeForRegion,
  getGenerationDefaults,
  getPreferredModeForRegion,
  getRegionProfile,
} from '@/lib/generationProfiles';
import {
  type GenerationMode,
  isModeAllowedForRegion,
  isPreferredScanTypeForRegion,
  type AnatomicalRegion,
  type ScanType,
  type SkinTone,
} from '@/lib/validation';

interface GenerateStepProps {
  croppedBlob: Blob;
  anatomicalRegion: AnatomicalRegion;
  onAnatomicalRegionChange: (region: AnatomicalRegion) => void;
  onResult: (base64: string) => void;
  onBack: () => void;
}

interface ApiResponse {
  image?: string;
  error?: string;
}

const GENERATE_REQUEST_TIMEOUT_MS = 90_000;
const MAX_GENERATE_IMAGE_DIM = 1280;

const QUALITY_WARNING_COPY: Record<ImageQualityWarning, 'qualityDark' | 'qualityLowContrast' | 'qualitySubjectTooSmall'> = {
  darkCrop: 'qualityDark',
  lowContrast: 'qualityLowContrast',
  subjectTooSmall: 'qualitySubjectTooSmall',
};

async function compressBlobForGeneration(blob: Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(blob);
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_GENERATE_IMAGE_DIM / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return blob;
    }

    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    return await new Promise<Blob>((resolve) =>
      canvas.toBlob((compressed) => resolve(compressed ?? blob), 'image/jpeg', 0.88),
    );
  } catch {
    return blob;
  }
}

export default function GenerateStep({
  croppedBlob,
  anatomicalRegion,
  onAnatomicalRegionChange,
  onResult,
  onBack,
}: GenerateStepProps) {
  const tGenerate = useTranslations('generate');
  const tCrop = useTranslations('crop');
  const tErrors = useTranslations('errors');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [skinTone, setSkinTone] = useState<SkinTone>('normal');
  const [mode, setMode] = useState<GenerationMode>(getPreferredModeForRegion(anatomicalRegion));
  const [scanType, setScanType] = useState<ScanType>(getDefaultScanTypeForRegion(anatomicalRegion));
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [qualityWarnings, setQualityWarnings] = useState<ImageQualityWarning[]>([]);

  const regionProfile = getRegionProfile(anatomicalRegion);
  const regionConditions = getConditionsForRegion(anatomicalRegion);
  const portraitDisabled = !isModeAllowedForRegion('portrait', anatomicalRegion);
  const scanTypeRecommendationMismatch = !isPreferredScanTypeForRegion(scanType, anatomicalRegion);

  useEffect(() => {
    const url = URL.createObjectURL(croppedBlob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [croppedBlob]);

  useEffect(() => {
    if (!isModeAllowedForRegion(mode, anatomicalRegion)) {
      setMode(getPreferredModeForRegion(anatomicalRegion));
    }
  }, [anatomicalRegion, mode]);

  useEffect(() => {
    let active = true;

    analyzeClientImageQuality(croppedBlob, anatomicalRegion)
      .then((assessment) => {
        if (active) {
          setQualityWarnings(assessment.warnings);
        }
      })
      .catch(() => {
        if (active) {
          setQualityWarnings([]);
        }
      });

    return () => {
      active = false;
    };
  }, [croppedBlob, anatomicalRegion]);

  const handleRegionChange = (region: AnatomicalRegion) => {
    onAnatomicalRegionChange(region);
    setSelectedConditions([]);
    setClinicalNotes('');
    setMode(getPreferredModeForRegion(region));
    setScanType(getDefaultScanTypeForRegion(region));
  };

  const loadingMessages =
    mode === 'portrait'
      ? [
          tGenerate('loadingCleanScan'),
          tGenerate('loadingAnalyzeFace'),
          tGenerate('loadingRenderPortrait'),
          tGenerate('loadingFinalize'),
        ]
      : [
          tGenerate('loadingCleanScan'),
          tGenerate(anatomicalRegion === 'heart' ? 'loadingAnalyzeHeart' : 'loadingAnalyzeAnatomy'),
          tGenerate('loadingRenderAnatomy'),
          tGenerate('loadingFinalize'),
        ];

  const estimatedTimeLabel =
    mode === 'portrait'
      ? tGenerate('estimatedTimePortrait')
      : tGenerate('estimatedTimeAnatomy');

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      GENERATE_REQUEST_TIMEOUT_MS,
    );

    try {
      const imageBlob = await compressBlobForGeneration(croppedBlob);
      const generationDefaults = getGenerationDefaults(mode, anatomicalRegion);
      const formData = new FormData();
      formData.append('image', imageBlob, 'crop.jpg');
      formData.append('creativity', String(generationDefaults.creativity));
      formData.append('skinTone', skinTone);
      formData.append('mode', mode);
      formData.append('scanType', scanType);
      formData.append('anatomicalRegion', anatomicalRegion);
      formData.append('clinicalNotes', buildClinicalNotesPayload(selectedConditions, clinicalNotes));
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

      <AnatomicalRegionSelector
        selectedRegion={anatomicalRegion}
        onSelect={handleRegionChange}
      />

      <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
        <p className="text-sm font-medium text-text-primary">
          {tCrop(regionProfile.cropGuidance.tipKey)}
        </p>
        <p className="mt-0.5 text-xs text-text-secondary">
          {tCrop(regionProfile.cropGuidance.subTipKey)}
        </p>
      </div>

      {qualityWarnings.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3">
          <p className="text-sm font-semibold text-text-primary">
            {tGenerate('qualityWarningTitle')}
          </p>
          <div className="mt-1 space-y-1">
            {qualityWarnings.map((warning) => (
              <p key={warning} className="text-xs text-text-secondary leading-relaxed">
                {tGenerate(QUALITY_WARNING_COPY[warning])}
              </p>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-text-secondary/80">
            {tGenerate('qualityWarningContinue')}
          </p>
        </div>
      )}

      {scanTypeRecommendationMismatch && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/80 px-4 py-3">
          <p className="text-sm font-semibold text-text-primary">
            {tGenerate('scanTypeAdviceTitle')}
          </p>
          <p className="mt-1 text-xs text-text-secondary leading-relaxed">
            {tGenerate(
              anatomicalRegion === 'face' || anatomicalRegion === 'fullBody'
                ? 'scanTypeAdvice3d4dPreferred'
                : 'scanTypeAdvice2dPreferred',
            )}
          </p>
        </div>
      )}

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

      {/* Clinical conditions dropdown */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-text-primary block">
          {tGenerate('clinicalConditionsLabel')}
        </label>
        <p className="text-[11px] text-text-secondary leading-snug">
          {tGenerate('clinicalConditionsHint')}
        </p>
        <select
          value=""
          aria-label={tGenerate('clinicalConditionsLabel')}
          onChange={(e) => {
            const id = e.target.value;
            if (id && !selectedConditions.includes(id)) {
              setSelectedConditions((prev) => [...prev, id]);
            }
          }}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">{tGenerate('clinicalConditionsPlaceholder')}</option>
          {regionConditions.map((c) => (
            <option key={c.id} value={c.id} disabled={selectedConditions.includes(c.id)}>
              {tGenerate(c.translationKey)}
            </option>
          ))}
        </select>
        {selectedConditions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {selectedConditions.map((id) => {
              const condition = regionConditions.find((c) => c.id === id);
              if (!condition) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium"
                >
                  {tGenerate(condition.translationKey)}
                  <button
                    type="button"
                    aria-label={`Remove ${tGenerate(condition.translationKey)}`}
                    onClick={() => setSelectedConditions((prev) => prev.filter((cId) => cId !== id))}
                    className="w-4 h-4 rounded-full hover:bg-accent/20 flex items-center justify-center transition-colors"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              );
            })}
          </div>
        )}
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

      <p className="text-xs text-text-secondary/60 text-center">{estimatedTimeLabel}</p>

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

      <LoadingOverlay
        visible={loading}
        messages={loadingMessages}
        estimatedTimeLabel={estimatedTimeLabel}
      />
    </section>
  );
}
