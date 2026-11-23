import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, DollarSign, Wrench, CalendarClock, 
  AlertTriangle, ShoppingBag, ArrowUpRight, Flame, Layers 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, CartesianGrid 
} from 'recharts';
import { DashboardStats, Invoice } from '../../../shared/types';
import { useAppStore } from '../../stores/useAppStore';
import { formatJOD } from '../../../shared/constants';

export const DashboardTab: React.FC = () => {
  const { setActiveTab } = useAppStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, invs] = await Promise.all([
        window.tigerAPI.getDashboardStats(),
        window.tigerAPI.getAllInvoices(6)
      ]);
      setStats(s);
      setRecentInvoices(invs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    window.addEventListener('focus', loadData);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', loadData);
    };
  }, []);

  // 7-day trend chart (starts at 0 for fresh new system)
  const weeklyData = [
    { day: 'السبت', sales: 0, profit: 0 },
    { day: 'الأحد', sales: 0, profit: 0 },
    { day: 'الإثنين', sales: 0, profit: 0 },
    { day: 'الثلاثاء', sales: 0, profit: 0 },
    { day: 'الأربعاء', sales: 0, profit: 0 },
    { day: 'الخميس', sales: 0, profit: 0 },
    { day: 'اليوم', sales: stats?.todaySales || 0, profit: stats?.todayNetProfit || 0 },
  ];

  return (
    <div className="p-6 space-y-6 select-none pb-28">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Flame className="w-7 h-7 text-orange-500 animate-pulse" />
            لوحة مؤشرات الأداء والتحكم - TIGER
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            متابعة فورية للمبيعات، صافي الأرباح، تذاكر الصيانة، والأقساط المستحقة
          </p>
        </div>

        <button
          onClick={() => setActiveTab('pos')}
          className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-600/30 transition"
        >
          <ShoppingBag className="w-4 h-4" />
          الانتقال لنقطة البيع (POS)
        </button>
      </div>

      {/* 5 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Today Sales */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">مبيعات اليوم الإجمالية</span>
            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
              {formatJOD(stats?.todaySales || 0)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              عدد الفواتير: {stats?.todayInvoicesCount || 0}
            </div>
          </div>
        </div>

        {/* 2. Today Net Profit (Highlighted) */}
        <div className="bg-gradient-to-tr from-emerald-600 to-teal-600 text-white rounded-2xl p-4 shadow-lg shadow-emerald-600/20 flex flex-col justify-between">
          <div className="flex items-center justify-between opacity-90">
            <span className="text-xs font-bold">صافي الربح الحقيقي اليوم</span>
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black font-mono">
              {formatJOD(stats?.todayNetProfit || 0)}
            </div>
            <div className="text-[10px] opacity-80 mt-0.5">
              بعد خصم تكلفة البضاعة والمصاريف
            </div>
          </div>
        </div>

        {/* 3. Active Repairs */}
        <div 
          onClick={() => setActiveTab('repairs')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500 rounded-2xl p-4 shadow-sm flex flex-col justify-between cursor-pointer transition group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">أجهزة قيد الصيانة</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center font-bold group-hover:scale-110 transition">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
              {stats?.activeRepairsCount || 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              تذاكر استلام بانتظار الإصلاح
            </div>
          </div>
        </div>

        {/* 4. Due Installments */}
        <div 
          onClick={() => setActiveTab('installments')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500 rounded-2xl p-4 shadow-sm flex flex-col justify-between cursor-pointer transition group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">أقساط مستحقة</span>
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center font-bold group-hover:scale-110 transition">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
              {stats?.dueInstallmentsCount || 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              دفعات حان موعد سدادها
            </div>
          </div>
        </div>

        {/* 5. Low-Stock Alerts */}
        <div 
          onClick={() => setActiveTab('accessories')}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-red-500 rounded-2xl p-4 shadow-sm flex flex-col justify-between cursor-pointer transition group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">نواقص المخزون</span>
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center font-bold group-hover:scale-110 transition">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black font-mono text-red-600 dark:text-red-400">
              {stats?.lowStockCount || 0}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              أصناف بلغت الحد الأدنى
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Chart & Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Performance Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                حركة المبيعات وصافي الأرباح (آخر 7 أيام)
              </h2>
              <p className="text-[11px] text-slate-400">مقارنة يومية بين إجمالي المبيعات وصافي الربح المحقق</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-orange-500 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                المبيعات
              </span>
              <span className="flex items-center gap-1.5 text-emerald-500 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                صافي الربح
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis tick={{ fontSize: 11, fill: '#888' }} />
                <Tooltip
                  formatter={(val: number) => [`${val} د.أ`]}
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="sales" name="المبيعات" fill="#f97316" radius={[6, 6, 0, 0]} />
                <Bar dataKey="profit" name="صافي الربح" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Invoices Widget */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-slate-900 dark:text-white">آخر الفواتير الصادرة</h2>
            <span className="text-[10px] text-slate-400">محدث تلقائياً</span>
          </div>

          <div className="space-y-2.5 flex-1">
            {recentInvoices.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">لا توجد فواتير اليوم</div>
            ) : (
              recentInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white font-mono">{inv.invoiceNumber}</div>
                    <div className="text-[10px] text-slate-400">{inv.customerName}</div>
                  </div>
                  <div className="text-left font-mono">
                    <div className="font-bold text-orange-600 dark:text-orange-400">{formatJOD(inv.totalAmount)}</div>
                    <div className="text-[9px] text-slate-400">{inv.createdAt.substring(11, 16)}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => setActiveTab('reports')}
            className="w-full text-center text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline pt-2 border-t border-slate-100 dark:border-slate-800"
          >
            عرض جميع الفواتير والتقارير ➔
          </button>
        </div>
      </div>
    </div>
  );
};
