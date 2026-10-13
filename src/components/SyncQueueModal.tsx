import React from 'react';
import { OfflineQueueItem } from '../types';
import { AlertTriangle, RotateCw, Trash2, X } from 'lucide-react';

interface SyncQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue: OfflineQueueItem[];
  onRetryAll: () => Promise<void>;
  onDeleteItem: (index: number) => Promise<void>;
}

export const SyncQueueModal: React.FC<SyncQueueModalProps> = ({
  isOpen,
  onClose,
  queue,
  onRetryAll,
  onDeleteItem
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <h4 className="font-bold text-amber-400 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Offline Remittance Sync Queue ({queue.length})
          </h4>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {queue.length === 0 ? (
            <p className="py-8 text-center text-slate-500 text-xs">
              No transactions currently queued. All records are up to date!
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-2 text-left">Time</th>
                  <th className="p-2 text-left">Details</th>
                  <th className="p-2 text-center">Status</th>
                  <th className="p-2 text-left">Message</th>
                  <th className="p-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {queue.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-850">
                    <td className="p-2 text-slate-400 whitespace-nowrap">
                      {new Date(item.time).toLocaleTimeString()}
                    </td>
                    <td className="p-2 text-slate-200">
                      <strong>{item.action}</strong>
                      {item.data?.tripSlip && (
                        <div className="text-[11px] text-sky-400">
                          Slip: {item.data.tripSlip} • Plate: {item.data.plate}
                        </div>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === 'error'
                          ? 'bg-red-950 text-red-400'
                          : item.status === 'duplicate'
                          ? 'bg-amber-950 text-amber-400'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-2 text-red-400 text-[11px] max-w-xs truncate">
                      {item.errorMsg || '-'}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => onDeleteItem(idx)}
                        className="p-1 text-slate-500 hover:text-red-400 rounded transition"
                        title="Delete queued item"
                      >
                        <Trash2 className="w-3.5 h-3.5 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
          >
            Close
          </button>
          <button
            onClick={onRetryAll}
            disabled={queue.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg shadow"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Retry Sync All
          </button>
        </div>
      </div>
    </div>
  );
};
