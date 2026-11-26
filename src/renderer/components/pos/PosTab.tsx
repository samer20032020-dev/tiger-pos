import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Barcode, Smartphone, Package, Battery, 
  RotateCcw, Briefcase, ShieldCheck, Tag 
} from 'lucide-react';
import { Phone, Accessory, Invoice } from '../../../shared/types';
import { ACCESSORY_CATEGORIES, formatJOD, isUnlimitedCategory } from '../../../shared/constants';
import { useCartStore } from '../../stores/useCartStore';
import { useAppStore } from '../../stores/useAppStore';
import { PosCart } from './PosCart';
import { TradeInModal } from './TradeInModal';
import { SplitPaymentModal } from './SplitPaymentModal';
import { ReturnsModal } from './ReturnsModal';
import { ThermalReceiptModal } from '../common/ThermalReceiptModal';

export const PosTab: React.FC = () => {
  const { items, addAccessoryItem, addPhoneItem, wholesaleMode, toggleWholesaleMode } = useCartStore();
  const { addToast } = useAppStore();

  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [phones, setPhones] = useState<Phone[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isTradeInOpen, setTradeInOpen] = useState(false);
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);
  const [isReturnsOpen, setReturnsOpen] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<Invoice | null>(null);
  const [isReceiptOpen, setReceiptOpen] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accList, phoneList] = await Promise.all([
        window.tigerAPI.getAllAccessories(),
        window.tigerAPI.getAllPhones('in_stock')
      ]);
      setAccessories(accList);
      setPhones(phoneList);
    } catch (err) {
      console.error('Failed to load POS catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Keyboard wedge barcode scanner listener
  const handleBarcodeScan = async (code: string) => {
    if (!code) return;
    const cleanCode = code.trim();

    // 1. Check if barcode matches accessory
    const matchedAcc = accessories.find(a => a.barcode === cleanCode || a.sku === cleanCode);
    if (matchedAcc) {
      try {
        addAccessoryItem(matchedAcc);
        addToast(`تمت إضافة: ${matchedAcc.name}`, 'success');
        setSearch('');
        return;
      } catch (err: any) {
        addToast(err.message, 'warning');
        return;
      }
    }

    // 2. Check if barcode matches Phone IMEI
    const matchedPhone = phones.find(p => p.imei1 === cleanCode || p.imei2 === cleanCode);
    if (matchedPhone) {
      try {
        addPhoneItem(matchedPhone);
        addToast(`تمت إضافة الهاتف: ${matchedPhone.brand} ${matchedPhone.model} (IMEI: ${matchedPhone.imei1})`, 'success');
        setSearch('');
        return;
      } catch (err: any) {
        addToast(err.message, 'warning');
        return;
      }
    }

    addToast(`لم يتم العثور على صنف أو هاتف بالباركود/IMEI: ${cleanCode}`, 'warning');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBarcodeScan(search);
    }
    if (e.key === 'F12') {
      e.preventDefault();
      if (items.some(it => it.unitPrice <= 0)) {
        addToast('يرجى إدخال سعر البيع للبنود ذات السعر المفتوح أولاً!', 'warning');
        return;
      }
      setCheckoutOpen(true);
    }
    if (e.key === 'F4') {
      e.preventDefault();
      setTradeInOpen(true);
    }
  };

  // Filtered items
  const filteredPhones = phones.filter(p => {
    const matchCat = selectedCategory === 'all' || selectedCategory === 'phones';
    const matchSearch = search === '' || 
      p.model.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase()) ||
      p.imei1.includes(search);
    return matchCat && matchSearch;
  });

  const filteredAccessories = accessories.filter(a => {
    const matchCat = selectedCategory === 'all' || a.category === selectedCategory;
    const matchSearch = search === '' || 
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.barcode.includes(search) ||
      a.sku.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Center: Catalog & Fast Scanning */}
      <div className="flex-1 flex flex-col p-5 overflow-hidden">
        {/* Top Controls: Barcode Search & Mode & Returns button */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Barcode className="w-5 h-5 absolute right-3.5 top-3 text-orange-500" />
            <input
              ref={barcodeInputRef}
              id="pos-barcode-search"
              type="text"
              placeholder="امسح بالباركود فوراً (F9)، أو ابحث بالموديل أو IMEI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-white dark:bg-slate-900 border-2 border-orange-500/30 focus:border-orange-500 rounded-2xl pr-11 pl-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white shadow-sm focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition"
              autoFocus
            />
          </div>

          {/* Wholesale Mode quick indicator button */}
          <button
            onClick={toggleWholesaleMode}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm border ${
              wholesaleMode
                ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/30'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            {wholesaleMode ? 'سعر الجملة مفعل' : 'تبديل للجملة'}
          </button>

          <button
            onClick={() => setReturnsOpen(true)}
            className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm"
          >
            <RotateCcw className="w-4 h-4 text-red-500" />
            مرتجع فاتورة
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none select-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedCategory === 'all'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            الكل ({phones.length + accessories.length})
          </button>

          <button
            onClick={() => setSelectedCategory('phones')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition ${
              selectedCategory === 'phones'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            الهواتف الذكية ({phones.length})
          </button>

          {ACCESSORY_CATEGORIES.map((cat) => {
            const count = accessories.filter(a => a.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Catalog Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
              جاري تحميل قائمة المنتجات...
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {/* 1. Phones Cards */}
              {filteredPhones.map((phone) => {
                const effectivePrice = wholesaleMode && phone.wholesalePrice ? phone.wholesalePrice : phone.sellingPrice;
                return (
                  <div
                    key={phone.id}
                    onClick={() => {
                      try {
                        addPhoneItem(phone);
                        addToast(`تمت إضافة: ${phone.brand} ${phone.model}`, 'success');
                      } catch (e: any) {
                        addToast(e.message, 'warning');
                      }
                    }}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-orange-500 dark:hover:border-orange-500 rounded-2xl p-3.5 shadow-sm hover:shadow-md cursor-pointer transition flex flex-col justify-between group relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
                        {phone.condition === 'new' ? 'جديد كرتونة' : phone.condition === 'used' ? 'مستعمل فحص' : 'مجدد'}
                      </span>
                      {phone.batteryHealth && (
                        <span className="text-[10px] font-mono font-bold flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <Battery className="w-3 h-3" />
                          {phone.batteryHealth}%
                        </span>
                      )}
                    </div>

                    <div className="my-2">
                      <div className="text-[11px] text-slate-400 font-medium">{phone.brand}</div>
                      <div className="text-sm font-black text-slate-900 dark:text-white line-clamp-1 group-hover:text-orange-500 transition">
                        {phone.model}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {phone.storage} | {phone.color}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-1">
                        IMEI: {phone.imei1.substring(0, 8)}...
                      </div>
                      {phone.warrantyPeriod && (
                        <div className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-semibold truncate">
                          <ShieldCheck className="w-3 h-3 shrink-0" />
                          {phone.warrantyPeriod}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-black font-mono text-orange-600 dark:text-orange-400">
                          {formatJOD(effectivePrice)}
                        </div>
                        {wholesaleMode && phone.wholesalePrice && (
                          <span className="text-[9px] text-amber-600 font-bold">سعر الجملة</span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-orange-500 flex items-center gap-0.5">
                        + إضافة
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* 2. Accessories Cards */}
              {filteredAccessories.map((acc) => {
                const effectivePrice = wholesaleMode && acc.wholesalePrice ? acc.wholesalePrice : acc.retailPrice;
                const isUnlimited = Boolean(acc.isUnlimitedStock || isUnlimitedCategory(acc.category, acc.name));
                return (
                  <div
                    key={acc.id}
                    onClick={() => {
                      try {
                        addAccessoryItem(acc);
                        addToast(`تمت إضافة: ${acc.name}`, 'success');
                      } catch (e: any) {
                        addToast(e.message, 'warning');
                      }
                    }}
                    className={`bg-white dark:bg-slate-900 border rounded-2xl p-3.5 shadow-sm hover:shadow-md cursor-pointer transition flex flex-col justify-between group ${
                      !isUnlimited && acc.currentStock <= 0 
                        ? 'opacity-40 border-slate-200 pointer-events-none'
                        : 'border-slate-200 dark:border-slate-800 hover:border-orange-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[100px]">
                        {acc.category}
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isUnlimited
                          ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                          : acc.currentStock <= acc.minStockAlert
                          ? 'bg-red-100 dark:bg-red-950/60 text-red-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}>
                        {isUnlimited ? '∞ مفتوح' : `المخزون: ${acc.currentStock}`}
                      </span>
                    </div>

                    <div className="my-2">
                      <div className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-orange-500 transition">
                        {acc.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-1">
                        {acc.barcode}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-black font-mono text-orange-600 dark:text-orange-400">
                          {isUnlimited && effectivePrice === 0 ? 'سعر حر (يدوي)' : formatJOD(effectivePrice)}
                        </div>
                        {wholesaleMode && acc.wholesalePrice > 0 && (
                          <span className="text-[9px] text-amber-600 font-bold">سعر الجملة</span>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 group-hover:text-orange-500 flex items-center gap-0.5">
                        + إضافة
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Left Side: POS Cart Panel */}
      <PosCart
        onOpenTradeIn={() => setTradeInOpen(true)}
        onOpenCheckout={() => setCheckoutOpen(true)}
      />

      {/* Modals */}
      <TradeInModal
        isOpen={isTradeInOpen}
        onClose={() => setTradeInOpen(false)}
      />

      <SplitPaymentModal
        isOpen={isCheckoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onConfirmSuccess={(invoice) => {
          setLastInvoice(invoice);
          setReceiptOpen(true);
          loadData(); // reload catalog stock
        }}
      />

      <ReturnsModal
        isOpen={isReturnsOpen}
        onClose={() => setReturnsOpen(false)}
        onSuccess={() => {
          loadData();
        }}
      />

      {lastInvoice && (
        <ThermalReceiptModal
          invoice={lastInvoice}
          isOpen={isReceiptOpen}
          onClose={() => setReceiptOpen(false)}
        />
      )}
    </div>
  );
};
