import React, { useState } from 'react';
import { X, DoorOpen, DoorClosed, AlertCircle, CheckCircle2, DollarSign } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useShiftStore } from '../../stores/useShiftStore';
import { formatJOD } from '../../../shared/constants';

interface ShiftModalProps {
  type: 'open' | 'close';
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({
  type,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { currentUser, addToast } = useAppStore();
  const { activeShift, refreshActiveShift } = useShiftStore();

  const [startingCash, setStartingCash] = useState<number>(100);
  const [actualCash, setActualCash] = useState<number>(0);
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const expectedCash = activeShift ? activeShift.expectedCash : 0;
  const difference = actualCash - expectedCash;

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSubmitting(true);
    try {
      await window.tigerAPI.openShift(currentUser.id, currentUser.fullName, Number(startingCash));
      addToast('تم فتح الوردية بنجاح!', 'success');
      await refreshActiveShift();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      addToast(err.message || 'فشل فتح الوردية', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    setSubmitting(true);
    try {
      await window.tigerAPI.closeShift(activeShift.id, Number(actualCash), note);
      addToast(`تم تسكير الصندوق والوردية بنجاح! الفارق: ${difference.toFixed(2)} د.أ`, 'success');
      await refreshActiveShift();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      addToast(err.message || 'فشل إغلاق الوردية', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {type === 'open' ? (
              <DoorOpen className="w-5 h-5 text-emerald-500" />
            ) : (
              <DoorClosed className="w-5 h-5 text-red-500" />
            )}
            <h3 className="font-bold text-slate-900 dark:text-white">
              {type === 'open' ? 'فتح وردية جديدة' : 'تسكير الصندوق وإغلاق الوردية'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {type === 'open' ? (
          <form onSubmit={handleOpenShift} className="space-y-4 pt-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                الكاشير المستلم للوردية:
              </label>
              <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                {currentUser?.fullName} ({currentUser?.role})
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                الرصيد الافتتاحي في درج الكاش (د.أ):
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={startingCash}
                  onChange={(e) => setStartingCash(Number(e.target.value))}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-left"
                />
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">JOD</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">المبلغ الفكة المتاح في الدرج عند استلام النوبة</p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
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
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
              >
                تأكيد فتح الوردية
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCloseShift} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] text-slate-500 mb-1">الرصيد الافتتاحي:</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono">
                  {formatJOD(activeShift?.startingCash || 0)}
                </div>
              </div>
              <div className="p-3 bg-orange-50 dark:bg-orange-950/40 rounded-xl border border-orange-200 dark:border-orange-800">
                <div className="text-[11px] text-orange-600 dark:text-orange-400 font-bold mb-1">المتوقع في الصندوق:</div>
                <div className="text-sm font-black text-orange-600 dark:text-orange-400 font-mono">
                  {formatJOD(expectedCash)}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                المبلغ الفعلي المعدود في الدرج (د.أ):
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={actualCash || ''}
                  onChange={(e) => setActualCash(Number(e.target.value))}
                  placeholder="0.00"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-lg font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-left font-mono"
                />
                <span className="absolute left-3 top-3 text-xs font-bold text-slate-400">JOD</span>
              </div>
            </div>

            {/* Discrepancy (عجز / زيادة) Card */}
            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              difference === 0 
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : difference > 0
                ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300'
                : 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800 text-red-800 dark:text-red-300'
            }`}>
              <div className="flex items-center gap-2">
                {difference === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <div>
                  <div className="text-xs font-bold">
                    {difference === 0 ? 'الرصيد مطابق تماماً بدون عجز أو زيادة' : difference > 0 ? 'يوجد فائض / زيادة في الصندوق' : 'يوجد عجز في الصندوق'}
                  </div>
                  <div className="text-[10px] opacity-80">الفارق بين الفعلي والمتوقع حسب الفواتير والمصاريف</div>
                </div>
              </div>
              <div className="text-base font-black font-mono">
                {formatJOD(difference)}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                ملاحظات تسكير الصندوق (اختياري):
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="أسباب العجز/الزيادة إن وجدت، أو تسليم العهدة للكاشير التالي..."
                rows={2}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
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
                className="bg-red-600 hover:bg-red-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-red-600/30 transition disabled:opacity-50"
              >
                تأكيد تسكير الصندوق
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
