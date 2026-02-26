'use client';

import { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { useTranslations } from 'next-intl';
import { getCroppedImg } from '@/lib/cropUtils';

interface CropStepProps {
  file: File;
  onCropped: (blob: Blob) => void;
  onBack: () => void;
}

export default function CropStep({ file, onCropped, onBack }: CropStepProps) {
  const t = useTranslations('crop');
  const [imageSrc, setImageSrc] = useState('');
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels || !imageSrc) return;
    setLoading(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      onCropped(blob);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="relative w-full h-72 rounded-2xl overflow-hidden bg-gray-900">
        {imageSrc && (
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={1}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
          />
        )}
      </div>

      <p className="mt-3 text-sm text-text-secondary text-center">{t('tip')}</p>

      <div className="mt-4">
        <label className="block text-sm font-medium text-text-primary mb-1">
          {t('zoom')}
        </label>
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-accent"
        />
      </div>

      <div className="mt-3">
        <label className="block text-sm font-medium text-text-primary mb-1">
          {t('rotate')}
        </label>
        <input
          type="range"
          min={-180}
          max={180}
          step={1}
          value={rotation}
          onChange={(e) => setRotation(Number(e.target.value))}
          className="w-full accent-accent"
        />
      </div>

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
          onClick={handleConfirm}
          disabled={loading}
        >
          {t('confirm')}
        </button>
      </div>
    </div>
  );
}
