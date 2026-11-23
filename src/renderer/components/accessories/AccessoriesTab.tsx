import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, Plus, Search, Printer, Edit2, 
  AlertTriangle, Filter, PlusCircle, MinusCircle, Trash2,
  FileSpreadsheet
} from 'lucide-react';
import { Accessory } from '../../../shared/types';
import { ACCESSORY_CATEGORIES, formatJOD } from '../../../shared/constants';
import { AccessoryModal } from './AccessoryModal';
import { BarcodeStickerModal } from '../common/BarcodeStickerModal';
import { DamagedItemModal } from '../common/DamagedItemModal';
import { useAppStore } from '../../stores/useAppStore';

export const AccessoriesTab: React.FC = () => {
  const { addToast, criticalShortageFilter, setCriticalShortageFilter } = useAppStore();
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(false);
  const [criticalOnly, setCriticalOnly] = useState<boolean>(criticalShortageFilter);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (criticalShortageFilter) {
      setCriticalOnly(true);
      setLowStockOnly(false);
    }
  }, [criticalShortageFilter]);

  // Modals
  const [isAddOpen, setAddOpen] = useState(false);
  const [editingAcc, setEditingAcc] = useState<Accessory | null>(null);
  const [barcodeAcc, setBarcodeAcc] = useState<Accessory | null>(null);
  const [damagedAcc, setDamagedAcc] = useState<Accessory | null>(null);

  // Excel / CSV Import
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);

  const detectCategory = (name: string, group: string): string => {
    const n = (name || '').toLowerCase();
    const g = (group || '').toLowerCase();
    if (n.includes('كيبل') || n.includes('سلك') || n.includes('شاحن') || n.includes('عظمة') || n.includes('راس شاحن') || n.includes('cable') || n.includes('charger')) {
      return 'شواحن وكوابل';
    }
    if (n.includes('سماعة') || n.includes('سبيكر') || n.includes('مايك') || n.includes('ايربودز') || n.includes('بودز') || n.includes('headphone') || n.includes('earphone') || n.includes('speaker') || n.includes('mic')) {
      return 'سماعات وإيربودز';
    }
    if (n.includes('بور بانك') || n.includes('بنك طاقة') || n.includes('بطارية') || n.includes('power bank') || n.includes('battery')) {
      return 'بطاريات وبنك طاقة';
    }
    if (n.includes('كفر') || n.includes('حافظة') || n.includes('جراب') || n.includes('case') || n.includes('cover')) {
      return 'كفرات وحافظات';
    }
    if (n.includes('سكرين') || n.includes('حماية') || n.includes('عدسات') || n.includes('عدسة') || n.includes('لاصقة') || n.includes('screen') || n.includes('lens') || n.includes('glass')) {
      return 'شاشات حماية (سكرينات)';
    }
    if (n.includes('هولدر') || n.includes('سيارة') || n.includes('حامل') || n.includes('car') || n.includes('holder') || n.includes('ستاند')) {
      return 'حوامل وسكسوارات سيارة';
    }
    if (n.includes('تحويلة') || n.includes('محول') || n.includes('هب') || n.includes('adapter') || n.includes('hub') || n.includes('otg') || n.includes('وصلة')) {
      return 'محولات وتوصيلات';
    }
    if (g.includes('صيان') || n.includes('شاشة صيانة') || n.includes('فلاتة') || n.includes('اي سي') || n.includes('لحام') || n.includes('بورد')) {
      return 'قطع غيار وشاشات صيانة';
    }
    return 'أخرى';
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

    const nameIdx = header.findIndex(h => h === 'name' || h.includes('اسم') || h === 'product' || h === 'item');
    const groupIdx = header.findIndex(h => h === 'productgroup' || h === 'group' || h === 'category' || h.includes('مجموع') || h.includes('تصنيف'));
    const skuIdx = header.findIndex(h => h === 'sku' || h.includes('كود') || h.includes('رمز'));
    const barcodeIdx = header.findIndex(h => h === 'barcode' || h.includes('باركود') || h === 'upc' || h === 'ean');
    const costIdx = header.findIndex(h => h === 'cost' || h.includes('تكلف') || h.includes('شراء'));
    const priceIdx = header.findIndex(h => h === 'price' || h.includes('بيع') || h.includes('سعر') || h === 'retail_price');
    const qtyIdx = header.findIndex(h => h === 'quantity' || h === 'qty' || h.includes('كمي') || h.includes('رصيد') || h.includes('مخزون'));
    const warnQtyIdx = header.findIndex(h => h === 'warningquantity' || h === 'reorderpoint' || h.includes('تنبيه') || h.includes('ادنى'));
    const descIdx = header.findIndex(h => h === 'description' || h.includes('وصف') || h.includes('ملاحظ'));

    if (nameIdx === -1) {
      throw new Error('لم يتم العثور على عمود اسم الصنف (Name) في الملف');
    }

    const items = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = parseLine(lines[i]);
      if (!cols[nameIdx] || cols[nameIdx].trim() === '') continue;

      const rawName = cols[nameIdx].trim();
      const rawGroup = groupIdx !== -1 ? cols[groupIdx] || '' : '';
      const category = detectCategory(rawName, rawGroup);

      items.push({
        name: rawName,
        category,
        sku: skuIdx !== -1 ? cols[skuIdx]?.trim() || '' : '',
        barcode: barcodeIdx !== -1 ? cols[barcodeIdx]?.trim() || '' : '',
        costPrice: costIdx !== -1 ? parseFloat(cols[costIdx]?.replace(/[^0-9.]/g, '')) || 0 : 0,
        retailPrice: priceIdx !== -1 ? parseFloat(cols[priceIdx]?.replace(/[^0-9.]/g, '')) || 0 : 0,
        wholesalePrice: priceIdx !== -1 ? parseFloat(cols[priceIdx]?.replace(/[^0-9.]/g, '')) || 0 : 0,
        currentStock: qtyIdx !== -1 ? parseInt(cols[qtyIdx]?.replace(/[^0-9-]/g, ''), 10) || 0 : 0,
        minStockAlert: warnQtyIdx !== -1 ? parseInt(cols[warnQtyIdx]?.replace(/[^0-9]/g, ''), 10) || 3 : 3,
        description: descIdx !== -1 ? cols[descIdx]?.trim() || '' : ''
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
            addToast('الملف فارغ أو لا يحتوي على أصناف صالحة', 'error');
            setImporting(false);
            return;
          }

          const res = await window.tigerAPI.importAccessoriesBatch(parsed);
          addToast(`تم استيراد ${res.importedCount} صنف جديد وتحديث ${res.updatedCount} صنف بنجاح!`, 'success');
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
      const data = await window.tigerAPI.getAllAccessories();
      setAccessories(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdjustStock = async (acc: Accessory, delta: number) => {
    try {
      await window.tigerAPI.adjustAccessoryStock(
        acc.id,
        delta,
        delta > 0 ? 'توريد يدوي سريع' : 'تسوية عجز/تلف',
        'المدير'
      );
      addToast(`تم تعديل مخزون ${acc.name} بمقدار (${delta > 0 ? '+' : ''}${delta})`, 'success');
      loadData();
    } catch (err: any) {
      addToast(err.message || 'فشل تعديل المخزون', 'error');
    }
  };

  const filtered = accessories.filter(a => {
    const matchSearch = search === '' ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.barcode.includes(search) ||
      a.sku.toLowerCase().includes(search.toLowerCase());

    const matchCategory = selectedCategory === 'all' || a.category === selectedCategory;
    const matchCritical = !criticalOnly || a.currentStock <= 2;
    const matchLowStock = !lowStockOnly || a.currentStock <= a.minStockAlert;

    return matchSearch && matchCategory && matchCritical && matchLowStock;
  });

  const criticalStockCount = accessories.filter(a => a.currentStock <= 2).length;
  const lowStockCount = accessories.filter(a => a.currentStock <= a.minStockAlert).length;

  return (
    <div className="p-6 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between select-none">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-orange-500" />
            مخزون الإكسسوارات وقطع الغيار
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            إدارة الشواحن، الكفرات، السكرينات، وقطع الصيانة مع توليد استيكرات الباركود والتنبيه عند انخفاض المخزون
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
            title="استيراد أصناف من ملف إكسل أو CSV بضغطة زر واحدة"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {importing ? 'جاري الاستيراد...' : 'استيراد من إكسل / CSV'}
          </button>

          <button
            onClick={() => {
              setEditingAcc(null);
              setAddOpen(true);
            }}
            className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-600/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            إضافة صنف / قطعة جديدة
          </button>
        </div>
      </div>

      {/* Filters & Alerts Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm select-none">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="بحث بالاسم، الباركود، أو SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pr-10 pl-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium"
          >
            <option value="all">جميع التصنيفات ({accessories.length})</option>
            {ACCESSORY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Critical Shortage <= 2 Beacon Filter Button */}
          <button
            onClick={() => {
              const next = !criticalOnly;
              setCriticalOnly(next);
              setCriticalShortageFilter(next);
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
            <span>🚨 نواقص حرجة (2 أو أقل) ({criticalStockCount})</span>
          </button>

          {/* Low Stock Toggle Button */}
          <button
            onClick={() => {
              const next = !lowStockOnly;
              setLowStockOnly(next);
              if (next) {
                setCriticalOnly(false);
                setCriticalShortageFilter(false);
              }
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

      {/* Accessories Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold select-none">
              <tr>
                <th className="p-3.5">اسم الصنف</th>
                <th className="p-3.5">التصنيف</th>
                <th className="p-3.5">الباركود الدولي / SKU</th>
                <th className="p-3.5">سعر التكلفة</th>
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
                  <td colSpan={9} className="text-center py-10 text-slate-400">
                    جاري تحميل الأصناف...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400">
                    لا توجد أصناف مطابقة للبحث
                  </td>
                </tr>
              ) : (
                filtered.map((acc) => {
                  const isCritical = acc.currentStock <= 2;
                  const isLow = acc.currentStock <= acc.minStockAlert;
                  return (
                    <tr 
                      key={acc.id} 
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
                          <span>{acc.name}</span>
                          {isCritical ? (
                            <span className="text-[10px] bg-red-600 text-white font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                              {acc.currentStock <= 0 ? 'نفد (0)!' : 'حرج: قطعتان أو أقل!'}
                            </span>
                          ) : isLow ? (
                            <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 font-bold px-1.5 py-0.2 rounded">
                              تحت الحد
                            </span>
                          ) : null}
                        </div>
                        {acc.description && (
                          <div className="text-[10px] text-slate-400 line-clamp-1">{acc.description}</div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="text-slate-600 dark:text-slate-300 font-medium">{acc.category}</span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">
                        <div>{acc.barcode}</div>
                        <div className="text-[10px] text-slate-400">{acc.sku}</div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-500">
                        {formatJOD(acc.costPrice)}
                      </td>
                      <td className="p-3.5 font-mono font-black text-orange-600 dark:text-orange-400 text-sm">
                        {formatJOD(acc.retailPrice)}
                      </td>
                      <td className="p-3.5 font-mono text-amber-600 font-bold">
                        {formatJOD(acc.wholesalePrice || acc.retailPrice)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`inline-block font-mono font-bold px-2 py-0.5 rounded-full text-xs ${
                          acc.currentStock <= 0
                            ? 'bg-red-600 text-white'
                            : isLow
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                        }`}>
                          {acc.currentStock} قطعة
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleAdjustStock(acc, 1)}
                            title="إضافة قطعة للمخزون (+1)"
                            className="p-1 rounded text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleAdjustStock(acc, -1)}
                            disabled={acc.currentStock <= 0}
                            title="خصم قطعة من المخزون (-1)"
                            className="p-1 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-950/60 transition disabled:opacity-30"
                          >
                            <MinusCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setBarcodeAcc(acc)}
                            title="طباعة استيكر الباركود 50x25mm"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingAcc(acc);
                              setAddOpen(true);
                            }}
                            title="تعديل الصنف"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {acc.currentStock > 0 && (
                            <button
                              onClick={() => setDamagedAcc(acc)}
                              title="تسجيل صنف تالف / شطب أو مرتجع للمورد"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {isAddOpen && (
        <AccessoryModal
          key={editingAcc ? editingAcc.id : 'new-accessory'}
          isOpen={isAddOpen}
          editingAccessory={editingAcc}
          onClose={() => {
            setAddOpen(false);
            setEditingAcc(null);
          }}
          onSuccess={loadData}
        />
      )}

      {barcodeAcc && (
        <BarcodeStickerModal
          isOpen={true}
          onClose={() => setBarcodeAcc(null)}
          title={barcodeAcc.name}
          code={barcodeAcc.barcode}
          price={barcodeAcc.retailPrice}
        />
      )}

      {damagedAcc && (
        <DamagedItemModal
          isOpen={true}
          onClose={() => setDamagedAcc(null)}
          onSuccess={loadData}
          itemType="accessory"
          itemId={damagedAcc.id}
          name={damagedAcc.name}
          barcodeOrImei={damagedAcc.barcode}
          costPrice={damagedAcc.costPrice}
          availableQuantity={damagedAcc.currentStock}
        />
      )}
    </div>
  );
};
