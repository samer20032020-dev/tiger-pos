import React, { useState } from 'react';
import { X, Smartphone, Plus, Check } from 'lucide-react';
import { PHONE_BRANDS, PHONE_STORAGE_OPTIONS, PHONE_RAM_OPTIONS, WARRANTY_OPTIONS, cleanNumberInput, parseNumberInput } from '../../../shared/constants';
import { Phone, PhoneCondition } from '../../../shared/types';
import { useAppStore } from '../../stores/useAppStore';

interface PhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PhoneModal: React.FC<PhoneModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { addToast, currentUser } = useAppStore();
  const isAdmin = currentUser?.role === 'admin';

  const [brand, setBrand] = useState('Apple iPhone');
  const [model, setModel] = useState('');
  const [storage, setStorage] = useState('128GB');
  const [ram, setRam] = useState('8GB');
  const [color, setColor] = useState('');
  const [condition, setCondition] = useState<PhoneCondition>('new');
  const [batteryHealth, setBatteryHealth] = useState<string>('100');
  const [imei1, setImei1] = useState('');
  const [imei2, setImei2] = useState('');
  const [costPrice, setCostPrice] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [wholesalePrice, setWholesalePrice] = useState<string>('');
  const [warrantyPeriod, setWarrantyPeriod] = useState<string>('ضمان سنة وكيل رسمي');
  const [supplierName, setSupplierName] = useState('شركة النخبة للأجهزة الذكية');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!model.trim() || !imei1.trim() || sellingPrice.trim() === '') return;

    const parsedCost = isAdmin ? parseNumberInput(costPrice) : 0;
    const parsedSell = parseNumberInput(sellingPrice);
    const parsedWholesale = wholesalePrice.trim() !== '' ? parseNumberInput(wholesalePrice) : parsedSell;

    setSubmitting(true);
    try {
      await window.tigerAPI.addPhone({
        brand,
        model,
        storage,
        ram,
        color: color || 'افتراضي',
        condition,
        batteryHealth: batteryHealth.trim() !== '' ? Math.round(parseNumberInput(batteryHealth)) : null,
        imei1,
        imei2: imei2 || null,
        costPrice: parsedCost,
        sellingPrice: parsedSell,
        wholesalePrice: parsedWholesale,
        warrantyPeriod: warrantyPeriod || null,
        status: 'in_stock',
        supplierId: null,
        supplierName: supplierName || 'شراء محلي',
        notes: notes || null
      }, currentUser?.fullName || 'المدير');

      addToast(`تم تسجيل الهاتف ${brand} ${model} بنجاح!`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast(err.message || 'فشل تسجيل الهاتف', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-slate-900 dark:text-white">إضافة هاتف جديد للمخزون (IMEI Serialized)</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الشركة:</label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
              >
                {PHONE_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الموديل:</label>
              <input
                type="text"
                placeholder="مثال: iPhone 15 Pro Max"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">سعة التخزين:</label>
              <select
                value={storage}
                onChange={(e) => setStorage(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono"
              >
                {PHONE_STORAGE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الرام (RAM):</label>
              <select
                value={ram}
                onChange={(e) => setRam(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono"
              >
                {PHONE_RAM_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">اللون:</label>
              <input
                type="text"
                placeholder="مثال: أسود تيتانيوم"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الحالة المادية:</label>
              <select
                value={condition}
                onChange={(e) => {
                  const cond = e.target.value as PhoneCondition;
                  setCondition(cond);
                  if (cond === 'new') setWarrantyPeriod('ضمان سنة وكيل رسمي');
                  else setWarrantyPeriod('ضمان فحص 7 أيام للمستعمل');
                }}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
              >
                <option value="new">جديد كرتونة (New)</option>
                <option value="used">مستعمل بحالة ممتازة (Used)</option>
                <option value="refurbished">مجدد معتمد (Refurbished)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">صحة البطارية (%):</label>
              <input
                type="text"
                inputMode="numeric"
                dir="ltr"
                value={batteryHealth}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setBatteryHealth(cleanNumberInput(e.target.value).replace(/[^0-9]/g, ''))}
                placeholder="100"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono text-left"
              />
            </div>
          </div>

          {/* Warranty selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">فترة ونوع الكفالة (Warranty):</label>
            <select
              value={warrantyPeriod}
              onChange={(e) => setWarrantyPeriod(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-medium"
            >
              {WARRANTY_OPTIONS.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الرقم التسلسلي الرئيسي (IMEI 1):
              </label>
              <input
                type="text"
                maxLength={15}
                placeholder="352849102938475"
                value={imei1}
                onChange={(e) => setImei1(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الرقم التسلسلي الثانوي (IMEI 2 - اختياري):
              </label>
              <input
                type="text"
                maxLength={15}
                placeholder="352849102938476"
                value={imei2}
                onChange={(e) => setImei2(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          {/* Pricing: Cost, Selling Price, Wholesale Price (3 decimals) */}
          <div className={`grid ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
            {isAdmin && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">سعر التكلفة (د.أ):</label>
                <input
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  placeholder="مثال: 450.000"
                  value={costPrice}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setCostPrice(cleanNumberInput(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono font-bold text-left"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">سعر البيع بالمفرق (د.أ):</label>
              <input
                type="text"
                inputMode="decimal"
                dir="ltr"
                placeholder="مثال: 520.000"
                value={sellingPrice}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setSellingPrice(cleanNumberInput(e.target.value))}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono font-bold text-orange-600 text-left"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">سعر الجملة (Wholesale):</label>
              <input
                type="text"
                inputMode="decimal"
                dir="ltr"
                placeholder="مثال: 490.000"
                value={wholesalePrice}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setWholesalePrice(cleanNumberInput(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono font-bold text-amber-600 text-left"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">اسم المورد:</label>
              <input
                type="text"
                placeholder="اسم المورد أو المصدر"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ملاحظات إضافية:</label>
              <input
                type="text"
                placeholder="أي ملاحظات فنية حول الجهاز..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-6 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-orange-600/30 transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {submitting ? 'جاري الحفظ...' : 'حفظ وإدخال للمخزون'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
