import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, AlertCircle, Clock, User } from 'lucide-react';
import { AuditLog } from '../../../shared/types';

export const AuditLogTab: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await window.tigerAPI.getAuditLogs(150);
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const actionLabels: Record<string, { label: string; color: string }> = {
    invoice_deleted: { label: 'استرجاع فاتورة', color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
    price_override: { label: 'تعديل سعر بيع', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
    stock_adjusted: { label: 'تعديل مخزون', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
    shift_closed: { label: 'فتح/إغلاق وردية', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
    user_created: { label: 'إدارة المستخدمين', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
    repair_updated: { label: 'تحديث صيانة', color: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300' },
    backup_restored: { label: 'استرجاع نسخة احتياطية', color: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' }
  };

  const filtered = logs.filter(l => 
    l.details.toLowerCase().includes(search.toLowerCase()) ||
    l.actorName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-4 select-none">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-orange-500" />
            سجل الرقابة والعمليات المحمية (Immutable Audit Log)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            سجل غير قابل للتعديل يوثق كل عملية استرجاع، تعديل أسعار، تغيير مخزون، وإغلاق وردية
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3.5">الوقت والتاريخ</th>
                <th className="p-3.5">نوع العملية</th>
                <th className="p-3.5">المستخدم المسؤول</th>
                <th className="p-3.5">تفاصيل الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8 text-slate-400">جاري تحميل السجل...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-slate-400">لا توجد عمليات مسجلة</td></tr>
              ) : (
                filtered.map((log) => {
                  const meta = actionLabels[log.actionType] || { label: log.actionType, color: 'bg-slate-100 text-slate-800' };
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                      <td className="p-3.5 font-mono text-slate-500 whitespace-nowrap">
                        {log.createdAt.replace('T', ' ').substring(0, 19)}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                        {log.actorName}
                      </td>
                      <td className="p-3.5 text-slate-700 dark:text-slate-300">
                        {log.details}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
