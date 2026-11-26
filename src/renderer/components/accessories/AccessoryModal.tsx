import React, { useState, useEffect } from 'react';
import { X, Package, Check, Sparkles, Infinity as InfinityIcon } from 'lucide-react';
import { ACCESSORY_CATEGORIES, cleanNumberInput, parseNumberInput, isUnlimitedCategory } from '../../../shared/constants';
import { Accessory } from '../../../shared/types';
import { useAppStore } from '../../stores/useAppStore';

interface AccessoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingAccessory?: Accessory | null;
  allowedCategories?: string[];
  modalTitle?: string;
}

export const AccessoryModal: React.FC<AccessoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingAccessory,
  allowedCategories,
  modalTitle
}) => {
  const { addToast, currentUser } = useAppStore();
  const isAdmin = currentUser?.role === 'admin';
  const categoriesList = allowedCategories && allowedCategories.length > 0 ? allowedCategories : ACCESSORY_CATEGORIES;

  const [name, setName] = useState(editingAccessory?.name || '');
  const [category, setCategory] = useState(editingAccessory?.category || categoriesList[0]);
  const [barcode, setBarcode] = useState(editingAccessory?.barcode || '');
  const [sku, setSku] = useState(editingAccessory?.sku || '');
  const [costPrice, setCostPrice] = useState<string>(editingAccessory?.costPrice !== undefined ? String(editingAccessory.costPrice) : '');
  const [retailPrice, setRetailPrice] = useState<string>(editingAccessory?.retailPrice !== undefined ? String(editingAccessory.retailPrice) : '');
  const [wholesalePrice, setWholesalePrice] = useState<string>(editingAccessory?.wholesalePrice !== undefined ? String(editingAccessory.wholesalePrice) : '');
  const [currentStock, setCurrentStock] = useState<string>(editingAccessory?.currentStock !== undefined ? String(editingAccessory.currentStock) : '10');
  const [minStockAlert, setMinStockAlert] = useState<string>(editingAccessory?.minStockAlert !== undefined ? String(editingAccessory.minStockAlert) : '5');
  const [isUnlimitedStock, setIsUnlimitedStock] = useState<boolean>(
    Boolean(editingAccessory?.isUnlimitedStock || isUnlimitedCategory(editingAccessory?.category || categoriesList[0], editingAccessory?.name || ''))
  );
  const [description, setDescription] = useState(editingAccessory?.description || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingAccessory) {
      setName(editingAccessory.name || '');
      setCategory(editingAccessory.category || categoriesList[0]);
      setBarcode(editingAccessory.barcode || '');
      setSku(editingAccessory.sku || '');
      setCostPrice(editingAccessory.costPrice !== undefined && editingAccessory.costPrice !== null ? String(editingAccessory.costPrice) : '');
      setRetailPrice(editingAccessory.retailPrice !== undefined && editingAccessory.retailPrice !== null ? String(editingAccessory.retailPrice) : '');
      setWholesalePrice(editingAccessory.wholesalePrice !== undefined && editingAccessory.wholesalePrice !== null ? String(editingAccessory.wholesalePrice) : '');
      setCurrentStock(editingAccessory.currentStock !== undefined && editingAccessory.currentStock !== null ? String(editingAccessory.currentStock) : '10');
      setMinStockAlert(editingAccessory.minStockAlert !== undefined && editingAccessory.minStockAlert !== null ? String(editingAccessory.minStockAlert) : '5');
      setIsUnlimitedStock(Boolean(editingAccessory.isUnlimitedStock || isUnlimitedCategory(editingAccessory.category, editingAccessory.name)));
      setDescription(editingAccessory.description || '');
    } else {
      setName('');
      setCategory(categoriesList[0]);
      setBarcode('');
      setSku('');
      setCostPrice('');
      setRetailPrice('');
      setWholesalePrice('');
      setCurrentStock('10');
      setMinStockAlert('5');
      setIsUnlimitedStock(isUnlimitedCategory(categoriesList[0], ''));
      setDescription('');
    }
  }, [editingAccessory, isOpen, categoriesList]);

  if (!isOpen) return null;

  const handleGenerateBarcode = () => {
    // Generate a clean 13-digit EAN-like barcode starting with 690
    const random = Math.floor(1000000000 + Math.random() * 9000000000);
    const code = `690${random}`.substring(0, 13);
    setBarcode(code);
    if (!sku) {
      setSku(`SKU-${code.substring(6, 12)}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !barcode.trim() || retailPrice.trim() === '') {
      addToast('يرجى إدخال اسم الصنف والباركود وسعر البيع', 'warning');
      return;
    }

    const parsedCost = isAdmin ? parseNumberInput(costPrice) : (editingAccessory?.costPrice ?? 0);
    const parsedRetail = parseNumberInput(retailPrice);
    const parsedWholesale = wholesalePrice.trim() !== '' ? parseNumberInput(wholesalePrice) : parsedRetail;
    const parsedStock = isUnlimitedStock ? 999999 : Math.max(0, Math.floor(parseNumberInput(currentStock)));
    const parsedMinAlert = isUnlimitedStock ? 0 : Math.max(0, Math.floor(parseNumberInput(minStockAlert)));

    setSubmitting(true);
    try {
      if (editingAccessory) {
        await window.tigerAPI.updateAccessory(editingAccessory.id, {
          name: name.trim(),
          category,
          barcode: barcode.trim(),
          sku: sku.trim() || barcode.trim(),
          costPrice: parsedCost,
          retailPrice: parsedRetail,
          wholesalePrice: parsedWholesale,
          currentStock: parsedStock,
          minStockAlert: parsedMinAlert,
          isUnlimitedStock,
          description: description || null
        });
        addToast('تم تحديث بيانات الصنف بنجاح!', 'success');
      } else {
        await window.tigerAPI.addAccessory({
          name: name.trim(),
          category,
          barcode: barcode.trim(),
          sku: sku.trim() || barcode.trim(),
          costPrice: parsedCost,
          retailPrice: parsedRetail,
          wholesalePrice: parsedWholesale,
          currentStock: parsedStock,
          minStockAlert: parsedMinAlert,
          isUnlimitedStock,
          description: description || null
        });
        addToast(`تمت إضافة الصنف ${name.trim()} بنجاح!`, 'success');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast(err.message || 'فشل حفظ الصنف', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-slate-900 dark:text-white">
              {editingAccessory 
                ? (modalTitle ? `تعديل ${modalTitle}` : 'تعديل بيانات الصنف') 
                : (modalTitle || 'إضافة إكسسوار أو قطعة غيار جديدة')}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 pt-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">اسم الصنف / القطعة:</label>
            <input
              type="text"
              placeholder="مثال: رأس شاحن أصلي Apple 20W Type-C"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">التصنيف:</label>
              <select
                value={category}
                onChange={(e) => {
                  const newCat = e.target.value;
                  setCategory(newCat);
                  if (isUnlimitedCategory(newCat, name)) {
                    setIsUnlimitedStock(true);
                  }
                }}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
              >
                {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">رمز SKU:</label>
              <input
                type="text"
                placeholder="مثال: CHG-AP-20W"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono uppercase"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">الباركود الدولي أو المحلي:</label>
              <button
                type="button"
                onClick={handleGenerateBarcode}
                className="text-[11px] text-orange-600 dark:text-orange-400 font-bold flex items-center gap-1 hover:underline"
              >
                <Sparkles className="w-3 h-3" />
                توليد باركود تلقائي
              </button>
            </div>
            <input
              type="text"
              placeholder="امسح الباركود بجهاز القارئ أو أدخله..."
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono text-left font-bold"
            />
          </div>

          <div className={`grid ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
            {isAdmin && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">سعر التكلفة (د.أ):</label>
                <input
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  placeholder="0.000"
                  value={costPrice}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setCostPrice(cleanNumberInput(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono text-left font-bold"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-orange-600 dark:text-orange-400 mb-1">سعر المفرق (البيع):</label>
              <input
                type="text"
                inputMode="decimal"
                dir="ltr"
                placeholder="0.000"
                value={retailPrice}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setRetailPrice(cleanNumberInput(e.target.value))}
                required
                className="w-full bg-orange-50 dark:bg-orange-950/40 border border-orange-300 dark:border-orange-700 rounded-xl p-2.5 text-xs font-black text-orange-600 dark:text-orange-400 font-mono text-left"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">سعر الجملة (د.أ):</label>
              <input
                type="text"
                inputMode="decimal"
                dir="ltr"
                placeholder="0.000"
                value={wholesalePrice}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setWholesalePrice(cleanNumberInput(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono text-left font-bold"
              />
            </div>
          </div>

          {/* Unlimited Stock Toggle for Transfers & Open Services */}
          <label className={`flex items-center justify-between gap-2 p-3 rounded-xl border cursor-pointer transition ${
            isUnlimitedStock
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300'
              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
          }`}>
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={isUnlimitedStock}
                onChange={(e) => setIsUnlimitedStock(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="text-xs font-black flex items-center gap-1.5">
                  <InfinityIcon className="w-4 h-4 text-blue-500" />
                  <span>سعة بيع لا نهائية / كمية مفتوحة (للحوالات والخدمات)</span>
                </div>
                <div className="text-[10px] opacity-80">
                  لن ينفد هذا البند أبداً على الكاشير ولن يظهر في تنبيهات النواقص مهما زادت المبيعات
                </div>
              </div>
            </div>
            {isUnlimitedStock && (
              <span className="font-mono font-black text-base px-2 py-0.5 rounded-lg bg-blue-600 text-white">
                ∞
              </span>
            )}
          </label>

          {!isUnlimitedStock && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الكمية المتوفرة بالمخزن:</label>
                <input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="10"
                  value={currentStock}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const clean = cleanNumberInput(e.target.value).replace(/[^0-9]/g, '');
                    setCurrentStock(clean);
                  }}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono text-center font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-red-600 dark:text-red-400 mb-1">حد تنبيه النواقص (Min Alert):</label>
                <input
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="5"
                  value={minStockAlert}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => {
                    const clean = cleanNumberInput(e.target.value).replace(/[^0-9]/g, '');
                    setMinStockAlert(clean);
                  }}
                  required
                  className="w-full bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-xl p-2.5 text-xs text-red-700 dark:text-red-300 font-mono text-center font-bold"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الوصف والمواصفات:</label>
            <textarea
              rows={2}
              placeholder="وصف المنتج، مكان الرف، كفالة المورد..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
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
              className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-orange-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {submitting ? 'جاري الحفظ...' : 'حفظ الصنف'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
