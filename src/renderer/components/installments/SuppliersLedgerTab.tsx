import React, { useState, useEffect } from 'react';
import { Truck, Plus, Phone, Search, Building2, DollarSign } from 'lucide-react';
import { Supplier } from '../../../shared/types';
import { formatJOD } from '../../../shared/constants';
import { useAppStore } from '../../stores/useAppStore';

export const SuppliersLedgerTab: React.FC = () => {
  const { addToast } = useAppStore();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await window.tigerAPI.getAllSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-6 space-y-4 select-none pb-28">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-6 h-6 text-orange-500" />
            حسابات الموردين وفواتير المشتريات
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            سجل موزعي الأجهزة والإكسسوارات وقطع الغيار وأرصدة الذمم غير المسددة
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-10 text-xs text-slate-400">جاري تحميل الموردين...</div>
        ) : (
          suppliers.map((sup) => (
            <div
              key={sup.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  sup.balance > 0 ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {sup.balance > 0 ? 'مستحق له' : 'رصيد مسدد'}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">{sup.name}</h3>
                <div className="text-[11px] text-slate-400">{sup.companyName || 'مورد محلي'}</div>
                <div className="text-xs font-mono text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-orange-500" />
                  {sup.phone}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500">الرصيد المتبقي له:</span>
                <span className="text-base font-black font-mono text-red-600 dark:text-red-400">
                  {formatJOD(sup.balance)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
