import { useState, useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/solid';

const config = {
  success: { bg: 'bg-green-500', Icon: CheckCircleIcon },
  error:   { bg: 'bg-red-500',   Icon: XCircleIcon },
  info:    { bg: 'bg-blue-500',  Icon: InformationCircleIcon },
};

const Toast = ({ message, type = 'success', duration = 3000, onClose }) => {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), duration - 400);
    const removeTimer = setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, duration);
    return () => { clearTimeout(fadeTimer); clearTimeout(removeTimer); };
  }, [duration, onClose]);

  if (!visible) return null;

  const { bg, Icon } = config[type] || config.info;

  return (
    <div
      className={[
        'fixed top-5 right-5 z-[9999] flex items-center gap-3',
        bg,
        'text-white pl-4 pr-3 py-3 rounded-xl shadow-lg min-w-[260px] max-w-xs',
        'transition-all duration-400',
        fading ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0 animate-slide-in',
      ].filter(Boolean).join(' ')}
      role="alert"
    >
      <Icon className="w-5 h-5 shrink-0" />
      <span className="flex-1 text-sm font-semibold">{message}</span>
      <button
        onClick={() => { setFading(true); setTimeout(() => { setVisible(false); onClose?.(); }, 400); }}
        className="p-1 rounded-lg hover:bg-white/20 transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;

