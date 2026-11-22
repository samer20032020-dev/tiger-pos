import React from 'react';
import { CalendarClock } from 'lucide-react';

export const InstallmentsTab: React.FC = () => {
  return (
    <div className="p-6 select-none max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-140px)] text-center font-cairo">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 max-w-sm w-full shadow-lg flex flex-col items-center justify-center space-y-4 animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-500 flex items-center justify-center shadow-sm">
          <CalendarClock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white">
          قريباً
        </h2>
      </div>
    </div>
  );
};
