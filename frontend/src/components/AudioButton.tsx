import { useState, useEffect, useCallback } from "react";

interface AudioButtonProps {
  word: string;
  audioUrl?: string;
  autoPlay?: boolean;
}

// Build TTS URL via our backend proxy
function getTtsUrl(word: string): string {
  const base = import.meta.env.VITE_API_URL || "";
  return `${base}/api/tts?word=${encodeURIComponent(word)}`;
}

export default function AudioButton({ word, audioUrl, autoPlay }: AudioButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Last-resort fallback: browser speechSynthesis
  const speakWord = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlaying(false);
    }
  }, [word]);

  // Try playing an <audio> from the given URL; on any error fall back to speakWord
  const playFromUrl = useCallback(
    (url: string) => {
      const audio = new Audio(url);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        console.warn("Audio load failed, falling back to speechSynthesis");
        speakWord();
      };
      audio.play().catch(() => {
        console.warn("Audio play() rejected, falling back to speechSynthesis");
        speakWord();
      });
    },
    [speakWord]
  );

  const playAudio = useCallback(() => {
    if (isPlaying) return;
    setIsPlaying(true);

    // Priority 1: explicit audioUrl from DB (if any)
    if (audioUrl) {
      playFromUrl(audioUrl);
      return;
    }

    // Priority 2: backend TTS proxy (Google Translate)
    const ttsUrl = getTtsUrl(word);
    playFromUrl(ttsUrl);
  }, [audioUrl, isPlaying, word, playFromUrl]);

  useEffect(() => {
    if (autoPlay) {
      const timer = setTimeout(() => {
        playAudio();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, playAudio]);

  return (
    <button
      type="button"
      onClick={playAudio}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95"
      style={{
        backgroundColor: isPlaying ? "#dbeafe" : "var(--tg-theme-bg-color)",
        color: isPlaying ? "#1d4ed8" : "var(--tg-theme-hint-color)",
      }}
    >
      <span className={isPlaying ? "animate-pulse" : ""}>{isPlaying ? "🔊" : "🔈"}</span>
      <span>{isPlaying ? "Tinglanmoqda..." : "Talaffuzni eshiting"}</span>
    </button>
  );
}
