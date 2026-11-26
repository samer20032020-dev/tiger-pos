import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export interface RowActionItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'warning' | 'danger' | 'purple' | 'info' | 'orange';
}

interface RowActionsMenuProps {
  actions: RowActionItem[];
}

export const RowActionsMenu: React.FC<RowActionsMenuProps> = ({ actions }) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; openUp: boolean }>({
    top: 0,
    left: 0,
    openUp: false
  });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuWidth = 192; // w-48
    const estimatedHeight = actions.length * 36 + 12;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < estimatedHeight + 16 && rect.top > estimatedHeight + 16;

    // Align menu left edge inside viewport (RTL friendly: right-aligned to button or clamped)
    let left = rect.left;
    if (left + menuWidth > window.innerWidth - 12) {
      left = window.innerWidth - menuWidth - 12;
    }
    if (left < 12) left = 12;

    const top = openUp ? rect.top - estimatedHeight - 4 : rect.bottom + 4;
    setCoords({ top, left, openUp });
  };

  useEffect(() => {
    if (!open) return;

    const handleOutside = (e: MouseEvent) => {
      if (
        btnRef.current?.contains(e.target as Node) ||
        menuRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    const handleScroll = () => setOpen(false);

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [open]);

  if (actions.length === 0) return null;

  const getColorClasses = (variant: RowActionItem['variant'] = 'default') => {
    switch (variant) {
      case 'danger':
        return 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50';
      case 'warning':
        return 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50';
      case 'purple':
        return 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50';
      case 'info':
        return 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50';
      case 'orange':
        return 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/50';
      default:
        return 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800';
    }
  };

  return (
    <div className="inline-flex justify-center">
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!open) updatePosition();
          setOpen(prev => !prev);
        }}
        title="عرض الخيارات"
        className={`inline-flex items-center justify-center w-8 h-8 rounded-xl border transition cursor-pointer ${
          open
            ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
            : 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-orange-400 hover:text-orange-500'
        }`}
      >
        <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            dir="rtl"
            style={{ top: coords.top, left: coords.left }}
            className="fixed z-[9999] w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl py-1.5 px-1.5 space-y-0.5 select-none animate-in fade-in zoom-in-95 duration-100"
          >
            {actions.map((action, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  action.onClick();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition text-right cursor-pointer ${getColorClasses(action.variant)}`}
              >
                <span className="shrink-0">{action.icon}</span>
                <span className="truncate">{action.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
};
