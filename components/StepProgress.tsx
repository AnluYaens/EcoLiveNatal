'use client';

import { useTranslations } from 'next-intl';

type WizardStep = 'upload' | 'crop' | 'generate' | 'result';

const STEP_KEYS: WizardStep[] = ['upload', 'crop', 'generate', 'result'];

const STEP_INDEX: Record<WizardStep, number> = {
  upload: 0,
  crop: 1,
  generate: 2,
  result: 3,
};

interface StepProgressProps {
  currentStep: WizardStep;
}

export default function StepProgress({ currentStep }: StepProgressProps) {
  const t = useTranslations('steps');
  const currentIndex = STEP_INDEX[currentStep];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-t border-gray-100 py-3 px-6">
      <div className="flex items-start justify-center gap-0 max-w-xs mx-auto">
        {STEP_KEYS.map((key, i) => {
          const filled = i <= currentIndex;
          const lineActive = i > 0 && i <= currentIndex;

          return (
            <div key={key} className="flex items-start">
              {/* Connecting line (except before first dot) */}
              {i > 0 && (
                <div
                  className={`h-px w-10 mt-[5px] transition-colors duration-300 ${
                    lineActive ? 'bg-accent' : 'bg-gray-200'
                  }`}
                />
              )}

              {/* Dot + label */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    filled
                      ? 'bg-accent'
                      : 'bg-transparent border border-accent'
                  }`}
                />
                <span className="text-[10px] text-text-secondary leading-none whitespace-nowrap">
                  {t(key)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
