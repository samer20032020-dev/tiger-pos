import React, { useState } from 'react';
import { X, RotateCcw, Search, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Invoice } from '../../../shared/types';
import { formatJOD } from '../../../shared/constants';
import { useAppStore } from '../../stores/useAppStore';

interface ReturnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ReturnsModal: React.FC<ReturnsModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { addToast, currentUser } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [refunding, setRefunding] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const invoices = await window.tigerAPI.getAllInvoices(100);
      const found = invoices.find(inv => 
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase().trim())
      );
      if (found) {
        const details = await window.tigerAPI.getInvoiceDetails(found.id);
        setSelectedInvoice(details);
      } else {
        setSelectedInvoice(null);
        addToast('لم يتم العثور على فاتورة بهذا الرقم', 'warning');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">إرجاع واسترداد الفواتير (Returns & Refunds)</h3>
              <p className="text-[11px] text-slate-500">استرجاع المواد للمخزون وتعديل الأرصدة وحالة أجهزة الـ IMEI</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search by Invoice # */}
        <form onSubmit={handleSearch} className="my-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="أدخل رقم الفاتورة (مثال: INV-2026-00001)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl pr-9 pl-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition"
          >
            {loading ? 'جاري البحث...' : 'بحث'}
          </button>
        </form>

        {/* Invoice Preview */}
        {selectedInvoice && (
          <div className="space-y-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200 font-mono">
                  {selectedInvoice.invoiceNumber}
                </span>
                <div className="text-[11px] text-slate-500">
                  {selectedInvoice.createdAt.replace('T', ' ').substring(0, 16)} | العميل: {selectedInvoice.customerName}
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
