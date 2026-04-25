import { forwardRef } from 'react';
import Spinner from './Spinner';

const variants = {
  primary:
    'bg-gradient-to-r from-brand-500 to-sky-500 text-white hover:from-brand-600 hover:to-sky-600 active:from-brand-700 active:to-sky-700 shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 focus-ring',
  secondary:
    'bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100 border border-slate-200 shadow-sm dark:border-slate-700 dark:bg-dark-700 dark:text-slate-200 dark:hover:bg-slate-700 focus-ring',
  danger:
    'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-lg shadow-red-500/20 focus-ring',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 active:bg-slate-200 dark:text-slate-300 dark:hover:bg-dark-700 focus-ring',
  outline:
    'bg-transparent border border-slate-300 text-slate-700 hover:bg-slate-50 active:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-dark-700 focus-ring',
  success:
    'bg-green-500 text-white hover:bg-green-600 active:bg-green-700 shadow-sm focus-ring',
};

const sizes = {
  xs: 'px-2.5 py-1.5 text-xs rounded-lg gap-1',
  sm: 'px-3 py-2 text-sm rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-5 py-3 text-base rounded-xl gap-2',
  xl: 'px-6 py-3.5 text-base rounded-xl gap-2.5',
};

const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  iconLeft,
  iconRight,
  fullWidth = false,
  className = '',
  type = 'button',
  ...props
}, ref) => {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center font-semibold transition-all duration-200 select-none will-change-transform',
        variants[variant],
        sizes[size],
        fullWidth ? 'w-full' : '',
        isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer hover:-translate-y-0.5',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {loading ? (
        <Spinner size="sm" className="text-current" />
      ) : iconLeft ? (
        <span className="shrink-0">{iconLeft}</span>
      ) : null}
      {children}
      {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
