import React, { useState, useEffect } from 'react';
import {
  Users, Search, Plus, UserPlus, Phone,
  FileText, DollarSign, Receipt, Printer, X, Check,
  AlertCircle, Smartphone, Wrench, CalendarClock, Trash2, CheckCircle2
} from 'lucide-react';
import { Customer, CustomerStatement, PaymentMethod } from '../../../shared/types';
import { formatJOD, cleanNumberInput, parseNumberInput } from '../../../shared/constants';
import { useAppStore } from '../../stores/useAppStore';

export const CustomersTab: React.FC = () => {
  const { addToast, currentUser } = useAppStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'debtors' | 'settled' | 'all'>('debtors');

  // Modals state
  const [isAddOpen, setAddOpen] = useState(false);
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);
  const [statementData, setStatementData] = useState<CustomerStatement | null>(null);
  const [statementLoading, setStatementLoading] = useState(false);

  // Debt Payment Modal state
  const [debtPayCustomer, setDebtPayCustomer] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [voucherNumber, setVoucherNumber] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [autoDeleteOnZero, setAutoDeleteOnZero] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Delete Customer Modal state
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState(false);

  // New Customer Form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newIdNumber, setNewIdNumber] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [submittingCustomer, setSubmittingCustomer] = useState(false);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await window.tigerAPI.getAllCustomers();
      setCustomers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const openStatement = async (cust: Customer) => {
    setStatementCustomer(cust);
    setStatementLoading(true);
    try {
      const stmt = await window.tigerAPI.getCustomerStatement(cust.id);
      setStatementData(stmt);
    } catch (err) {
      console.error(err);
      addToast('فشل تحميل كشف حساب العميل', 'error');
    } finally {
      setStatementLoading(false);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setSubmittingCustomer(true);
    try {
      await window.tigerAPI.addCustomer({
        name: newName.trim(),
        phone: newPhone.trim() || '',
        idNumber: newIdNumber.trim() || null,
        balance: 0,
        notes: newNotes.trim() || null
      });
      addToast(`تم تسجيل العميل ${newName.trim()} بنجاح!`, 'success');
      setNewName('');
      setNewPhone('');
      setNewIdNumber('');
      setNewNotes('');
      setAddOpen(false);
      loadCustomers();
    } catch (err: any) {
      addToast(err.message || 'فشل إضافة العميل', 'error');
    } finally {
      setSubmittingCustomer(false);
    }
  };

  const handlePayDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseNumberInput(payAmount);
    if (!debtPayCustomer || amt <= 0) return;

    setSubmittingPayment(true);
    try {
      const vNumber = voucherNumber || `VCH-${Date.now().toString().slice(-6)}`;
      const isFullSettlement = (debtPayCustomer.balance - amt) <= 0.001;

      await window.tigerAPI.payCustomerDebt({
        customerId: debtPayCustomer.id,
        amount: amt,
        paymentMethod,
        voucherNumber: vNumber,
        receivedBy: currentUser?.fullName || 'الكاشير',
        notes: payNotes || null
      });

      if (isFullSettlement && autoDeleteOnZero) {
        await window.tigerAPI.deleteCustomer(debtPayCustomer.id, currentUser?.fullName || 'الكاشير');
        addToast(`تم سداد كامل الذمة للعميل (${debtPayCustomer.name}) وحذفه نهائياً بنجاح!`, 'success');
      } else if (isFullSettlement) {
        addToast(`تم سداد كامل الذمة للعميل (${debtPayCustomer.name}) بنجاح! تم تصفير حسابه وإزالته تلقائياً من قائمة الذمم المطلوبة.`, 'success');
      } else {
        addToast(`تم تسجيل سند قبض وسداد دفعة بقيمة ${formatJOD(amt)} بنجاح! المتبقي: ${formatJOD(debtPayCustomer.balance - amt)}`, 'success');
      }

      setDebtPayCustomer(null);
      setPayAmount('');
      setVoucherNumber('');
      setPayNotes('');
      setAutoDeleteOnZero(false);
      loadCustomers();
    } catch (err: any) {
      addToast(err.message || 'فشل سداد الذمة', 'error');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setDeletingCustomer(true);
    try {
      await window.tigerAPI.deleteCustomer(customerToDelete.id, currentUser?.fullName || 'المدير');
      addToast(`تم حذف سجل العميل (${customerToDelete.name}) نهائياً بنجاح!`, 'success');
      setCustomerToDelete(null);
      loadCustomers();
    } catch (err: any) {
      addToast(err.message || 'فشل حذف العميل', 'error');
    } finally {
      setDeletingCustomer(false);
    }
  };

  const handlePrintStatement = async () => {
    const htmlContent = document.getElementById('printable-customer-statement')?.innerHTML;
    if (htmlContent && window.tigerAPI) {
      const fullHtml = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8">
          <title>كشف حساب عميل - TIGER</title>
          <style>
            @page { margin: 10mm; size: A4 portrait; }
            body {
              font-family: Arial, Tahoma, sans-serif;
              direction: rtl;
              text-align: right;
              font-size: 11px;
              color: #000;
              background: #fff;
            }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 12px; }
            th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: right; }
            th { background-color: #f2f2f2; }
            .bold { font-weight: bold; }
            .text-center { text-align: center; }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
        </html>
      `;
      try {
        await window.tigerAPI.printSilentHtml(fullHtml, false);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const debtors = customers.filter(c => c.balance > 0);
  const settled = customers.filter(c => c.balance <= 0);
  const totalDebt = debtors.reduce((sum, c) => sum + c.balance, 0);

  const filtered = customers.filter(c => {
    if (filterTab === 'debtors' && c.balance <= 0) return false;
    if (filterTab === 'settled' && c.balance > 0) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.idNumber && c.idNumber.includes(q))
    );
  });

  return (
    <div className="p-6 space-y-4 select-none pb-28">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-orange-500" />
            دليل العملاء وكشف الحساب التفصيلي
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            إدارة أرصدة العملاء، متابعة المشتريات والصيانة، إصدار كشوفات الحساب وسداد الذمم
          </p>
        </div>

        <button
          onClick={() => setAddOpen(true)}
          className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-600/30 transition"
        >
          <UserPlus className="w-4 h-4" />
          إضافة عميل جديد
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-[11px] font-bold text-slate-500">إجمالي الذمم المطلوبة في السوق</div>
            <div className="text-xl font-black text-red-600 dark:text-red-400 font-mono mt-0.5">
              {formatJOD(totalDebt)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-[11px] font-bold text-slate-500">عملاء عليهم مبالغ مستحقة</div>
            <div className="text-xl font-black text-slate-800 dark:text-slate-100 font-mono mt-0.5">
              {debtors.length} <span className="text-xs font-normal text-slate-400">عميل</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-[11px] font-bold text-slate-500">سددوا ذممهم بالكامل (خالص)</div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
              {settled.length} <span className="text-xs font-normal text-slate-400">عميل</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
            <Check className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
          <button
            onClick={() => setFilterTab('debtors')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${filterTab === 'debtors'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <span className={`w-2 h-2 rounded-full ${filterTab === 'debtors' ? 'bg-white' : 'bg-red-500'}`} />
            عليهم ذمم مطلوبة ({debtors.length})
          </button>

          <button
            onClick={() => setFilterTab('settled')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${filterTab === 'settled'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <span className={`w-2 h-2 rounded-full ${filterTab === 'settled' ? 'bg-white' : 'bg-emerald-500'}`} />
            المسددين بالكامل / خالصين ({settled.length})
          </button>

          <button
            onClick={() => setFilterTab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${filterTab === 'all'
                ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            جميع العملاء ({customers.length})
          </button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="بحث بالاسم أو الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pr-9 pl-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">اسم العميل</th>
                <th className="p-3.5">رقم الهاتف</th>
                <th className="p-3.5">الرقم الوطني</th>
                <th className="p-3.5">الرصيد الذمة الحالي</th>
                <th className="p-3.5">ملاحظات</th>
                <th className="p-3.5">تاريخ التسجيل</th>
                <th className="p-3.5 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    جاري تحميل بيانات العملاء...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    {filterTab === 'debtors' ? (
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                        <span className="font-bold text-slate-700 dark:text-slate-300">لا توجد أي ذمم مالية مطلوبة حالياً</span>
                        <span className="text-[11px] text-slate-400">جميع العملاء مسددين بالكامل وخالصين</span>
                      </div>
                    ) : filterTab === 'settled' ? (
                      'لا يوجد عملاء خالصين مسجلين بعد'
                    ) : (
                      'لا يوجد عملاء مطابقون للبحث'
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                      {cust.name}
                    </td>
                    <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">
                      {cust.phone || '-'}
                    </td>
                    <td className="p-3.5 font-mono text-slate-500">
                      {cust.idNumber || '-'}
                    </td>
                    <td className="p-3.5 font-mono font-black">
                      {cust.balance > 0 ? (
                        <span className="text-red-600 dark:text-red-400 font-bold">
                          {formatJOD(cust.balance)} (مطلوب)
                        </span>
                      ) : cust.balance < 0 ? (
                        <span className="text-emerald-600">
                          {formatJOD(Math.abs(cust.balance))} (دائن)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-lg text-[11px] font-bold">
                          <Check className="w-3 h-3" /> خالص (0.000 د.أ)
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-slate-500 max-w-[180px] truncate">
                      {cust.notes || '-'}
                    </td>
                    <td className="p-3.5 text-slate-400 font-mono">
                      {cust.createdAt.substring(0, 10)}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openStatement(cust)}
                          title="عرض وطباعة كشف الحساب التفصيلي"
                          className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5 text-orange-500" />
                          كشف حساب
                        </button>

                        {cust.balance > 0 ? (
                          <button
                            onClick={() => {
                              setDebtPayCustomer(cust);
                              setPayAmount(cust.balance > 0 ? String(cust.balance) : '');
                              setVoucherNumber(`RCP-${Date.now().toString().slice(-5)}`);
                              setAutoDeleteOnZero(false);
                            }}
                            title="سداد ذمة أو دفعة نقدية"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            سداد ذمة
                          </button>
                        ) : (
                          <button
                            onClick={() => setCustomerToDelete(cust)}
                            title="حذف سجل العميل نهائياً من النظام"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition flex items-center gap-1 text-xs font-bold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            حذف
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Add Customer */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-orange-500" />
                إضافة عميل جديد للدليل
              </h3>
              <button onClick={() => setAddOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-3 pt-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">اسم العميل:</label>
                <input
                  type="text"
                  placeholder="الاسم الثلاثي أو الرباعي"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">رقم الهاتف (اختياري):</label>
                <input
                  type="text"
                  placeholder="079... أو 078... (يمكن تركه فارغاً)"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono text-left"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">الرقم الوطني (اختياري):</label>
                <input
                  type="text"
                  placeholder="الرقم الوطني للهوية"
                  value={newIdNumber}
                  onChange={(e) => setNewIdNumber(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white font-mono text-left"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ملاحظات وعنوان:</label>
                <input
                  type="text"
                  placeholder="أي تفاصيل أو عنوان العميل..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingCustomer}
                  className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-orange-600/30"
                >
                  <Check className="w-4 h-4" />
                  {submittingCustomer ? 'جاري الإضافة...' : 'حفظ العميل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Pay Customer Debt */}
      {debtPayCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-500" />
                سداد ذمة عميل (سند قبض)
              </h3>
              <button onClick={() => setDebtPayCustomer(null)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePayDebt} className="space-y-3 pt-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{debtPayCustomer.name}</div>
                <div className="text-[11px] text-slate-500 font-mono">{debtPayCustomer.phone}</div>
                <div className="text-xs text-red-600 font-bold mt-1">
                  الرصيد الذمة الحالي: {formatJOD(debtPayCustomer.balance)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">المبلغ المدفوع (د.أ):</label>
                <input
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  value={payAmount}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setPayAmount(cleanNumberInput(e.target.value))}
                  required
                  placeholder="0.000"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-sm font-mono font-bold text-emerald-600 text-left"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">طريقة السداد:</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-semibold"
                >
                  <option value="cash">نقداً (Cash)</option>
                  <option value="card">فيزا / بطاقة (Card)</option>
                  <option value="cliq">كليك / تحويل بنكي (CliQ)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">رقم سند القبض:</label>
                <input
                  type="text"
                  value={voucherNumber}
                  onChange={(e) => setVoucherNumber(e.target.value)}
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-2 text-xs font-mono font-bold"
                />
              </div>

              {debtPayCustomer.balance > 0 && typeof payAmount === 'number' && payAmount >= debtPayCustomer.balance && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-bold">
                    <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    سيتم تصفير الذمة بالكامل (0.000 د.أ) وإزالة العميل تلقائياً من قائمة الذمم المطلوبة.
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-700 dark:text-slate-300 select-none pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60">
                    <input
                      type="checkbox"
                      checked={autoDeleteOnZero}
                      onChange={(e) => setAutoDeleteOnZero(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500"
                    />
                    <span>حذف سجل العميل وسنداته نهائياً من قاعدة البيانات بعد تمام السداد</span>
                  </label>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDebtPayCustomer(null)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/30"
                >
                  <Check className="w-4 h-4" />
                  {submittingPayment ? 'جاري السداد...' : 'تأكيد السداد والقبض'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Customer Account Statement (كشف حساب تفصيلي) */}
      {statementCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl p-6 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" />
                <h3 className="font-bold text-slate-900 dark:text-white">
                  كشف حساب تفصيلي: {statementCustomer.name}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintStatement}
                  className="bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Printer className="w-4 h-4" />
                  طباعة الكشف
                </button>
                <button onClick={() => setStatementCustomer(null)} className="text-slate-400 hover:text-slate-200 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="my-3 overflow-y-auto flex-1 space-y-4 pr-1" id="printable-customer-statement">
              {statementLoading ? (
                <div className="text-center py-12 text-slate-400 text-xs">جاري تحميل حركات العميل...</div>
              ) : statementData ? (
                <>
                  {/* Customer Summary Cards */}
                  <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-center">
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">إجمالي المشتريات</div>
                      <div className="text-sm font-black text-slate-800 dark:text-slate-200">
                        {formatJOD(statementData.totalPurchases)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">إجمالي السدادات</div>
                      <div className="text-sm font-black text-emerald-600">
                        {formatJOD(statementData.totalPaid)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">الرصيد الذمة المتبقي</div>
                      <div className="text-sm font-black text-red-600">
                        {formatJOD(statementData.currentBalance)}
                      </div>
                    </div>
                  </div>

                  {/* 1. Invoices */}
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-orange-500" />
                      فواتير المشتريات ({statementData.invoices.length}):
                    </h4>
                    {statementData.invoices.length === 0 ? (
                      <p className="text-[11px] text-slate-400">لا توجد فواتير مشتريات سابقة</p>
                    ) : (
                      <table className="w-full text-right text-[11px] border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                        <thead className="bg-slate-100 dark:bg-slate-800 font-bold">
                          <tr>
                            <th className="p-2">رقم الفاتورة</th>
                            <th className="p-2">التاريخ</th>
                            <th className="p-2">طريقة الدفع</th>
                            <th className="p-2">إجمالي الفاتورة</th>
                            <th className="p-2">المدفوع</th>
                            <th className="p-2">متبقي ذمة</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                          {statementData.invoices.map((inv) => (
                            <tr key={inv.id}>
                              <td className="p-2 font-bold">{inv.invoiceNumber}</td>
                              <td className="p-2">{inv.createdAt.substring(0, 10)}</td>
                              <td className="p-2 font-sans">{inv.paymentMethod}</td>
                              <td className="p-2">{formatJOD(inv.totalAmount)}</td>
                              <td className="p-2 text-emerald-600">{formatJOD(inv.paidAmount)}</td>
                              <td className="p-2 text-red-600">{formatJOD(inv.remainingAmount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* 2. Repair Tickets */}
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-blue-500" />
                      تذاكر الصيانة ({statementData.repairTickets.length}):
                    </h4>
                    {statementData.repairTickets.length === 0 ? (
                      <p className="text-[11px] text-slate-400">لا توجد أجهزة صيانة مسجلة</p>
                    ) : (
                      <table className="w-full text-right text-[11px] border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                        <thead className="bg-slate-100 dark:bg-slate-800 font-bold">
                          <tr>
                            <th className="p-2">رقم الكرت</th>
                            <th className="p-2">الجهاز</th>
                            <th className="p-2">العطل</th>
                            <th className="p-2">الحالة</th>
                            <th className="p-2">الحساب</th>
                            <th className="p-2">العربون</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {statementData.repairTickets.map((t) => (
                            <tr key={t.id}>
                              <td className="p-2 font-mono font-bold">{t.ticketNumber}</td>
                              <td className="p-2">{t.deviceModel}</td>
                              <td className="p-2">{t.reportedIssue}</td>
                              <td className="p-2">{t.status}</td>
                              <td className="p-2 font-mono">{formatJOD(t.finalCost)}</td>
                              <td className="p-2 font-mono text-emerald-600">{formatJOD(t.advancePayment)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* 3. Debt Payments (سندات القبض المباشرة) */}
                  <div>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-emerald-500" />
                      سندات سداد الذمم النقدية ({statementData.debtPayments.length}):
                    </h4>
                    {statementData.debtPayments.length === 0 ? (
                      <p className="text-[11px] text-slate-400">لا توجد سندات قبض منفصلة مسجلة</p>
                    ) : (
                      <table className="w-full text-right text-[11px] border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                        <thead className="bg-slate-100 dark:bg-slate-800 font-bold">
                          <tr>
                            <th className="p-2">رقم السند</th>
                            <th className="p-2">التاريخ</th>
                            <th className="p-2">المبلغ المسدد</th>
                            <th className="p-2">طريقة الدفع</th>
                            <th className="p-2">المستلم</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                          {statementData.debtPayments.map((dp) => (
                            <tr key={dp.id}>
                              <td className="p-2 font-bold">{dp.voucherNumber}</td>
                              <td className="p-2">{dp.createdAt.substring(0, 10)}</td>
                              <td className="p-2 font-black text-emerald-600">{formatJOD(dp.amount)}</td>
                              <td className="p-2 font-sans">{dp.paymentMethod}</td>
                              <td className="p-2 font-sans">{dp.receivedBy}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setStatementCustomer(null)}
                className="px-5 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Confirm Delete Customer Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white">حذف سجل العميل</h3>
                <p className="text-xs text-slate-400">تأكيد حذف بيانات العميل</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              هل أنت متأكد من حذف العميل <span className="font-bold text-slate-900 dark:text-white">({customerToDelete.name})</span> نهائياً من قاعدة البيانات؟
              <br />
              <span className="text-[11px] text-slate-400 mt-1 block">
                * سيبقى أرشيف فواتير البيع مسجلاً في التقارير المالية لضمان سلامة المحاسبة والأرباح.
              </span>
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={deletingCustomer}
                onClick={handleDeleteCustomer}
                className="bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-red-600/30"
              >
                <Trash2 className="w-4 h-4" />
                {deletingCustomer ? 'جاري الحذف...' : 'نعم، احذف العميل'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
