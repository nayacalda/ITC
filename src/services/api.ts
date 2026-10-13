import { SimpleDB } from './db';
import { RemittanceRecord, OfflineQueueItem } from '../types';

export const API_URL = "https://script.google.com/macros/s/AKfycbyDqlHii2B8J8az_IkiiEQRz5wn2-zt7a0kmu0_qoB6FD46tJnn8QgZbwd3Ckw2G0EUmg/exec";

export const COL = {
  ID: 0, TIMESTAMP: 1, DATEREC: 2, PLATE: 3, ORNO: 4, TRIPSLIP: 5, DRIVER: 6, ROUTE: 7, REMARK: 8,
  GROSS: 9, DISC: 10, TERMINAL: 11, FUEL: 12, MEALS: 13, REPAIR: 14, OTHERSEXP: 15, SUBTOTAL: 16,
  PAKYAW: 17, MGTFEE: 18, CBU: 19, TIRE: 20, LOAN: 21, OTHERS: 22, TOTALNET: 23, ENCODER: 24,
  IS_OFFLINE: 25, QUEUE_IDX: 26, IS_ERROR: 27
};

export const REMIT_CONFIG = [
  { key: 'gross', label: 'GROSS', type: 'income', group: 'expenses' },
  { key: 'disc', label: 'DISC.', type: 'expense', group: 'expenses' },
  { key: 'terminal', label: 'TERMINAL FEE', type: 'expense', group: 'expenses' },
  { key: 'fuel', label: 'FUEL / DIESEL', type: 'expense', group: 'expenses' },
  { key: 'meals', label: 'MEALS', type: 'expense', group: 'expenses' },
  { key: 'repair', label: 'REPAIR & MAINTENANCE', type: 'expense', group: 'expenses' },
  { key: 'othersexp', label: 'OTHERS EXP.', type: 'expense', group: 'expenses' },
  { key: 'pakyaw', label: 'PAKYAW/RENTAL', type: 'income', group: 'deductions' },
  { key: 'mgtfee', label: 'MGT. FEE', type: 'expense', group: 'deductions' },
  { key: 'cbu', label: 'CBU', type: 'deduction', group: 'deductions' },
  { key: 'tire', label: 'TIRE', type: 'deduction', group: 'deductions' },
  { key: 'loan', label: 'LOAN AMORT.', type: 'deduction', group: 'deductions' },
  { key: 'others', label: 'OTHERS', type: 'deduction', group: 'deductions' }
];

export async function apiCall(action: string, payload: any = {}): Promise<any> {
  if (!navigator.onLine) throw new Error("Offline");
  payload.token = localStorage.getItem('token') || '';
  
  try {
    const res = await fetch(`${API_URL}?action=${action}`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      signal: AbortSignal.timeout(10000)
    });
    return await res.json();
  } catch (err) {
    console.warn(`apiCall [${action}] failed:`, err);
    throw err;
  }
}

export function generateSafeUUID(): string {
  return (typeof crypto.randomUUID === "function")
    ? crypto.randomUUID()
    : 'id_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export async function saveOfflineAction(action: string, data: any): Promise<void> {
  const queue = (await SimpleDB.get<OfflineQueueItem[]>('offlineQueue')) || [];
  queue.push({
    id: generateSafeUUID(),
    action,
    data,
    time: Date.now(),
    status: 'pending'
  });
  await SimpleDB.set('offlineQueue', queue);
}

export async function checkDuplicateStrict(tripSlip: string, currentId: string | null = null): Promise<boolean> {
  const s = String(tripSlip || "").trim().toLowerCase();
  if (!s || s.includes("expense") || s.includes("payment") || s.includes("cash in") || s.includes("cash out") || s.includes("salary")) {
    return false;
  }
  const cache = (await SimpleDB.get<any[]>('cachedSummary')) || [];
  const localDup = cache.find(r => 
    String(r[COL.TRIPSLIP] || "").trim().toLowerCase() === s && 
    String(r[COL.ID]) !== String(currentId)
  );
  return !!localDup;
}

export function formatCurrency(n: number | string | undefined | null): string {
  const v = Number(n || 0);
  if (v === 0) return "";
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatCurrencyStrict(n: number | string | undefined | null): string {
  const v = Number(n || 0);
  return '₱ ' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
