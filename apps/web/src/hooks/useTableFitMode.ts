'use client';

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'ailefinans_table_fit_mode';

function subscribe(callback: () => void) {
  window.addEventListener('table_fit_mode_change', callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('table_fit_mode_change', callback);
    window.removeEventListener('storage', callback);
  };
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('admin_fit_mode');
  if (saved !== null) {
    return saved === 'true';
  }
  return true;
}

function getServerSnapshot(): boolean {
  return true;
}

export function useTableFitMode() {
  const isFitMode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleFitMode = () => {
    if (typeof window !== 'undefined') {
      const next = !getSnapshot();
      localStorage.setItem(STORAGE_KEY, String(next));
      localStorage.setItem('admin_fit_mode', String(next));
      window.dispatchEvent(new Event('table_fit_mode_change'));
    }
  };

  return { isFitMode, toggleFitMode };
}
