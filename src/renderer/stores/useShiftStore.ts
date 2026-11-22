import { create } from 'zustand';
import { Shift } from '../../shared/types';

interface ShiftState {
  activeShift: Shift | null;
  isOpenShiftModalOpen: boolean;
  isCloseShiftModalOpen: boolean;
  refreshActiveShift: () => Promise<void>;
  setOpenShiftModalOpen: (open: boolean) => void;
  setCloseShiftModalOpen: (open: boolean) => void;
}

export const useShiftStore = create<ShiftState>((set) => ({
  activeShift: null,
  isOpenShiftModalOpen: false,
  isCloseShiftModalOpen: false,

  refreshActiveShift: async () => {
    if (window.tigerAPI) {
      try {
        const shift = await window.tigerAPI.getActiveShift();
        set({ activeShift: shift });
      } catch (err) {
        console.error('Failed to load active shift:', err);
      }
    }
  },

  setOpenShiftModalOpen: (open) => set({ isOpenShiftModalOpen: open }),
  setCloseShiftModalOpen: (open) => set({ isCloseShiftModalOpen: open }),
}));
