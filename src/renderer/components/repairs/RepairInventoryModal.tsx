import React, { useState, useEffect } from 'react';
import { 
  X, Wrench, Package, Plus, Search, Layers, Battery, 
  Smartphone, Cable, Check, AlertTriangle, ArrowUpDown, Trash2
} from 'lucide-react';
import { Accessory } from '../../../shared/types';
import { REPAIR_PART_CATEGORIES } from '../../../shared/constants';
import { formatJOD } from '../../../shared/constants';
import { useAppStore } from '../../stores/useAppStore';

interface RepairInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RepairInventoryModal: React.FC<RepairInventoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { addToast } = useAppStore();
  const [parts, setParts] = useState<Accessory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // New Part Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<string>(REPAIR_PART_CATEGORIES[0]);
  const [newCostPrice, setNewCostPrice] = useState<string>('');
  const [newRetailPrice, setNewRetailPrice] = useState<string>('');
  const [newWholesalePrice, setNewWholesalePrice] = useState<string>('');
  const [newStock, setNewStock] = useState<string>('5');
  const [newMinStock, setNewMinStock] = useState<string>('2');
  const [submitting, setSubmitting] = useState(false);

  const loadParts = async () => {
    setLoading(true);
    try {
      const allAccs = await window.tigerAPI.getAllAccessories();
      // Filter items that match repair part categories or have repair-related keywords
      const repairItems = allAccs.filter(a => 
        REPAIR_PART_CATEGORIES.includes(a.category) ||
        a.category.includes('صيانة') ||
        a.category.includes('شاشات') ||
        a.category.includes('بطاريات') ||
        a.category.includes('UI') ||
        a.name.includes('شاشة') ||
        a.name.includes('بطارية') ||
        a.name.includes('جدلة') ||
        a.name.includes('فلكس') ||
        a.name.includes('باك')
      );
      setParts(repairItems);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadParts();
    }
  }, [isOpen]);

  const handleCreatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      addToast('يرجى إدخال اسم قطعة الصيانة', 'warning');
      return;
    }
    const cost = parseFloat(newCostPrice) || 0;
    const retail = parseFloat(newRetailPrice) || 0;
    const wholesale = parseFloat(newWholesalePrice) || retail;
    const stock = parseInt(newStock, 10) || 0;
    const minStock = parseInt(newMinStock, 10) || 2;

    setSubmitting(true);
    try {
      await window.tigerAPI.addAccessory({
        name: newName.trim(),
        category: newCategory,
        costPrice: cost,
        retailPrice: retail,
        wholesalePrice: wholesale,
        currentStock: stock,
        minStockAlert: minStock,
        barcode: `REP-${Date.now().toString().slice(-6)}`,
        sku: `SKU-${Date.now().toString().slice(-4)}`
      });
      addToast(`تم إضافة قطعة الصيانة (${newName.trim()}) بنجاح!`, 'success');
      setNewName('');
      setNewCostPrice('');
      setNewRetailPrice('');
      setNewWholesalePrice('');
      setShowAddForm(false);
      await loadParts();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      addToast(err.message || 'فشل حفظ قطعة الصيانة', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStockDelta = async (id: string, delta: number) => {
    try {
      await window.tigerAPI.adjustAccessoryStock(id, delta, 'تعديل سريع من قسم قطع الصيانة', 'فني الصيانة');
      setParts(prev => prev.map(p => p.id === id ? { ...p, currentStock: Math.max(0, p.currentStock + delta) } : p));
      addToast(`تم تحديث رصيد القطعة (${delta > 0 ? '+' : ''}${delta})`, 'info');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      addToast(err.message || 'فشل تعديل المخزون', 'error');
    }
  };

  const filtered = parts.filter(p => {
    const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchSearch = !search.trim() || 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100 font-cairo">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-bold shadow-lg shadow-orange-500/30">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>مخزون وتسعير قطع الصيانة</span>
                <span className="text-xs bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-bold px-2 py-0.5 rounded-full font-mono">
                  {filtered.length} صنف
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                إدارة أسعار ومخزون: الشاشات (LCD)، البطاريات، جدلات الشحن (UI)، وباكات الآيفون
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-orange-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>{showAddForm ? 'إغلاق النموذج' : 'إضافة قطعة صيانة جديدة'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* New Spare Part Form (Collapsible) */}
        {showAddForm && (
          <form onSubmit={handleCreatePart} className="p-5 bg-orange-50/50 dark:bg-orange-950/20 border-b border-orange-200/60 dark:border-orange-900/40 space-y-4 animate-in slide-in-from-top-2 duration-150">
            <div className="text-xs font-black text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              <span>إدخال قطعة صيانة جديدة للمخزون والتسعير:</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Name */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">اسم القطعة والموديل (مثال: شاشة iPhone 13 Pro أصلية / بطارية سامسونج A52):</label>
                <input
                  type="text"
                  required
                  placeholder="اسم قطعة الصيانة..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">تصنيف القطعة:</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500"
                >
                  {REPAIR_PART_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Cost Price */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">سعر التكلفة (د.أ):</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.000"
                  value={newCostPrice}
                  onChange={(e) => setNewCostPrice(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 text-left"
                />
              </div>

              {/* Retail Price */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">سعر البيع للزبون (د.أ):</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="0.000"
                  value={newRetailPrice}
                  onChange={(e) => setNewRetailPrice(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-orange-600 dark:text-orange-400 focus:outline-none focus:border-orange-500 text-left"
                />
              </div>

              {/* Wholesale Price */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">سعر الجملة / محلات (د.أ):</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="0.000"
                  value={newWholesalePrice}
                  onChange={(e) => setNewWholesalePrice(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 text-left"
                />
              </div>

              {/* Stock Quantity */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">الكمية المتوفرة بالمحل:</label>
                <input
                  type="number"
                  min="0"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 text-left"
                />
              </div>

              {/* Min Stock Alert */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">تنبيه النواقص عند وصول رصيد:</label>
                <input
                  type="number"
                  min="1"
                  value={newMinStock}
                  onChange={(e) => setNewMinStock(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 text-left"
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
                >
                  <Check className="w-4 h-4" />
                  <span>{submitting ? 'جاري الحفظ...' : 'حفظ القطعة بالمخزون'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Filter Bar & Category Chips */}
        <div className="p-4 bg-slate-50/70 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-orange-400'
              }`}
            >
              الكل ({parts.length})
            </button>
            {REPAIR_PART_CATEGORIES.map(cat => {
              const count = parts.filter(p => p.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    selectedCategory === cat
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-orange-400'
                  }`}
                >
                  <span>{cat}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    selectedCategory === cat ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث باسم القطعة أو الباركود..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pr-9 pl-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* Spare Parts Table */}
        <div className="flex-1 overflow-y-auto p-4 select-text">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">جاري تحميل قائمة قطع الصيانة...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <Package className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
              <div className="text-xs font-bold">لا توجد قطع صيانة مسجلة ضمن هذا التصنيف</div>
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="text-xs text-orange-500 hover:underline font-bold"
              >
                + أضف أول قطعة صيانة الآن
              </button>
            </div>
          ) : (
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="p-3">اسم القطعة</th>
                  <th className="p-3">التصنيف</th>
                  <th className="p-3 text-center">سعر التكلفة</th>
                  <th className="p-3 text-center">سعر البيع (مفرق)</th>
                  <th className="p-3 text-center">سعر الجملة</th>
                  <th className="p-3 text-center">الرصيد المتوفر</th>
                  <th className="p-3 text-center">تعديل سريع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filtered.map(p => {
                  const isLow = p.currentStock <= p.minStockAlert;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{p.barcode || p.sku}</div>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {p.category}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-500 dark:text-slate-400">
                        {formatJOD(p.costPrice)}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-orange-600 dark:text-orange-400">
                        {formatJOD(p.retailPrice)}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                        {formatJOD(p.wholesalePrice || p.retailPrice)}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-1 font-mono font-black px-2.5 py-1 rounded-xl text-xs ${
                          isLow
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 ring-1 ring-red-400/30'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                        }`}>
                          {p.currentStock} قطعة
                          {isLow && <AlertTriangle className="w-3 h-3 shrink-0" />}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => handleStockDelta(p.id, -1)}
                            disabled={p.currentStock <= 0}
                            title="خصم قطعة (-1)"
                            className="w-6 h-6 flex items-center justify-center rounded text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 transition font-bold"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStockDelta(p.id, 1)}
                            title="إضافة قطعة (+1)"
                            className="w-6 h-6 flex items-center justify-center rounded text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition font-bold"
                          >
                            +
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>💡 أي قطعة صيانة تضيفها هنا تظهر تلقائياً في نافذة صيانة الأجهزة لتضمينها في تذاكر الصيانة للزبائن وفواتيرهم.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
