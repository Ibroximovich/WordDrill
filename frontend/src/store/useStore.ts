import { create } from 'zustand';
import { api } from '../lib/api';

export interface User {
  id: number;
  telegramId: string;
  firstName: string;
  streakDays: number;
  lastActiveAt: string;
}

export interface Stats {
  masteredCount: number;
  dueCount: number;
  totalProgress: number;
}

export interface Unit {
  id: number;
  bookNumber: number;
  unitNumber: number;
  title: string;
  _count: { words: number };
}

export interface Word {
  id: number;
  unitId: number;
  english: string;
  uzbek: string;
  exampleSentence: string;
  audioUrl?: string;
  options: string[];
  progress?: {
    id: number;
    mistakeCount: number;
    srsStage: number;
    nextReviewAt: string;
    isMastered: boolean;
  } | null;
}

interface Store {
  user: User | null;
  stats: Stats | null;
  units: Unit[];
  isLoading: boolean;
  error: string | null;
  
  authenticate: () => Promise<void>;
  loadStats: () => Promise<void>;
  loadUnits: () => Promise<void>;
  updateProgress: (wordId: number, hasMistake: boolean) => Promise<void>;
  setUser: (user: User) => void;
  setStats: (stats: Stats) => void;
}

// Get initData from Telegram WebApp
function getInitData(): string {
  return window.Telegram?.WebApp?.initData || 'mock';
}

export const useStore = create<Store>((set, get) => ({
  user: null,
  stats: null,
  units: [],
  isLoading: true,
  error: null,

  authenticate: async () => {
    try {
      set({ isLoading: true, error: null });
      const initData = getInitData();
      const response = await api.post('/users/auth', { initData });
      const { user } = response.data;
      set({ user, isLoading: false });
      
      // Load stats and units
      await get().loadStats();
      await get().loadUnits();
    } catch (error) {
      console.error('Auth error:', error);
      set({ error: 'Autentifikatsiya xatosi', isLoading: false });
    }
  },

  loadStats: async () => {
    const { user } = get();
    if (!user) return;
    
    try {
      const response = await api.get(`/users/${user.id}/stats`);
      set({ stats: response.data.stats });
    } catch (error) {
      console.error('Stats load error:', error);
    }
  },

  loadUnits: async () => {
    try {
      const response = await api.get('/units');
      set({ units: response.data.units });
    } catch (error) {
      console.error('Units load error:', error);
    }
  },

  updateProgress: async (wordId: number, hasMistake: boolean) => {
    const { user } = get();
    if (!user) return;
    
    try {
      await api.post('/progress/update', {
        userId: user.id,
        wordId,
        hasMistake,
      });
    } catch (error) {
      console.error('Progress update error:', error);
    }
  },

  setUser: (user) => set({ user }),
  setStats: (stats) => set({ stats }),
}));
