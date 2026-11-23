import React, { useEffect, useState, useCallback } from 'react';
import { useAppStore } from './stores/useAppStore';
import { useShiftStore } from './stores/useShiftStore';
import { AuthScreen } from './components/auth/AuthScreens';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ShiftModal } from './components/dashboard/ShiftModal';
import { DashboardTab } from './components/dashboard/DashboardTab';
import { PosTab } from './components/pos/PosTab';
import { PhonesTab } from './components/phones/PhonesTab';
import { AccessoriesTab } from './components/accessories/AccessoriesTab';
import { RepairsTab } from './components/repairs/RepairsTab';
import { CustomersTab } from './components/customers/CustomersTab';
import { InstallmentsTab } from './components/installments/InstallmentsTab';
import { SuppliersLedgerTab } from './components/installments/SuppliersLedgerTab';
import { ExpensesTab } from './components/expenses/ExpensesTab';
import { ReportsTab } from './components/reports/ReportsTab';
import { AuditLogTab } from './components/settings/AuditLogTab';
import { SettingsTab } from './components/settings/SettingsTab';
import { RepairTicketModal } from './components/repairs/RepairTicketModal';
import { PhoneModal } from './components/phones/PhoneModal';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { playCashDrawerSound } from './utils/soundUtils';
import { TIGER_LOGO } from './assets/logoData';

export const App: React.FC = () => {
  const { screen, setScreen, activeTab, setActiveTab, toasts, removeToast, currentUser } = useAppStore();
  const { 
    refreshActiveShift, 
    isOpenShiftModalOpen, 
    setOpenShiftModalOpen, 
    isCloseShiftModalOpen, 
    setCloseShiftModalOpen 
  } = useShiftStore();

  const [isFirstRun, setIsFirstRun] = useState<boolean | null>(null);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [activeRepairsCount, setActiveRepairsCount] = useState(0);
  const [isGlobalRepairOpen, setGlobalRepairOpen] = useState(false);
  const [isGlobalPhoneOpen, setGlobalPhoneOpen] = useState(false);

  // Check first run
  useEffect(() => {
    if (window.tigerAPI) {
      window.tigerAPI.getAllUsers().then((users) => {
        if (!users || users.length === 0) {
          setIsFirstRun(true);
          setScreen('setup');
        } else {
          setIsFirstRun(false);
          setScreen('login');
        }
      }).catch(() => {
        setIsFirstRun(false);
        setScreen('login');
      });
    } else {
      setIsFirstRun(false);
      setScreen('login');
    }
  }, []);

  const fetchBadgeCounts = async () => {
    if (window.tigerAPI) {
      try {
        const stats = await window.tigerAPI.getDashboardStats();
        setLowStockCount(stats.lowStockCount);
        setActiveRepairsCount(stats.activeRepairsCount);
      } catch {}
    }
  };

  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    if (screen !== 'app') return;

    // Cash Drawer Kick Shortcut check
    const configuredDrawerShortcut = (localStorage.getItem('tiger_cash_drawer_shortcut') || 'F12').trim();
    let isDrawerMatch = false;
    if (configuredDrawerShortcut.startsWith('Ctrl+')) {
      const k = configuredDrawerShortcut.replace('Ctrl+', '').toLowerCase();
      if (e.ctrlKey && e.key.toLowerCase() === k) isDrawerMatch = true;
    } else if (configuredDrawerShortcut.startsWith('Alt+')) {
      const k = configuredDrawerShortcut.replace('Alt+', '').toLowerCase();
      if (e.altKey && e.key.toLowerCase() === k) isDrawerMatch = true;
    } else if (e.key.toLowerCase() === configuredDrawerShortcut.toLowerCase() || e.code.toLowerCase() === configuredDrawerShortcut.toLowerCase()) {
      isDrawerMatch = true;
    }

    if (isDrawerMatch) {
      const activeEl = document.activeElement?.tagName || '';
      const isInput = ['INPUT', 'TEXTAREA'].includes(activeEl);
      const isFuncKey = configuredDrawerShortcut.startsWith('F') && !isNaN(Number(configuredDrawerShortcut.substring(1)));
      if (!isInput || isFuncKey) {
        e.preventDefault();
        e.stopPropagation();
        playCashDrawerSound();
        if (window.tigerAPI) {
          window.tigerAPI.openCashDrawer().catch(() => {});
        }
        useAppStore.getState().addToast(`🔓 تم فتح درج الكاش! (مفتاح: ${configuredDrawerShortcut})`, 'success');
        return;
      }
    }

    if (e.key === 'F1') { e.preventDefault(); setActiveTab('pos'); }
    else if (e.key === 'F2') { e.preventDefault(); setGlobalRepairOpen(true); }
    else if (e.key === 'F3') { e.preventDefault(); setGlobalPhoneOpen(true); }
    else if (e.key === 'F9') {
      e.preventDefault();
      if (activeTab !== 'pos') setActiveTab('pos');
      setTimeout(() => {
        const input = document.getElementById('pos-barcode-search') as HTMLInputElement | null;
        input?.focus(); input?.select();
      }, 50);
    }
  }, [screen, activeTab, setActiveTab]);

  useEffect(() => {
    if (screen === 'app') {
      refreshActiveShift();
      fetchBadgeCounts();
      const interval = setInterval(fetchBadgeCounts, 15000);
      window.addEventListener('keydown', handleGlobalKeyDown);
      return () => { clearInterval(interval); window.removeEventListener('keydown', handleGlobalKeyDown); };
    }
  }, [screen, handleGlobalKeyDown]);

  // If not logged in, show clean unified Auth screen (with options: مدير / موظف)
  if (!currentUser) {
    return <AuthScreen />;
  }

  // Main App
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-50 dark:bg-slate-950 font-cairo relative">
      {/* Background Watermark Logo (خلفية شفافة وفخمة ومبينة وواضحة للنظام كامل) */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center select-none overflow-hidden"
        aria-hidden="true"
      >
        <img 
          src={TIGER_LOGO} 
          alt="TIGER Watermark" 
          className="w-[460px] max-w-[65vw] max-h-[70vh] object-contain opacity-[0.08] dark:opacity-[0.06] transition-opacity select-none"
        />
      </div>

      <Sidebar lowStockCount={lowStockCount} activeRepairsCount={activeRepairsCount} />

      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <Header
          onOpenShiftModal={() => setOpenShiftModalOpen(true)}
          onCloseShiftModal={() => setCloseShiftModalOpen(true)}
        />

        <main className={`flex-1 relative ${activeTab === 'pos' ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden h-[calc(100vh-64px)]'}`}>
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'pos' && <PosTab />}
          {activeTab === 'phones' && <PhonesTab />}
          {activeTab === 'accessories' && <AccessoriesTab />}
          {activeTab === 'repairs' && <RepairsTab />}
          {activeTab === 'customers' && <CustomersTab />}
          {activeTab === 'installments' && <InstallmentsTab />}
          {activeTab === 'suppliers' && <SuppliersLedgerTab />}
          {activeTab === 'expenses' && <ExpensesTab />}
          {activeTab === 'reports' && <ReportsTab />}
          {activeTab === 'audit' && <AuditLogTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </main>
      </div>

      <RepairTicketModal isOpen={isGlobalRepairOpen} onClose={() => setGlobalRepairOpen(false)} onSuccess={fetchBadgeCounts} />
      <PhoneModal isOpen={isGlobalPhoneOpen} onClose={() => setGlobalPhoneOpen(false)} onSuccess={fetchBadgeCounts} />
      <ShiftModal type="open" isOpen={isOpenShiftModalOpen} onClose={() => setOpenShiftModalOpen(false)} onSuccess={fetchBadgeCounts} />
      <ShiftModal type="close" isOpen={isCloseShiftModalOpen} onClose={() => setCloseShiftModalOpen(false)} onSuccess={fetchBadgeCounts} />

      {/* Bottom Center Toasts (تظهر في أسفل الشاشة وتختفي خلال ثانيتين لعدم حجب أشرطة البحث والبيع) */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex flex-col-reverse items-center space-y-reverse space-y-2 pointer-events-none w-auto max-w-lg px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-5 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-3 text-xs font-bold text-white transition-all transform animate-in fade-in slide-in-from-bottom-3 duration-200 ${
              toast.type === 'success' ? 'bg-emerald-600/95 border border-emerald-500/50' :
              toast.type === 'error' ? 'bg-red-600/95 border border-red-500/50' :
              toast.type === 'warning' ? 'bg-amber-600/95 border border-amber-500/50' : 'bg-slate-900/95 border border-slate-700/50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-200 shrink-0" />}
              {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-200 shrink-0" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-blue-200 shrink-0" />}
              <span className="whitespace-nowrap">{toast.message}</span>
            </div>
            <button onClick={() => removeToast(toast.id)} className="p-1 hover:bg-white/20 rounded-lg transition mr-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
