import React, { useState, useEffect } from 'react';
import { X, History, Clock, ArrowRight, ShieldCheck, Tag } from 'lucide-react';
import { ImeiHistory } from '../../../shared/types';
import { formatLocalDateTime } from '../../../shared/dateUtils';
import { useEscapeClose } from '../../utils/useEscapeStack';

interface ImeiHistoryModalProps {
  imei: string;
  phoneTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ImeiHistoryModal: React.FC<ImeiHistoryModalProps> = ({
  imei,
  phoneTitle,
  isOpen,
  onClose
}) => {
  useEscapeClose(isOpen, onClose);
  const [history, setHistory] = useState<ImeiHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && imei) {
      setLoading(true);
      window.tigerAPI.getImeiHistory(imei)
        .then(res => setHistory(res))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, imei]);

  if (!isOpen) return null;

  const actionLabels: Record<string, { label: string; color: string }> = {
    purchased: { label: 'إدخال وشراء', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' },
    sold: { label: 'بيع', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300' },
    trade_in: { label: 'تبديل Trade-In', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300' },
    returned: { label: 'إرجاع للمخزون', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' },
    sent_to_repair: { label: 'تحويل للصيانة', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' },
    repaired: { label: 'إصلاح الجهاز', color: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300' },
    status_changed: { label: 'تغيير الحالة', color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-orange-500" />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">سجل ودورة حياة الجهاز (IMEI Timeline)</h3>
              <p className="text-[11px] text-slate-500 font-mono">IMEI: {imei} | {phoneTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeline */}
        <div className="my-4 overflow-y-auto flex-1 space-y-4 pr-2">
          {loading ? (
            <div className="text-center py-8 text-xs text-slate-400">جاري تحميل السجل...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">لا يوجد سجل حركات سابق لهذا الرقم التسلسلي</div>
          ) : (
            history.map((item, idx) => {
              const act = actionLabels[item.action] || { label: item.action, color: 'bg-slate-100 text-slate-800' };
              return (
                <div key={item.id} className="relative flex items-start gap-3 border-r-2 border-orange-500/30 pr-4 pb-2">
                  <div className="absolute -right-2 top-0 w-3.5 h-3.5 rounded-full bg-orange-500 ring-4 ring-orange-500/20" />
                  <div className="flex-1 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700/60">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${act.color}`}>
                        {act.label}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {formatLocalDateTime(item.createdAt)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                      {item.description}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                      <span>المسؤول:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{item.actor}</span>
                      {item.referenceId && (
                        <span className="mr-2 font-mono">مرجع: #{item.referenceId}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
