import { useState, useEffect, useRef } from 'react';
import { Word } from '../../store/useStore';
import AudioButton from '../AudioButton';

interface Stage2SpellingProps {
  word: Word;
  onNext: (hasMistake: boolean) => void;
  haptic: { impact: (s?: "light" | "medium" | "heavy") => void; success: () => void; error: () => void };
}

type PhaseType = "input" | "correct_shown" | "wrong_shown" | "retype";

export default function Stage2Spelling({ word, onNext, haptic }: Stage2SpellingProps) {
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<PhaseType>("input");
  const [hasMistake, setHasMistake] = useState(false);
  const [shakeInput, setShakeInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInput("");
    setPhase("input");
    setHasMistake(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [word.id]);

  const handleSubmit = () => {
    const trimmed = input.trim().toLowerCase();
    const correct = word.english.toLowerCase();

    if (phase === "retype") {
      if (trimmed === correct) {
        setPhase("correct_shown");
        haptic.success();
        setTimeout(() => {
          onNext(true); // already recorded as mistake
        }, 1200);
      } else {
        setShakeInput(true);
        haptic.error();
        setTimeout(() => setShakeInput(false), 600);
        setInput("");
      }
      return;
    }

    // phase === "input"
    if (trimmed === correct) {
      setPhase("correct_shown");
      haptic.success();
      setTimeout(() => {
        onNext(hasMistake);
      }, 1200);
    } else {
      setHasMistake(true);
      setPhase("wrong_shown");
      haptic.error();
      setShakeInput(true);
      setTimeout(() => setShakeInput(false), 600);
    }
  };

  const handleProceedToRetype = () => {
    setInput("");
    setPhase("retype");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const isCorrectPhase = phase === "correct_shown";

  return (
    <div className="flex-1 flex flex-col px-4 py-6 animate-slide-in">
      <div className="text-center mb-2">
        <span
          className="text-xs font-semibold px-3 py-1 rounded-full"
          style={{ backgroundColor: "#dbeafe", color: "#1d4ed8" }}
        >
          {"✍️ 2-bosqich: Imlo"}
        </span>
      </div>

      {/* Word Card:
          Audio is strictly hidden during typing ("input" and "retype") to prevent spoilers.
          It only appears when answer is correct or when correct spelling is revealed.
      */}
      <div
        className="rounded-3xl p-6 mb-6 text-center"
        style={{ backgroundColor: "var(--tg-theme-secondary-bg-color)" }}
      >
        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--tg-theme-text-color)" }}>
          {word.uzbek}
        </h2>

        {isCorrectPhase && (
          <div className="mt-2 animate-slide-in">
            <AudioButton word={word.english} audioUrl={word.audioUrl} autoPlay={true} />
          </div>
        )}
      </div>

      {phase === "wrong_shown" ? (
        <div className="animate-slide-in">
          <div
            className="p-4 rounded-2xl mb-4 text-center"
            style={{ backgroundColor: "#fee2e2" }}
          >
            <p className="text-sm mb-1" style={{ color: "#991b1b" }}>
              {"❌ Noto'g'ri!"}
            </p>
            <p className="text-lg font-bold" style={{ color: "#7f1d1d" }}>
              {"To'g'ri yozilishi:"}
            </p>
            <p className="text-2xl font-bold mt-1 mb-3" style={{ color: "#dc2626" }}>
              {word.english}
            </p>
            {/* Show pronunciation after showing correct spelling */}
            <AudioButton word={word.english} audioUrl={word.audioUrl} autoPlay={true} />
          </div>
          <button
            type="button"
            onClick={handleProceedToRetype}
            className="w-full py-4 rounded-2xl font-bold text-white transition-all active:scale-95"
            style={{ backgroundColor: "#3b82f6" }}
          >
            {"Qayta yozish ✍️"}
          </button>
        </div>
      ) : (
        <>
          <p className="text-center text-sm mb-4" style={{ color: "var(--tg-theme-hint-color)" }}>
            {phase === "retype"
              ? `"${word.english}" so'zini qayta yozing`
              : "Inglizcha so'zni yozing"}
          </p>

          <div className={shakeInput ? "animate-shake" : ""}>
            <input
              ref={inputRef}
              type="text"
              disabled={isCorrectPhase}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && input.trim() && !isCorrectPhase && handleSubmit()}
              placeholder={phase === "retype" ? "Qayta yozing..." : "Inglizcha so'z..."}
              className="w-full px-4 py-4 rounded-2xl text-lg font-semibold text-center border-2 transition-all"
              style={{
                backgroundColor: isCorrectPhase
                  ? "#f0fdf4"
                  : "var(--tg-theme-secondary-bg-color)",
                color: isCorrectPhase ? "#166534" : "var(--tg-theme-text-color)",
                borderColor: isCorrectPhase
                  ? "#10b981"
                  : phase === "retype"
                  ? "#3b82f6"
                  : "var(--tg-theme-secondary-bg-color)",
              }}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          {/* Success banner */}
          {isCorrectPhase && (
            <div
              className="mt-3 p-3 rounded-2xl text-center animate-slide-in"
              style={{ backgroundColor: "#d1fae5" }}
            >
              <p className="font-bold text-base" style={{ color: "#065f46" }}>
                {"✅ To'g'ri!"}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim() || isCorrectPhase}
            className="mt-4 w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-95"
            style={{
              backgroundColor: isCorrectPhase
                ? "#10b981"
                : input.trim()
                ? "var(--tg-theme-button-color)"
                : "var(--tg-theme-secondary-bg-color)",
              color: isCorrectPhase || input.trim()
                ? "var(--tg-theme-button-text-color)"
                : "var(--tg-theme-hint-color)",
            }}
          >
            {isCorrectPhase
              ? "✓ Qabul qilindi"
              : phase === "retype"
              ? "Tekshirish ✓"
              : "Tekshirish →"}
          </button>
        </>
      )}
    </div>
  );
}
