import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, Word } from '../store/useStore';
import { api } from '../lib/api';
import { useTelegramApp } from '../hooks/useTelegramApp';
import ProgressBar from '../components/ProgressBar';
import Stage2Spelling from '../components/stages/Stage2Spelling';
import ResultScreen from '../components/ResultScreen';

export default function ReviewPage() {
  const navigate = useNavigate();
  const { user, updateProgress, loadStats } = useStore();
  const { haptic, twa } = useTelegramApp();

  const [reviewWords, setReviewWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, mistakes: 0 });

  useEffect(() => {
    if (twa) {
      twa.BackButton.show();
      twa.BackButton.onClick(() => navigate('/'));
    }
    return () => twa?.BackButton.hide();
  }, [twa, navigate]);

  useEffect(() => {
    const loadDueWords = async () => {
      if (!user) return;
      try {
        setIsLoading(true);
        const response = await api.get('/units/review/due', {
          params: { userId: user.id },
        });
        const words = response.data.reviewWords.map((r: any) => ({
          ...r.word,
          options: r.options,
          progress: { mistakeCount: r.mistakeCount, srsStage: r.srsStage },
        }));
        setReviewWords(words);
      } catch (error) {
        console.error('Failed to load review words:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadDueWords();
  }, [user]);

  const currentWord = reviewWords[currentIndex];

  const handleNext = useCallback(async (hasMistake: boolean) => {
    if (!currentWord) return;

    await updateProgress(currentWord.id, hasMistake);
    setSessionStats(prev => ({
      correct: hasMistake ? prev.correct : prev.correct + 1,
      mistakes: hasMistake ? prev.mistakes + 1 : prev.mistakes,
    }));

    if (currentIndex < reviewWords.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsComplete(true);
      await loadStats();
      haptic.success();
    }
  }, [currentWord, currentIndex, reviewWords.length, updateProgress, loadStats, haptic]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-5xl mb-4">🔄</div>
          <p style={{ color: 'var(--tg-theme-hint-color)' }}>Takrorlanayotgan so'zlar...</p>
        </div>
      </div>
    );
  }

  if (reviewWords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--tg-theme-text-color)' }}>
          Hamma so'zlar takrorlandi!
        </h2>
        <p className="mb-6" style={{ color: 'var(--tg-theme-hint-color)' }}>
          Takrorlanadigan so'zlar yo'q. Keyinroq qaytib keling!
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-8 py-3 rounded-2xl font-bold"
          style={{ backgroundColor: 'var(--tg-theme-button-color)', color: 'var(--tg-theme-button-text-color)' }}
        >
          Bosh sahifaga qaytish
        </button>
      </div>
    );
  }

  if (isComplete) {
    return <ResultScreen stats={sessionStats} onFinish={() => navigate('/')} />;
  }

  if (!currentWord) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--tg-theme-bg-color)' }}>
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-lg font-bold" style={{ color: 'var(--tg-theme-text-color)' }}>
          🔄 Takrorlash rejimi
        </h2>
      </div>
      <ProgressBar current={currentIndex + 1} total={reviewWords.length} stage={2} />
      <div className="flex-1 flex flex-col">
        <Stage2Spelling word={currentWord} onNext={handleNext} haptic={haptic} />
      </div>
    </div>
  );
}
