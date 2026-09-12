import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full bg-bg-card border border-slate-700 rounded-xl px-4 py-2.5 text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all ${
            error ? 'border-rose-500 focus:ring-rose-500/50 focus:border-rose-500' : ''
          } ${className}`}
          {...props}
        />
        {error && <p className="text-sm text-rose-500 mt-1.5">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
