import { forwardRef } from 'react';

const Input = forwardRef(({
  label,
  error,
  helper,
  id,
  iconLeft,
  iconRight,
  className = '',
  inputClassName = '',
  disabled = false,
  required = false,
  as: Tag = 'input',
  ...props
}, ref) => {
  const inputId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={['flex flex-col gap-0.5', className].join(' ')}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-semibold text-slate-700 dark:text-slate-200"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {iconLeft && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {iconLeft}
          </span>
        )}
        <Tag
          ref={ref}
          id={inputId}
          disabled={disabled}
          required={required}
          className={[
            'w-full rounded-2xl border bg-white/95 dark:bg-dark-700/95 text-slate-900 dark:text-slate-100 shadow-sm',
            'placeholder:text-slate-400 dark:placeholder:text-slate-500',
            'transition-all duration-200',
            'focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500',
            error
              ? 'border-red-400 focus:ring-red-400 focus:border-red-400'
              : 'border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500',
            iconLeft ? 'pl-10' : 'px-4',
            iconRight ? 'pr-10' : 'px-4',
            Tag === 'textarea' ? 'py-2.5 min-h-[80px]' : 'py-2.5',
            disabled ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-dark-800' : '',
            inputClassName,
          ].filter(Boolean).join(' ')}
          {...props}
        />
        {iconRight && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            {iconRight}
          </span>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">{error}</p>
      )}
      {helper && !error && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{helper}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
