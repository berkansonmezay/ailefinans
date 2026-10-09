'use client';

import React from 'react';
import { Minimize2 } from 'lucide-react';

interface FitModeToggleProps {
  isFitMode: boolean;
  onToggle: () => void;
  className?: string;
}

export function FitModeToggle({ isFitMode, onToggle, className = '' }: FitModeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border cursor-pointer shrink-0 select-none ${
        isFitMode
          ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
          : 'bg-bg-secondary text-text-secondary hover:text-text-primary border-border hover:border-text-muted/30'
      } ${className}`}
      title="Sütunları daraltarak tüm verileri ve işlem butonlarını yatay kaydırma olmadan ekrana sığdır"
    >
      <Minimize2 className={`w-3.5 h-3.5 ${isFitMode ? 'text-white' : 'text-blue-500'}`} />
      <span>Ekrana Sığdır</span>
      <span
        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
          isFitMode
            ? 'bg-white/20 text-white'
            : 'bg-bg-card text-text-muted border border-border'
        }`}
      >
        {isFitMode ? 'Açık' : 'Kapalı'}
      </span>
    </button>
  );
}
