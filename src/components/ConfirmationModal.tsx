import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs">
      <div
        id="confirmation-modal-dialog"
        className="w-full max-w-md bg-stone-50 rounded-2xl border border-stone-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  isDestructive ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-serif font-semibold text-stone-900">{title}</h3>
            </div>
            <button
              id="confirm-modal-close-x"
              onClick={onCancel}
              className="p-1 text-stone-400 hover:text-stone-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-stone-600 leading-relaxed mb-6">{message}</p>

          <div className="flex items-center justify-end gap-3">
            <button
              id="confirm-modal-cancel-btn"
              type="button"
              disabled={isLoading}
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-stone-700 bg-stone-200/80 hover:bg-stone-300 rounded-xl transition-colors cursor-pointer"
            >
              {cancelLabel}
            </button>
            <button
              id="confirm-modal-action-btn"
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors cursor-pointer flex items-center gap-2 ${
                isDestructive
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-stone-900 hover:bg-stone-800 text-white'
              } disabled:opacity-50`}
            >
              {isLoading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : null}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
