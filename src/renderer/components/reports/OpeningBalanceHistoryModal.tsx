import React from 'react';
import { X, Clock, History, ArrowDownToLine, RotateCcw, Edit3 } from 'lucide-react';
import { OpeningBalanceEntry } from '../../../shared/types';
import { formatJOD } from '../../../shared/constants';
import { formatLocalDateTime } from '../../../shared/dateUtils';
import { useEscapeClose } from '../../utils/useEscapeStack';

interface OpeningBalanceHistoryModalProps {
  isOpen: boolean;
  entries: OpeningBalanceEntry[];
  loading?: boolean;
  onClose: () => void;
}

export const OpeningBalanceHistoryModal: React.FC<OpeningBalanceHistoryModalProps> = ({
  isOpen,
  entries,
  loading = false,
  onClose,
}) => {
  useEscapeClose(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-3xl w-full max-w-lg max-h-[82vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span>سجل أرقام الرصيد الافتتاحي (الصبح)</span>
                <span className="text-[11px] font-mono bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full">
                  {entries.length}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                كل رقم تم إدخاله أو ترحيله للرصيد الافتتاحي مع الساعة والتاريخ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
            title="إغلاق (ESC)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-xs text-slate-400">جاري تحميل السجل...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              لا توجد أرقام مسجلة بعد — أي رقم تضعه أو ترحله سيظهر هنا تلقائياً بالساعة والتاريخ
            </div>
          ) : (
            entries.map((entry, idx) => {
              const isSettlement = entry.source === 'settlement';
              const isReset = entry.source === 'reset';
              return (
                <div
                  key={entry.id || idx}
                  className={`flex items-center justify-between gap-3 p-3 rounded-2xl border text-xs ${
                    idx === 0
                      ? 'bg-orange-50/70 dark:bg-orange-950/25 border-orange-200 dark:border-orange-800/60'
                      : 'bg-slate-50/80 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isSettlement
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : isReset
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {isSettlement ? (
                        <ArrowDownToLine className="w-4 h-4" />
                      ) : isReset ? (
                        <RotateCcw className="w-4 h-4" />
                      ) : (
                        <Edit3 className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black font-mono text-sm text-slate-900 dark:text-white">
                          {formatJOD(entry.amount)}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isSettlement
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : isReset
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                          }`}
                        >
                          {isSettlement ? 'ترحيل وجمع' : isReset ? 'تصفير' : 'تعديل يدوي'}
                        </span>
                      </div>
                      {entry.note && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {entry.note}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <div className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{formatLocalDateTime(entry.createdAt)}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 text-left">
                      {entry.actorName}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold transition"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
