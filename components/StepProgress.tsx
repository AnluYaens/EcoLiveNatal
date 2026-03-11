"use client";

import { useTranslations } from "next-intl";

type WizardStep = "upload" | "crop" | "generate" | "result";

const STEP_KEYS: WizardStep[] = ["upload", "crop", "generate", "result"];

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
  const t = useTranslations("steps");
  const currentIndex = STEP_INDEX[currentStep];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-gray-100 py-3 px-6">
      <div className="flex items-center justify-center max-w-xs mx-auto">
        {STEP_KEYS.map((key, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;

          return (
            <div key={key} className="flex items-center">
              {/* Connecting line (before each dot except the first) */}
              {i > 0 && (
                <div
                  className={`h-0.5 w-8 sm:w-12 transition-colors duration-300 ${
                    i <= currentIndex ? "bg-accent" : "bg-gray-200"
                  }`}
                />
              )}

              {/* Circle + label */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 text-xs font-bold ${
                    isCompleted
                      ? "bg-accent text-white"
                      : isCurrent
                        ? "bg-accent text-white ring-4 ring-accent/20"
                        : "bg-transparent border-2 border-gray-300 text-gray-400"
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <span
                  className={`text-[10px] leading-none whitespace-nowrap transition-colors duration-300 ${
                    i <= currentIndex
                      ? "text-accent font-semibold"
                      : "text-text-secondary"
                  }`}
                >
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
