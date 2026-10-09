'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'ailefinans_table_fit_mode';

export function useTableFitMode() {
  const [isFitMode, setIsFitMode] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('admin_fit_mode');
      if (saved !== null) {
        setIsFitMode(saved === 'true');
      }
    }
  }, []);

  const toggleFitMode = () => {
    setIsFitMode((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, String(next));
        localStorage.setItem('admin_fit_mode', String(next));
        window.dispatchEvent(new Event('table_fit_mode_change'));
      }
      return next;
    });
  };

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('admin_fit_mode');
      if (saved !== null) {
        setIsFitMode(saved === 'true');
      }
    };
    window.addEventListener('table_fit_mode_change', handleStorageChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('table_fit_mode_change', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return { isFitMode, toggleFitMode };
}
