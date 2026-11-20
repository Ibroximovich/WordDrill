import { useState, useEffect } from 'react';
import { Word } from '../../store/useStore';

interface Stage1QuizProps {
  word: Word;
  allWords?: Word[];
  onNext: (hasMistake: boolean) => void;
  haptic: { impact: (s?: "light" | "medium" | "heavy") => void; success: () => void; error: () => void };
}

type QuizDirection = "uz-to-en" | "en-to-uz";

export default function Stage1Quiz({ word, allWords = [], onNext, haptic }: Stage1QuizProps) {
  const [direction, setDirection] = useState<QuizDirection>("uz-to-en");
  const [options, setOptions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    // 50/50 random direction
    const chosenDirection: QuizDirection = Math.random() < 0.5 ? "uz-to-en" : "en-to-uz";
    setDirection(chosenDirection);
    setSelected(null);
    setIsCorrect(null);

    if (chosenDirection === "uz-to-en") {
      // English options
      if (word.options && word.options.length > 0) {
        setOptions(word.options);
      } else if (allWords && allWords.length > 1) {
        const others = allWords
          .filter((w) => w.id !== word.id)
          .map((w) => w.english)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        setOptions([...others, word.english].sort(() => Math.random() - 0.5));
      } else {
        setOptions([word.english]);
      }
    } else {
      // Uzbek options from other words
      const correctAnswer = word.uzbek;
      const otherPool = allWords
        .filter((w) => w.id !== word.id)
        .map((w) => w.uzbek);

      // Unique non-empty options
      const uniqueOthers = Array.from(new Set(otherPool)).filter(
        (u) => u.toLowerCase() !== correctAnswer.toLowerCase()
      );

      const shuffledOthers = uniqueOthers.sort(() => Math.random() - 0.5).slice(0, 3);
      setOptions([...shuffledOthers, correctAnswer].sort(() => Math.random() - 0.5));
    }
  }, [word.id, word.uzbek, word.english, word.options, allWords]);

  const handleSelect = (option: string) => {
    if (selected) return;

    const correctTarget = direction === "uz-to-en" ? word.english : word.uzbek;
    const correct = option.trim().toLowerCase() === correctTarget.trim().toLowerCase();

    setSelected(option);
    setIsCorrect(correct);

    if (correct) {
      haptic.success();
      setTimeout(() => onNext(false), 500);
    } else {
      haptic.error();
      setTimeout(() => onNext(true), 700);
    }
  };

  const isUzToEn = direction === "uz-to-en";
  const correctAnswerText = isUzToEn ? word.english : word.uzbek;

  return (
    <div className="flex-1 flex flex-col px-4 py-6 animate-slide-in">
      {/* Stage label */}
      <div className="text-center mb-2">
        <span
          className="text-xs font-semibold px-3 py-1 rounded-full"
          style={{ backgroundColor: "#fef3c7", color: "#d97706" }}
        >
          {isUzToEn ? "🌱 1-bosqich: O'zbekcha ➔ Inglizcha" : "🌱 1-bosqich: Inglizcha ➔ O'zbekcha"}
        </span>
      </div>

      {/* Word Card (No audio in Stage 1) */}
      <div
        className="rounded-3xl p-6 mb-6 text-center"
        style={{ backgroundColor: "var(--tg-theme-secondary-bg-color)" }}
      >
        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--tg-theme-text-color)" }}>
          {isUzToEn ? word.uzbek : word.english}
        </h2>
      </div>

      {/* Instruction */}
      <p className="text-center text-sm mb-4" style={{ color: "var(--tg-theme-hint-color)" }}>
        {isUzToEn ? "To'g'ri inglizcha variantni tanlang" : "To'g'ri o'zbekcha tarjimani tanlang"}
      </p>

      {/* Options */}
      <div className="grid grid-cols-2 gap-3">
        {options.map((option, i) => {
          let bgColor = "var(--tg-theme-secondary-bg-color)";
          let textColor = "var(--tg-theme-text-color)";
          let borderColor = "transparent";

          const isOptionCorrect =
            option.trim().toLowerCase() === correctAnswerText.trim().toLowerCase();

          if (selected === option) {
            if (isCorrect) {
              bgColor = "#d1fae5";
              borderColor = "#10b981";
              textColor = "#065f46";
            } else {
              bgColor = "#fee2e2";
              borderColor = "#ef4444";
              textColor = "#991b1b";
            }
          } else if (selected && isOptionCorrect) {
            bgColor = "#d1fae5";
            borderColor = "#10b981";
            textColor = "#065f46";
          }

          return (
            <button
              key={i}
              type="button"
              disabled={selected !== null}
              onClick={() => handleSelect(option)}
              className="p-4 rounded-2xl font-semibold text-sm transition-all active:scale-95 border-2 min-h-[58px] flex items-center justify-center text-center"
              style={{ backgroundColor: bgColor, color: textColor, borderColor }}
            >
              {option}
            </button>
          );
        })}
      </div>

      {selected && (
        <div
          className="mt-4 p-3 rounded-2xl text-center animate-slide-in"
          style={{ backgroundColor: isCorrect ? "#d1fae5" : "#fee2e2" }}
        >
          <p className="font-bold" style={{ color: isCorrect ? "#065f46" : "#991b1b" }}>
            {isCorrect
              ? "✅ To'g'ri!"
              : `❌ Noto'g'ri! To'g'ri javob: "${correctAnswerText}"`}
          </p>
        </div>
      )}
    </div>
  );
}
