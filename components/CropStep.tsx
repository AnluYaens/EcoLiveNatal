"use client";

import { useState, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import { useTranslations } from "next-intl";
import { getCroppedImg } from "@/lib/cropUtils";
import AnatomicalRegionSelector from "@/components/AnatomicalRegionSelector";
import { getRegionProfile } from "@/lib/generationProfiles";
import type { AnatomicalRegion } from "@/lib/validation";

interface CropStepProps {
  file: File;
  anatomicalRegion: AnatomicalRegion;
  onAnatomicalRegionChange: (region: AnatomicalRegion) => void;
  onCropped: (blob: Blob) => void;
  onBack: () => void;
}

export default function CropStep({
  file,
  anatomicalRegion,
  onAnatomicalRegionChange,
  onCropped,
  onBack,
}: CropStepProps) {
  const t = useTranslations("crop");
  const regionProfile = getRegionProfile(anatomicalRegion);
  const [imageSrc, setImageSrc] = useState("");
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

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  return (
    <section className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="w-9 h-9 rounded-full flex items-center justify-center bg-white border border-gray-200 hover:bg-gray-50 transition-colors text-text-primary shadow-sm"
          onClick={onBack}
          aria-label={t("back")}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-text-primary flex-1 text-center pr-9">
          {t("title")}
        </h2>
      </div>

      <AnatomicalRegionSelector
        selectedRegion={anatomicalRegion}
        onSelect={onAnatomicalRegionChange}
      />

      <div className="bg-accent-light/40 rounded-2xl px-4 py-3 space-y-1">
        <p className="text-sm font-medium text-text-primary">{t(regionProfile.cropGuidance.tipKey)}</p>
        <p className="text-xs text-text-secondary">{t(regionProfile.cropGuidance.subTipKey)}</p>
        <p className="text-[11px] text-text-secondary/80">{t("subTip")}</p>
      </div>

      {/* Crop canvas */}
      <div className="relative w-full h-72 rounded-2xl overflow-hidden bg-gray-900 shadow-lg ring-1 ring-black/5">
        {imageSrc && (
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={undefined}
            minZoom={0.5}
            objectFit="contain"
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={onCropComplete}
          />
        )}
      </div>

      {/* Sliders */}
      <div className="space-y-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
              <label className="text-sm font-medium text-text-primary">{t("zoom")}</label>
            </div>
            <span className="text-xs font-bold text-accent bg-accent-light px-2.5 py-1 rounded-full">
              {zoom.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.1}
            value={zoom}
            aria-label={t("zoom")}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-accent"
          />
        </div>

        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <label className="text-sm font-medium text-text-primary">{t("rotate")}</label>
            </div>
            <span className="text-xs font-bold text-accent bg-accent-light px-2.5 py-1 rounded-full">
              {rotation}&deg;
            </span>
          </div>
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={rotation}
            aria-label={t("rotate")}
            onChange={(e) => setRotation(Number(e.target.value))}
            className="w-full accent-accent"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          type="button"
          className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-4 rounded-full transition-all duration-200 shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          onClick={handleConfirm}
          disabled={loading}
        >
          {loading ? (
            <div className="h-5 w-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {t("confirm")}
        </button>

        <button
          type="button"
          className="w-full text-sm text-text-secondary hover:text-text-primary transition-colors py-2 text-center"
          onClick={handleReset}
        >
          {t("reset")}
        </button>
      </div>
    </section>
  );
}
