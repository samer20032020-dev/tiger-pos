import { create } from 'zustand';
import { User, Shift } from '../../shared/types';

export type NavTab = 
  | 'dashboard'
  | 'pos'
  | 'phones'
  | 'accessories'
  | 'repairs'
  | 'installments'
  | 'customers'
  | 'suppliers'
  | 'expenses'
  | 'reports'
  | 'audit'
  | 'settings';

export type AppScreen = 'setup' | 'login' | 'app';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface AppState {
  screen: AppScreen;
  setScreen: (s: AppScreen) => void;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
  barcodeListenerActive: boolean;
  setBarcodeListenerActive: (active: boolean) => void;
  criticalShortageFilter: boolean;
  setCriticalShortageFilter: (active: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  screen: 'login',
  setScreen: (s) => set({ screen: s }),
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
  criticalShortageFilter: false,
  setCriticalShortageFilter: (active) => set({ criticalShortageFilter: active }),
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  darkMode: false,
  toggleDarkMode: () => {
    const next = !get().darkMode;
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ darkMode: next });
  },
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
  barcodeListenerActive: true,
  setBarcodeListenerActive: (active) => set({ barcodeListenerActive: active }),
}));
