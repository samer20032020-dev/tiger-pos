import React, { useEffect, useRef, useState } from 'react';
import { TIGER_LOGO } from '../../assets/logoData';

interface StandbyLogoScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StandbyLogoScreen: React.FC<StandbyLogoScreenProps> = ({ isOpen, onClose }) => {
  const [storeName, setStoreName] = useState<string>('TIGER MOBILE');
  const [now, setNow] = useState<Date>(() => new Date());
  const readyToWakeRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      readyToWakeRef.current = false;
      return;
    }

    setNow(new Date());
    const armTimer = window.setTimeout(() => {
      readyToWakeRef.current = true;
    }, 180);

    if (window.tigerAPI?.getSettings) {
      window.tigerAPI
        .getSettings()
        .then((s) => {
          if (s?.storeName?.trim()) {
            setStoreName(s.storeName.trim());
          }
        })
        .catch(() => {});
    }

    const clockInterval = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    const handleWakeKey = (e: KeyboardEvent) => {
      if (!readyToWakeRef.current) return;
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };

    window.addEventListener('keydown', handleWakeKey, true);
    return () => {
      window.clearTimeout(armTimer);
      window.clearInterval(clockInterval);
      window.removeEventListener('keydown', handleWakeKey, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const timeText = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const dateText = now.toLocaleDateString('ar-JO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      onClick={() => {
        if (readyToWakeRef.current) onClose();
      }}
      className="fixed inset-0 z-[10005] bg-[#020204] flex flex-col items-center justify-center select-none overflow-hidden cursor-pointer font-cairo animate-in fade-in duration-300"
      aria-label="شاشة التوقف - شعار المحل"
    >
      {/* Ambient Radial Floor Glow */}
      <div
        className="pointer-events-none absolute w-[540px] h-[540px] rounded-full tiger-standby-aura"
        style={{
          background:
            'radial-gradient(circle, rgba(249,115,22,0.34) 0%, rgba(245,158,11,0.14) 38%, rgba(249,115,22,0.03) 62%, rgba(0,0,0,0) 75%)',
        }}
      />

      {/* Secondary Subtle Horizon Reflection */}
      <div
        className="pointer-events-none absolute bottom-0 inset-x-0 h-44 opacity-50"
        style={{
          background:
            'radial-gradient(ellipse at bottom, rgba(249,115,22,0.16) 0%, rgba(0,0,0,0) 70%)',
        }}
      />

      {/* Illuminated Logo Emblem Container */}
      <div className="relative flex flex-col items-center justify-center z-10 px-6">
        <div className="relative flex items-center justify-center w-64 h-64 sm:w-72 sm:h-72">
          {/* Slow Rotating Luminous Conic Ring */}
          <div
            className="absolute inset-2 rounded-full tiger-standby-ring opacity-75"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0deg, rgba(249,115,22,0.75) 55deg, rgba(251,191,36,0.9) 85deg, transparent 140deg, transparent 360deg)',
              WebkitMaskImage: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))',
              maskImage: 'radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))',
            }}
          />

          {/* Subtle Inner Border Ring */}
          <div className="absolute inset-5 rounded-full border border-orange-500/20 bg-black/50 shadow-[0_0_50px_rgba(249,115,22,0.18)]" />

          {/* Glowing Store Logo */}
          <img
            src={TIGER_LOGO}
            alt={storeName}
            className="relative z-10 w-44 h-44 sm:w-52 sm:h-52 object-contain tiger-standby-logo select-none"
          />
        </div>

        {/* Store Name & Tagline */}
        <div className="mt-4 text-center space-y-1.5">
          <h1
            className="text-2xl sm:text-3xl font-black tracking-[0.18em] text-transparent bg-clip-text bg-gradient-to-b from-white via-amber-100 to-orange-400 tiger-standby-text"
            dir="ltr"
          >
            {storeName}
          </h1>
          <p className="text-[11px] font-bold tracking-widest text-orange-300/60">
            MOBILE STORE &bull; MAINTENANCE &bull; POS
          </p>
        </div>

        {/* Sleek Digital Clock & Date */}
        <div className="mt-8 text-center space-y-1">
          <div className="text-3xl sm:text-4xl font-mono font-black text-white/90 tracking-widest" dir="ltr">
            {timeText}
          </div>
          <div className="text-xs font-bold text-slate-400/80">
            {dateText}
          </div>
        </div>
      </div>

      {/* Subtle Bottom Hint */}
      <div className="absolute bottom-7 inset-x-0 text-center">
        <span className="text-[11px] font-bold text-slate-500/75 tracking-wide">
          اضغط ESC أو أي مفتاح أو انقر بالماوس للعودة
        </span>
      </div>
    </div>
  );
};
