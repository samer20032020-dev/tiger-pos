import React from 'react';
import { 
  Trash2, Plus, Minus, Smartphone, Package, 
  User, Tag, RefreshCw, CreditCard, ShoppingBag, 
  Percent, DollarSign, ShieldCheck, Briefcase 
} from 'lucide-react';
import { useCartStore } from '../../stores/useCartStore';
import { formatJOD } from '../../../shared/constants';

interface PosCartProps {
  onOpenTradeIn: () => void;
  onOpenCheckout: () => void;
}

export const PosCart: React.FC<PosCartProps> = ({
  onOpenTradeIn,
  onOpenCheckout
}) => {
  const { 
    items, updateQuantity, removeItem, clearCart, 
    customerName, customerPhone, setCustomerInfo,
    discount, setDiscount, discountType, setDiscountType,
    taxEnabled, setTaxEnabled, taxRate, setTaxRate,
    wholesaleMode, toggleWholesaleMode,
    tradeIn, getSubtotal, getNetTotal, getTradeInValue,
    getDiscountAmount, getTaxAmount
  } = useCartStore();

  const subtotal = getSubtotal();
  const tradeInVal = getTradeInValue();
  const discountAmt = getDiscountAmount();
  const taxAmt = getTaxAmount();
  const netTotal = getNetTotal();

  return (
    <div className="w-96 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between select-none shadow-lg h-full">
      {/* Cart Header & Mode Toggle */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-orange-500" />
            <h2 className="font-bold text-slate-800 dark:text-white text-sm">سلة المشتريات</h2>
            <span className="text-xs bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 font-bold px-2 py-0.5 rounded-full font-mono">
              {items.reduce((s, it) => s + it.quantity, 0)}
            </span>
          </div>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              تفريغ
            </button>
          )}
        </div>

        {/* Wholesale Mode Toggle */}
        <button
          onClick={toggleWholesaleMode}
          className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition border ${
            wholesaleMode
              ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          {wholesaleMode ? '✓ تفعيل سعر الجملة (Wholesale)' : 'تبديل إلى سعر الجملة'}
        </button>
      </div>

      {/* Customer Quick Selector */}
      <div className="p-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-1.5">
          <User className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">بيانات العميل:</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="اسم العميل (نقدي)"
            value={customerName}
            onChange={(e) => setCustomerInfo(e.target.value, customerPhone)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white"
          />
          <input
            type="text"
            placeholder="رقم الهاتف"
            value={customerPhone}
            onChange={(e) => setCustomerInfo(customerName, e.target.value)}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-mono text-left"
          />
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <ShoppingBag className="w-12 h-12 stroke-[1.2] mb-2 text-slate-300 dark:text-slate-700" />
            <p className="text-xs font-bold">السلة فارغة حالياً</p>
            <p className="text-[11px] opacity-75 mt-1">امسح باركود أو اختر صنفاً من القائمة لإضافته</p>
          </div>
        ) : (
          items.map((it) => (
            <div
              key={it.id}
              className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl p-2.5 flex flex-col gap-1.5"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  {it.itemType === 'phone' ? (
                    <Smartphone className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  ) : (
                    <Package className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-1">
                      {it.name}
                    </div>
                    {it.barcodeOrImei && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        {it.itemType === 'phone' ? 'IMEI: ' : 'SN: '} {it.barcodeOrImei}
                      </div>
                    )}
                    {it.warrantyPeriod && (
                      <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                        <ShieldCheck className="w-3 h-3" />
                        {it.warrantyPeriod}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeItem(it.id)}
                  className="text-slate-400 hover:text-red-500 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Price and Quantity row */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700/60">
                <div className="text-xs font-bold font-mono text-orange-600 dark:text-orange-400">
                  {formatJOD(it.unitPrice * it.quantity)}
                  {it.quantity > 1 && (
                    <span className="text-[10px] text-slate-400 font-normal mr-1">
                      ({formatJOD(it.unitPrice)} × {it.quantity})
                    </span>
                  )}
                </div>

                {it.itemType === 'accessory' ? (
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
                    <button
                      onClick={() => updateQuantity(it.id, it.quantity - 1)}
                      className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-orange-500 rounded"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold font-mono px-1">{it.quantity}</span>
                    <button
                      onClick={() => updateQuantity(it.id, it.quantity + 1)}
                      className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-orange-500 rounded"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] bg-orange-100 dark:bg-orange-950/80 text-orange-600 dark:text-orange-300 font-bold px-2 py-0.5 rounded">
                    قطعة واحدة مسلسلة
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Trade-In Applied Banner or Add Button */}
      <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
        {tradeIn ? (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin" style={{ animationDuration: '6s' }} />
              <div>
                <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  بديل: {tradeIn.brand} {tradeIn.model}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                  IMEI: {tradeIn.imei}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 font-mono">
                -{formatJOD(tradeIn.purchasePrice)}
              </span>
              <button
                onClick={onOpenTradeIn}
                className="text-[11px] underline text-slate-500 hover:text-emerald-600"
              >
                تعديل
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onOpenTradeIn}
            className="w-full border border-dashed border-orange-400 dark:border-orange-500/40 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-orange-600 dark:text-orange-400 rounded-xl py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            نظام التبديل والمستعمل (Trade-In / F4)
          </button>
        )}
      </div>

      {/* Financial Summary & Checkout */}
      <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
        {/* Subtotal */}
        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
          <span>المجموع الفرعي:</span>
          <span className="font-mono font-bold">{formatJOD(subtotal)}</span>
        </div>

        {/* Discount: Direct JOD (دينار) only */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-slate-700 dark:text-slate-300 font-bold">الخصم المباشر (د.أ):</span>
          </div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="any"
              min="0"
              value={discount || ''}
              onChange={(e) => {
                setDiscountType('fixed');
                setDiscount(Number(e.target.value));
              }}
              placeholder="0.00"
              className="w-24 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-xs text-left font-mono font-bold text-red-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
            <span className="text-[11px] font-bold text-slate-500">د.أ</span>
          </div>
        </div>

        {tradeInVal > 0 && (
          <div className="flex justify-between text-xs text-emerald-600 font-bold">
            <span>خصم جهاز التبديل:</span>
            <span className="font-mono">-{formatJOD(tradeInVal)}</span>
          </div>
        )}

        <div className="border-t border-slate-200 dark:border-slate-800 pt-1.5 flex items-center justify-between">
          <span className="text-xs font-black text-slate-900 dark:text-white">الصافي النهائي:</span>
          <span className="text-lg font-black font-mono text-orange-600 dark:text-orange-400">
            {formatJOD(netTotal)}
          </span>
        </div>

        <button
          onClick={onOpenCheckout}
          disabled={items.length === 0}
          className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-orange-600/30 transition disabled:opacity-40 disabled:cursor-not-allowed text-xs"
        >
          <CreditCard className="w-4 h-4" />
          الدفع وإتمام الفاتورة (F12)
        </button>
      </div>
    </div>
  );
};
