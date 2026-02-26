'use client';

interface StyleCardProps {
  styleKey: string;
  label: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}

export default function StyleCard({
  styleKey,
  label,
  description,
  selected,
  onSelect,
}: StyleCardProps) {
  return (
    <button
      type="button"
      data-style={styleKey}
      onClick={onSelect}
      className={`flex-1 text-left p-4 rounded-2xl shadow-sm transition-all cursor-pointer ${
        selected
          ? 'border-2 border-accent bg-[#fff5f5]'
          : 'border border-gray-200 bg-white'
      }`}
    >
      <div className="font-semibold text-text-primary">{label}</div>
      <div className="text-sm text-text-secondary mt-1">{description}</div>
    </button>
  );
}
