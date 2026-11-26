import { create } from 'zustand';
import { Phone, Accessory, Customer, PaymentMethod, TradeInDevice } from '../../shared/types';
import { isUnlimitedCategory } from '../../shared/constants';

export interface CartItem {
  id: string; // unique cart line id
  itemType: 'phone' | 'accessory';
  itemId: string; // phone.id or accessory.id
  name: string;
  barcodeOrImei: string;
  unitPrice: number;
  retailPrice: number;
  wholesalePrice: number;
  costPrice: number;
  quantity: number;
  itemDiscount?: number;
  warrantyPeriod?: string;
  maxStock?: number;
  phoneDetails?: Phone;
}

interface CartState {
  items: CartItem[];
  customer: Customer | null;
  customerName: string;
  customerPhone: string;
  discount: number;
  discountType: 'fixed' | 'percent';
  taxEnabled: boolean;
  taxRate: number;
  wholesaleMode: boolean;
  tradeIn: TradeInDevice | null;
  paymentMethod: PaymentMethod;
  cashAmount: number;
  cardAmount: number;
  cliqAmount: number;
  creditAmount: number;
  notes: string;

  // Actions
  toggleWholesaleMode: () => void;
  setTaxEnabled: (enabled: boolean) => void;
  setTaxRate: (rate: number) => void;
  setDiscountType: (type: 'fixed' | 'percent') => void;
  addAccessoryItem: (acc: Accessory) => void;
  addPhoneItem: (phone: Phone) => void;
  updateQuantity: (cartItemId: string, qty: number) => void;
  setItemDiscount: (cartItemId: string, discount: number) => void;
  setItemWarranty: (cartItemId: string, warranty: string) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
  setCustomer: (cust: Customer | null) => void;
  setCustomerInfo: (name: string, phone: string) => void;
  setDiscount: (discount: number) => void;
  setTradeIn: (tradeIn: TradeInDevice | null) => void;
  setPaymentDetails: (details: {
    method: PaymentMethod;
    cashAmount?: number;
    cardAmount?: number;
    cliqAmount?: number;
    creditAmount?: number;
  }) => void;
  setNotes: (notes: string) => void;

  // Computed helpers
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getTaxAmount: () => number;
  getTradeInValue: () => number;
  getNetTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customer: null,
  customerName: 'زبون نقدي',
  customerPhone: '',
  discount: 0,
  discountType: 'fixed',
  taxEnabled: false,
  taxRate: 0,
  wholesaleMode: false,
  tradeIn: null,
  paymentMethod: 'cash',
  cashAmount: 0,
  cardAmount: 0,
  cliqAmount: 0,
  creditAmount: 0,
  notes: '',

  toggleWholesaleMode: () => {
    const nextMode = !get().wholesaleMode;
    // Update all existing items in cart to wholesale vs retail price
    const updatedItems = get().items.map(it => ({
      ...it,
      unitPrice: nextMode && it.wholesalePrice > 0 ? it.wholesalePrice : it.retailPrice
    }));
    set({ wholesaleMode: nextMode, items: updatedItems });
  },

  setTaxEnabled: (enabled) => set({ taxEnabled: enabled }),
  setTaxRate: (rate) => set({ taxRate: Math.min(5.5, Math.max(0, Number(rate))) }),
  setDiscountType: (type) => set({ discountType: type }),

  addAccessoryItem: (acc) => {
    const isWholesale = get().wholesaleMode;
    const items = get().items;
    const isUnlimited = Boolean(acc.isUnlimitedStock || isUnlimitedCategory(acc.category, acc.name));
    const existingIndex = items.findIndex(it => it.itemId === acc.id && it.itemType === 'accessory');
    if (existingIndex >= 0) {
      const existing = items[existingIndex];
      if (!isUnlimited && existing.quantity >= acc.currentStock) {
        throw new Error(`المخزون المتوفر (${acc.currentStock}) غير كافٍ لإضافة المزيد`);
      }
      const updated = [...items];
      updated[existingIndex] = {
        ...existing,
        quantity: existing.quantity + 1
      };
      set({ items: updated });
    } else {
      if (!isUnlimited && acc.currentStock <= 0) {
        throw new Error(`الصنف ${acc.name} نفد من المخزون!`);
      }
      const wholesaleP = acc.wholesalePrice || acc.retailPrice;
      const unitP = isWholesale ? wholesaleP : acc.retailPrice;

      const newItem: CartItem = {
        id: `citem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        itemType: 'accessory',
        itemId: acc.id,
        name: acc.name,
        barcodeOrImei: acc.barcode,
        unitPrice: unitP,
        retailPrice: acc.retailPrice,
        wholesalePrice: wholesaleP,
        costPrice: acc.costPrice,
        quantity: 1,
        itemDiscount: 0,
        warrantyPeriod: isUnlimited ? 'خدمة فورية' : 'ضمان تشغيل 3 أيام',
        maxStock: isUnlimited ? undefined : acc.currentStock
      };
      set({ items: [...items, newItem] });
    }
  },

  addPhoneItem: (phone) => {
    const isWholesale = get().wholesaleMode;
    const items = get().items;
    const exists = items.some(it => it.itemId === phone.id);
    if (exists) {
      throw new Error(`الهاتف بالرقم التسلسلي (${phone.imei1}) مضاف بالفعل إلى السلة`);
    }

    const wholesaleP = phone.wholesalePrice || phone.sellingPrice;
    const unitP = isWholesale ? wholesaleP : phone.sellingPrice;

    const newItem: CartItem = {
      id: `citem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      itemType: 'phone',
      itemId: phone.id,
      name: `${phone.brand} ${phone.model} (${phone.storage} - ${phone.color})`,
      barcodeOrImei: phone.imei1,
      unitPrice: unitP,
      retailPrice: phone.sellingPrice,
      wholesalePrice: wholesaleP,
      costPrice: phone.costPrice,
      quantity: 1,
      itemDiscount: 0,
      warrantyPeriod: phone.warrantyPeriod || (phone.condition === 'new' ? 'ضمان سنة وكيل رسمي' : 'ضمان فحص 7 أيام للمستعمل'),
      maxStock: 1,
      phoneDetails: phone
    };
    set({ items: [...items, newItem] });
  },

  updateQuantity: (cartItemId, qty) => {
    if (qty <= 0) {
      get().removeItem(cartItemId);
      return;
    }
    const items = get().items.map(it => {
      if (it.id === cartItemId) {
        if (it.maxStock !== undefined && qty > it.maxStock) {
          throw new Error(`الكمية المطلوبة تتجاوز المخزون المتوفر (${it.maxStock})`);
        }
        return { ...it, quantity: qty };
      }
      return it;
    });
    set({ items });
  },

  setItemDiscount: (cartItemId, discount) => {
    const items = get().items.map(it => {
      if (it.id === cartItemId) {
        return { ...it, itemDiscount: Math.max(0, discount) };
      }
      return it;
    });
    set({ items });
  },

  setItemWarranty: (cartItemId, warranty) => {
    const items = get().items.map(it => {
      if (it.id === cartItemId) {
        return { ...it, warrantyPeriod: warranty };
      }
      return it;
    });
    set({ items });
  },

  removeItem: (cartItemId) => {
    set({ items: get().items.filter(it => it.id !== cartItemId) });
  },

  clearCart: () => {
    set({
      items: [],
      customer: null,
      customerName: 'زبون نقدي',
      customerPhone: '',
      discount: 0,
      discountType: 'fixed',
      tradeIn: null,
      paymentMethod: 'cash',
      cashAmount: 0,
      cardAmount: 0,
      cliqAmount: 0,
      creditAmount: 0,
      notes: ''
    });
  },

  setCustomer: (cust) => {
    if (cust) {
      set({ customer: cust, customerName: cust.name, customerPhone: cust.phone });
    } else {
      set({ customer: null, customerName: 'زبون نقدي', customerPhone: '' });
    }
  },

  setCustomerInfo: (name, phone) => {
    set({ customerName: name, customerPhone: phone });
  },

  setDiscount: (discount) => set({ discount: Math.max(0, discount) }),

  setTradeIn: (tradeIn) => set({ tradeIn }),

  setPaymentDetails: (details) => {
    set({
      paymentMethod: details.method,
      cashAmount: details.cashAmount !== undefined ? details.cashAmount : get().cashAmount,
      cardAmount: details.cardAmount !== undefined ? details.cardAmount : get().cardAmount,
      cliqAmount: details.cliqAmount !== undefined ? details.cliqAmount : get().cliqAmount,
      creditAmount: details.creditAmount !== undefined ? details.creditAmount : get().creditAmount,
    });
  },

  setNotes: (notes) => set({ notes }),

  getSubtotal: () => {
    return get().items.reduce((sum, it) => {
      const lineTotal = (it.unitPrice * it.quantity) - (it.itemDiscount || 0);
      return sum + Math.max(0, lineTotal);
    }, 0);
  },

  getDiscountAmount: () => {
    const subtotal = get().getSubtotal();
    if (get().discountType === 'percent') {
      return Number(((subtotal * get().discount) / 100).toFixed(3));
    }
    return Math.min(subtotal, get().discount);
  },

  getTradeInValue: () => {
    return get().tradeIn ? get().tradeIn!.purchasePrice : 0;
  },

  getTaxAmount: () => {
    if (!get().taxEnabled || get().taxRate <= 0) return 0;
    const subtotal = get().getSubtotal();
    const discountAmount = get().getDiscountAmount();
    const taxableBase = Math.max(0, subtotal - discountAmount);
    return Number(((taxableBase * get().taxRate) / 100).toFixed(3));
  },

  getNetTotal: () => {
    const subtotal = get().getSubtotal();
    const discountAmount = get().getDiscountAmount();
    const tradeInVal = get().getTradeInValue();
    const taxAmount = get().getTaxAmount();
    const netBeforeTax = Math.max(0, subtotal - discountAmount - tradeInVal);
    return Number((netBeforeTax + taxAmount).toFixed(3));
  }
}));
