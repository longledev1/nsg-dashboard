import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ message, type = 'success', onClose, duration = 3500 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />;
      case 'info':
        return <Info className="w-4 h-4 text-[#d0aa61] shrink-0" />;
      case 'success':
      default:
        return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'error':
        return 'border-red-200 bg-red-50 text-red-900';
      case 'info':
        return 'border-[#d0aa61]/40 bg-[#faf6ed] text-[#9f7a35]';
      case 'success':
      default:
        return 'border-emerald-200 bg-emerald-50 text-emerald-950';
    }
  };

  return (
    <div className="fixed top-20 right-5 z-[100] animate-in slide-in-from-top-3 fade-in duration-200">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-md ${getBorderColor()}`}>
        {getIcon()}
        <span className="text-xs font-medium leading-relaxed flex-1">{message}</span>
        <button
          onClick={onClose}
          className="p-1 hover:opacity-75 rounded-md transition-opacity"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
