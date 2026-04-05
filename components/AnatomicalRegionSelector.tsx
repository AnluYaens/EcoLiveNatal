'use client';

import { useTranslations } from 'next-intl';
import { REGION_ORDER, getRegionProfile } from '@/lib/generationProfiles';
import type { AnatomicalRegion } from '@/lib/validation';

interface AnatomicalRegionSelectorProps {
  selectedRegion: AnatomicalRegion;
  onSelect: (region: AnatomicalRegion) => void;
}

export default function AnatomicalRegionSelector({
  selectedRegion,
  onSelect,
}: AnatomicalRegionSelectorProps) {
  const tGenerate = useTranslations('generate');

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-text-primary">{tGenerate('regionTitle')}</p>
      <div className="grid grid-cols-3 gap-3">
        {REGION_ORDER.map((region) => {
          const profile = getRegionProfile(region);

          return (
            <button
              key={region}
              type="button"
              onClick={() => onSelect(region)}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center border-2 transition-all ${
                  selectedRegion === region
                    ? 'border-accent bg-accent/10'
                    : 'border-gray-200 bg-white group-hover:border-gray-300'
                }`}
              >
                <svg
                  className={`w-6 h-6 transition-colors ${
                    selectedRegion === region ? 'text-accent' : 'text-text-secondary'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d={profile.iconPath} />
                </svg>
              </div>
              <span className="text-xs font-medium text-text-primary leading-tight text-center">
                {tGenerate(profile.labelKey)}
              </span>
              <span className="text-[10px] text-text-secondary leading-tight text-center">
                {tGenerate(profile.descKey)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
