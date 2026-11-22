import React, { useState, useEffect } from 'react';
import { Receipt, Plus, Search, DollarSign, Check } from 'lucide-react';
import { Expense } from '../../../shared/types';
import { EXPENSE_CATEGORIES, formatJOD } from '../../../shared/constants';
import { useAppStore } from '../../stores/useAppStore';
import { useShiftStore } from '../../stores/useShiftStore';

export const ExpensesTab: React.FC = () => {
  const { addToast, currentUser } = useAppStore();
  const { activeShift } = useShiftStore();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Expense Modal
  const [isOpen, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Expense['category']>('other');
  const [amount, setAmount] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [deductFromShift, setDeductFromShift] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await window.tigerAPI.getAllExpenses();
      setExpenses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) return;
    setSubmitting(true);
    try {
      await window.tigerAPI.addExpense({
        category,
        amount: Number(amount),
        title,
        notes: notes || null,
        paidBy: currentUser?.fullName || 'الكاشير',
        shiftId: (deductFromShift && activeShift) ? activeShift.id : null,
        expenseDate: new Date().toISOString().split('T')[0]
      });

      addToast(`تم تسجيل المصروف بقيمة ${amount} د.أ بنجاح!`, 'success');
      setTitle('');
      setAmount('');
      setNotes('');
      setOpen(false);
      loadData();
    } catch (err: any) {
      addToast(err.message || 'فشل تسجيل المصروف', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="p-6 space-y-4 select-none">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-orange-500" />
            المصاريف والنثريات التشغيلية
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            تسجيل الإيجار، الرواتب، فواتير الكهرباء، وأدوات الصيانة لخصمها تلقائياً من الأرباح
          </p>
        </div>

        <button
          onClick={() => setOpen(true)}
          className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-600/30 transition"
        >
          <Plus className="w-4 h-4" />
          تسجيل مصروف جديد
        </button>
      </div>

      {/* Expenses Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3.5">التاريخ</th>
                <th className="p-3.5">بند المصروف</th>
                <th className="p-3.5">التصنيف</th>
                <th className="p-3.5">المبلغ</th>
                <th className="p-3.5">المسؤول عن الصرف</th>
                <th className="p-3.5">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">جاري تحميل المصاريف...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-slate-400">لا توجد مصاريف مسجلة</td></tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                    <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">{exp.expenseDate}</td>
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">{exp.title}</td>
                    <td className="p-3.5">
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold">
                        {EXPENSE_CATEGORIES.find(c => c.key === exp.category)?.label || exp.category}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-black text-red-600 dark:text-red-400 text-sm">
                      {formatJOD(exp.amount)}
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">{exp.paidBy}</td>
                    <td className="p-3.5 text-slate-400">{exp.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-4">تسجيل مصروف جديد</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">بند المصروف:</label>
                <input
                  type="text"
                  placeholder="مثال: فاتورة كهرباء، صيانة مفك، سلفة موظف..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">التصنيف:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                  >
                    {EXPENSE_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-red-600 dark:text-red-400 mb-1">المبلغ (د.أ):</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.1"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                    required
                    className="w-full bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-xl p-2.5 text-xs font-black text-red-600 font-mono text-left"
                  />
                </div>
              </div>

              {activeShift && (
                <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs">
                  <input
                    type="checkbox"
                    checked={deductFromShift}
                    onChange={(e) => setDeductFromShift(e.target.checked)}
                    className="rounded text-orange-600 w-4 h-4"
                  />
                  <span>خصم المبلغ مباشرة من درج كاش الوردية المفتوحة</span>
                </label>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ملاحظات إضافية:</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-orange-600/30"
                >
                  <Check className="w-4 h-4" />
                  حفظ المصروف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
