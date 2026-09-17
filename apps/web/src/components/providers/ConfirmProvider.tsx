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
            className={`bg-bg-card border border-border text-text-primary w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border-l-[5px] ${
              variant === 'danger'
                ? 'border-l-rose-500'
                : variant === 'warning'
                ? 'border-l-amber-500'
                : 'border-l-emerald-500'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 pb-4 flex items-start space-x-4 border-b border-border">
              <div className={`p-3 rounded-xl flex-shrink-0 shadow-sm ${
                variant === 'danger'
                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                  : variant === 'warning'
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              }`}>
                {variant === 'info' ? (
                  <Info className="h-6 w-6" />
                ) : (
                  <AlertTriangle className="h-6 w-6" />
                )}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <h3 className="text-lg font-bold text-text-primary tracking-tight">
                  {options.title || (variant === 'danger' ? 'İşlem Onayı Gerekli' : 'Bilgi ve Onay')}
                </h3>
                <p className="text-sm font-medium text-text-secondary mt-2 leading-relaxed">
                  {options.message}
                </p>
                {variant === 'danger' && (
                  <div className="mt-3 p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/15 text-[12px] text-rose-600 dark:text-rose-400">
                    ⚠️ Bu işlem geri alınamaz. İlgili kayıt ve bağlı tüm detaylar kalıcı olarak silinecektir.
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleCancel}
                className="text-text-muted hover:text-text-primary p-1.5 rounded-lg hover:bg-bg-secondary transition-colors"
                title="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Actions Footer */}
            <div className="p-4 bg-bg-secondary/40 border-t border-border flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-xs font-semibold text-text-secondary bg-bg-secondary hover:bg-bg-secondary/80 rounded-xl border border-border transition-all cursor-pointer"
              >
                {options.cancelText || 'Vazgeç'}
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-all cursor-pointer ${
                  variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                    : variant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
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
