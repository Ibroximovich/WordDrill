interface ResultScreenProps {
  stats: { correct: number; mistakes: number };
  onFinish: () => void;
}

export default function ResultScreen({ stats, onFinish }: ResultScreenProps) {
  const total = stats.correct + stats.mistakes;
  const accuracy = total > 0 ? Math.round((stats.correct / total) * 100) : 0;

  const getEmoji = () => {
    if (accuracy >= 90) return '🏆';
    if (accuracy >= 70) return '🎯';
    if (accuracy >= 50) return '💪';
    return '📚';
  };

  const getMessage = () => {
    if (accuracy >= 90) return 'Mukammal! Siz ajoyibsiz!';
    if (accuracy >= 70) return 'Yaxshi natija! Davom eting!';
    if (accuracy >= 50) return 'Yaxshi harakat! Mashq qiling!';
    return 'Qiyin edi, lekin siz bardosh berdingiz!';
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center animate-slide-in"
         style={{ backgroundColor: 'var(--tg-theme-bg-color)' }}>
      <div className="text-7xl mb-6 animate-bounce-once">{getEmoji()}</div>
      
      <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--tg-theme-text-color)' }}>
        Dars tugadi!
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--tg-theme-hint-color)' }}>
        {getMessage()}
      </p>

      {/* Stats */}
      <div className="w-full rounded-3xl p-6 mb-8"
           style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: '#10b981' }}>
              {stats.correct}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--tg-theme-hint-color)' }}>
              To'g'ri
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: '#6366f1' }}>
              {accuracy}%
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--tg-theme-hint-color)' }}>
              Aniqlik
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: '#ef4444' }}>
              {stats.mistakes}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--tg-theme-hint-color)' }}>
              Xato
            </div>
          </div>
        </div>

        {/* Accuracy bar */}
        <div className="mt-4">
          <div className="w-full h-3 rounded-full" style={{ backgroundColor: 'var(--tg-theme-bg-color)' }}>
            <div
              className="h-3 rounded-full transition-all duration-1000"
              style={{
                width: `${accuracy}%`,
                backgroundColor: accuracy >= 70 ? '#10b981' : accuracy >= 50 ? '#f59e0b' : '#ef4444',
              }}
            />
          </div>
        </div>
      </div>

      <button
        onClick={onFinish}
        className="w-full py-4 rounded-2xl font-bold text-lg active:scale-95 transition-all"
        style={{
          backgroundColor: 'var(--tg-theme-button-color)',
          color: 'var(--tg-theme-button-text-color)',
        }}
      >
        🏠 Bosh sahifaga qaytish
      </button>
    </div>
  );
}
