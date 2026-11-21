import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTelegramApp } from './hooks/useTelegramApp';
import { useStore } from './store/useStore';
import Dashboard from './pages/Dashboard';
import LearnPage from './pages/LearnPage';
import ReviewPage from './pages/ReviewPage';
import DuelPage from './pages/DuelPage';
import LoadingScreen from './components/LoadingScreen';

function App() {
  const { isReady, themeParams, startParam } = useTelegramApp();
  const { user, isLoading, authenticate } = useStore();

  useEffect(() => {
    if (isReady) {
      authenticate();
    }
  }, [isReady, authenticate]);

  // Apply Telegram theme
  useEffect(() => {
    if (themeParams) {
      const root = document.documentElement;
      if (themeParams.bg_color) root.style.setProperty('--tg-theme-bg-color', themeParams.bg_color);
      if (themeParams.text_color) root.style.setProperty('--tg-theme-text-color', themeParams.text_color);
      if (themeParams.hint_color) root.style.setProperty('--tg-theme-hint-color', themeParams.hint_color);
      if (themeParams.link_color) root.style.setProperty('--tg-theme-link-color', themeParams.link_color);
      if (themeParams.button_color) root.style.setProperty('--tg-theme-button-color', themeParams.button_color);
      if (themeParams.button_text_color) root.style.setProperty('--tg-theme-button-text-color', themeParams.button_text_color);
      if (themeParams.secondary_bg_color) root.style.setProperty('--tg-theme-secondary-bg-color', themeParams.secondary_bg_color);
    }
  }, [themeParams]);

  if (isLoading || (!user && isReady)) {
    return <LoadingScreen />;
  }

  const initialDuelId = startParam && startParam.startsWith('duel_') ? startParam.replace('duel_', '') : null;

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            initialDuelId ? (
              <Navigate to={`/duel/${initialDuelId}`} replace />
            ) : user ? (
              <Dashboard />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="/learn/:unitId" element={<LearnPage />} />
        <Route path="/learn/:unitId/:part" element={<LearnPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="/duel/:duelId" element={<DuelPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
