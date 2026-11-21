import { useEffect, useState } from 'react';

interface ThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
}

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  openTelegramLink?: (url: string) => void;
  initData: string;
  initDataUnsafe: {
    start_param?: string;
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
  };
  themeParams: ThemeParams;
  colorScheme: 'light' | 'dark';
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (fn: () => void) => void;
    offClick: (fn: () => void) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export function useTelegramApp() {
  const [isReady, setIsReady] = useState(false);
  const [themeParams, setThemeParams] = useState<ThemeParams | null>(null);
  const [twa, setTwa] = useState<TelegramWebApp | null>(null);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    
    if (webApp) {
      webApp.ready();
      webApp.expand();
      setThemeParams(webApp.themeParams);
      setTwa(webApp);
    }
    
    // Ready regardless (mock for browser testing)
    setIsReady(true);
  }, []);

  const getInitData = () => {
    return window.Telegram?.WebApp?.initData || 'mock';
  };

  const haptic = {
    impact: (style: 'light' | 'medium' | 'heavy' = 'light') => {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
    },
    success: () => {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
    },
    error: () => {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
    },
  };

  const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param || '';

  const shareUrl = (url: string, text: string) => {
    const fullShareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(fullShareUrl);
    } else {
      window.open(fullShareUrl, '_blank');
    }
  };

  return { isReady, themeParams, twa, getInitData, haptic, startParam, shareUrl };
}
