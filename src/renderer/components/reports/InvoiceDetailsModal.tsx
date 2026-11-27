import React from 'react';
import {
  X, Receipt, User, Clock, CreditCard, Package,
  Smartphone, TrendingUp, Tag, Layers
} from 'lucide-react';
import { Invoice } from '../../../shared/types';
import { formatJOD } from '../../../shared/constants';
import { formatLocalDateTime } from '../../../shared/dateUtils';
import { WhatsAppIcon } from '../common/WhatsAppIcon';
import { useEscapeClose } from '../../utils/useEscapeStack';

interface InvoiceDetailsModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onSendWhatsApp?: (invoice: Invoice) => void;
}

export const InvoiceDetailsModal: React.FC<InvoiceDetailsModalProps> = ({
  invoice,
  onClose,
  onSendWhatsApp,
}) => {
  useEscapeClose(Boolean(invoice), onClose);

  if (!invoice) return null;

  const isRefunded = invoice.status === 'refunded';
  const items = invoice.items || [];
  const totalQty = items.reduce((s, it) => s + (it.quantity || 1), 0);
  const computedItemsCost = items.reduce(
    (s, it) => s + Number(it.costPrice || 0) * Number(it.quantity || 1),
    0
  );
  const totalCost = invoice.totalCost !== undefined ? invoice.totalCost : computedItemsCost;
  const netProfit =
    invoice.totalProfit !== undefined
      ? invoice.totalProfit
      : invoice.totalAmount - totalCost;

  const paymentLabel =
    invoice.paymentMethod === 'cash'
      ? 'نقدي (Cash)'
      : invoice.paymentMethod === 'card'
      ? 'بطاقة بنكية'
      : invoice.paymentMethod === 'cliq'
      ? 'كليك (CliQ)'
      : invoice.paymentMethod === 'split'
      ? 'دفع مقسّم'
      : 'ذمم وآجل';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 font-cairo"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base font-black">تفاصيل بنود الفاتورة</h3>
                <span className="font-mono text-xs font-black bg-slate-800 text-orange-400 px-2.5 py-0.5 rounded-lg border border-slate-700">
                  {invoice.invoiceNumber}
                </span>
                {isRefunded ? (
                  <span className="text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-0.5 rounded-full">
                    مسترجعة (ملغاة)
                  </span>
                ) : invoice.isPosted ? (
                  <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                    مرحّل للأرشيف
                  </span>
                ) : (
                  <span className="text-[10px] font-black bg-orange-500/20 text-orange-300 border border-orange-500/40 px-2.5 py-0.5 rounded-full">
                    غير مرحّل (نشط)
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-3 flex-wrap mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-mono">
                    {formatLocalDateTime(invoice.createdAt)}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  <span>العميل: {invoice.customerName || 'زبون نقدي'}</span>
                </span>
                <span className="flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{paymentLabel}</span>
                </span>
                {invoice.cashierName && (
                  <span>البائع: {invoice.cashierName}</span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Items Breakdown Table */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-orange-500" />
              <span>تفاصيل القطع والمواد داخل الفاتورة ({items.length} بنود — {totalQty} قطعة)</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3">اسم القطعة / الصنف</th>
                  <th className="p-3 text-center">الكمية</th>
                  <th className="p-3">تكلفة الحبة (جملة)</th>
                  <th className="p-3">إجمالي التكلفة</th>
                  <th className="p-3">سعر البيع (للحبة)</th>
                  <th className="p-3">خصم البند</th>
                  <th className="p-3">إجمالي البيع</th>
                  <th className="p-3">صافي ربح القطعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-400">
                      لا توجد بنود مسجلة لهذه الفاتورة
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => {
                    const qty = Number(it.quantity || 1);
                    const unitCost = Number(it.costPrice || 0);
                    const rowCost = unitCost * qty;
                    const rowTotal =
                      it.total !== undefined
                        ? Number(it.total)
                        : Number(it.unitPrice || 0) * qty - Number(it.itemDiscount || 0);
                    const rowProfit = rowTotal - rowCost;
                    const itemDisc = Number(it.itemDiscount || 0);

                    return (
                      <tr
                        key={it.id || idx}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                      >
                        <td className="p-3 text-center font-mono text-slate-400 font-bold">
                          {idx + 1}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {it.itemType === 'phone' ? (
                              <Smartphone className="w-4 h-4 text-orange-500 shrink-0" />
                            ) : (
                              <Package className="w-4 h-4 text-blue-500 shrink-0" />
                            )}
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">
                                {it.name}
                              </div>
                              {it.barcodeOrImei && (
                                <div className="text-[10px] font-mono text-slate-400">
                                  {it.barcodeOrImei}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono font-black text-orange-600 dark:text-orange-400">
                          ×{qty}
                        </td>
                        <td className="p-3 font-mono font-semibold text-slate-500 dark:text-slate-400">
                          {formatJOD(unitCost)}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {formatJOD(rowCost)}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {formatJOD(Number(it.unitPrice || 0))}
                        </td>
                        <td className="p-3 font-mono font-bold">
                          {itemDisc > 0 ? (
                            <span className="text-orange-600 dark:text-orange-400">
                              -{formatJOD(itemDisc)}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-black text-slate-900 dark:text-white">
                          {formatJOD(rowTotal)}
                        </td>
                        <td className="p-3 font-mono font-black">
                          <span
                            className={
                              rowProfit >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                            }
                          >
                            {rowProfit >= 0 ? `+${formatJOD(rowProfit)}` : formatJOD(rowProfit)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Invoice Financial Totals Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-3">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                إجمالي التكلفة (جملة)
              </span>
              <span className="text-base font-black font-mono text-slate-800 dark:text-slate-200">
                {formatJOD(totalCost)}
              </span>
            </div>

            <div className="bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/60 rounded-2xl p-3">
              <span className="text-[11px] font-bold text-orange-700 dark:text-orange-400 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" />
                <span>الخصومات (والتبديل)</span>
              </span>
              <span className="text-base font-black font-mono text-orange-600 dark:text-orange-400">
                {formatJOD((invoice.discount || 0) + (invoice.tradeInDiscount || 0))}
              </span>
            </div>

            <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-2xl p-3">
              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 block">
                إجمالي سعر البيع (الصافي)
              </span>
              <span className="text-base font-black font-mono text-blue-700 dark:text-blue-300">
                {isRefunded ? '0.000 د.أ (مسترد)' : formatJOD(invoice.totalAmount)}
              </span>
            </div>

            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-3">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>صافي ربح الفاتورة</span>
              </span>
              <span className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                {isRefunded ? '0.000 د.أ' : `+${formatJOD(netProfit)}`}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            {invoice.customerPhone && onSendWhatsApp && (
              <button
                type="button"
                onClick={() => onSendWhatsApp(invoice)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
              >
                <WhatsAppIcon className="w-3.5 h-3.5 fill-white" />
                <span>إرسال الفاتورة عبر واتساب</span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-black transition"
          >
            إغلاق (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};
