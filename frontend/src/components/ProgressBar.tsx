interface ProgressBarProps {
  current: number;
  total: number;
  stage?: 1 | 2 | 3;
}

const stageColors = {
  1: '#f59e0b',
  2: '#3b82f6',
  3: '#10b981',
};

const stageLabels = {
  1: '🌱 Warm-up',
  2: '✍️ Spelling',
  3: '📝 Context',
};

export default function ProgressBar({ current, total, stage = 1 }: ProgressBarProps) {
  const percent = Math.round((current / total) * 100);
  const color = stageColors[stage];

  return (
    <div className="w-full px-4 py-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium" style={{ color: 'var(--tg-theme-hint-color)' }}>
          {stageLabels[stage]}
        </span>
        <span className="text-xs font-bold" style={{ color }}>
          {current}/{total}
        </span>
      </div>
      <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
