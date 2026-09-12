import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      <div className="relative bg-bg-card border border-border rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 ease-out">
        {/* Subtle top glow */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent opacity-50" />
        
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h3 className="text-xl font-bold text-text-primary tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors p-2 rounded-xl hover:bg-bg-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
