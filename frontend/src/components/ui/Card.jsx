const accentColors = {
  brand: 'border-l-brand-500',
  green: 'border-l-green-500',
  blue: 'border-l-blue-500',
  purple: 'border-l-purple-500',
  red: 'border-l-red-500',
  amber: 'border-l-amber-500',
  teal: 'border-l-teal-500',
  none: '',
};

const Card = ({
  children,
  accent,
  className = '',
  padding = 'p-5',
  hover = false,
  ...props
}) => {
  return (
    <div
      className={[
        'bg-white dark:bg-dark-700 rounded-xl shadow-card border border-slate-100 dark:border-slate-700',
        accent ? `border-l-4 ${accentColors[accent] || accentColors.brand}` : '',
        hover ? 'transition-shadow duration-200 hover:shadow-card-hover cursor-pointer' : '',
        padding,
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = '' }) => (
  <div
    className={[
      'px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-dark-800 rounded-t-xl -mx-5 -mt-5 mb-5',
      className,
    ].filter(Boolean).join(' ')}
  >
    {children}
  </div>
);

export default Card;
