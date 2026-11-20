import { useState, useEffect, useCallback } from 'react';

interface AudioButtonProps {
  word: string;
  audioUrl?: string;
  autoPlay?: boolean;
}

export default function AudioButton({ word, audioUrl, autoPlay }: AudioButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);

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

  const playAudio = useCallback(() => {
    if (isPlaying) return;
    setIsPlaying(true);

    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => {
        speakWord();
      };
      audio.play().catch(() => speakWord());
    } else {
      speakWord();
    }
  }, [audioUrl, isPlaying, speakWord]);

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
