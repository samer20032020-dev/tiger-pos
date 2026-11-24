import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, Download, Calendar, DollarSign, 
  CheckCircle2, TrendingUp, Receipt, Wrench, 
  CreditCard, Wallet, Banknote, Search, Layers,
  ChevronDown, CheckSquare, Square, ArrowDownToLine,
  Lock, AlertTriangle, Sparkles, RefreshCw, Eye
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { Invoice, RepairTicket, Expense } from '../../../shared/types';
import { formatJOD } from '../../../shared/constants';
import { WhatsAppIcon } from '../common/WhatsAppIcon';
import { sendWhatsAppMessage, buildInvoiceWhatsAppMessage } from '../../utils/whatsapp';

type ReportTabMode = 'settlement' | 'monthly';
type PostingFilter = 'unposted' | 'posted' | 'all';
type TimeFilter = 'today' | 'yesterday_today' | 'week' | 'month' | 'custom' | 'all';

export const ReportsTab: React.FC = () => {
  const { addToast } = useAppStore();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Active top-level mode
  const [activeMode, setActiveMode] = useState<ReportTabMode>('settlement');

  // Data states
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Settlement tab states
  const [postingFilter, setPostingFilter] = useState<PostingFilter>('unposted');
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [startingCashInput, setStartingCashInput] = useState<string>('0.000');
  const [receiptsOverrideInput, setReceiptsOverrideInput] = useState<string>('');
  const [expectedOverrideInput, setExpectedOverrideInput] = useState<string>('');
  const [actualCashInput, setActualCashInput] = useState<string>('0.000');
  const [isManualReceipts, setIsManualReceipts] = useState<boolean>(false);
  const [isManualExpected, setIsManualExpected] = useState<boolean>(false);

  const startingCash = parseFloat(startingCashInput) || 0;
  const actualCash = parseFloat(actualCashInput) || 0;
  const hasActualCashEntered = actualCashInput.trim() !== '';
  const [postingLoading, setPostingLoading] = useState<boolean>(false);

  // Date Filter states (Audios 4 & 7)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('yesterday_today');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  // Monthly tab states
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [exporting, setExporting] = useState<boolean>(false);
  const [lastExportPath, setLastExportPath] = useState<string | null>(null);

  // Search in transactions
  const [searchQuery, setSearchQuery] = useState('');

  const months = [
    { num: 1, name: 'يناير (شهر 1)' },
    { num: 2, name: 'فبراير (شهر 2)' },
    { num: 3, name: 'مارس (شهر 3)' },
    { num: 4, name: 'أبريل (شهر 4)' },
    { num: 5, name: 'مايو (شهر 5)' },
    { num: 6, name: 'يونيو (شهر 6)' },
    { num: 7, name: 'يوليو (شهر 7)' },
    { num: 8, name: 'أغسطس (شهر 8)' },
    { num: 9, name: 'سبتمبر (شهر 9)' },
    { num: 10, name: 'أكتوبر (شهر 10)' },
    { num: 11, name: 'نوفمبر (شهر 11)' },
    { num: 12, name: 'ديسمبر (شهر 12)' },
  ];

  const loadReportData = async () => {
    if (!window.tigerAPI) return;
    setLoading(true);
    try {
      const [invList, repList, expList, activeShift] = await Promise.all([
        window.tigerAPI.getAllInvoices(300),
        window.tigerAPI.getAllRepairTickets(),
        window.tigerAPI.getAllExpenses(200),
        window.tigerAPI.getActiveShift().catch(() => null)
      ]);
      setInvoices(invList);
      setRepairs(repList);
      setExpenses(expList);
      if (activeShift && activeShift.startingCash !== undefined && activeShift.startingCash !== null) {
        setStartingCashInput(String(activeShift.startingCash));
      }
    } catch (err) {
      console.error('Failed to load reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  // Filter items by time range (Audios 4 & 7: Supports midnight shifts, 48 hours & custom dates)
  const filterByDate = (dateStr?: string | null) => {
    if (!dateStr || timeFilter === 'all') return true;
    const itemDate = new Date(dateStr);
    const now = new Date();

    if (timeFilter === 'today') {
      return itemDate.toDateString() === now.toDateString();
    }
    if (timeFilter === 'yesterday_today') {
      // 48 hours: yesterday & today (essential when working past midnight)
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      return itemDate >= yesterday;
    }
    if (timeFilter === 'week') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      return itemDate >= sevenDaysAgo;
    }
    if (timeFilter === 'month') {
      return itemDate.getFullYear() === now.getFullYear() && itemDate.getMonth() === now.getMonth();
    }
    if (timeFilter === 'custom') {
      if (!startDate && !endDate) return true;
      const itemTime = itemDate.getTime();
      const start = startDate ? new Date(startDate + 'T00:00:00').getTime() : -Infinity;
      const end = endDate ? new Date(endDate + 'T23:59:59').getTime() : Infinity;
      return itemTime >= start && itemTime <= end;
    }
    return true;
  };

  // Monthly stats
  const filteredInvoices = invoices.filter(inv => filterByDate(inv.createdAt));
  const filteredRepairs = repairs.filter(rep => filterByDate(rep.createdAt));
  const filteredExpenses = expenses.filter(exp => filterByDate(exp.createdAt));

  const totalSales = filteredInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const totalInvoicesCount = filteredInvoices.length;
  const cashSales = filteredInvoices.reduce((sum, inv) => sum + (inv.cashAmount || 0), 0);
  const cardSales = filteredInvoices.reduce((sum, inv) => sum + (inv.cardAmount || 0), 0);
  const cliqSales = filteredInvoices.reduce((sum, inv) => sum + (inv.cliqAmount || 0), 0);
  const creditSales = filteredInvoices.reduce((sum, inv) => sum + (inv.creditAmount || 0), 0);
  const totalRepairsRevenue = filteredRepairs.reduce((sum, rep) => sum + (rep.finalCost || rep.advancePayment || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  // Settlement / Unposted Calculations (All pending unposted transactions in drawer)
  const unpostedInvoices = invoices.filter(i => !i.isPosted);
  const periodInvoices = invoices.filter(i => filterByDate(i.createdAt));
  const postedInvoices = invoices.filter(i => i.isPosted && filterByDate(i.createdAt));

  const unpostedSales = unpostedInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
  const unpostedCost = unpostedInvoices.reduce((sum, i) => sum + (i.totalCost || 0), 0);
  const unpostedDiscounts = unpostedInvoices.reduce((sum, i) => sum + (i.discount || 0), 0);
  const unpostedProfit = unpostedInvoices.reduce((sum, i) => sum + (i.totalProfit || 0), 0);
  const unpostedCash = unpostedInvoices.reduce((sum, i) => sum + (i.cashAmount || 0), 0);
  
  // Repairs cash from unposted repairs in drawer
  const unpostedRepairsCash = repairs
    .filter(r => !r.isPosted)
    .reduce((sum, r) => sum + (r.advancePayment || 0) + (r.status === 'delivered' ? Math.max(0, r.finalCost - r.advancePayment) : 0), 0);

  const autoReceipts = unpostedCash + unpostedRepairsCash;
  const effectiveReceipts = isManualReceipts 
    ? (parseFloat(receiptsOverrideInput) || 0) 
    : autoReceipts;
  const autoExpectedDrawerCash = startingCash + effectiveReceipts;
  const totalExpectedDrawerCash = isManualExpected 
    ? (parseFloat(expectedOverrideInput) || 0) 
    : autoExpectedDrawerCash;
  const cashDifference = actualCash - totalExpectedDrawerCash;

  // Filtered transactions for the ledger table
  const displayedInvoices = invoices.filter(inv => {
    // When viewing 'unposted', ALWAYS show all unposted invoices so cashier can review and settle them!
    if (postingFilter === 'unposted') {
      if (inv.isPosted) return false;
    } else if (postingFilter === 'posted') {
      if (!inv.isPosted) return false;
      if (!filterByDate(inv.createdAt)) return false;
    } else {
      // 'all'
      if (!filterByDate(inv.createdAt)) return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      (inv.customerName && inv.customerName.toLowerCase().includes(q)) ||
      (inv.cashierName && inv.cashierName.toLowerCase().includes(q)) ||
      (inv.items && inv.items.some(it => it.name.toLowerCase().includes(q)))
    );
  });

  const handleSelectAll = () => {
    const visibleUnpostedIds = displayedInvoices.filter(i => !i.isPosted).map(i => i.id);
    if (selectedInvoiceIds.length === visibleUnpostedIds.length) {
      setSelectedInvoiceIds([]);
    } else {
      setSelectedInvoiceIds(visibleUnpostedIds);
    }
  };

  const toggleSelectInvoice = (id: string) => {
    setSelectedInvoiceIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handlePostTransactions = async (idsToPost?: string[]) => {
    const targetIds = idsToPost || (selectedInvoiceIds.length > 0 ? selectedInvoiceIds : unpostedInvoices.map(i => i.id));
    if (targetIds.length === 0) {
      addToast('لا توجد عمليات غير مرحلة للترحيل', 'info');
      return;
    }

    if (!confirm(`هل أنت متأكد من ترحيل وإغلاق (${targetIds.length}) عملية في الخزينة ونقلها للأرشيف؟`)) {
      return;
    }

    setPostingLoading(true);
    try {
      const res = await window.tigerAPI.postInvoices(targetIds);
      addToast(`تم ترحيل ${res.count} عملية بنجاح وإغلاق حساب الصندوق لليوم!`, 'success');
      setSelectedInvoiceIds([]);
      await loadReportData();
    } catch (err: any) {
      addToast(err.message || 'فشل ترحيل العمليات', 'error');
    } finally {
      setPostingLoading(false);
    }
  };

  const handleSettleAndResetDrawer = async () => {
    if (!confirm('هل أنت متأكد من ترحيل وإغلاق الصندوق وتصفير اليومية بالكامل؟\nسيتم نقل كافة العمليات وتذاكر الصيانة للأرشيف وتصفير الصندوق والمؤشرات بالكامل لبدء يوم جديد.')) {
      return;
    }

    setPostingLoading(true);
    try {
      const res = await window.tigerAPI.settleAndResetDailyDrawer();
      addToast(`تم ترحيل الصندوق بنجاح (${res.invoiceCount} فواتير، ${res.repairCount} صيانة)! تم تصفير كافة المؤشرات والأرقام بالكامل لبدء يوم جديد.`, 'success');
      setStartingCashInput('0.000');
      setIsManualReceipts(true);
      setReceiptsOverrideInput('0.000');
      setIsManualExpected(true);
      setExpectedOverrideInput('0.000');
      setActualCashInput('0.000');
      setSelectedInvoiceIds([]);
      await loadReportData();
    } catch (err: any) {
      addToast(err.message || 'فشل ترحيل وتصفير الصندوق', 'error');
    } finally {
      setPostingLoading(false);
    }
  };

  const handleExportMonthlyExcel = async () => {
    setExporting(true);
    setLastExportPath(null);
    try {
      const res = await window.tigerAPI.exportMonthlyExcel(selectedYear, selectedMonth);
      if (res.success) {
        setLastExportPath(res.filePath);
        addToast(`تم استخراج تقرير إكسل الشامل بنجاح لشهر ${selectedMonth}/${selectedYear}`, 'success');
      }
    } catch (err: any) {
      addToast(err.message || 'فشل استخراج ملف إكسل', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 select-none max-w-6xl mx-auto pb-28 font-cairo">
      
      {/* Top Header & Main Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-orange-500" />
            <span>إدارة الحسابات والتقارير والجرد</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            ترحيل الخزينة، جرد الصندوق، تتبع الخصومات، والأرباح الشهرية
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveMode('settlement')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
              activeMode === 'settlement'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>إغلاق الخزينة والترحيل اليومي (الجرد)</span>
            {unpostedInvoices.length > 0 && (
              <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-[10px]">
                {unpostedInvoices.length} نشط
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('monthly')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 ${
              activeMode === 'monthly'
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>التقارير المالية وتصدير Excel</span>
          </button>
        </div>
      </div>

      {/* Universal Date Filter Bar (+25% Bigger, Ultra Clear & Vibrant) */}
      <div className="bg-white dark:bg-slate-900 border-2 border-orange-500/30 dark:border-orange-500/20 rounded-3xl p-5 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-bold shadow-md shadow-orange-500/30">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-black text-slate-900 dark:text-white block">
                تصفية الفترة الزمنية للتقارير والعمليات
              </span>
              <span className="text-xs text-slate-400 block font-medium">
                اختر الفترة أو حدد تاريخاً حراً (متاح للشفتات المسائية وما بعد منتصف الليل)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-2 rounded-2xl border border-slate-200 dark:border-slate-700/60">
            {[
              { id: 'today', label: 'اليوم' },
              { id: 'yesterday_today', label: 'أمس واليوم (48 ساعة)' },
              { id: 'week', label: 'آخر 7 أيام' },
              { id: 'month', label: 'هذا الشهر' },
              { id: 'custom', label: 'فترة مخصصة (من - إلى)' },
              { id: 'all', label: 'كافة الفترات' },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTimeFilter(f.id as TimeFilter)}
                className={`px-4 py-2 rounded-xl text-sm font-black transition ${
                  timeFilter === f.id
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30 ring-2 ring-orange-400/50'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {timeFilter === 'custom' && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-6 text-sm animate-fadeIn">
            <div className="flex items-center gap-3">
              <span className="text-slate-900 dark:text-white font-black text-sm">من تاريخ:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border-2 border-orange-500/60 rounded-2xl px-4 py-2 font-mono text-sm font-black text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 shadow-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-900 dark:text-white font-black text-sm">إلى تاريخ:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border-2 border-orange-500/60 rounded-2xl px-4 py-2 font-mono text-sm font-black text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 shadow-sm"
              />
            </div>
            <span className="text-xs text-orange-600 dark:text-orange-400 font-black bg-orange-50 dark:bg-orange-950/40 px-3 py-1.5 rounded-xl border border-orange-200 dark:border-orange-800/40">
              ✓ يتم عرض وتحديث الحسابات بين هذين التاريخين فوراً
            </span>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODE 1: DAILY CASH CLOSING & SETTLEMENT (الجرد والترحيل) */}
      {/* ========================================================= */}
      {activeMode === 'settlement' && (
        <div className="space-y-6">

          {/* Top 5 KPI Cards for Unposted/Current Drawer Session */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            
            {/* 1. Unposted Sales */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-500 block">إجمالي مبيعات الصندوق</span>
              <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
                {formatJOD(unpostedSales)}
              </div>
              <span className="text-[10px] text-slate-400 block">{unpostedInvoices.length} فاتورة غير مرحلة</span>
            </div>

            {/* 2. Total Cost / Wholesale */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-slate-500 block">رأس المال (سعر الجملة)</span>
              <div className="text-xl font-black font-mono text-slate-600 dark:text-slate-300">
                {formatJOD(unpostedCost)}
              </div>
              <span className="text-[10px] text-slate-400 block">تكلفة البضاعة المباعة</span>
            </div>

            {/* 3. Discounts given by employee */}
            <div className="bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/60 rounded-3xl p-4 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-orange-700 dark:text-orange-400 block">خصومات الموظف الممنوحة</span>
              <div className="text-xl font-black font-mono text-orange-600 dark:text-orange-400">
                {formatJOD(unpostedDiscounts)}
              </div>
              <span className="text-[10px] text-orange-600/70 dark:text-orange-400/70 block">إجمالي الخصم للزبائن</span>
            </div>

            {/* 4. Net Profit */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-3xl p-4 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block">صافي أرباح اليوم</span>
              <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatJOD(unpostedProfit)}
              </div>
              <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 block">البيع - الجملة</span>
            </div>

            {/* 5. Total Cash in Drawer */}
            <div className="col-span-2 sm:col-span-1 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-3xl p-4 shadow-sm space-y-1">
              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 block">نقدية المبيعات والصيانة</span>
              <div className="text-xl font-black font-mono text-blue-600 dark:text-blue-400">
                {formatJOD(unpostedCash + unpostedRepairsCash)}
              </div>
              <span className="text-[10px] text-blue-600/70 dark:text-blue-400/70 block">المقبوض نقداً اليوم</span>
            </div>

          </div>

          {/* Cash Reconciliation & Day Closing Panel */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-3xl p-6 text-white shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-bold shadow-lg shadow-orange-500/30">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black">حاسبة جرد الصندوق وترحيل الخزينة لليوم</h2>
                  <p className="text-xs text-slate-300">
                    مطابقة الكاش الفعلي بالدرج مع حسابات النظام لليوم قبل إغلاق الخزينة
                  </p>
                </div>
              </div>

              {/* Master Posting & Day Reset Button */}
              <button
                type="button"
                onClick={() => handleSettleAndResetDrawer()}
                disabled={postingLoading}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-6 py-3 rounded-2xl text-xs font-black transition flex items-center justify-center gap-2 shadow-xl shadow-orange-500/40 hover:shadow-orange-500/60 ring-2 ring-orange-400/40 cursor-pointer shrink-0"
              >
                <ArrowDownToLine className="w-4 h-4" />
                <span>
                  {postingLoading
                    ? 'جاري الترحيل وتصفير الصندوق...'
                    : `ترحيل الصندوق وتصفير اليومية بالكامل (${unpostedInvoices.length} فواتير)`}
                </span>
              </button>
            </div>

            {/* Reconciliation Equation: Starting + Today Sales = Expected vs Actual (Fully Editable With Glowing Highlights) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              
              {/* 1. Starting Cash */}
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 block">الرصيد الافتتاحي (الصبح):</label>
                  <button
                    type="button"
                    onClick={() => setStartingCashInput('0.000')}
                    className="text-[10px] text-slate-400 hover:text-red-400 font-bold"
                  >
                    تصفير (0)
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    placeholder="0.000"
                    value={startingCashInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      const parts = val.split('.');
                      const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : val;
                      setStartingCashInput(sanitized);
                    }}
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-sm font-mono font-black text-white focus:outline-none focus:border-orange-500 select-text text-left"
                  />
                  <span className="text-xs text-slate-400 font-bold shrink-0">د.أ</span>
                </div>
                <span className="text-[10px] text-slate-400 block">المبلغ الذي بدأ به الدرج (عدله بحرية)</span>
              </div>

              {/* 2. Today's Cash Flow (Editable / Overridable) */}
              <div className="bg-slate-800/80 border border-emerald-500/40 rounded-2xl p-4 space-y-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300 block">+ مقبوضات اليوم النقدية:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsManualReceipts(true);
                        setReceiptsOverrideInput('0.000');
                      }}
                      className="text-[10px] text-slate-400 hover:text-red-400 font-bold"
                    >
                      تصفير (0)
                    </button>
                    {isManualReceipts && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsManualReceipts(false);
                          setReceiptsOverrideInput('');
                        }}
                        className="text-[10px] text-orange-400 hover:text-orange-300 font-bold underline"
                        title="استعادة الحساب التلقائي"
                      >
                        استعادة التلقائي
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    placeholder="0.000"
                    value={isManualReceipts ? receiptsOverrideInput : (autoReceipts > 0 ? autoReceipts.toFixed(3) : '0.000')}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      const parts = val.split('.');
                      const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : val;
                      setIsManualReceipts(true);
                      setReceiptsOverrideInput(sanitized);
                    }}
                    className="w-full bg-slate-900 border border-emerald-500/50 rounded-xl px-3 py-2 text-sm font-mono font-black text-emerald-400 focus:outline-none focus:border-emerald-400 select-text text-left"
                  />
                  <span className="text-xs text-slate-400 font-bold shrink-0">د.أ</span>
                </div>
                <span className="text-[10px] text-slate-400 block">مبيعات ({formatJOD(unpostedCash)}) + صيانة ({formatJOD(unpostedRepairsCash)})</span>
              </div>

              {/* 3. Expected Total (Glowing Prominent / Editable) */}
              <div className="bg-slate-800/90 border-2 border-orange-500 rounded-2xl p-4 space-y-1.5 shadow-[0_0_20px_rgba(249,115,22,0.35)] ring-2 ring-orange-500/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-orange-300 block">= الكاش المفترض بالدرج:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsManualExpected(true);
                        setExpectedOverrideInput('0.000');
                      }}
                      className="text-[10px] text-slate-400 hover:text-red-400 font-bold"
                    >
                      تصفير (0)
                    </button>
                    {isManualExpected && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsManualExpected(false);
                          setExpectedOverrideInput('');
                        }}
                        className="text-[10px] text-orange-400 hover:text-orange-300 font-bold underline"
                        title="استعادة الحساب التلقائي"
                      >
                        استعادة التلقائي
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    placeholder="0.000"
                    value={isManualExpected ? expectedOverrideInput : (autoExpectedDrawerCash > 0 ? autoExpectedDrawerCash.toFixed(3) : '0.000')}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      const parts = val.split('.');
                      const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : val;
                      setIsManualExpected(true);
                      setExpectedOverrideInput(sanitized);
                    }}
                    className="w-full bg-slate-900 border border-orange-500/60 rounded-xl px-3 py-2 text-base font-mono font-black text-orange-400 focus:outline-none focus:border-orange-400 select-text text-left"
                  />
                  <span className="text-xs text-slate-400 font-bold shrink-0">د.أ</span>
                </div>
                <span className="text-[10px] text-slate-400 block">المجموع الحسابي المطلوب (افتتاحي + مقبوضات)</span>
              </div>

              {/* 4. Actual Cash Input & Difference (Glowing Status) */}
              <div className={`bg-slate-800/80 rounded-2xl p-4 space-y-1.5 transition ${
                hasActualCashEntered && Math.abs(cashDifference) > 0.005 && cashDifference < 0
                  ? 'border-2 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.35)] ring-2 ring-red-500/50'
                  : hasActualCashEntered && Math.abs(cashDifference) < 0.005
                  ? 'border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.35)] ring-2 ring-emerald-500/50'
                  : 'border border-slate-700'
              }`}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 block">الكاش الفعلي بعد العد بالدرج:</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActualCashInput('0.000')}
                      className="text-[10px] text-slate-400 hover:text-red-400 font-bold"
                    >
                      تصفير (0)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActualCashInput(totalExpectedDrawerCash > 0 ? totalExpectedDrawerCash.toFixed(3) : '0.000')}
                      className="text-[10px] text-orange-400 hover:text-orange-300 font-bold underline"
                      title="تعبئة الكاش الفعلي ليطابق المفترض"
                    >
                      مطابقة مع المفترض
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    dir="ltr"
                    placeholder="0.000"
                    value={actualCashInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      const parts = val.split('.');
                      const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : val;
                      setActualCashInput(sanitized);
                    }}
                    className="w-full bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-orange-500 select-text text-left"
                  />
                  <span className="text-xs text-slate-400 font-bold shrink-0">د.أ</span>
                </div>
                <div className="text-[11px] font-bold pt-1">
                  {!hasActualCashEntered ? (
                    <span className="text-slate-400">أدخل المبلغ الفعلي للمطابقة</span>
                  ) : Math.abs(cashDifference) < 0.005 ? (
                    <span className="text-emerald-400 font-black flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      متطابق تماماً بدون أي فارق!
                    </span>
                  ) : cashDifference > 0 ? (
                    <span className="text-blue-400 font-black">
                      يوجد فائض بالدرج: +{formatJOD(cashDifference)}
                    </span>
                  ) : (
                    <span className="text-red-400 font-black flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      يوجد عجز ونقص: {formatJOD(cashDifference)}
                    </span>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Detailed Transactions Ledger Table with Posting & Cost/Profit Breakdown */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-black text-slate-800 dark:text-white">
                  سجل العمليات وتفاصيل التكلفة والخصومات
                </h2>

                {/* Filter: Unposted vs Posted vs All */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setPostingFilter('unposted')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      postingFilter === 'unposted'
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    غير مرحل ({unpostedInvoices.length})
                  </button>
                  <button
                    onClick={() => setPostingFilter('posted')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      postingFilter === 'posted'
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    مرحّل ومغلق ({postedInvoices.length})
                  </button>
                  <button
                    onClick={() => setPostingFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition ${
                      postingFilter === 'all'
                        ? 'bg-orange-500 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    الكل ({periodInvoices.length})
                  </button>
                </div>
              </div>

              {/* Search Bar & Select All Action */}
              <div className="flex items-center gap-2">
                {postingFilter !== 'posted' && unpostedInvoices.length > 0 && (
                  <button
                    onClick={handleSelectAll}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
                  >
                    {selectedInvoiceIds.length > 0 ? <CheckSquare className="w-3.5 h-3.5 text-orange-500" /> : <Square className="w-3.5 h-3.5" />}
                    <span>{selectedInvoiceIds.length > 0 ? `إلغاء التحديد (${selectedInvoiceIds.length})` : 'تحديد غير المرحل'}</span>
                  </button>
                )}

                <div className="relative w-56">
                  <input
                    type="text"
                    placeholder="بحث برقم الفاتورة أو العميل..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl pr-8 pl-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="p-3 w-10 text-center">#</th>
                    <th className="p-3">رقم الفاتورة</th>
                    <th className="p-3">الوقت والتاريخ</th>
                    <th className="p-3">المواد المباعة (اسم القطعة والكمية)</th>
                    <th className="p-3">التكلفة (جملة)</th>
                    <th className="p-3">سعر البيع</th>
                    <th className="p-3">الخصم الممنوح</th>
                    <th className="p-3">صافي الربح</th>
                    <th className="p-3">طريقة الدفع</th>
                    <th className="p-3 text-center">حالة الترحيل</th>
                    <th className="p-3 text-center">واتساب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {displayedInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-8 text-center text-slate-400 text-xs">
                        {postingFilter === 'unposted' ? (
                          <div className="flex flex-col items-center justify-center gap-2 py-4">
                            <CheckCircle2 className="w-7 h-7 text-emerald-500 animate-bounce" />
                            <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                              ممتاز! لا توجد فواتير غير مرحلة حالياً
                            </span>
                            <span className="text-[11px] text-slate-400">
                              كافة مبيعات الصندوق مرحلة ومغلقة بنجاح ومطابقة للخزينة
                            </span>
                          </div>
                        ) : postingFilter === 'posted' ? (
                          'لا توجد فواتير مرحلة ومغلقة ضمن الفترة الزمنية المحددة'
                        ) : (
                          'لا توجد فواتير مسجلة ضمن هذه الفترة'
                        )}
                      </td>
                    </tr>
                  ) : (
                    displayedInvoices.slice(0, 100).map(inv => {
                      const isSelected = selectedInvoiceIds.includes(inv.id);
                      const isPriorShift = !inv.isPosted && !filterByDate(inv.createdAt);
                      return (
                        <tr
                          key={inv.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                            isSelected ? 'bg-orange-50/40 dark:bg-orange-950/20' : ''
                          }`}
                        >
                          <td className="p-3 text-center">
                            {!inv.isPosted ? (
                              <button
                                onClick={() => toggleSelectInvoice(inv.id)}
                                className="text-slate-400 hover:text-orange-500 transition"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-orange-500" />
                                ) : (
                                  <Square className="w-4 h-4" />
                                )}
                              </button>
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                            )}
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                            {inv.invoiceNumber}
                          </td>
                          <td className="p-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                            <div>{inv.createdAt ? inv.createdAt.replace('T', ' ').substring(5, 16) : '-'}</div>
                            {isPriorShift && (
                              <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 text-[9px] font-bold">
                                شفت سابق
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {inv.items && inv.items.length > 0 ? (
                                inv.items.map((it, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 shadow-sm"
                                  >
                                    <span>{it.name}</span>
                                    <span className="font-mono text-orange-600 dark:text-orange-400 font-extrabold">
                                      ×{it.quantity}
                                    </span>
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 font-mono font-semibold text-slate-500">
                            {formatJOD(inv.totalCost || 0)}
                          </td>
                          <td className="p-3 font-mono font-black text-slate-900 dark:text-white">
                            {formatJOD(inv.totalAmount)}
                          </td>
                          <td className="p-3 font-mono font-bold">
                            {inv.discount > 0 ? (
                              <span className="text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/60 px-1.5 py-0.5 rounded">
                                -{formatJOD(inv.discount)}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            +{formatJOD(inv.totalProfit || 0)}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {inv.paymentMethod === 'cash' ? 'نقدي' :
                               inv.paymentMethod === 'card' ? 'بطاقة' :
                               inv.paymentMethod === 'cliq' ? 'كليك' :
                               inv.paymentMethod === 'split' ? 'مقسم' : 'ذمم'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {inv.isPosted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>مرحّل للأرشيف</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 shadow-sm">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                </span>
                                <span>غير مرحّل (نشط)</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {inv.customerPhone ? (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const msg = buildInvoiceWhatsAppMessage(inv);
                                  const res = await sendWhatsAppMessage(inv.customerPhone!, msg);
                                  if (res.success) {
                                    addToast(`تم فتح واتساب للعميل (${inv.customerName})`, 'success');
                                  } else {
                                    addToast(res.error || 'فشل إرسال الفاتورة', 'error');
                                  }
                                }}
                                title={`إرسال الفاتورة عبر واتساب (${inv.customerPhone})`}
                                className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 transition"
                              >
                                <WhatsAppIcon className="w-3.5 h-3.5 fill-current" />
                              </button>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Audio 3: Bottom Shift Settlement & Day Closing Bar */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-4 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold shadow-md shadow-orange-500/30">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black">
                    إغلاق وترحيل اليومية وجرد الصندوق
                  </div>
                  <div className="text-[11px] text-slate-300">
                    المفترض بالدرج: <span className="font-mono font-bold text-orange-400">{formatJOD(totalExpectedDrawerCash)}</span>
                    {hasActualCashEntered && (
                      <span className="mr-2">
                        | الفعلي: <span className="font-mono font-bold text-emerald-400">{formatJOD(actualCash)}</span>
                        {' '}({Math.abs(cashDifference) < 0.005 ? 'متطابق بدون فارق' : cashDifference > 0 ? `فائض +${formatJOD(cashDifference)}` : `عجز ${formatJOD(cashDifference)}`})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSettleAndResetDrawer()}
                disabled={postingLoading}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-6 py-3 rounded-2xl text-xs font-black transition flex items-center gap-2 shadow-lg shadow-orange-500/30 shrink-0 cursor-pointer"
              >
                <ArrowDownToLine className="w-4 h-4" />
                <span>
                  {postingLoading
                    ? 'جاري الترحيل وتصفير الصندوق...'
                    : `ترحيل الصندوق وتصفير اليومية بالكامل (${unpostedInvoices.length} فواتير)`}
                </span>
              </button>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 2: MONTHLY FINANCIAL REPORTS & EXCEL EXPORT          */}
      {/* ========================================================= */}
      {activeMode === 'monthly' && (
        <div className="space-y-6">

          {/* Time Filter Chips */}
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold text-slate-500">تصفية الفترة الزمنية للتقارير:</span>
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
              {[
                { id: 'today', label: 'اليوم' },
                { id: 'week', label: 'آخر 7 أيام' },
                { id: 'month', label: 'هذا الشهر' },
                { id: 'all', label: 'كافة الفترات' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTimeFilter(tab.id as TimeFilter)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                    timeFilter === tab.id
                      ? 'bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* KPI Financial Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. Total Sales */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">إجمالي المبيعات</span>
                <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                {formatJOD(totalSales)}
              </div>
              <div className="text-[11px] text-slate-400">
                {totalInvoicesCount} فاتورة بيع منفذة
              </div>
            </div>

            {/* 2. Repairs Revenue */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">إيرادات الصيانة</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                  <Wrench className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
                {formatJOD(totalRepairsRevenue)}
              </div>
              <div className="text-[11px] text-slate-400">
                {filteredRepairs.length} أجهزة تم استلامها
              </div>
            </div>

            {/* 3. Expenses */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">المصاريف التشغيلية</span>
                <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-red-600 dark:text-red-400">
                {formatJOD(totalExpenses)}
              </div>
              <div className="text-[11px] text-slate-400">
                {filteredExpenses.length} سندات صرف مسجلة
              </div>
            </div>

            {/* 4. Net Total Flow */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">صافي التدفق المالي</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatJOD(Math.max(0, totalSales + totalRepairsRevenue - totalExpenses))}
              </div>
              <div className="text-[11px] text-slate-400">
                المبيعات + الصيانة - المصاريف
              </div>
            </div>

          </div>

          {/* Payment Methods Breakdown */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <h2 className="text-xs font-black text-slate-700 dark:text-slate-300">
              توزيع المقبوضات حسب طريقة الدفع
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1">
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span>نقدي (Cash)</span>
                </div>
                <div className="text-lg font-black font-mono text-slate-800 dark:text-white">
                  {formatJOD(cashSales)}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>بطاقات بنكية</span>
                </div>
                <div className="text-lg font-black font-mono text-slate-800 dark:text-white">
                  {formatJOD(cardSales)}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1">
                  <Wallet className="w-4 h-4 text-purple-600" />
                  <span>CliQ ومحافظ</span>
                </div>
                <div className="text-lg font-black font-mono text-slate-800 dark:text-white">
                  {formatJOD(cliqSales)}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1">
                  <Receipt className="w-4 h-4 text-amber-600" />
                  <span>ذمم وآجل</span>
                </div>
                <div className="text-lg font-black font-mono text-slate-800 dark:text-white">
                  {formatJOD(creditSales)}
                </div>
              </div>
            </div>
          </div>

          {/* Modern Excel Export Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-800 dark:text-white">تصدير تقرير محاسبي كامل إلى Excel</h2>
                  <p className="text-[11px] text-slate-400">ملف إكسل منسق وجاهز بـ 6 أوراق عمل للمبيعات، الصيانة، والمصاريف</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-end gap-3 pt-1">
              <div className="w-full sm:w-44">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">السنة:</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold"
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                  <option value={2027}>2027</option>
                </select>
              </div>

              <div className="w-full sm:w-56">
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">الشهر:</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold"
                >
                  {months.map(m => (
                    <option key={m.num} value={m.num}>{m.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleExportMonthlyExcel}
                disabled={exporting}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-6 py-2 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition"
              >
                <Download className="w-4 h-4" />
                <span>{exporting ? 'جاري التصدير...' : 'تصدير ملف Excel الآن'}</span>
              </button>
            </div>

            {lastExportPath && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <div className="truncate">
                  تم تصدير وحفظ الملف بنجاح في: <span className="font-mono font-bold">{lastExportPath}</span>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
