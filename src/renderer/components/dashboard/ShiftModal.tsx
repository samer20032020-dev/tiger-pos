import React, { useState, useEffect } from 'react';
import { 
  X, DoorOpen, DoorClosed, AlertCircle, CheckCircle2, 
  DollarSign, Vault, Sparkles, AlertTriangle, Lock, Coins, 
  ArrowUpRight, Info, Check, UserCheck, Calculator
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useShiftStore } from '../../stores/useShiftStore';
import { formatJOD, cleanNumberInput } from '../../../shared/constants';

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

  const [startingCashInput, setStartingCashInput] = useState<string>('100');
  const [actualCashInput, setActualCashInput] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (type === 'close') {
        setActualCashInput('');
        setNote('');
      } else {
        setStartingCashInput('100');
      }
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  const expectedCash = activeShift ? (activeShift.expectedCash || 0) : 0;
  const startingCash = activeShift ? (activeShift.startingCash || 0) : 0;
  const netCashSales = Math.max(0, expectedCash - startingCash);

  const hasEnteredCash = actualCashInput.trim() !== '';
  const actualCash = parseFloat(actualCashInput) || 0;
  const difference = hasEnteredCash ? (actualCash - expectedCash) : 0;
  const isExactMatch = hasEnteredCash && Math.abs(difference) < 0.005;

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    const initialAmount = parseFloat(startingCashInput) || 0;
    setSubmitting(true);
    try {
      await window.tigerAPI.openShift(currentUser.id, currentUser.fullName, initialAmount);
      addToast('تم فتح الوردية بنجاح! نهارك سعيد ورزق وبركة', 'success');
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
    if (!hasEnteredCash) {
      addToast('يرجى إدخال المبلغ الفعلي المعدود في الدرج أولاً', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      await window.tigerAPI.closeShift(activeShift.id, actualCash, note.trim());
      addToast(
        isExactMatch
          ? 'تم تسكير الصندوق بنجاح والحساب مطابق تماماً 100%!'
          : `تم تسكير الصندوق والوردية بنجاح! الفارق: ${difference > 0 ? '+' : ''}${difference.toFixed(3)} د.أ`,
        isExactMatch ? 'success' : difference > 0 ? 'info' : 'warning'
      );
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden font-cairo transform transition-all animate-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="flex items-center justify-between p-5 pb-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm ${
              type === 'open' 
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40' 
                : 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-800/40'
            }`}>
              {type === 'open' ? (
                <DoorOpen className="w-6 h-6" />
              ) : (
                <Vault className="w-6 h-6" />
              )}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {type === 'open' ? 'فتح وردية جديدة (تسليم العهدة)' : 'تسكير الصندوق وإغلاق الوردية'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {type === 'open' 
                  ? 'تسجيل الرصيد الافتتاحي في درج الكاش وبدء العمل'
                  : 'جرد نقدية الدرج، مطابقة الحسابات، وتسليم الصندوق'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {type === 'open' ? (
          /* ========================================================== */
          /* FORM: OPEN NEW SHIFT                                       */
          /* ========================================================== */
          <form onSubmit={handleOpenShift} className="p-6 space-y-5">
            {/* Cashier Info Card */}
            <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">الموظف / المستلم:</span>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                    {currentUser?.fullName}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {currentUser?.role === 'admin' ? 'مدير نظام' : 'كاشير'}
              </span>
            </div>

            {/* Starting Cash Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                  الرصيد الافتتاحي في درج الكاش (الفكة):
                </label>
                <span className="text-[10px] text-slate-400">عهدة الصباح</span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  value={startingCashInput}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setStartingCashInput(cleanNumberInput(e.target.value))}
                  placeholder="0.000"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-2xl pl-14 pr-4 py-3 text-xl font-black font-mono text-slate-900 dark:text-white focus:outline-none transition"
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-400 pointer-events-none">
                  د.أ (JOD)
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 ml-1">مبالغ شائعة:</span>
                {['50', '100', '150', '200'].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setStartingCashInput(amt)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold font-mono transition ${
                      startingCashInput === amt
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {amt} د.أ
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={submitting || !startingCashInput}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-emerald-600/25 transition disabled:opacity-50 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>تأكيد فتح الوردية</span>
              </button>
            </div>
          </form>
        ) : (
          /* ========================================================== */
          /* FORM: CLOSE SHIFT & CASH DRAWER RECONCILIATION             */
          /* ========================================================== */
          <form onSubmit={handleCloseShift} className="p-6 space-y-4">
            
            {/* Top 2 Elegant Metrics Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Card 1: Starting Cash */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 p-3.5 rounded-2xl space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold">الرصيد الافتتاحي</span>
                  <Coins className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-base font-black font-mono text-slate-700 dark:text-slate-200">
                  {formatJOD(startingCash)}
                </div>
                <div className="text-[10px] text-slate-400 truncate">عهدة بداية الشفت</div>
              </div>

              {/* Card 2: Expected Drawer Cash */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/20 border border-orange-200/80 dark:border-orange-800/60 p-3.5 rounded-2xl space-y-1 shadow-sm">
                <div className="flex items-center justify-between text-orange-600 dark:text-orange-400">
                  <span className="text-[10px] font-black">المتوقع في الصندوق</span>
                  <Vault className="w-3.5 h-3.5" />
                </div>
                <div className="text-base font-black font-mono text-orange-600 dark:text-orange-400">
                  {formatJOD(expectedCash)}
                </div>
                <div className="text-[10px] text-orange-700/70 dark:text-orange-300/70 truncate">
                  الافتتاحي + المبيعات النقدية
                </div>
              </div>
            </div>

            {/* Actual Cash Input Section */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-orange-500" />
                  <span>المبلغ الفعلي المعدود في الدرج:</span>
                </label>

                {/* Quick Match Shortcut Button */}
                <button
                  type="button"
                  onClick={() => setActualCashInput(expectedCash.toFixed(3))}
                  className="text-[11px] font-extrabold text-orange-600 hover:text-orange-700 dark:text-orange-400 hover:underline flex items-center gap-1 transition"
                  title="تعبئة المبلغ الفعلي ليتطابق مع المبلغ المتوقع بنقرة واحدة"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span>مطابقة مع المتوقع</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  placeholder="0.000"
                  value={actualCashInput}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setActualCashInput(cleanNumberInput(e.target.value))}
                  autoFocus
                  required
                  className={`w-full bg-slate-50 dark:bg-slate-950 border-2 rounded-2xl pl-14 pr-4 py-3 text-2xl font-black font-mono text-slate-900 dark:text-white focus:outline-none transition shadow-inner ${
                    !hasEnteredCash 
                      ? 'border-slate-200 dark:border-slate-700 focus:border-orange-500'
                      : isExactMatch 
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                      : difference > 0 
                      ? 'border-blue-500 ring-2 ring-blue-500/20'
                      : 'border-rose-500 ring-2 ring-rose-500/20'
                  }`}
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-400 pointer-events-none">
                  د.أ
                </span>
              </div>
            </div>

            {/* Smart Live Difference Card (No fake red alert before user enters cash!) */}
            <div>
              {!hasEnteredCash ? (
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 p-3.5 rounded-2xl flex items-center gap-2.5 text-slate-500 dark:text-slate-400">
                  <Info className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="text-[11px] leading-tight font-medium">
                    عد النقود الموجودة في الدرج وأدخل المبلغ لمطابقة الرصيد وحساب الفارق تلقائياً.
                  </div>
                </div>
              ) : isExactMatch ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/80 p-3.5 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in duration-150">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-emerald-800 dark:text-emerald-200">
                        الرصيد متطابق تماماً بدون أي فارق!
                      </div>
                      <div className="text-[10px] text-emerald-600/80 dark:text-emerald-300/80">
                        المبلغ المعدود مطابق للحسابات 100%
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                    0.000 د.أ
                  </div>
                </div>
              ) : difference > 0 ? (
                <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-300 dark:border-blue-800/80 p-3.5 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in duration-150">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-blue-800 dark:text-blue-200">
                        يوجد فائض / زيادة في الصندوق
                      </div>
                      <div className="text-[10px] text-blue-600/80 dark:text-blue-300/80">
                        المبلغ الفعلي أكبر من المتوقع بحسب الفواتير
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-black font-mono text-blue-600 dark:text-blue-400">
                    +{formatJOD(difference)}
                  </div>
                </div>
              ) : (
                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/80 p-3.5 rounded-2xl flex items-center justify-between shadow-sm animate-in fade-in duration-150">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-rose-800 dark:text-rose-200">
                        يوجد عجز ونقص في الصندوق
                      </div>
                      <div className="text-[10px] text-rose-600/80 dark:text-rose-300/80">
                        الفارق بين الفعلي والمتوقع حسب الفواتير والمصاريف
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-black font-mono text-rose-600 dark:text-rose-400">
                    {formatJOD(difference)}
                  </div>
                </div>
              )}
            </div>

            {/* Optional Notes */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                ملاحظات تسكير الصندوق (اختياري):
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="أسباب العجز/الزيادة إن وجدت، أو تفاصيل تسليم العهدة للكاشير التالي..."
                rows={2}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 focus:border-orange-500 dark:focus:border-orange-500 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none transition resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={submitting || !hasEnteredCash}
                className={`text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-lg transition flex items-center gap-2 disabled:opacity-50 cursor-pointer ${
                  isExactMatch
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                    : 'bg-red-600 hover:bg-red-500 shadow-red-600/30'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>تأكيد تسكير الصندوق</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
