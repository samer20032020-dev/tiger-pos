import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Info, Trash2, X } from 'lucide-react';
import { useConfirmStore } from '../../stores/useConfirmStore';

export const ConfirmDialogModal: React.FC = () => {
  const { current, closeConfirm } = useConfirmStore();
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!current) return;

    const timer = window.setTimeout(() => {
      confirmBtnRef.current?.focus();
    }, 20);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeConfirm(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [current, closeConfirm]);

  if (!current) return null;

  const tone = current.tone ?? 'warning';
  const isDanger = tone === 'danger';
  const isInfo = tone === 'info';

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 font-cairo"
      onClick={() => closeConfirm(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 flex items-start gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isDanger
                ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                : isInfo
                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
            }`}
          >
            {isDanger ? (
              <Trash2 className="w-5 h-5" />
            ) : isInfo ? (
              <Info className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              {current.title || (isDanger ? 'تأكيد الحذف النهائي' : 'تأكيد الإجراء')}
            </h3>
            <p className="mt-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {current.message}
            </p>
          </div>

          <button
            type="button"
            onClick={() => closeConfirm(false)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => closeConfirm(false)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            {current.cancelText || 'إلغاء'}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={() => closeConfirm(true)}
            className={`px-5 py-2 rounded-xl text-xs font-black text-white shadow-md transition ${
              isDanger
                ? 'bg-red-600 hover:bg-red-500 shadow-red-600/25'
                : isInfo
                ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/25'
                : 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/25'
            }`}
          >
            {current.confirmText || (isDanger ? 'نعم، احذف' : 'تأكيد')}
          </button>
        </div>
      </div>
    </div>
  );
};
