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
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
          onClick={handleCancel}
        >
          <div
            className="bg-card border border-border text-card-foreground w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Banner */}
            <div className={`p-6 pb-5 flex items-start space-x-4 border-b border-border/50 ${
              variant === 'danger'
                ? 'bg-rose-500/10'
                : variant === 'warning'
                ? 'bg-amber-500/10'
                : 'bg-primary/10'
            }`}>
              <div className={`p-3 rounded-xl flex-shrink-0 ${
                variant === 'danger'
                  ? 'bg-rose-500/20 text-rose-500'
                  : variant === 'warning'
                  ? 'bg-amber-500/20 text-amber-500'
                  : 'bg-primary/20 text-primary'
              }`}>
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <h3 className="text-lg font-bold text-foreground">
                  {options.title || (variant === 'danger' ? 'Kayıt Silinecek' : 'İşlem Onayı')}
                </h3>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  {options.message}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Actions */}
            <div className="p-4 bg-muted/30 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all cursor-pointer"
              >
                {options.cancelText || 'İptal'}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`px-5 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md transition-all cursor-pointer ${
                  variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                    : variant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                    : 'bg-primary hover:bg-primary/90 shadow-primary/20'
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
