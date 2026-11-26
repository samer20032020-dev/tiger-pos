import { create } from 'zustand';

const STORAGE_KEY = 'tiger_daily_cash_calculator_v1';

interface PersistedCalculatorFields {
  startingCashInput: string;
  startingCashLocked: boolean;
  receiptsOverrideInput: string;
  expectedOverrideInput: string;
  actualCashInput: string;
  isManualReceipts: boolean;
  isManualExpected: boolean;
}

const DEFAULT_STATE: PersistedCalculatorFields = {
  startingCashInput: '0.000',
  startingCashLocked: false,
  receiptsOverrideInput: '',
  expectedOverrideInput: '',
  actualCashInput: '0.000',
  isManualReceipts: false,
  isManualExpected: false,
};

function loadSavedState(): PersistedCalculatorFields {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ...DEFAULT_STATE };
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return {
      startingCashInput: typeof parsed.startingCashInput === 'string' ? parsed.startingCashInput : '0.000',
      startingCashLocked: Boolean(parsed.startingCashLocked),
      receiptsOverrideInput: typeof parsed.receiptsOverrideInput === 'string' ? parsed.receiptsOverrideInput : '',
      expectedOverrideInput: typeof parsed.expectedOverrideInput === 'string' ? parsed.expectedOverrideInput : '',
      actualCashInput: typeof parsed.actualCashInput === 'string' ? parsed.actualCashInput : '0.000',
      isManualReceipts: Boolean(parsed.isManualReceipts),
      isManualExpected: Boolean(parsed.isManualExpected),
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveState(fields: PersistedCalculatorFields): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fields));
    }
  } catch {
    // Ignore storage quota errors
  }
}

interface DailyCalculatorStore extends PersistedCalculatorFields {
  setStartingCashInput: (val: string, lock?: boolean) => void;
  setReceiptsOverride: (val: string, manual: boolean) => void;
  setExpectedOverride: (val: string, manual: boolean) => void;
  setActualCashInput: (val: string) => void;
  resetAllToZero: () => void;
}

const initial = loadSavedState();

export const useDailyCalculatorStore = create<DailyCalculatorStore>((set, get) => ({
  ...initial,

  setStartingCashInput: (val, lock = true) => {
    const next: PersistedCalculatorFields = {
      startingCashInput: val,
      startingCashLocked: lock,
      receiptsOverrideInput: get().receiptsOverrideInput,
      expectedOverrideInput: get().expectedOverrideInput,
      actualCashInput: get().actualCashInput,
      isManualReceipts: get().isManualReceipts,
      isManualExpected: get().isManualExpected,
    };
    saveState(next);
    set(next);
  },

  setReceiptsOverride: (val, manual) => {
    const next: PersistedCalculatorFields = {
      startingCashInput: get().startingCashInput,
      startingCashLocked: get().startingCashLocked,
      receiptsOverrideInput: val,
      expectedOverrideInput: get().expectedOverrideInput,
      actualCashInput: get().actualCashInput,
      isManualReceipts: manual,
      isManualExpected: get().isManualExpected,
    };
    saveState(next);
    set(next);
  },

  setExpectedOverride: (val, manual) => {
    const next: PersistedCalculatorFields = {
      startingCashInput: get().startingCashInput,
      startingCashLocked: get().startingCashLocked,
      receiptsOverrideInput: get().receiptsOverrideInput,
      expectedOverrideInput: val,
      actualCashInput: get().actualCashInput,
      isManualReceipts: get().isManualReceipts,
      isManualExpected: manual,
    };
    saveState(next);
    set(next);
  },

  setActualCashInput: (val) => {
    const next: PersistedCalculatorFields = {
      startingCashInput: get().startingCashInput,
      startingCashLocked: get().startingCashLocked,
      receiptsOverrideInput: get().receiptsOverrideInput,
      expectedOverrideInput: get().expectedOverrideInput,
      actualCashInput: val,
      isManualReceipts: get().isManualReceipts,
      isManualExpected: get().isManualExpected,
    };
    saveState(next);
    set(next);
  },

  resetAllToZero: () => {
    const next: PersistedCalculatorFields = {
      startingCashInput: '0.000',
      startingCashLocked: true,
      receiptsOverrideInput: '0.000',
      expectedOverrideInput: '0.000',
      actualCashInput: '0.000',
      isManualReceipts: true,
      isManualExpected: true,
    };
    saveState(next);
    set(next);
  },
}));
