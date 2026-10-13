import React from 'react';
import { HelpCircle, AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = "Confirm Action",
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Yes, Proceed",
  cancelLabel = "Cancel"
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4 animate-in zoom-in-95">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">{title}</h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800 transition cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow transition cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
