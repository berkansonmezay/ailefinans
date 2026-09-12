import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 active:scale-95';
  
  const variants = {
    primary: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] focus:ring-emerald-500',
    secondary: 'bg-bg-secondary text-text-primary hover:bg-bg-secondary hover:text-text-primary border border-slate-700 focus:ring-slate-500',
    danger: 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20 focus:ring-rose-500',
    ghost: 'bg-transparent text-text-muted hover:bg-bg-secondary hover:text-text-primary',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    />
  );
}
