'use client';

import { useTranslations } from 'next-intl';

interface DisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DisclaimerModal({ isOpen, onClose }: DisclaimerModalProps) {
  const t = useTranslations('disclaimer');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-6 max-w-sm mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm text-text-primary leading-relaxed mb-6">
          {t('text')}
        </p>
        <button
          type="button"
          className="w-full bg-accent hover:bg-accent-hover text-white font-semibold py-3 rounded-xl transition-colors"
          onClick={onClose}
        >
          {t('closeButton')}
        </button>
      </div>
    </div>
  );
}
