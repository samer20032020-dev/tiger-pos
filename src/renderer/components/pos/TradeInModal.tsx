import React, { useState } from 'react';
import { X, RefreshCw, Smartphone, Battery, Tag, Check, AlertCircle } from 'lucide-react';
import { PHONE_BRANDS, PHONE_STORAGE_OPTIONS, cleanNumberInput, parseNumberInput } from '../../../shared/constants';
import { TradeInDevice } from '../../../shared/types';
import { useCartStore } from '../../stores/useCartStore';
import { useEscapeClose } from '../../utils/useEscapeStack';

interface TradeInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TradeInModal: React.FC<TradeInModalProps> = ({ isOpen, onClose }) => {
  useEscapeClose(isOpen, onClose);
  const { setTradeIn, tradeIn } = useCartStore();

  const [brand, setBrand] = useState(tradeIn?.brand || 'Apple iPhone');
  const [model, setModel] = useState(tradeIn?.model || '');
  const [storage, setStorage] = useState(tradeIn?.storage || '128GB');
  const [color, setColor] = useState(tradeIn?.color || '');
  const [batteryHealth, setBatteryHealth] = useState<number | ''>(tradeIn?.batteryHealth || 85);
  const [imei, setImei] = useState(tradeIn?.imei || '');
  const [conditionNotes, setConditionNotes] = useState(tradeIn?.conditionNotes || '');
  const [purchasePrice, setPurchasePrice] = useState<string>(tradeIn?.purchasePrice !== undefined ? String(tradeIn.purchasePrice) : '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model.trim() || !imei.trim() || purchasePrice.trim() === '') return;

    const device: Omit<TradeInDevice, 'id' | 'invoiceId' | 'createdAt'> = {
      brand,
      model,
      storage,
      color: color || 'افتراضي',
      batteryHealth: batteryHealth ? Number(batteryHealth) : null,
      imei,
      conditionNotes: conditionNotes || 'مستعمل بحالة جيدة',
      purchasePrice: parseNumberInput(purchasePrice)
    };

    setTradeIn(device as any);
    onClose();
  };

  const handleRemove = () => {
    setTradeIn(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-orange-500" />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">نظام التبديل والمستعمل (Trade-In)</h3>
              <p className="text-[11px] text-slate-500">شراء هاتف مستعمل من العميل وخصم قيمته من الفاتورة وإدراجه بالمخزون</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الشركة المصنعة:</label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
              >
                {PHONE_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الموديل (Model):</label>
              <input
                type="text"
                placeholder="مثال: iPhone 13 Pro Max"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">السعة التخزينية:</label>
              <select
                value={storage}
                onChange={(e) => setStorage(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
              >
                {PHONE_STORAGE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">اللون:</label>
              <input
                type="text"
                placeholder="مثال: أزرق / أسود"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">نسبة البطارية (%):</label>
              <input
                type="number"
                min="50"
                max="100"
                placeholder="85"
                value={batteryHealth}
                onChange={(e) => setBatteryHealth(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono text-center"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الرقم التسلسلي (IMEI):</label>
              <input
                type="text"
                placeholder="35..."
                value={imei}
                onChange={(e) => setImei(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono text-left"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-orange-600 dark:text-orange-400 mb-1">سعر الشراء المتفق عليه (د.أ):</label>
              <input
                type="text"
                inputMode="decimal"
                dir="ltr"
                placeholder="0.000"
                value={purchasePrice}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setPurchasePrice(cleanNumberInput(e.target.value))}
                required
                className="w-full bg-orange-50 dark:bg-orange-950/40 border border-orange-300 dark:border-orange-700 rounded-xl p-2.5 text-sm font-black text-orange-600 dark:text-orange-400 font-mono text-left"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ملاحظات الفحص وحالة الجهاز:</label>
            <textarea
              rows={2}
              placeholder="خدوش، شاشة أصلية، كرتونة ملحقة، نسبة النظافة..."
              value={conditionNotes}
              onChange={(e) => setConditionNotes(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            {tradeIn ? (
              <button
                type="button"
                onClick={handleRemove}
                className="text-xs text-red-600 hover:text-red-500 font-semibold"
              >
                إلغاء جهاز التبديل
              </button>
            ) : <div />}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-orange-600/30 transition flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                تأكيد واعتماد الخصم
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
