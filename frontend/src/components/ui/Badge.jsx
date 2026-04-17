const variants = {
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  brand: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1 text-sm',
};

const Badge = ({ children, variant = 'neutral', size = 'md', dot = false, className = '' }) => {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 font-semibold rounded-full',
        variants[variant],
        sizes[size],
        className,
      ].filter(Boolean).join(' ')}
    >
      {dot && (
        <span
          className={[
            'w-1.5 h-1.5 rounded-full',
            variant === 'success' ? 'bg-green-500' :
            variant === 'warning' ? 'bg-amber-500' :
            variant === 'danger' ? 'bg-red-500' :
            variant === 'info' ? 'bg-blue-500' :
            variant === 'brand' ? 'bg-brand-500' :
            variant === 'purple' ? 'bg-purple-500' :
            'bg-slate-400',
          ].join(' ')}
        />
      )}
      {children}
    </span>
  );
};

export default Badge;
