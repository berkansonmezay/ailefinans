import React, { forwardRef } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, options, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`w-full bg-bg-card border border-slate-700 rounded-xl px-4 py-2.5 text-text-primary focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 appearance-none transition-all ${
              error ? 'border-rose-500 focus:ring-rose-500/50 focus:border-rose-500' : ''
            } ${className}`}
            {...props}
          >
            <option value="" disabled className="bg-bg-card text-text-muted">Seçiniz...</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-bg-card text-text-primary">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-text-muted">
            <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>
        {error && <p className="text-sm text-rose-500 mt-1.5">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
