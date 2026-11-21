import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useTelegramApp } from "../hooks/useTelegramApp";
import { useStore } from "../store/useStore";
import LoadingScreen from "../components/LoadingScreen";

interface Question {
  wordId: number;
  english: string;
  uzbek: string;
  options: string[];
  correctAnswer: string;
}

interface DuelData {
  id: string;
  unitId: number;
  wordIds: number[];
  creatorId: string;
  creatorName: string;
  creatorScore: number | null;
  creatorTime: number | null;
  opponentId: string | null;
  opponentName: string | null;
  opponentScore: number | null;
  opponentTime: number | null;
  status: string;
  createdAt: string;
}

export default function DuelPage() {
  const { duelId } = useParams<{ duelId: string }>();
  const navigate = useNavigate();
  const { haptic, shareUrl, getInitData } = useTelegramApp();
  const { user } = useStore();

  const [loading, setLoading] = useState(true);
  const [duel, setDuel] = useState<DuelData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [view, setView] = useState<"lobby" | "quiz" | "result">("lobby");

  // Quiz state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120); // 120 soniya (2 daqiqa)
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const scoreRef = useRef(0);
  const timeLeftRef = useRef(120);

  scoreRef.current = score;
  timeLeftRef.current = timeLeft;

  const currentUserId = user?.telegramId?.toString();
  const isCreator = duel ? duel.creatorId === currentUserId : false;
  const hasUserSubmitted = isCreator
    ? duel?.creatorScore !== null && duel?.creatorScore !== undefined
    : duel?.opponentId === currentUserId && duel?.opponentScore !== null && duel?.opponentScore !== undefined;

  // Load duel data
  const loadDuel = useCallback(async (silent = false) => {
    if (!duelId) return;
    try {
      if (!silent) setLoading(true);
      const res = await api.get(`/duel/${duelId}`);
      if (res.data.success) {
        const fetchedDuel: DuelData = res.data.duel;
        setDuel(fetchedDuel);
        setQuestions(res.data.questions || []);

        const isUserCreator = fetchedDuel.creatorId === currentUserId;
        const alreadySubmitted = isUserCreator
          ? fetchedDuel.creatorScore !== null && fetchedDuel.creatorScore !== undefined
          : fetchedDuel.opponentId === currentUserId && fetchedDuel.opponentScore !== null && fetchedDuel.opponentScore !== undefined;

        if (alreadySubmitted) {
          setView("result");
        }
      }
    } catch (err) {
      console.error("Duel load error:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [duelId, currentUserId]);

  useEffect(() => {
    loadDuel();
  }, [loadDuel]);

  // Submit test results
  const submitResult = useCallback(
    async (finalScore: number, remainingSeconds: number) => {
      if (isSubmitting || !duelId) return;
      setIsSubmitting(true);
      if (timerRef.current) clearInterval(timerRef.current);

      const timeSpent = Math.max(1, 120 - remainingSeconds);

      try {
        const res = await api.post(`/duel/${duelId}/submit`, {
          score: finalScore,
          timeSpent,
          initData: getInitData(),
        });
        if (res.data.success) {
          setDuel(res.data.duel);
          setView("result");
        }
      } catch (err) {
        console.error("Submit score error:", err);
        setView("result");
      } finally {
        setIsSubmitting(false);
      }
    },
    [duelId, getInitData, isSubmitting]
  );

  // Timer countdown
  useEffect(() => {
    if (view === "quiz") {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            submitResult(scoreRef.current, 0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [view, submitResult]);

  // Polling for opponent when in result view and still waiting
  useEffect(() => {
    if (view !== "result" || !duel) return;
    if (duel.status === "COMPLETED") return;

    const pollInterval = setInterval(() => {
      loadDuel(true);
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [view, duel, loadDuel]);

  const handleStartQuiz = () => {
    haptic.impact("heavy");
    setCurrentIndex(0);
    setScore(0);
    setTimeLeft(120);
    setSelectedOption(null);
    setIsAnswered(false);
    setView("quiz");
  };

  const handleSelectOption = (option: string) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedOption(option);

    const currentQuestion = questions[currentIndex];
    const isCorrect = option === currentQuestion.correctAnswer;

    if (isCorrect) {
      haptic.success();
      setScore((prev) => prev + 1);
    } else {
      haptic.error();
    }

    setTimeout(() => {
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex((prev) => prev + 1);
        setSelectedOption(null);
        setIsAnswered(false);
      } else {
        const finalScore = isCorrect ? scoreRef.current + 1 : scoreRef.current;
        submitResult(finalScore, timeLeftRef.current);
      }
    }, 450);
  };

  const shareLink = `https://t.me/worddrill_uz_bot?startapp=duel_${duelId}`;

  const handleShare = () => {
    haptic.impact("medium");
    shareUrl(
      shareLink,
      "WordDrill'da men bilan ingliz tili so'z boyligi bo'yicha kuch sinash! ⚔️ Qani, kim ko'p so'z bilar ekan?"
    );
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!duel) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-xl font-bold mb-2">{"Duel topilmadi"}</h2>
        <p className="text-sm opacity-70 mb-6">{"Bu havola eskirgan yoki mavjud emas."}</p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-bold"
        >
          {"Bosh sahifaga qaytish"}
        </button>
      </div>
    );
  }

  // --- 1. LOBBY VIEW ---
  if (view === "lobby") {
    return (
      <div className="min-h-screen flex flex-col justify-between p-6" style={{ backgroundColor: "var(--tg-theme-bg-color)" }}>
        <div className="text-center pt-8">
          <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-4xl mb-4 shadow-lg" style={{ backgroundColor: "#ef4444", color: "#ffffff" }}>
            {"⚔️"}
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full uppercase" style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}>
            {"Do'st bilan bellashuv"}
          </span>
          <h1 className="text-2xl font-black mt-3 mb-1" style={{ color: "var(--tg-theme-text-color)" }}>
            {"WordDrill Duel"}
          </h1>
          <p className="text-sm" style={{ color: "var(--tg-theme-hint-color)" }}>
            {`Unit ${duel.unitId} • 10 ta so'z`}
          </p>
        </div>

        {/* Players Card */}
        <div className="rounded-3xl p-5 my-6 space-y-4" style={{ backgroundColor: "var(--tg-theme-secondary-bg-color)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white" style={{ backgroundColor: "#3b82f6" }}>
                {duel.creatorName[0]?.toUpperCase() || "C"}
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--tg-theme-text-color)" }}>
                  {duel.creatorName}
                </p>
                <p className="text-xs" style={{ color: "var(--tg-theme-hint-color)" }}>
                  {"Duel yaratuvchisi"}
                </p>
              </div>
            </div>
            {duel.creatorScore !== null ? (
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ backgroundColor: "#dcfce7", color: "#15803d" }}>
                {"Tayyor ✅"}
              </span>
            ) : (
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ backgroundColor: "#fef9c3", color: "#854d0e" }}>
                {"Kutilmoqda..."}
              </span>
            )}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 my-2" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white" style={{ backgroundColor: "#f97316" }}>
                {duel.opponentName ? duel.opponentName[0]?.toUpperCase() : "?"}
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--tg-theme-text-color)" }}>
                  {duel.opponentName || "Raqib taklif qilinmagan"}
                </p>
                <p className="text-xs" style={{ color: "var(--tg-theme-hint-color)" }}>
                  {"Raqib"}
                </p>
              </div>
            </div>
            {duel.opponentScore !== null ? (
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ backgroundColor: "#dcfce7", color: "#15803d" }}>
                {"Tayyor ✅"}
              </span>
            ) : (
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ backgroundColor: "#fef9c3", color: "#854d0e" }}>
                {"Kutilmoqda..."}
              </span>
            )}
          </div>
        </div>

        {/* Rules */}
        <div className="rounded-2xl p-4 mb-4 text-xs space-y-1.5" style={{ backgroundColor: "var(--tg-theme-secondary-bg-color)", color: "var(--tg-theme-hint-color)" }}>
          <p>{"⏱️ Umumiy vaqt: 120 soniya (2 daqiqa)"}</p>
          <p>{"🎯 10 ta 4-variantli test savollari"}</p>
          <p>{"🏆 Ball teng bo'lganda, kamroq vaqt sarflagan g'olib bo'ladi!"}</p>
        </div>

        {/* Actions */}
        <div className="space-y-3 pb-4">
          <button
            onClick={handleShare}
            className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
            style={{ backgroundColor: "#3b82f6" }}
          >
            <span>{"📤 Do'stga havola yuborish"}</span>
          </button>

          {!hasUserSubmitted ? (
            <button
              onClick={handleStartQuiz}
              className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
              style={{ backgroundColor: "#ef4444" }}
            >
              <span>{"⚔️ O'zim boshlash"}</span>
            </button>
          ) : (
            <button
              onClick={() => setView("result")}
              className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ backgroundColor: "#10b981" }}
            >
              <span>{"📊 Natijani ko'rish"}</span>
            </button>
          )}

          <button
            onClick={() => navigate("/")}
            className="w-full py-3 rounded-2xl font-medium text-sm text-center"
            style={{ color: "var(--tg-theme-hint-color)" }}
          >
            {"Bosh sahifaga qaytish"}
          </button>
        </div>
      </div>
    );
  }

  // --- 2. QUIZ VIEW ---
  if (view === "quiz") {
    const currentQ = questions[currentIndex];
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const isUrgent = timeLeft < 20;

    return (
      <div className="min-h-screen flex flex-col justify-between p-4" style={{ backgroundColor: "var(--tg-theme-bg-color)" }}>
        {/* Header: Progress & Timer */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: "var(--tg-theme-secondary-bg-color)", color: "var(--tg-theme-text-color)" }}>
              {`Savol ${currentIndex + 1} / ${questions.length}`}
            </span>
            <div
              className={`text-sm font-black px-3 py-1 rounded-full flex items-center gap-1 transition-all ${
                isUrgent ? "animate-pulse" : ""
              }`}
              style={{
                backgroundColor: isUrgent ? "#fee2e2" : "#dbeafe",
                color: isUrgent ? "#dc2626" : "#1d4ed8",
              }}
            >
              <span>{"⏱️"}</span>
              <span>{`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--tg-theme-secondary-bg-color)" }}>
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${((currentIndex + 1) / questions.length) * 100}%`,
                backgroundColor: "#ef4444",
              }}
            />
          </div>
        </div>

        {/* Question Card */}
        {currentQ && (
          <div className="my-auto py-6">
            <div className="rounded-3xl p-6 text-center shadow-sm mb-6" style={{ backgroundColor: "var(--tg-theme-secondary-bg-color)" }}>
              <span className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: "var(--tg-theme-hint-color)" }}>
                {"Inglizcha so'zning tarjimasini toping:"}
              </span>
              <h2 className="text-3xl font-black" style={{ color: "var(--tg-theme-text-color)" }}>
                {currentQ.english}
              </h2>
            </div>

            {/* 4 Options */}
            <div className="space-y-3">
              {currentQ.options.map((option, idx) => {
                let bgColor = "var(--tg-theme-secondary-bg-color)";
                let textColor = "var(--tg-theme-text-color)";
                let borderColor = "transparent";

                if (isAnswered) {
                  if (option === currentQ.correctAnswer) {
                    bgColor = "#dcfce7";
                    textColor = "#15803d";
                    borderColor = "#16a34a";
                  } else if (option === selectedOption) {
                    bgColor = "#fee2e2";
                    textColor = "#991b1b";
                    borderColor = "#dc2626";
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={isAnswered}
                    onClick={() => handleSelectOption(option)}
                    className="w-full py-4 px-5 rounded-2xl text-base font-bold text-left transition-all active:scale-98 border-2 shadow-sm flex items-center justify-between"
                    style={{
                      backgroundColor: bgColor,
                      color: textColor,
                      borderColor: borderColor,
                    }}
                  >
                    <span>{option}</span>
                    {isAnswered && option === currentQ.correctAnswer && <span>{"✅"}</span>}
                    {isAnswered && option === selectedOption && option !== currentQ.correctAnswer && <span>{"❌"}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="text-center pb-2">
          <p className="text-xs font-semibold" style={{ color: "var(--tg-theme-hint-color)" }}>
            {`To'g'ri javoblar: ${score} ta`}
          </p>
        </div>
      </div>
    );
  }

  // --- 3. RESULT VIEW ---
  const isCompleted = duel.status === "COMPLETED" || (duel.creatorScore !== null && duel.opponentScore !== null);

  let winnerTitle = "";
  let isUserWinner = false;

  if (isCompleted && duel.creatorScore !== null && duel.opponentScore !== null) {
    if (duel.creatorScore > duel.opponentScore) {
      winnerTitle = `🏆 ${duel.creatorName} g'alaba qozondi!`;
      isUserWinner = isCreator;
    } else if (duel.opponentScore > duel.creatorScore) {
      winnerTitle = `🏆 ${duel.opponentName} g'alaba qozondi!`;
      isUserWinner = !isCreator;
    } else {
      // Tie in score -> compare time
      const cTime = duel.creatorTime ?? 120;
      const oTime = duel.opponentTime ?? 120;
      if (cTime < oTime) {
        winnerTitle = `🏆 ${duel.creatorName} tezroq javob berib g'olib bo'ldi!`;
        isUserWinner = isCreator;
      } else if (oTime < cTime) {
        winnerTitle = `🏆 ${duel.opponentName} tezroq javob berib g'olib bo'ldi!`;
        isUserWinner = !isCreator;
      } else {
        winnerTitle = "🤝 Do'stlik g'alaba qozondi (Durang)!";
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between p-6" style={{ backgroundColor: "var(--tg-theme-bg-color)" }}>
      <div className="pt-6 text-center">
        <div className="text-6xl mb-3">
          {isCompleted ? (isUserWinner ? "🎉" : "⚔️") : "⏳"}
        </div>
        <h1 className="text-2xl font-black mb-1" style={{ color: "var(--tg-theme-text-color)" }}>
          {isCompleted ? winnerTitle : "Raqib kutilmoqda..."}
        </h1>
        <p className="text-sm" style={{ color: "var(--tg-theme-hint-color)" }}>
          {isCompleted
            ? "Ikkala ishtirokchi ham o'z natijasini topshirdi"
            : "Siz o'z natijangizni muvaffaqiyatli topshirdingiz"}
        </p>
      </div>

      {/* Comparison Board */}
      <div className="my-6 space-y-4">
        {/* Creator Card */}
        <div
          className="rounded-3xl p-5 shadow-sm border-2 transition-all"
          style={{
            backgroundColor: "var(--tg-theme-secondary-bg-color)",
            borderColor:
              isCompleted && duel.creatorScore! >= (duel.opponentScore ?? -1)
                ? "#10b981"
                : "transparent",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white" style={{ backgroundColor: "#3b82f6" }}>
                {duel.creatorName[0]?.toUpperCase() || "C"}
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--tg-theme-text-color)" }}>
                  {duel.creatorName} {isCreator && "(Siz)"}
                </p>
                <p className="text-xs" style={{ color: "var(--tg-theme-hint-color)" }}>
                  {"Yaratuvchi"}
                </p>
              </div>
            </div>
            {duel.creatorScore !== null ? (
              <div className="text-right">
                <span className="text-xl font-black text-blue-600 block">
                  {`${duel.creatorScore} / 10`}
                </span>
                <span className="text-xs" style={{ color: "var(--tg-theme-hint-color)" }}>
                  {`${duel.creatorTime} soniya`}
                </span>
              </div>
            ) : (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ backgroundColor: "#fef9c3", color: "#854d0e" }}>
                {"Topshirmadi"}
              </span>
            )}
          </div>
        </div>

        {/* Opponent Card */}
        <div
          className="rounded-3xl p-5 shadow-sm border-2 transition-all"
          style={{
            backgroundColor: "var(--tg-theme-secondary-bg-color)",
            borderColor:
              isCompleted && duel.opponentScore! >= (duel.creatorScore ?? -1)
                ? "#10b981"
                : "transparent",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white" style={{ backgroundColor: "#f97316" }}>
                {duel.opponentName ? duel.opponentName[0]?.toUpperCase() : "?"}
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--tg-theme-text-color)" }}>
                  {duel.opponentName || "Raqib hali qo'shilmadi"} {!isCreator && duel.opponentName && "(Siz)"}
                </p>
                <p className="text-xs" style={{ color: "var(--tg-theme-hint-color)" }}>
                  {"Raqib"}
                </p>
              </div>
            </div>
            {duel.opponentScore !== null ? (
              <div className="text-right">
                <span className="text-xl font-black text-orange-600 block">
                  {`${duel.opponentScore} / 10`}
                </span>
                <span className="text-xs" style={{ color: "var(--tg-theme-hint-color)" }}>
                  {`${duel.opponentTime} soniya`}
                </span>
              </div>
            ) : (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ backgroundColor: "#fef9c3", color: "#854d0e" }}>
                {"Kutilmoqda..."}
              </span>
            )}
          </div>
        </div>

        {!isCompleted && (
          <div className="p-4 rounded-2xl text-center text-xs animate-pulse" style={{ backgroundColor: "#eff6ff", color: "#1d4ed8" }}>
            {"ℹ️ Raqibingiz testni tugatishi bilanoq, Telegram botingizga yakuniy natijalar xabari keladi!"}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="space-y-3 pb-4">
        {!isCompleted && (
          <>
            <button
              onClick={handleShare}
              className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
              style={{ backgroundColor: "#3b82f6" }}
            >
              <span>{"📤 Do'stga havolani qayta ulashish"}</span>
            </button>
            <button
              onClick={() => loadDuel(false)}
              className="w-full py-3.5 rounded-2xl font-bold border transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{
                backgroundColor: "var(--tg-theme-secondary-bg-color)",
                color: "var(--tg-theme-text-color)",
                borderColor: "var(--tg-theme-hint-color)",
              }}
            >
              <span>{"🔄 Natijani tekshirish"}</span>
            </button>
          </>
        )}

        <button
          onClick={() => navigate("/")}
          className="w-full py-4 rounded-2xl font-bold text-white text-center transition-all active:scale-95 shadow-lg"
          style={{ backgroundColor: "#10b981" }}
        >
          {"🏠 Bosh sahifaga qaytish"}
        </button>
      </div>
    </div>
  );
}
