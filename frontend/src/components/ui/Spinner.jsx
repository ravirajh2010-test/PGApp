const Spinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    xs: 'w-3 h-3 border',
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-[3px]',
    xl: 'w-12 h-12 border-4',
  };

  return (
    <span
      className={[
        'inline-block animate-spin rounded-full border-current border-r-transparent',
        sizeClasses[size],
        className,
      ].filter(Boolean).join(' ')}
      role="status"
      aria-label="Loading"
    />
  );
};

export default Spinner;
