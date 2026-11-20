import { useState, useEffect, useRef } from 'react';
import { Word } from '../../store/useStore';

interface Stage3ContextProps {
  word: Word;
  onNext: (hasMistake: boolean) => void;
  haptic: { impact: (s?: 'light'|'medium'|'heavy') => void; success: () => void; error: () => void };
}

export default function Stage3Context({ word, onNext, haptic }: Stage3ContextProps) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [hasMistake, setHasMistake] = useState(false);
  const [shakeInput, setShakeInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInput('');
    setResult(null);
    setHasMistake(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [word.id]);

  // Split sentence at ___
  const parts = word.exampleSentence.split('___');

  const handleSubmit = () => {
    const trimmed = input.trim().toLowerCase();
    const correct = word.english.toLowerCase();

    if (trimmed === correct) {
      setResult('correct');
      haptic.success();
      setTimeout(() => onNext(hasMistake), 1000);
    } else {
      setResult('wrong');
      setHasMistake(true);
      haptic.error();
      setShakeInput(true);
      setTimeout(() => {
        setShakeInput(false);
        setResult(null);
        setInput('');
        setTimeout(() => inputRef.current?.focus(), 100);
      }, 1500);
    }
  };

  return (
    <div className="flex-1 flex flex-col px-4 py-6 animate-slide-in">
      <div className="text-center mb-4">
        <span className="text-xs font-semibold px-3 py-1 rounded-full"
              style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>
          📝 3-bosqich: Kontekst
        </span>
      </div>

      <div className="rounded-3xl p-6 mb-4" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
        <div className="text-center mb-3">
          <span className="text-sm font-medium" style={{ color: 'var(--tg-theme-hint-color)' }}>
            Bo'sh joyni to'ldiring:
          </span>
        </div>
        
        {/* Sentence display */}
        <div className="text-lg leading-relaxed text-center" style={{ color: 'var(--tg-theme-text-color)' }}>
          <span className="italic">&ldquo;</span>
          {parts[0]}
          <span
            className="inline-block px-2 py-0.5 rounded mx-1 font-bold"
            style={{
              backgroundColor: result === 'correct' ? '#d1fae5' : result === 'wrong' ? '#fee2e2' : '#e0e7ff',
              color: result === 'correct' ? '#065f46' : result === 'wrong' ? '#991b1b' : '#3730a3',
              minWidth: '80px',
              borderBottom: '2px dashed',
              borderColor: result === 'correct' ? '#10b981' : result === 'wrong' ? '#ef4444' : '#6366f1',
            }}
          >
            {result === 'correct' ? word.english : result === 'wrong' ? word.english : '___'}
          </span>
          {parts[1]}
          <span className="italic">&rdquo;</span>
        </div>

        {/* Word hint */}
        <div className="mt-4 text-center">
          <span className="text-sm px-3 py-1 rounded-full"
                style={{ backgroundColor: 'var(--tg-theme-bg-color)', color: 'var(--tg-theme-hint-color)' }}>
            💡 {word.uzbek}
          </span>
        </div>
      </div>

      {result === 'correct' && (
        <div className="p-3 rounded-2xl mb-4 text-center animate-slide-in"
             style={{ backgroundColor: '#d1fae5' }}>
          <p className="font-bold" style={{ color: '#065f46' }}>✅ Ajoyib! Davom etamiz...</p>
        </div>
      )}

      {result === 'wrong' && (
        <div className="p-3 rounded-2xl mb-4 text-center animate-slide-in"
             style={{ backgroundColor: '#fee2e2' }}>
          <p className="font-bold" style={{ color: '#991b1b' }}>
            ❌ Noto'g'ri! To'g'ri: <span style={{ color: '#dc2626' }}>{word.english}</span>
          </p>
        </div>
      )}

      <div className={shakeInput ? 'animate-shake' : ''}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && input.trim() && handleSubmit()}
          placeholder="So'zni yozing..."
          className="w-full px-4 py-4 rounded-2xl text-lg font-semibold text-center border-2"
          style={{
            backgroundColor: 'var(--tg-theme-secondary-bg-color)',
            color: 'var(--tg-theme-text-color)',
            borderColor: 'var(--tg-theme-secondary-bg-color)',
          }}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          disabled={result !== null}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!input.trim() || result !== null}
        className="mt-4 w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-95"
        style={{
          backgroundColor: input.trim() && !result ? 'var(--tg-theme-button-color)' : 'var(--tg-theme-secondary-bg-color)',
          color: input.trim() && !result ? 'var(--tg-theme-button-text-color)' : 'var(--tg-theme-hint-color)',
        }}
      >
        Tekshirish ✓
      </button>
    </div>
  );
}
