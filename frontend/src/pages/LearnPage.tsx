import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore, Word } from '../store/useStore';
import { api } from '../lib/api';
import { useTelegramApp } from '../hooks/useTelegramApp';
import ProgressBar from '../components/ProgressBar';
import Stage1Quiz from '../components/stages/Stage1Quiz';
import Stage2Spelling from '../components/stages/Stage2Spelling';
import Stage3Context from '../components/stages/Stage3Context';
import ResultScreen from '../components/ResultScreen';

type Stage = 1 | 2 | 3;

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function LearnPage() {
  const { unitId, part } = useParams<{ unitId: string; part?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, updateProgress, loadStats } = useStore();
  const { haptic, twa } = useTelegramApp();

  const currentPart = part
    ? parseInt(part)
    : searchParams.get("part")
    ? parseInt(searchParams.get("part")!)
    : 1;

  // Base 10 words for this session
  const baseWordsRef = useRef<Word[]>([]);
  const [words, setWords] = useState<Word[]>([]);
  const [currentStage, setCurrentStage] = useState<Stage>(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, mistakes: 0 });

  useEffect(() => {
    if (twa) {
      twa.BackButton.show();
      twa.BackButton.onClick(() => navigate("/"));
    }
    return () => {
      twa?.BackButton.hide();
    };
  }, [twa, navigate]);

  useEffect(() => {
    const loadWords = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`/units/${unitId}/words`, {
          params: { userId: user?.id },
        });
        const allWords: Word[] = response.data.words;

        // Split into 10-word parts: Part 1 (1–10) or Part 2 (11–20)
        const selectedWords =
          currentPart === 2
            ? allWords.slice(10, 20)
            : allWords.slice(0, 10);

        // Keep base reference
        baseWordsRef.current = selectedWords;

        // Shuffle for Stage 1
        setWords(shuffleArray(selectedWords));

        // Initialize progress for all words in background
        if (user) {
          api.post("/progress/bulk-init", {
            userId: user.id,
            unitId: parseInt(unitId!),
          }).catch(console.error);
        }
      } catch (error) {
        console.error("Failed to load words:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (unitId && user) loadWords();
  }, [unitId, user, currentPart]);

  const currentWord = words[currentIndex];
  const totalWords = words.length;

  // Optimistic UI: Fire-and-forget background progress update
  const handleNext = useCallback((hasMistake: boolean) => {
    if (!currentWord) return;

    // Send to backend in background without awaiting (no UI freeze!)
    updateProgress(currentWord.id, hasMistake).catch((err) => {
      console.error("Progress update background error:", err);
    });

    setSessionStats((prev) => ({
      correct: hasMistake ? prev.correct : prev.correct + 1,
      mistakes: hasMistake ? prev.mistakes + 1 : prev.mistakes,
    }));

    if (currentIndex < totalWords - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // End of current stage
      if (currentStage < 3) {
        const nextStage = (currentStage + 1) as Stage;
        setCurrentStage(nextStage);
        // Shuffle words again for the next stage (Fisher-Yates)
        setWords(shuffleArray(baseWordsRef.current));
        setCurrentIndex(0);
        haptic.success();
      } else {
        // All 3 stages complete
        setIsComplete(true);
        loadStats().catch(console.error);
        haptic.success();
      }
    }
  }, [currentWord, currentIndex, totalWords, currentStage, updateProgress, loadStats, haptic]);

  // Arrow navigation handlers
  const handlePrevWord = () => {
    if (currentIndex > 0) {
      haptic.impact("light");
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNextWord = () => {
    if (currentIndex < totalWords - 1) {
      haptic.impact("light");
      setCurrentIndex((prev) => prev + 1);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce-once">📚</div>
          <p style={{ color: "var(--tg-theme-hint-color)" }}>{"So'zlar yuklanmoqda..."}</p>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return <ResultScreen stats={sessionStats} onFinish={() => navigate("/")} />;
  }

  if (!currentWord) return null;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--tg-theme-bg-color)" }}>
      {/* Session Top Bar with Back/Forward Arrows */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevWord}
            disabled={currentIndex === 0}
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all active:scale-90"
            style={{
              backgroundColor: currentIndex === 0 ? "transparent" : "var(--tg-theme-secondary-bg-color)",
              color: currentIndex === 0 ? "var(--tg-theme-hint-color)" : "var(--tg-theme-text-color)",
              opacity: currentIndex === 0 ? 0.25 : 1,
              cursor: currentIndex === 0 ? "not-allowed" : "pointer",
            }}
            title="Oldingi so'z"
          >
            {"←"}
          </button>
          <button
            type="button"
            onClick={handleNextWord}
            disabled={currentIndex >= totalWords - 1}
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all active:scale-90"
            style={{
              backgroundColor: currentIndex >= totalWords - 1 ? "transparent" : "var(--tg-theme-secondary-bg-color)",
              color: currentIndex >= totalWords - 1 ? "var(--tg-theme-hint-color)" : "var(--tg-theme-text-color)",
              opacity: currentIndex >= totalWords - 1 ? 0.25 : 1,
              cursor: currentIndex >= totalWords - 1 ? "not-allowed" : "pointer",
            }}
            title="Keyingi so'z"
          >
            {"→"}
          </button>
        </div>

        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{
            backgroundColor: "var(--tg-theme-secondary-bg-color)",
            color: "var(--tg-theme-hint-color)",
          }}
        >
          {currentPart === 1 ? "1-qism (1–10)" : "2-qism (11–20)"}
        </span>
      </div>

      <ProgressBar current={currentIndex + 1} total={totalWords} stage={currentStage} />
      
      <div className="flex-1 flex flex-col">
        {currentStage === 1 && (
          <Stage1Quiz word={currentWord} allWords={words} onNext={handleNext} haptic={haptic} />
        )}
        {currentStage === 2 && (
          <Stage2Spelling word={currentWord} onNext={handleNext} haptic={haptic} />
        )}
        {currentStage === 3 && (
          <Stage3Context word={currentWord} onNext={handleNext} haptic={haptic} />
        )}
      </div>
    </div>
  );
}
