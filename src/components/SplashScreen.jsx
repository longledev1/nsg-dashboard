import React, { useState, useEffect } from 'react';

export default function SplashScreen({ onFinish }) {
  const [progress, setProgress] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Smooth progress simulation from 0% to 100%
    const startTime = Date.now();
    const duration = 1400; // 1.4 seconds smooth loading

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const rawPercent = Math.min(100, Math.floor((elapsed / duration) * 100));

      // Non-linear easing for natural feeling
      setProgress(rawPercent);

      if (rawPercent >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsFading(true);
          setTimeout(() => {
            if (onFinish) onFinish();
          }, 500); // 500ms fade transition
        }, 200); // 200ms hold at 100%
      }
    }, 20);

    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white transition-all duration-500 ease-out select-none ${
        isFading ? 'opacity-0 pointer-events-none scale-105' : 'opacity-100'
      }`}
      style={{ WebkitFontSmoothing: 'antialiased' }}
    >
      <div className="flex flex-col items-center px-6 max-w-sm w-full text-center">
        {/* NSG Black Logo on Pure White Background */}
        <div className="relative mb-8 transition-transform duration-700 ease-out transform">
          <img
            src="/logo_nsg_black.png"
            alt="NSG Logo"
            className="w-48 sm:w-56 h-auto object-contain drop-shadow-sm select-none"
            draggable="false"
          />
        </div>

        {/* Progress Bar Container */}
        <div className="w-56 sm:w-64 h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner relative">
          <div
            className="h-full bg-gradient-to-r from-[#d0aa61] via-[#9f7a35] to-[#504b44] rounded-full transition-all duration-75 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Percentage Counter & Loading Status */}
        <div className="mt-4 flex items-center justify-between w-56 sm:w-64 text-xs">
          <span className="font-medium text-slate-400 tracking-wider uppercase text-[10px]">
            {progress < 100 ? 'Đang tải hệ thống...' : 'Sẵn sàng!'}
          </span>
          <span className="font-bold text-[#504b44] font-mono tracking-tight text-xs">
            {progress}%
          </span>
        </div>
      </div>

      {/* Subtle Bottom Branding */}
      <div className="absolute bottom-8 text-center">
        <p className="text-[11px] text-slate-400 font-semibold tracking-widest uppercase">
          NS GROUP
        </p>
      </div>
    </div>
  );
}
