import React from 'react';
import { 
  LayoutDashboard, ShoppingCart, Smartphone, Package, 
  Wrench, CalendarClock, Truck, Receipt, FileSpreadsheet, 
  ShieldAlert, Settings, LogOut, Users, AlertCircle, Cpu
} from 'lucide-react';
import { useAppStore, NavTab } from '../../stores/useAppStore';
import { useShiftStore } from '../../stores/useShiftStore';
import { TIGER_LOGO } from '../../assets/logoData';

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ElementType;
  badge?: number;
  tag?: string;
  adminOnly?: boolean;
}

interface SidebarProps {
  lowStockCount?: number;
  activeRepairsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  lowStockCount = 0,
  activeRepairsCount = 0
}) => {
  const { activeTab, setActiveTab, currentUser, setCurrentUser, setScreen } = useAppStore();
  const { activeShift } = useShiftStore();
  const isAdmin = currentUser?.role === 'admin';

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'pos', label: 'نقطة البيع', icon: ShoppingCart },
    { id: 'phones', label: 'الهواتف & IMEI', icon: Smartphone },
    { id: 'accessories', label: 'الإكسسوارات', icon: Package, badge: lowStockCount > 0 ? lowStockCount : undefined },
    { id: 'repairs', label: 'الصيانة', icon: Wrench, badge: activeRepairsCount > 0 ? activeRepairsCount : undefined },
    { id: 'repair_parts', label: 'قطع الصيانة', icon: Cpu },
    { id: 'customers', label: 'العملاء', icon: Users },
    { id: 'installments', label: 'الأقساط', icon: CalendarClock, tag: 'قريباً' },
    { id: 'suppliers', label: 'الموردين', icon: Truck, adminOnly: true },
    { id: 'expenses', label: 'المصاريف', icon: Receipt, adminOnly: true },
    { id: 'reports', label: 'التقارير', icon: FileSpreadsheet, adminOnly: true },
    { id: 'audit', label: 'سجل العمليات', icon: ShieldAlert, adminOnly: true },
    { id: 'settings', label: 'الإعدادات', icon: Settings, adminOnly: true },
  ];

  const visibleItems = isAdmin ? navItems : navItems.filter(i => !i.adminOnly);

  const handleLogout = () => {
    setCurrentUser(null);
    setScreen('login');
  };

  return (
    <aside className="w-56 bg-white border-l border-gray-100 flex flex-col select-none">
      {/* Brand */}
      <div className="px-4 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <img
            src={TIGER_LOGO}
            alt="TIGER MOBILE"
            className="w-10 h-10 object-contain rounded-xl shrink-0 drop-shadow-sm"
          />
          <div>
            <div className="font-black text-gray-900 text-base tracking-wider leading-none">TIGER</div>
            <div className="text-[10px] text-gray-400 font-bold mt-1">MOBILE</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-orange-50 text-orange-600 font-semibold'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-orange-500' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.tag ? (
                <span className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-black">
                  {item.tag}
                </span>
              ) : item.badge !== undefined && (
                <span className="text-[11px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Shift warning (employee) */}
      {!activeShift && !isAdmin && (
        <div className="px-3 py-2">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center gap-2 text-amber-700">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs">لا توجد وردية</span>
          </div>
        </div>
      )}

      {/* User footer */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs flex-shrink-0">
              {currentUser?.fullName.substring(0, 1) || '?'}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-semibold text-gray-800 truncate">{currentUser?.fullName}</div>
              <div className="text-[10px] text-gray-400">{currentUser?.role === 'admin' ? 'مدير عام' : 'موظف'}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="تسجيل خروج"
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
