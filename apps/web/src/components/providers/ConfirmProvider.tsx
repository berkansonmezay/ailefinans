'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info, X } from 'lucide-react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const confirm = (opts: ConfirmOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      const normalizedOpts = typeof opts === 'string' ? { message: opts } : opts;
      setOptions(normalizedOpts);
      setResolver(() => resolve);
    });
  };

  const handleConfirm = () => {
    if (resolver) resolver(true);
    setOptions(null);
    setResolver(null);
  };

  const handleCancel = () => {
    if (resolver) resolver(false);
    setOptions(null);
    setResolver(null);
  };

  const variant = options?.variant || 'danger';

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {mounted && options && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={handleCancel}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 pb-5 flex items-start space-x-4 border-b border-slate-100 dark:border-slate-800">
              <div className={`p-3 rounded-xl flex-shrink-0 text-white shadow-md ${
                variant === 'danger'
                  ? 'bg-rose-600 shadow-rose-600/30'
                  : variant === 'warning'
                  ? 'bg-amber-600 shadow-amber-600/30'
                  : 'bg-emerald-600 shadow-emerald-600/30'
              }`}>
                {variant === 'info' ? (
                  <Info className="h-6 w-6 text-white" />
                ) : (
                  <AlertTriangle className="h-6 w-6 text-white" />
                )}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  {options.title || (variant === 'danger' ? 'Kayıt Silinecek' : 'İşlem Onayı')}
                </h3>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-200 mt-1.5 leading-relaxed">
                  {options.message}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCancel}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Actions Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-200/70 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl border border-slate-300/50 dark:border-slate-700 transition-all cursor-pointer"
              >
                {options.cancelText || 'Vazgeç'}
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                className={`px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-lg transition-all cursor-pointer ${
                  variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                    : variant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                }`}
              >
                {options.confirmText || (variant === 'danger' ? 'Evet, Sil' : 'Onayla')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}
