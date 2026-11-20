import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useTelegramApp } from '../hooks/useTelegramApp';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, stats, units, loadStats } = useStore();
  const { haptic } = useTelegramApp();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedUnitId, setExpandedUnitId] = useState<number | null>(null);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const toggleUnit = (unitId: number) => {
    haptic.impact('light');
    setExpandedUnitId((prev) => (prev === unitId ? null : unitId));
  };

  const handleStartPart = (unitId: number, part: number, e: React.MouseEvent) => {
    e.stopPropagation();
    haptic.impact('medium');
    navigate(`/learn/${unitId}/${part}`);
  };

  const handleReview = () => {
    haptic.impact('medium');
    navigate('/review');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--tg-theme-bg-color)' }}>
      {/* Header */}
      <div className="px-4 pt-6 pb-4" style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--tg-theme-text-color)' }}>
              📚 WordDrill
            </h1>
            <p className="text-sm" style={{ color: 'var(--tg-theme-hint-color)' }}>
              Salom, {user?.firstName}! 👋
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="text-2xl"
            style={{ opacity: refreshing ? 0.5 : 1 }}
          >
            🔄
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: 'var(--tg-theme-bg-color)' }}>
            <div className="text-3xl font-bold" style={{ color: '#f59e0b' }}>
              🔥 {user?.streakDays || 0}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--tg-theme-hint-color)' }}>
              Streak (kun)
            </div>
          </div>
          <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: 'var(--tg-theme-bg-color)' }}>
            <div className="text-3xl font-bold" style={{ color: '#10b981' }}>
              ✅ {stats?.masteredCount || 0}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--tg-theme-hint-color)' }}>
              O'zlashtirilgan
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Review Button */}
        {stats && stats.dueCount > 0 && (
          <button
            onClick={handleReview}
            className="w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 animate-pulse-green"
            style={{
              backgroundColor: '#10b981',
              color: '#ffffff',
            }}
          >
            <span>📝</span>
            <span>Takrorlash ({stats.dueCount} ta so'z)</span>
            <span>→</span>
          </button>
        )}

        {/* Units List */}
        <div>
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--tg-theme-text-color)' }}>
            📖 Darslar
          </h2>
          <div className="space-y-3">
            {units.map((unit) => {
              const isExpanded = expandedUnitId === unit.id;
              return (
                <div
                  key={unit.id}
                  className="rounded-2xl overflow-hidden transition-all"
                  style={{ backgroundColor: 'var(--tg-theme-secondary-bg-color)' }}
                >
                  <div
                    onClick={() => toggleUnit(unit.id)}
                    className="p-4 flex items-center justify-between cursor-pointer active:opacity-80"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
                        style={{
                          backgroundColor: 'var(--tg-theme-button-color)',
                          color: 'var(--tg-theme-button-text-color)',
                        }}
                      >
                        {unit.unitNumber}
                      </div>
                      <div>
                        <div className="font-semibold text-sm" style={{ color: 'var(--tg-theme-text-color)' }}>
                          {unit.title}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--tg-theme-hint-color)' }}>
                          Kitob {unit.bookNumber} • {unit._count.words} ta so'z
                        </div>
                      </div>
                    </div>
                    <span
                      className="text-lg font-bold transition-transform duration-200"
                      style={{
                        color: 'var(--tg-theme-hint-color)',
                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      }}
                    >
                      ›
                    </span>
                  </div>

                  {/* 10-word parts selection */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t space-y-2 animate-slide-in"
                         style={{ borderColor: 'var(--tg-theme-bg-color)' }}>
                      <p className="text-xs font-medium mb-2" style={{ color: 'var(--tg-theme-hint-color)' }}>
                        Qismni tanlang (har biri 10 ta so'z):
                      </p>
                      <button
                        onClick={(e) => handleStartPart(unit.id, 1, e)}
                        className="w-full p-3 rounded-xl flex items-center justify-between text-left font-semibold text-sm transition-transform active:scale-98"
                        style={{
                          backgroundColor: 'var(--tg-theme-bg-color)',
                          color: 'var(--tg-theme-text-color)',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">🌱</span>
                          <span>1-qism (1–10 so'zlar)</span>
                        </div>
                        <span
                          className="text-xs px-2.5 py-1 rounded-full font-bold"
                          style={{
                            backgroundColor: 'var(--tg-theme-button-color)',
                            color: 'var(--tg-theme-button-text-color)',
                          }}
                        >
                          Boshlash →
                        </span>
                      </button>

                      <button
                        onClick={(e) => handleStartPart(unit.id, 2, e)}
                        className="w-full p-3 rounded-xl flex items-center justify-between text-left font-semibold text-sm transition-transform active:scale-98"
                        style={{
                          backgroundColor: 'var(--tg-theme-bg-color)',
                          color: 'var(--tg-theme-text-color)',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">🚀</span>
                          <span>2-qism (11–20 so'zlar)</span>
                        </div>
                        <span
                          className="text-xs px-2.5 py-1 rounded-full font-bold"
                          style={{
                            backgroundColor: 'var(--tg-theme-button-color)',
                            color: 'var(--tg-theme-button-text-color)',
                          }}
                        >
                          Boshlash →
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {units.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📭</div>
            <p style={{ color: 'var(--tg-theme-hint-color)' }}>Darslar yuklanmoqda...</p>
          </div>
        )}
      </div>
    </div>
  );
}
