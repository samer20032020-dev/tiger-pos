import React, { useState, useEffect, useRef } from 'react';
import { 
  Cpu, Plus, Search, Printer, Edit2, 
  AlertTriangle, PlusCircle, MinusCircle, Trash2,
  FileSpreadsheet, Wrench, Layers, Battery, Smartphone, Cable, ArrowLeftRight
} from 'lucide-react';
import { Accessory } from '../../../shared/types';
import { REPAIR_PART_CATEGORIES, formatJOD, isRepairCategory } from '../../../shared/constants';
import { AccessoryModal } from '../accessories/AccessoryModal';
import { BarcodeStickerModal } from '../common/BarcodeStickerModal';
import { DamagedItemModal } from '../common/DamagedItemModal';
import { useAppStore } from '../../stores/useAppStore';

export const RepairPartsTab: React.FC = () => {
  const { addToast, currentUser } = useAppStore();
  const isAdmin = currentUser?.role === 'admin';

  const [parts, setParts] = useState<Accessory[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(false);
  const [criticalOnly, setCriticalOnly] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddOpen, setAddOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Accessory | null>(null);
  const [barcodePart, setBarcodePart] = useState<Accessory | null>(null);
  const [damagedPart, setDamagedPart] = useState<Accessory | null>(null);

  // Excel / CSV Import
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);

  const detectRepairCategory = (name: string, group: string): string => {
    const n = (name || '').toLowerCase();
    const g = (group || '').toLowerCase();

    if (n.includes('شاشة') || n.includes('شاشه') || n.includes('lcd') || n.includes('screen') || n.includes('oled') || n.includes('amoled') || g.includes('شاش')) {
      return 'شاشات الصيانة';
    }
    if (n.includes('بطارية') || n.includes('بطاريه') || n.includes('battery') || g.includes('بطار')) {
      return 'بطاريات الصيانة';
    }
    if (n.includes('باك') || n.includes('هاوسنج') || n.includes('ظهر') || n.includes('ظواهر') || n.includes('housing') || n.includes('back glass') || g.includes('باك')) {
      return 'باكات وظواهر';
    }
    if (n.includes('جدلة') || n.includes('فلكس') || n.includes('كونكتر') || n.includes('شحن') || n.includes('ui') || n.includes('charging flex') || n.includes('sub board')) {
      return 'جدلات وكونكترات شحن (UI)';
    }
    return 'قطع غيار ومواد صيانة';
  };

  const parseCSV = (text: string) => {
    const cleanText = text.replace(/^\uFEFF/, '');
    const lines = cleanText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          if (inQuotes && line[i + 1] === char) {
            current += char;
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const header = parseLine(lines[0]).map(h => h.trim().toLowerCase());
    const findIdx = (keywords: string[]) =>
      header.findIndex(h => keywords.some(k => h.includes(k.toLowerCase())));

    const nameIdx = findIdx(['اسم', 'name', 'item', 'صنف', 'مادة', 'قطعة', 'القطعة']);
    const costIdx = findIdx(['تكلفة', 'شراء', 'cost', 'جملة الشراء']);
    const retailIdx = findIdx(['مفرق', 'بيع', 'retail', 'price', 'سعر']);
    const wholesaleIdx = findIdx(['جملة', 'wholesale']);
    const stockIdx = findIdx(['كمية', 'رصيد', 'مخزون', 'stock', 'qty', 'الكمية']);
    const barcodeIdx = findIdx(['باركود', 'كود', 'barcode', 'code']);
    const groupIdx = findIdx(['مجموعة', 'تصنيف', 'category', 'group', 'قسم']);

    const items: Array<{
      name: string;
      category: string;
      costPrice: number;
      retailPrice: number;
      wholesalePrice: number;
      currentStock: number;
      minStockAlert: number;
      barcode?: string;
      sku?: string;
    }> = [];

    for (let i = 1; i < lines.length; i++) {
      const row = parseLine(lines[i]);
      if (row.length === 0) continue;
      const rawName = nameIdx >= 0 ? row[nameIdx] : row[0];
      if (!rawName || rawName.trim().length === 0) continue;

      const groupVal = groupIdx >= 0 ? row[groupIdx] : '';
      const category = detectRepairCategory(rawName, groupVal);

      const cost = costIdx >= 0 ? parseFloat(row[costIdx]?.replace(/[^0-9.]/g, '')) || 0 : 0;
      const retail = retailIdx >= 0 ? parseFloat(row[retailIdx]?.replace(/[^0-9.]/g, '')) || 0 : cost;
      const wholesale = wholesaleIdx >= 0 ? parseFloat(row[wholesaleIdx]?.replace(/[^0-9.]/g, '')) || retail : retail;
      const stock = stockIdx >= 0 ? parseInt(row[stockIdx]?.replace(/[^0-9-]/g, ''), 10) || 0 : 5;
      const rawBarcode = barcodeIdx >= 0 ? row[barcodeIdx]?.replace(/[^0-9a-zA-Z_-]/g, '') : '';

      items.push({
        name: rawName.trim(),
        category,
        costPrice: cost,
        retailPrice: retail,
        wholesalePrice: wholesale,
        currentStock: stock,
        minStockAlert: 2,
        barcode: rawBarcode && rawBarcode.length > 2 ? rawBarcode : `REP-${Date.now().toString().slice(-6)}${i}`,
        sku: `REP-${i.toString().padStart(4, '0')}`
      });
    }

    return items;
  };

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = parseCSV(content);

          if (parsed.length === 0) {
            addToast('الملف فارغ أو لا يحتوي على قطع صيانة صالحة', 'error');
            setImporting(false);
            return;
          }

          const res = await window.tigerAPI.importAccessoriesBatch(parsed);
          addToast(`تم استيراد ${res.importedCount} قطعة صيانة جديدة وتحديث ${res.updatedCount} قطعة بنجاح!`, 'success');
          await loadData();
        } catch (err: any) {
          addToast(err.message || 'فشل استيراد الملف', 'error');
        } finally {
          setImporting(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsText(file, 'utf-8');
    } catch (err: any) {
      addToast(err.message || 'فشل قراءة الملف', 'error');
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const allItems = await window.tigerAPI.getAllAccessories();
      // Filter items dedicated to repair parts
      const repairItems = allItems.filter(item => isRepairCategory(item.category, item.name));
      setParts(repairItems);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdjustStock = async (part: Accessory, delta: number) => {
    try {
      await window.tigerAPI.adjustAccessoryStock(
        part.id,
        delta,
        delta > 0 ? 'توريد يدوي لقطع الصيانة' : 'استهلاك أو كسر قطعة',
        currentUser?.fullName || 'المدير'
      );
      addToast(`تم تعديل مخزون ${part.name} بمقدار (${delta > 0 ? '+' : ''}${delta})`, 'success');
      loadData();
    } catch (err: any) {
      addToast(err.message || 'فشل تعديل المخزون', 'error');
    }
  };

  const handleDeletePart = async (part: Accessory) => {
    const confirmed = window.confirm(`هل أنت متأكد من حذف قطعة الصيانة "${part.name}" نهائياً من النظام؟`);
    if (!confirmed) return;

    try {
      await window.tigerAPI.deleteAccessory(part.id);
      addToast(`تم حذف قطعة الصيانة "${part.name}" بنجاح`, 'success');
      loadData();
    } catch (err: any) {
      addToast(err.message || 'فشل حذف قطعة الصيانة', 'error');
    }
  };

  const handleMoveToAccessories = async (part: Accessory) => {
    const confirmed = window.confirm(`هل تريد نقل "${part.name}" إلى قسم الإكسسوارات؟`);
    if (!confirmed) return;

    try {
      const n = (part.name || '').toLowerCase();
      const targetCategory =
        n.includes('عدس') || n.includes('حماية') || n.includes('سكرين')
          ? 'شاشات حماية (سكرينات)'
          : 'أخرى';
      await window.tigerAPI.updateAccessory(part.id, { category: targetCategory });
      addToast(`تم نقل "${part.name}" إلى قسم الإكسسوارات بنجاح`, 'success');
      loadData();
    } catch (err: any) {
      addToast(err.message || 'فشل نقل القطعة', 'error');
    }
  };

  const filtered = parts.filter(p => {
    const matchSearch = search === '' ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());

    let matchCategory = selectedCategory === 'all';
    if (!matchCategory) {
      if (selectedCategory === 'شاشات الصيانة') {
        matchCategory = p.category.includes('شاش') || p.category.includes('LCD') || p.category.includes('screen') || p.name.includes('شاشة');
      } else if (selectedCategory === 'بطاريات الصيانة') {
        matchCategory = p.category.includes('بطار') || p.category.includes('Battery') || p.name.includes('بطارية');
      } else if (selectedCategory === 'باكات وظواهر') {
        matchCategory = p.category.includes('باك') || p.category.includes('ظواهر') || p.category.includes('هاوسنج') || p.name.includes('باك') || p.name.includes('ظهر');
      } else if (selectedCategory === 'جدلات وكونكترات شحن (UI)') {
        matchCategory = p.category.includes('جدل') || p.category.includes('كونكتر') || p.category.includes('UI') || p.category.includes('شحن');
      } else {
        matchCategory = p.category === selectedCategory;
      }
    }

    const matchCritical = !criticalOnly || p.currentStock <= 2;
    const matchLowStock = !lowStockOnly || p.currentStock <= p.minStockAlert;

    return matchSearch && matchCategory && matchCritical && matchLowStock;
  });

  const criticalStockCount = parts.filter(p => p.currentStock <= 2).length;
  const lowStockCount = parts.filter(p => p.currentStock <= p.minStockAlert).length;

  const repairTotals = filtered.reduce(
    (accTotals, item) => {
      const qty = Math.max(0, Number(item.currentStock || 0));
      const cost = Number(item.costPrice || 0);
      const retail = Number(item.retailPrice || 0);
      const wholesale = Number(item.wholesalePrice || item.retailPrice || 0);
      accTotals.totalQty += qty;
      accTotals.totalCostValue += cost * qty;
      accTotals.totalRetailValue += retail * qty;
      accTotals.totalWholesaleValue += wholesale * qty;
      return accTotals;
    },
    { totalQty: 0, totalCostValue: 0, totalRetailValue: 0, totalWholesaleValue: 0 }
  );
  const expectedRepairProfit = repairTotals.totalRetailValue - repairTotals.totalCostValue;

  return (
    <div className="p-6 space-y-4 pb-28">
      {/* Top Header */}
      <div className="flex items-center justify-between select-none">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-orange-500" />
            <span>مخزون وقطع الصيانة (Hardware & Spare Parts)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            إدارة متخصصة ومستقلة لشاشات الصيانة، البطاريات، باكات وظواهر الأجهزة، وجدلات الشحن مع أسعار التكلفة، المفرق، والجملة
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv, .txt"
            onChange={handleFileChosen}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition cursor-pointer"
            title="استيراد قطع الصيانة من ملف إكسل أو CSV بضغطة زر واحدة"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {importing ? 'جاري الاستيراد...' : 'استيراد من إكسل / CSV'}
          </button>

          <button
            onClick={() => {
              setEditingPart(null);
              setAddOpen(true);
            }}
            className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            إضافة قطعة صيانة جديدة
          </button>
        </div>
      </div>

      {/* Filters & Category Pills Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm select-none">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="بحث باسم القطعة، الموديل، الباركود، أو SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pr-10 pl-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Tabs */}
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              selectedCategory === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            الكل ({parts.length})
          </button>

          {REPAIR_PART_CATEGORIES.map(cat => {
            const count = parts.filter(p => {
              if (cat === 'شاشات الصيانة') return p.category.includes('شاش') || p.name.includes('شاشة');
              if (cat === 'بطاريات الصيانة') return p.category.includes('بطار') || p.name.includes('بطارية');
              if (cat === 'باكات وظواهر') return p.category.includes('باك') || p.category.includes('ظواهر') || p.category.includes('هاوسنج');
              if (cat === 'جدلات وكونكترات شحن (UI)') return p.category.includes('جدل') || p.category.includes('UI') || p.category.includes('شحن');
              return p.category === cat;
            }).length;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  selectedCategory === cat ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}

          {/* Critical Stock Filter Button */}
          <button
            onClick={() => {
              const next = !criticalOnly;
              setCriticalOnly(next);
              if (next) setLowStockOnly(false);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              criticalOnly
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/40 ring-2 ring-red-400'
                : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100'
            }`}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
            </span>
            <span>🚨 نواقص حرجة ({criticalStockCount})</span>
          </button>

          {/* Low Stock Toggle Button */}
          <button
            onClick={() => {
              const next = !lowStockOnly;
              setLowStockOnly(next);
              if (next) setCriticalOnly(false);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
              lowStockOnly
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${lowStockOnly ? 'text-white' : 'text-amber-500'}`} />
            <span>تنبيهات الحد الأدنى ({lowStockCount})</span>
          </button>
        </div>
      </div>

      {/* Repair Parts Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold select-none">
              <tr>
                <th className="p-3.5">اسم قطعة الصيانة</th>
                <th className="p-3.5">التصنيف</th>
                <th className="p-3.5">الباركود / SKU</th>
                {isAdmin && <th className="p-3.5">سعر التكلفة</th>}
                <th className="p-3.5">سعر المفرق</th>
                <th className="p-3.5">سعر الجملة</th>
                <th className="p-3.5 text-center">المخزون الحالي</th>
                <th className="p-3.5 text-center">تعديل سريع</th>
                <th className="p-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="text-center py-10 text-slate-400">
                    جاري تحميل قطع الصيانة...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="text-center py-12 text-slate-400 space-y-2">
                    <Cpu className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
                    <div className="font-bold">لا توجد قطع صيانة مسجلة مطابقة للبحث</div>
                    <button
                      onClick={() => {
                        setEditingPart(null);
                        setAddOpen(true);
                      }}
                      className="text-orange-500 hover:underline font-bold text-xs"
                    >
                      + أضف أول قطعة صيانة الآن
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map((part) => {
                  const isCritical = part.currentStock <= 2;
                  const isLow = part.currentStock <= part.minStockAlert;
                  return (
                    <tr 
                      key={part.id} 
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${
                        isCritical
                          ? 'bg-red-50/80 dark:bg-red-950/40 border-r-4 border-r-red-500'
                          : isLow
                          ? 'bg-amber-50/50 dark:bg-amber-950/20'
                          : ''
                      }`}
                    >
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                          {isCritical && (
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                            </span>
                          )}
                          <span>{part.name}</span>
                          {isCritical ? (
                            <span className="text-[10px] bg-red-600 text-white font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                              {part.currentStock <= 0 ? 'نفد (0)!' : 'حرج: قطعتان أو أقل!'}
                            </span>
                          ) : isLow ? (
                            <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 font-bold px-1.5 py-0.2 rounded">
                              تحت الحد
                            </span>
                          ) : null}
                        </div>
                        {part.description && (
                          <div className="text-[10px] text-slate-400 line-clamp-1">{part.description}</div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {part.category}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">
                        <div>{part.barcode}</div>
                        <div className="text-[10px] text-slate-400">{part.sku}</div>
                      </td>
                      {isAdmin && (
                        <td className="p-3.5 font-mono text-slate-500 font-bold">
                          {formatJOD(part.costPrice)}
                        </td>
                      )}
                      <td className="p-3.5 font-mono font-black text-orange-600 dark:text-orange-400 text-sm">
                        {formatJOD(part.retailPrice)}
                      </td>
                      <td className="p-3.5 font-mono text-amber-600 font-bold">
                        {formatJOD(part.wholesalePrice || part.retailPrice)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`inline-block font-mono font-bold px-2 py-0.5 rounded-full text-xs ${
                          part.currentStock <= 0
                            ? 'bg-red-600 text-white'
                            : isLow
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                        }`}>
                          {part.currentStock} قطعة
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        {isAdmin ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleAdjustStock(part, 1)}
                              title="إضافة قطعة للمخزون (+1)"
                              className="p-1 rounded text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition"
                            >
                              <PlusCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleAdjustStock(part, -1)}
                              disabled={part.currentStock <= 0}
                              title="خصم قطعة من المخزون (-1)"
                              className="p-1 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-950/60 transition disabled:opacity-30"
                            >
                              <MinusCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 font-mono text-xs select-none" title="تعديل المخزون مخصص للمدير فقط">-</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setBarcodePart(part)}
                            title="طباعة استيكر الباركود 50x25mm"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingPart(part);
                                  setAddOpen(true);
                                }}
                                title="تعديل قطعة الصيانة"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleMoveToAccessories(part)}
                                title="نقل إلى قسم الإكسسوارات"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-purple-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              >
                                <ArrowLeftRight className="w-4 h-4" />
                              </button>
                              {part.currentStock > 0 && (
                                <button
                                  onClick={() => setDamagedPart(part)}
                                  title="تسجيل قطعة تالفة أو شطب أو مرتجع"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeletePart(part)}
                                title="حذف قطعة الصيانة نهائياً"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {isAdmin && filtered.length > 0 && (
              <tfoot className="bg-slate-900 text-white border-t-2 border-orange-500 font-bold select-text">
                <tr>
                  <td colSpan={3} className="p-4 text-xs font-black text-orange-400">
                    📊 إجمالي مخزون قطع الصيانة ({filtered.length} صنف):
                  </td>
                  <td className="p-4 font-mono">
                    <div className="text-[10px] text-slate-400 font-sans">إجمالي التكلفة:</div>
                    <div className="text-sm font-black text-slate-100">{formatJOD(repairTotals.totalCostValue)}</div>
                  </td>
                  <td className="p-4 font-mono">
                    <div className="text-[10px] text-orange-300 font-sans">إجمالي المبيع (مفرق):</div>
                    <div className="text-sm font-black text-orange-400">{formatJOD(repairTotals.totalRetailValue)}</div>
                  </td>
                  <td className="p-4 font-mono">
                    <div className="text-[10px] text-amber-300 font-sans">إجمالي الجملة:</div>
                    <div className="text-sm font-black text-amber-400">{formatJOD(repairTotals.totalWholesaleValue)}</div>
                  </td>
                  <td className="p-4 text-center font-mono">
                    <div className="text-[10px] text-slate-400 font-sans">إجمالي القطع:</div>
                    <div className="text-sm font-black text-white">{repairTotals.totalQty} قطعة</div>
                  </td>
                  <td colSpan={2} className="p-4 text-center font-mono">
                    <div className="text-[10px] text-emerald-300 font-sans">صافي الربح المتوقع:</div>
                    <div className="text-sm font-black text-emerald-400">+{formatJOD(expectedRepairProfit)}</div>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modals */}
      {isAddOpen && (
        <AccessoryModal
          key={editingPart ? editingPart.id : 'new-repair-part'}
          isOpen={isAddOpen}
          editingAccessory={editingPart}
          allowedCategories={REPAIR_PART_CATEGORIES}
          modalTitle={editingPart ? 'تعديل قطعة صيانة' : 'إضافة قطعة صيانة جديدة'}
          onClose={() => {
            setAddOpen(false);
            setEditingPart(null);
          }}
          onSuccess={loadData}
        />
      )}

      {barcodePart && (
        <BarcodeStickerModal
          isOpen={true}
          onClose={() => setBarcodePart(null)}
          title={barcodePart.name}
          code={barcodePart.barcode}
          price={barcodePart.retailPrice}
          subtitle={barcodePart.category}
          availableStock={barcodePart.currentStock}
        />
      )}

      {damagedPart && (
        <DamagedItemModal
          isOpen={true}
          onClose={() => setDamagedPart(null)}
          onSuccess={loadData}
          itemType="accessory"
          itemId={damagedPart.id}
          name={damagedPart.name}
          barcodeOrImei={damagedPart.barcode}
          costPrice={damagedPart.costPrice}
          availableQuantity={damagedPart.currentStock}
        />
      )}
    </div>
  );
};
