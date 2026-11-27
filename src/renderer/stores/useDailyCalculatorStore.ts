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
  autoResetV2?: boolean;
}

const DEFAULT_STATE: PersistedCalculatorFields = {
  startingCashInput: '0.000',
  startingCashLocked: false,
  receiptsOverrideInput: '',
  expectedOverrideInput: '',
  actualCashInput: '',
  isManualReceipts: false,
  isManualExpected: false,
  autoResetV2: true,
};

function loadSavedState(): PersistedCalculatorFields {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ...DEFAULT_STATE };
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);

    let receiptsOverrideInput = typeof parsed.receiptsOverrideInput === 'string' ? parsed.receiptsOverrideInput : '';
    let expectedOverrideInput = typeof parsed.expectedOverrideInput === 'string' ? parsed.expectedOverrideInput : '';
    let isManualReceipts = Boolean(parsed.isManualReceipts);
    let isManualExpected = Boolean(parsed.isManualExpected);

    // One-time unlock from pre-v0.9.12 resetAllToZero() which stuck receipts/expected in manual 0.000 mode
    if (!parsed.autoResetV2) {
      if (isManualReceipts && (receiptsOverrideInput === '0.000' || receiptsOverrideInput === '0' || receiptsOverrideInput === '')) {
        isManualReceipts = false;
        receiptsOverrideInput = '';
      }
      if (isManualExpected && (expectedOverrideInput === '0.000' || expectedOverrideInput === '0' || expectedOverrideInput === '')) {
        isManualExpected = false;
        expectedOverrideInput = '';
      }
    }

    return {
      startingCashInput: typeof parsed.startingCashInput === 'string' ? parsed.startingCashInput : '0.000',
      startingCashLocked: Boolean(parsed.startingCashLocked),
      receiptsOverrideInput,
      expectedOverrideInput,
      actualCashInput: typeof parsed.actualCashInput === 'string' ? parsed.actualCashInput : '',
      isManualReceipts,
      isManualExpected,
      autoResetV2: true,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveState(fields: PersistedCalculatorFields): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...fields, autoResetV2: true }));
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
  carryOverStartingCash: (nextStartingCash: string) => void;
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
      autoResetV2: true,
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
      autoResetV2: true,
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
      autoResetV2: true,
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
      autoResetV2: true,
    };
    saveState(next);
    set(next);
  },

  carryOverStartingCash: (nextStartingCash) => {
    const next: PersistedCalculatorFields = {
      startingCashInput: nextStartingCash,
      startingCashLocked: true,
      receiptsOverrideInput: '',
      expectedOverrideInput: '',
      actualCashInput: '',
      isManualReceipts: false,
      isManualExpected: false,
      autoResetV2: true,
    };
    saveState(next);
    set(next);
  },

  resetAllToZero: () => {
    const next: PersistedCalculatorFields = {
      startingCashInput: '0.000',
      startingCashLocked: true,
      receiptsOverrideInput: '',
      expectedOverrideInput: '',
      actualCashInput: '',
      isManualReceipts: false,
      isManualExpected: false,
      autoResetV2: true,
    };
    saveState(next);
    set(next);
  },
}));
