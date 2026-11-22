import React, { useState } from 'react';
import { X, Wrench, Check, Lock, Calendar, DollarSign, Smartphone, ShieldAlert, KeyRound, Grid3X3 } from 'lucide-react';
import { ConditionChecklist, RepairTicket } from '../../../shared/types';
import { PatternLockInput } from '../common/PatternLockInput';
import { useAppStore } from '../../stores/useAppStore';

interface RepairTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RepairTicketModal: React.FC<RepairTicketModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { addToast } = useAppStore();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [deviceImei, setDeviceImei] = useState('');
  const [lockPasscode, setLockPasscode] = useState('');
  const [lockPattern, setLockPattern] = useState('');
  const [lockType, setLockType] = useState<'passcode' | 'pattern' | 'none'>('passcode');
  const [reportedIssue, setReportedIssue] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<number | ''>('');
  const [advancePayment, setAdvancePayment] = useState<number | ''>(0);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });

  // Exact 6-point Physical Condition Checklist for store legal protection
  const [checklist, setChecklist] = useState<ConditionChecklist>({
    crackedScreen: false,
    frameScratches: false,
    backCracked: false,
    cameraDamaged: false,
    simTrayMissing: false,
    deadDevice: false
  });

  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !deviceModel || !reportedIssue) return;

    setSubmitting(true);
    try {
      await window.tigerAPI.createRepairTicket({
        customerName,
        customerPhone,
        deviceModel,
        deviceImei: deviceImei || 'غير متوفر',
        lockPasscode: lockType === 'passcode' ? (lockPasscode.trim() || null) : null,
        lockPattern: lockType === 'pattern' ? (lockPattern.trim() || null) : null,
        reportedIssue,
        conditionChecklist: checklist,
        estimatedCost: Number(estimatedCost) || 0,
        advancePayment: Number(advancePayment) || 0,
        finalCost: Number(estimatedCost) || 0,
        status: 'received',
        technicianNotes: null,
        expectedDeliveryDate: expectedDeliveryDate || null,
        deliveredAt: null
      });

      addToast(`تم إنشاء كرت الصيانة بنجاح للعميل ${customerName}!`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast(err.message || 'فشل إنشاء تذكرة الصيانة', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-orange-500" />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">استلام جهاز وإصدار كرت صيانة جديد</h3>
              <p className="text-[11px] text-slate-500">تسجيل بيانات الزبون، العطل، حالة الجهاز المادية، وقفل الشاشة</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Customer & Device Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">اسم العميل:</label>
              <input
                type="text"
                placeholder="اسم العميل الرباعي أو الثلاثي"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">رقم الهاتف:</label>
              <input
                type="text"
                placeholder="079... أو 078..."
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono text-left"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">نوع وموديل الجهاز:</label>
              <input
                type="text"
                placeholder="مثال: iPhone 13 Pro أو Samsung S23"
                value={deviceModel}
                onChange={(e) => setDeviceModel(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الرقم التسلسلي (IMEI / Serial):</label>
              <input
                type="text"
                placeholder="35... (يمكن قراءته بـ *#06# أو علبة الجهاز)"
                value={deviceImei}
                onChange={(e) => setDeviceImei(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono text-left"
              />
            </div>
          </div>

          {/* Screen Lock Security: Passcode / Pattern Selector */}
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-200">
                    قفل وحماية الشاشة
                  </h3>
                  <p className="text-[10px] text-slate-400">لتجربة وفحص الجهاز بعد الصيانة</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="text-[11px] font-bold">
                {lockType === 'pattern' && lockPattern ? (
                  <span className="text-orange-600 bg-orange-50 dark:bg-orange-950/40 px-2.5 py-0.5 rounded-lg border border-orange-200 dark:border-orange-800 font-mono">
                    نمط مسجل: {lockPattern}
                  </span>
                ) : lockType === 'passcode' && lockPasscode ? (
                  <span className="text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800 font-mono">
                    رمز: {lockPasscode}
                  </span>
                ) : (
                  <span className="text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                    بدون قفل
                  </span>
                )}
              </div>
            </div>

            {/* Quick 3 Options: رمز رقمي | نمط الشاشة | بدون قفل */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setLockType('passcode')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                  lockType === 'passcode'
                    ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>رمز رقمي (PIN)</span>
              </button>

              <button
                type="button"
                onClick={() => setLockType('pattern')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                  lockType === 'pattern'
                    ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
                <span>نمط الشاشة</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLockType('none');
                  setLockPasscode('');
                  setLockPattern('');
                }}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                  lockType === 'none'
                    ? 'bg-orange-500 border-orange-500 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <span>بدون قفل (مفتوح)</span>
              </button>
            </div>

            {/* Content per mode */}
            {lockType === 'passcode' && (
              <div className="pt-1">
                <input
                  type="text"
                  placeholder="أدخل رمز الدخول أو كلمة المرور"
                  value={lockPasscode}
                  onChange={(e) => setLockPasscode(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-xs font-mono font-bold text-slate-800 dark:text-white text-center tracking-wider focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
            )}

            {lockType === 'pattern' && (
              <div className="flex justify-center pt-1">
                <PatternLockInput
                  value={lockPattern}
                  onChange={setLockPattern}
                  size={190}
                />
              </div>
            )}

            {lockType === 'none' && (
              <div className="py-2.5 text-center text-xs text-slate-400 font-bold bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                الهاتف مسجل بدون رمز قفل أو نمط
              </div>
            )}
          </div>

          {/* Reported Issue */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              وصف العطل والمشكلة المشتكى منها:
            </label>
            <textarea
              rows={2}
              placeholder="مثال: كسر في الشاشة، لا يشحن، صوت السماعة ضعيف، الجهاز يرست..."
              value={reportedIssue}
              onChange={(e) => setReportedIssue(e.target.value)}
              required
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
            />
          </div>

          {/* Legal Protection: 6-Checkbox Physical Condition Checklist */}
          <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 mb-2">
              <ShieldAlert className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                فحص الحالة المادية الظاهرية للجهاز (حماية قانونية للمحل):
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50">
                <input
                  type="checkbox"
                  checked={checklist.crackedScreen}
                  onChange={(e) => setChecklist({ ...checklist, crackedScreen: e.target.checked })}
                  className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                />
                <span className={checklist.crackedScreen ? 'text-red-600 font-bold' : ''}>شاشة مكسورة</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50">
                <input
                  type="checkbox"
                  checked={checklist.frameScratches}
                  onChange={(e) => setChecklist({ ...checklist, frameScratches: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <span className={checklist.frameScratches ? 'text-amber-600 font-bold' : ''}>خدوش على الإطار</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50">
                <input
                  type="checkbox"
                  checked={checklist.backCracked}
                  onChange={(e) => setChecklist({ ...checklist, backCracked: e.target.checked })}
                  className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                />
                <span className={checklist.backCracked ? 'text-red-600 font-bold' : ''}>كسر في الظهر</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50">
                <input
                  type="checkbox"
                  checked={checklist.cameraDamaged}
                  onChange={(e) => setChecklist({ ...checklist, cameraDamaged: e.target.checked })}
                  className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                />
                <span className={checklist.cameraDamaged ? 'text-red-600 font-bold' : ''}>عدسة كاميرا متضررة</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50">
                <input
                  type="checkbox"
                  checked={checklist.simTrayMissing}
                  onChange={(e) => setChecklist({ ...checklist, simTrayMissing: e.target.checked })}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <span className={checklist.simTrayMissing ? 'text-amber-600 font-bold' : ''}>بدون بيت شريحة</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50">
                <input
                  type="checkbox"
                  checked={checklist.deadDevice}
                  onChange={(e) => setChecklist({ ...checklist, deadDevice: e.target.checked })}
                  className="rounded text-red-600 focus:ring-red-500 w-4 h-4"
                />
                <span className={checklist.deadDevice ? 'text-red-600 font-bold' : ''}>لا يعمل نهائياً</span>
              </label>
            </div>
          </div>

          {/* Pricing & Advance Payment */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">التكلفة التقديرية (د.أ):</label>
              <input
                type="number"
                step="0.001"
                min="0"
                placeholder="0.000"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono text-left font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">الدفعة المقدمة (العربون):</label>
              <input
                type="number"
                step="0.001"
                min="0"
                placeholder="0.000"
                value={advancePayment}
                onChange={(e) => setAdvancePayment(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl p-2.5 text-xs text-emerald-700 dark:text-emerald-300 font-mono text-left font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">موعد التسليم المتوقع:</label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
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
              className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-orange-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {submitting ? 'جاري الإصدار...' : 'إصدار كرت الصيانة وطباعة الإيصال'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
