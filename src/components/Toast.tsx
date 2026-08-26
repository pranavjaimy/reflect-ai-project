import React from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'error' | 'success' | 'info';
  onClose: () => void;
  onRetry?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'error',
  onClose,
  onRetry,
}) => {
  const isError = type === 'error';

  return (
    <div
      id="app-toast-banner"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border max-w-md transition-all duration-200 ${
        isError
          ? 'bg-rose-50 border-rose-200 text-rose-900'
          : 'bg-emerald-50 border-emerald-200 text-emerald-900'
      }`}
    >
      {isError ? (
        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
      ) : (
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
      )}
      <div className="flex-1 text-sm font-medium">{message}</div>
      {onRetry && (
        <button
          id="toast-retry-btn"
          onClick={onRetry}
          className="text-xs font-semibold px-2.5 py-1 rounded bg-rose-200 hover:bg-rose-300 text-rose-900 transition-colors"
        >
          Retry
        </button>
      )}
      <button
        id="toast-close-btn"
        onClick={onClose}
        className="p-1 rounded-md text-stone-400 hover:text-stone-700 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
