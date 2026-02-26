'use client';

import { useTranslations } from 'next-intl';

interface CreativitySliderProps {
  value: number;
  onChange: (v: number) => void;
}

export default function CreativitySlider({
  value,
  onChange,
}: CreativitySliderProps) {
  const t = useTranslations('generate');

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-text-primary">
          {t('creativity')}
        </label>
        <span className="text-sm font-bold text-accent">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
      <div className="flex justify-between text-xs text-text-secondary mt-1">
        <span>{t('creativityLow')}</span>
        <span>{t('creativityMid')}</span>
        <span>{t('creativityHigh')}</span>
      </div>
    </div>
  );
}
