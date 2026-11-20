export default function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen"
         style={{ backgroundColor: 'var(--tg-theme-bg-color)' }}>
      <div className="text-6xl mb-6 animate-bounce-once">📚</div>
      <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--tg-theme-text-color)' }}>
        WordDrill
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--tg-theme-hint-color)' }}>
        Yuklanmoqda...
      </p>
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: 'var(--tg-theme-button-color)',
              animation: `bounce 1s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
