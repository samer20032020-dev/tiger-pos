import React, { useState, useEffect, useRef } from 'react';
import { 
  Sun, Moon, Clock, DoorOpen, DoorClosed, 
  Bell, AlertTriangle, ExternalLink, Copy, Check, X, ShieldAlert 
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { useShiftStore } from '../../stores/useShiftStore';
import { Accessory } from '../../../shared/types';

interface HeaderProps {
  onOpenShiftModal: () => void;
  onCloseShiftModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenShiftModal, onCloseShiftModal }) => {
  const { 
    darkMode, 
    toggleDarkMode, 
    activeTab, 
    setActiveTab, 
    setCriticalShortageFilter, 
    addToast 
  } = useAppStore();
  const { activeShift } = useShiftStore();
  const [time, setTime] = useState('');

  // Stock Alert Beacon State
  const [criticalItems, setCriticalItems] = useState<Accessory[]>([]);
  const [isBeaconOpen, setIsBeaconOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Time ticker
  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  // Stock Alert Beacon: Poll accessories for items <= 2 pieces (Screens, Batteries, Cables, Parts)
  const checkStockAlerts = async () => {
    try {
      if (window.tigerAPI && window.tigerAPI.getAllAccessories) {
        const all = await window.tigerAPI.getAllAccessories();
        // Flag any item where currentStock <= 2 (critical shortage)
        const critical = all.filter(a => a.currentStock <= 2);
        setCriticalItems(critical);
      }
    } catch (e) {
      console.error('Failed to check stock alerts:', e);
    }
  };

  useEffect(() => {
    checkStockAlerts();
    const interval = setInterval(checkStockAlerts, 12000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // Close popover on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsBeaconOpen(false);
      }
    };
    if (isBeaconOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isBeaconOpen]);

  const handleCopyShortageList = () => {
    if (criticalItems.length === 0) return;
    const text = 
      `🚨 *طلبية نواقص تايجر موبايل المستعجلة* 🚨\n` +
      `التاريخ: ${new Date().toLocaleDateString('ar-JO')}\n` +
      `الأصناف المطلوبة (الرصيد قطعتان أو أقل):\n\n` +
      criticalItems.map((item, idx) => 
        `${idx + 1}. ${item.name} (${item.category})\n   الرصيد المتبقي: ${item.currentStock <= 0 ? 'نفد بالكامل (0)' : `${item.currentStock} قطع`}\n   الباركود: ${item.barcode}`
      ).join('\n\n') +
      `\n\nيرجى تجهيز الطلبية بأسرع وقت، شكراً! 📱`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    addToast('تم نسخ قائمة النواقص بالكامل! جاهزة للإرسال للمورد على واتساب', 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleGoToAccessories = () => {
    setCriticalShortageFilter(true);
    setActiveTab('accessories');
    setIsBeaconOpen(false);
  };

  const tabNames: Record<string, string> = {
    dashboard: 'الرئيسية',
    pos: 'نقطة البيع',
    phones: 'الهواتف & IMEI',
    accessories: 'الإكسسوارات وقطع الغيار',
    repairs: 'الصيانة والدعم الفني',
    customers: 'العملاء والذمم',
    installments: 'الأقساط الشهرية',
    suppliers: 'الموردين والشركات',
    expenses: 'المصاريف اليومية',
    reports: 'التقارير المالية والترحيل',
    audit: 'سجل العمليات',
    settings: 'الإعدادات والنظام',
  };

  return (
    <header className="h-14 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 px-5 flex items-center justify-between flex-shrink-0 relative select-none">
      {/* Page title */}
      <h1 className="font-bold text-gray-800 dark:text-white text-sm">{tabNames[activeTab] || ''}</h1>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Stock Alert Beacon (Automatic Part Shortage Indicator) */}
        <div className="relative" ref={popoverRef}>
          <button
            onClick={() => setIsBeaconOpen(!isBeaconOpen)}
            title={criticalItems.length > 0 ? `تنبيه نواقص المخزون: يوجد ${criticalItems.length} أصناف رصيدها قطعتان أو أقل!` : 'المخزون مكتمل'}
            className={`relative p-2 rounded-xl transition flex items-center gap-1.5 ${
              criticalItems.length > 0
                ? 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            {/* Animated Radar Pulse Beacon */}
            {criticalItems.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex items-center justify-center rounded-full h-4 w-4 bg-red-600 text-white text-[9px] font-black">
                  {criticalItems.length > 9 ? '9+' : criticalItems.length}
                </span>
              </span>
            )}
            <Bell className={`w-4 h-4 ${criticalItems.length > 0 ? 'text-red-500 animate-bounce' : ''}`} />
            {criticalItems.length > 0 && (
              <span className="text-[11px] font-bold hidden sm:inline text-red-600 dark:text-red-400">
                منارة النواقص ({criticalItems.length})
              </span>
            )}
          </button>

          {/* Beacon Dropdown Popover */}
          {isBeaconOpen && (
            <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[85vh]">
              {/* Popover Header */}
              <div className="p-3.5 bg-gradient-to-r from-red-600 to-rose-600 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-yellow-300" />
                  <div>
                    <h3 className="font-black text-xs">منارة تنبيهات النواقص (Stock Alert Beacon)</h3>
                    <p className="text-[10px] text-red-100">
                      قطع غيار وشاشات وبطاريات بحاجة للطلب فوراً
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsBeaconOpen(false)}
                  className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Popover List */}
              <div className="p-3 overflow-y-auto max-h-72 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {criticalItems.length === 0 ? (
                  <div className="text-center py-6 text-slate-400">
                    <Check className="w-8 h-8 mx-auto text-emerald-500 mb-1" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">المخزون ممتاز!</p>
                    <p className="text-[11px]">لا توجد قطع غيار أو إكسسوارات أقل من قطعتين حالياً.</p>
                  </div>
                ) : (
                  criticalItems.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white truncate">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{item.category}</span>
                          <span className="font-mono">({item.barcode})</span>
                        </div>
                      </div>

                      {/* Stock Badge */}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                        item.currentStock <= 0
                          ? 'bg-red-600 text-white animate-pulse'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {item.currentStock <= 0 ? 'نفد (0)' : `${item.currentStock} فقط`}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Popover Footer Actions */}
              {criticalItems.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={handleCopyShortageList}
                    className="flex-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'تم النسخ!' : 'نسخ لواتساب المورد'}</span>
                  </button>

                  <button
                    onClick={handleGoToAccessories}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-sm transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>عرض في المخزون</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Clock */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
          <Clock className="w-3.5 h-3.5" />
          <span className="font-mono">{time}</span>
        </div>

        {/* Shift control */}
        {activeShift ? (
          <button
            onClick={onCloseShiftModal}
            className="flex items-center gap-1.5 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition"
          >
            <DoorClosed className="w-3.5 h-3.5" />
            تسكير
          </button>
        ) : (
          <button
            onClick={onOpenShiftModal}
            className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg transition"
          >
            <DoorOpen className="w-3.5 h-3.5" />
            فتح وردية
          </button>
        )}

        {/* Dark mode */}
        <button
          onClick={toggleDarkMode}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
