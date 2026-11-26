import React, { useState } from 'react';
import { X, AlertTriangle, Trash2, ArrowLeftRight, Check } from 'lucide-react';
import { DamagedItem } from '../../../shared/types';
import { useAppStore } from '../../stores/useAppStore';
import { useEscapeClose } from '../../utils/useEscapeStack';

interface DamagedItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  itemType: 'phone' | 'accessory';
  itemId: string;
  name: string;
  barcodeOrImei: string;
  costPrice: number;
  availableQuantity?: number;
}

export const DamagedItemModal: React.FC<DamagedItemModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  itemType,
  itemId,
  name,
  barcodeOrImei,
  costPrice,
  availableQuantity = 1
}) => {
  useEscapeClose(isOpen, onClose);
  const { addToast, currentUser } = useAppStore();
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState('كسر شاشة أثناء المعاينة');
  const [actionTaken, setActionTaken] = useState<'write_off' | 'returned_to_supplier'>('write_off');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const totalLoss = Number((costPrice * quantity).toFixed(3));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || quantity <= 0) return;

    setSubmitting(true);
    try {
      await window.tigerAPI.reportDamagedItem({
        itemType,
        itemId,
        name,
        barcodeOrImei,
        quantity,
        costPrice,
        totalLoss,
        reason,
        actionTaken,
        supplierId: null,
        reportedBy: currentUser?.fullName || 'الكاشير'
      });

      addToast(
        actionTaken === 'write_off'
          ? `تم تسجيل الصنف كتالف مشطوب وخسارة بقيمة (${totalLoss} د.أ) بنجاح!`
          : `تم تسجيل الصنف كمرتجع للمورد بنجاح!`,
        'success'
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast(err.message || 'فشل تسجيل التالف', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">تسجيل بضاعة تالفة / مرتجع للمورد</h3>
              <p className="text-[11px] text-slate-500">خصم القطعة من المخزون وتوثيق خسائر التوالف بدقة</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item Information Preview */}
        <div className="my-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{name}</div>
          <div className="text-[11px] text-slate-500 font-mono">
            {itemType === 'phone' ? 'IMEI: ' : 'باركود: '} {barcodeOrImei}
          </div>
          <div className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold">
            سعر التكلفة: {costPrice.toFixed(3)} د.أ
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Action Choice: Write-off vs Return to Supplier */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActionTaken('write_off')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition ${
                actionTaken === 'write_off'
                  ? 'border-red-500 bg-red-500/10 text-red-600 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>شطب كتالف (خسارة)</span>
            </button>

            <button
              type="button"
              onClick={() => setActionTaken('returned_to_supplier')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition ${
                actionTaken === 'returned_to_supplier'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-600 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>مرتجع للمورد</span>
            </button>
          </div>

          {itemType === 'accessory' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                الكمية التالفة (المتوفر: {availableQuantity}):
              </label>
              <input
                type="number"
                min="1"
                max={availableQuantity}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(availableQuantity, Number(e.target.value))))}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">سبب التلف أو المرتجع:</label>
            <input
              type="text"
              placeholder="مثال: كسر شاشة، عيب مصنعي، بطارية منتفخة..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl p-2.5 flex items-center justify-between text-xs">
            <span className="text-red-700 dark:text-red-400 font-bold">إجمالي الخسارة المحسوبة:</span>
            <span className="font-mono font-black text-red-600 text-sm">{totalLoss.toFixed(3)} د.أ</span>
          </div>

          <div className="pt-2 flex items-center justify-between gap-2">
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
              className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30 transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {submitting ? 'جاري التسجيل...' : 'تأكيد التسجيل وخصم المخزون'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
