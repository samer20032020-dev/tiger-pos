import React, { useState, useEffect, useRef } from 'react';
import { X, RotateCcw, Search, AlertTriangle, CheckCircle2, Receipt, Clock, User } from 'lucide-react';
import { Invoice } from '../../../shared/types';
import { formatJOD } from '../../../shared/constants';
import { formatLocalDateTime } from '../../../shared/dateUtils';
import { useAppStore } from '../../stores/useAppStore';
import { useEscapeClose } from '../../utils/useEscapeStack';

interface ReturnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ReturnsModal: React.FC<ReturnsModalProps> = ({ isOpen, onClose, onSuccess }) => {
  useEscapeClose(isOpen, onClose);
  const { addToast, currentUser } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 60);

      window.tigerAPI.getAllInvoices(15).then(invs => {
        setRecentInvoices(invs.filter(i => i.status === 'completed').slice(0, 5));
      }).catch(() => {});
    } else {
      setSearchQuery('');
      setSelectedInvoice(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const normalizeQuery = (str: string) => {
    return (str || '')
      .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
      .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
      .trim();
  };

  const selectInvoiceById = async (invId: string) => {
    setLoading(true);
    try {
      const details = await window.tigerAPI.getInvoiceDetails(invId);
      if (details) {
        setSelectedInvoice(details);
        setSearchQuery(details.invoiceNumber);
      }
    } catch {
      addToast('تعذر تحميل تفاصيل الفاتورة', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = normalizeQuery(searchQuery);
    if (!clean) return;
    setLoading(true);
    try {
      const invoices = await window.tigerAPI.getAllInvoices(200);
      const cleanLower = clean.toLowerCase();
      // Extract numeric suffix if just numbers entered e.g. "25" -> "25"
      const numericQuery = clean.replace(/[^0-9]/g, '').replace(/^0+/, '');

      const found = invoices.find(inv => {
        const invNum = inv.invoiceNumber.toLowerCase();
        if (invNum === cleanLower) return true;
        if (invNum.includes(cleanLower)) return true;
        if (numericQuery) {
          const invDigits = invNum.replace(/[^0-9]/g, '').replace(/^0+/, '');
          if (invDigits === numericQuery || invDigits.endsWith(numericQuery)) return true;
        }
        return false;
      });

      if (found) {
        const details = await window.tigerAPI.getInvoiceDetails(found.id);
        setSelectedInvoice(details);
      } else {
        setSelectedInvoice(null);
        addToast('لم يتم العثور على فاتورة بهذا الرقم أو الرقم التسلسلي', 'warning');
      }
    } catch (err: any) {
      addToast('حدث خطأ أثناء البحث عن الفاتورة', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedInvoice) return;
    setRefunding(true);
    try {
      await window.tigerAPI.refundInvoice(selectedInvoice.id, currentUser?.fullName || 'الكاشير');
      addToast(`تم استرجاع الفاتورة ${selectedInvoice.invoiceNumber} بنجاح وإعادة البضاعة للمخزون`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      addToast(err.message || 'فشل استرجاع الفاتورة', 'error');
    } finally {
      setRefunding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">إرجاع واسترداد الفواتير (Returns & Refunds)</h3>
              <p className="text-[11px] text-slate-500">استرجاع المواد للمخزون وتعديل الأرصدة وحالة أجهزة الـ IMEI</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search by Invoice # */}
        <form onSubmit={handleSearch} className="my-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
            <input
              ref={inputRef}
              autoFocus
              type="text"
              placeholder="اكتب رقم الفاتورة أو الأرقام فقط (مثال: 25 أو INV-2026-00025)..."
              value={searchQuery}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setSearchQuery(normalizeQuery(e.target.value))}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pr-9 pl-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Search className="w-3.5 h-3.5" />
            {loading ? 'جاري البحث...' : 'بحث'}
          </button>
        </form>

        {/* Quick Recent Invoices (Click to select immediately) */}
        {!selectedInvoice && recentInvoices.length > 0 && (
          <div className="mb-4 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-bold text-slate-500 mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              أو اختر من آخر الفواتير المكتملة مباشرة (بنقرة واحدة):
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {recentInvoices.map((inv) => (
                <button
                  key={inv.id}
                  type="button"
                  onClick={() => selectInvoiceById(inv.id)}
                  className="w-full text-right p-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-orange-50 dark:hover:bg-orange-950/30 border border-slate-200 dark:border-slate-800 transition flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Receipt className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{inv.invoiceNumber}</span>
                    <span className="text-slate-400 font-sans">| {inv.customerName || 'زبون نقدي'}</span>
                  </div>
                  <div className="font-mono font-bold text-orange-600 dark:text-orange-400">
                    {formatJOD(inv.totalAmount)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Invoice Preview */}
        {selectedInvoice && (
          <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200 font-mono">
                  {selectedInvoice.invoiceNumber}
                </span>
                <div className="text-[11px] text-slate-500">
                  {formatLocalDateTime(selectedInvoice.createdAt)} | العميل: {selectedInvoice.customerName}
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                selectedInvoice.status === 'completed' 
                  ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {selectedInvoice.status === 'completed' ? 'فترة صالحة للإرجاع' : 'مسترجعة مسبقاً'}
              </span>
            </div>

            {/* Items List */}
            <div className="max-h-36 overflow-y-auto space-y-1 border-t border-b border-slate-200 dark:border-slate-800 py-2">
              {selectedInvoice.items?.map((it, idx) => (
                <div key={idx} className="flex justify-between text-xs py-1">
                  <span>{it.quantity}x {it.name} {it.barcodeOrImei && `(${it.barcodeOrImei})`}</span>
                  <span className="font-mono font-bold">{formatJOD(it.total)}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between text-xs font-black">
              <span>الإجمالي المسترد:</span>
              <span className="font-mono text-sm text-red-600">{formatJOD(selectedInvoice.totalAmount)}</span>
            </div>

            {selectedInvoice.status === 'completed' ? (
              <div className="pt-2">
                <button
                  type="button"
                  disabled={refunding}
                  onClick={handleRefund}
                  className="w-full bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  {refunding ? 'جاري المعالجة...' : 'تأكيد استرجاع كامل الفاتورة وإعادة البضاعة'}
                </button>
              </div>
            ) : (
              <div className="text-center text-xs text-red-500 font-bold py-1">
                هذه الفاتورة تم استرجاعها بالفعل مسبقاً!
              </div>
            )}
          </div>
        )}

        <div className="pt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
