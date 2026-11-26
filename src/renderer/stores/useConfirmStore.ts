import { create } from 'zustand';

export interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'warning' | 'info';
}

interface ActiveConfirmRequest extends ConfirmOptions {
  message: string;
  resolve: (result: boolean) => void;
}

interface ConfirmState {
  current: ActiveConfirmRequest | null;
  openConfirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
  closeConfirm: (result: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  current: null,
  openConfirm: (message, options = {}) => {
    const prev = get().current;
    if (prev) {
      prev.resolve(false);
    }
    return new Promise<boolean>((resolve) => {
      set({
        current: {
          message,
          title: options.title,
          confirmText: options.confirmText,
          cancelText: options.cancelText,
          tone: options.tone ?? 'warning',
          resolve,
        },
      });
    });
  },
  closeConfirm: (result) => {
    const active = get().current;
    set({ current: null });
    if (active) {
      active.resolve(result);
    }
  },
}));

/**
 * Non-blocking in-app replacement for native window.confirm().
 * Native Electron/Windows confirm() boxes steal Chromium HWND keyboard focus,
 * leaving HTML inputs un-typeable until window refocus.
 */
export function tigerConfirm(message: string, options?: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().openConfirm(message, options);
}

