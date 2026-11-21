import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useTelegramApp } from '../hooks/useTelegramApp';
import { api } from '../lib/api';

interface CreatedDuelInfo {
  id: string;
  unitNumber: number;
  shareLink: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, stats, units, loadStats } = useStore();
  const { haptic, shareUrl, getInitData } = useTelegramApp();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedUnitId, setExpandedUnitId] = useState<number | null>(null);
  const [createdDuel, setCreatedDuel] = useState<CreatedDuelInfo | null>(null);
  const [isCreatingDuel, setIsCreatingDuel] = useState(false);

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

  const handleCreateDuel = async (unitId: number, unitNumber: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    haptic.impact('heavy');
    try {
      setIsCreatingDuel(true);
      const res = await api.post('/duel/create', {
        unitId,
        initData: getInitData(),
      });
      if (res.data.success) {
        setCreatedDuel({
          id: res.data.duel.id,
          unitNumber,
          shareLink: res.data.shareLink,
        });
      }
    } catch (err) {
      console.error('Failed to create duel:', err);
    } finally {
      setIsCreatingDuel(false);
    }
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

        {/* Duel Banner Button */}
        <button
          onClick={() => {
            if (units.length > 0) {
              const targetUnit = units[0];
              handleCreateDuel(targetUnit.id, targetUnit.unitNumber);
            }
          }}
          disabled={isCreatingDuel || units.length === 0}
          className="w-full mt-3 py-3.5 px-4 rounded-2xl font-bold text-sm flex items-center justify-between text-white shadow-md active:scale-98 transition-all"
          style={{
            background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{"⚔️"}</span>
            <div className="text-left">
              <div className="font-extrabold leading-tight">{"Do'st bilan bellashuv (Duel)"}</div>
              <div className="text-xs opacity-90 font-normal">{"10 ta so'z • 2 daqiqalik asinxron duel"}</div>
            </div>
          </div>
          <span className="text-xs bg-white text-red-600 px-2.5 py-1 rounded-full font-black">
            {isCreatingDuel ? "..." : "Boshlash 🚀"}
          </span>
        </button>
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

                      <div className="pt-1">
                        <button
                          onClick={(e) => handleCreateDuel(unit.id, unit.unitNumber, e)}
                          disabled={isCreatingDuel}
                          className="w-full p-3 rounded-xl flex items-center justify-between text-left font-semibold text-sm transition-transform active:scale-98 border border-red-200 dark:border-red-900"
                          style={{
                            backgroundColor: 'var(--tg-theme-bg-color)',
                            color: '#dc2626',
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">{"⚔️"}</span>
                            <span>{"Shu unitda do'st bilan duel"}</span>
                          </div>
                          <span
                            className="text-xs px-2.5 py-1 rounded-full font-bold text-white"
                            style={{ backgroundColor: '#ef4444' }}
                          >
                            {"Duel yaratish"}
                          </span>
                        </button>
                      </div>
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

      {/* Duel Created Modal */}
      {createdDuel && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-sm rounded-3xl p-6 text-center animate-slide-up shadow-2xl space-y-4"
            style={{ backgroundColor: "var(--tg-theme-secondary-bg-color)" }}
          >
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-md" style={{ backgroundColor: "#ef4444", color: "#ffffff" }}>
              {"⚔️"}
            </div>
            <div>
              <h3 className="text-xl font-black" style={{ color: "var(--tg-theme-text-color)" }}>
                {`Unit ${createdDuel.unitNumber} Duela tayyor!`}
              </h3>
              <p className="text-xs mt-1" style={{ color: "var(--tg-theme-hint-color)" }}>
                {"Havolani do'stingizga yuboring. Ikkalangiz ham 10 ta so'zni yechib bo'lgach g'olib aniqlanadi!"}
              </p>
            </div>

            <div
              className="p-3 rounded-xl text-xs font-mono select-all truncate text-left border"
              style={{
                backgroundColor: "var(--tg-theme-bg-color)",
                color: "var(--tg-theme-text-color)",
                borderColor: "var(--tg-theme-hint-color)",
              }}
            >
              {createdDuel.shareLink}
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => {
                  shareUrl(
                    createdDuel.shareLink,
                    `WordDrill'da Unit ${createdDuel.unitNumber} bo'yicha men bilan bellashuv o'yna! ⚔️ Qani kim kuchliroq ekan?`
                  );
                }}
                className="w-full py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
                style={{ backgroundColor: "#3b82f6" }}
              >
                <span>{"📤 Do'stga havola yuborish"}</span>
              </button>

              <button
                onClick={() => {
                  const duelId = createdDuel.id;
                  setCreatedDuel(null);
                  navigate(`/duel/${duelId}`);
                }}
                className="w-full py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
                style={{ backgroundColor: "#ef4444" }}
              >
                <span>{"⚔️ O'zim boshlash"}</span>
              </button>

              <button
                onClick={() => setCreatedDuel(null)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold"
                style={{ color: "var(--tg-theme-hint-color)" }}
              >
                {"Yopish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
