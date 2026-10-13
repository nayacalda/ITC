import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'success' | 'error' | 'info';
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl shadow-2xl text-xs font-semibold text-white animate-in slide-in-from-bottom-2 fade-in ${
            t.type === 'error'
              ? 'bg-rose-900 border border-rose-700'
              : t.type === 'info'
              ? 'bg-sky-900 border border-sky-700'
              : 'bg-emerald-900 border border-emerald-700'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {t.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{t.text}</span>
          </div>
          <button
            onClick={() => onDismiss(t.id)}
            className="p-1 rounded text-white/70 hover:text-white transition ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
