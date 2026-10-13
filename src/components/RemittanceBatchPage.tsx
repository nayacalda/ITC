import React, { useState, useEffect, useRef } from 'react';
import { VehicleRecord, StaffProfile } from '../types';
import { checkDuplicateStrict, formatCurrency } from '../services/api';
import { Plus, Save, Trash2, AlertCircle } from 'lucide-react';

interface BatchRow {
  id: string;
  dateRec: string;
  plate: string;
  orNo: string;
  tripSlip: string;
  driver: string;
  route: string;
  remark: string;
  gross: string;
  disc: string;
  terminal: string;
  fuel: string;
  meals: string;
  repair: string;
  othersexp: string;
  subTotal: string;
  pakyaw: string;
  mgtfee: string;
  cbu: string;
  tire: string;
  loan: string;
  others: string;
  totalNet: string;
  isDuplicate?: boolean;
}

interface RemittanceBatchPageProps {
  vehicles: VehicleRecord[];
  staff: StaffProfile[];
  onSaveBatch: (records: any[]) => Promise<void>;
  onShowAlert: (msg: string) => void;
  onShowConfirm: (msg: string, onConfirm: () => void) => void;
}

const TRIP_SLIP_SUGGESTIONS = ["CASH IN", "CASH OUT", "EXPENSE", "PAYMENT", "SALARY"];
const ROUTE_SUGGESTIONS = ["ORMOC", "ISABEL"];

export const RemittanceBatchPage: React.FC<RemittanceBatchPageProps> = ({
  vehicles,
  staff,
  onSaveBatch,
  onShowAlert,
  onShowConfirm
}) => {
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const createEmptyRow = (prevRow?: BatchRow): BatchRow => {
    const today = new Date().toLocaleDateString('en-CA');
    return {
      id: 'row_' + Date.now() + Math.random().toString(36).substring(2, 7),
      dateRec: prevRow ? prevRow.dateRec : today,
      plate: '',
      orNo: '',
      tripSlip: '',
      driver: '',
      route: '',
      remark: '',
      gross: '',
      disc: '',
      terminal: '',
      fuel: '',
      meals: '',
      repair: '',
      othersexp: '',
      subTotal: '',
      pakyaw: '',
      mgtfee: '',
      cbu: '',
      tire: '',
      loan: '',
      others: '',
      totalNet: '',
      isDuplicate: false
    };
  };

  useEffect(() => {
    if (rows.length === 0) {
      setRows([createEmptyRow()]);
    }
  }, []);

  const addRow = () => {
    setRows(prev => [...prev, createEmptyRow(prev[prev.length - 1])]);
  };

  const removeRow = (id: string) => {
    if (rows.length <= 1) {
      setRows([createEmptyRow()]);
      return;
    }
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const updateRowField = async (id: string, field: keyof BatchRow, value: string) => {
    setRows(prevRows => {
      return prevRows.map(row => {
        if (row.id !== id) return row;

        const updated = { ...row, [field]: value };

        // If numeric fields changed, recalculate
        if ([
          'gross', 'disc', 'terminal', 'fuel', 'meals', 'repair', 'othersexp',
          'pakyaw', 'mgtfee', 'cbu', 'tire', 'loan', 'others'
        ].includes(field)) {
          const num = (f: keyof BatchRow) => Number(updated[f]) || 0;
          const g = num('gross');
          const m = num('mgtfee');
          const exp = num('disc') + num('terminal') + num('fuel') + num('meals') + num('repair') + num('othersexp');
          const sub = g - (g > 0 ? m : 0) - exp;

          const p = num('pakyaw');
          const ded = num('cbu') + num('tire') + num('loan') + num('others');
          const net = sub + p + m + ded;

          updated.subTotal = sub !== 0 ? sub.toFixed(2) : '';
          updated.totalNet = net !== 0 ? net.toFixed(2) : '';
        }

        // If Plate changed, auto-suggest driver if available
        if (field === 'plate' && value.trim()) {
          const matchVehicle = vehicles.find(v => v.plate.toUpperCase() === value.trim().toUpperCase());
          if (matchVehicle && matchVehicle.driver && !updated.driver) {
            updated.driver = matchVehicle.driver;
          }
        }

        return updated;
      });
    });

    // Check duplicate asynchronously
    if (field === 'tripSlip') {
      const val = value.trim();
      const s = val.toLowerCase();
      const isExempt = s.includes("expense") || s.includes("payment") || s.includes("cash in") || s.includes("cash out") || s.includes("salary");

      if (val && !isExempt) {
        const isDbDup = await checkDuplicateStrict(val);
        const inGridDup = rows.filter(r => r.id !== id && r.tripSlip.trim().toLowerCase() === s).length > 0;
        const isDup = isDbDup || inGridDup;

        setRows(prevRows => prevRows.map(r => r.id === id ? { ...r, isDuplicate: isDup } : r));
      } else {
        setRows(prevRows => prevRows.map(r => r.id === id ? { ...r, isDuplicate: false } : r));
      }
    }
  };

  // Keyboard navigation on Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number, totalCols: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const allInputs = containerRef.current?.querySelectorAll<HTMLInputElement>('input:not([readonly])');
      if (!allInputs) return;

      const currentInput = e.target as HTMLInputElement;
      const index = Array.from(allInputs).indexOf(currentInput);

      if (index > -1) {
        if (index === allInputs.length - 1) {
          addRow();
          setTimeout(() => {
            const updatedInputs = containerRef.current?.querySelectorAll<HTMLInputElement>('input:not([readonly])');
            if (updatedInputs && updatedInputs[index + 1]) {
              updatedInputs[index + 1].focus();
            }
          }, 60);
        } else {
          allInputs[index + 1]?.focus();
        }
      }
    }
  };

  // Split rows into regular trip/incomes and expenses
  const isExpenseRow = (r: BatchRow) => {
    const s = r.tripSlip.toUpperCase();
    return s.includes('EXPENSE') || s.includes('PAYMENT') || s.includes('CASH OUT');
  };

  const incomeRows = rows.filter(r => !isExpenseRow(r));
  const expenseRows = rows.filter(r => isExpenseRow(r));

  // Calculate totals
  const calcTotals = () => {
    const keys: (keyof BatchRow)[] = [
      'gross', 'disc', 'terminal', 'fuel', 'meals', 'repair', 'othersexp',
      'subTotal', 'pakyaw', 'mgtfee', 'cbu', 'tire', 'loan', 'others', 'totalNet'
    ];
    const totals: Record<string, number> = {};
    keys.forEach(k => totals[k] = 0);

    rows.forEach(r => {
      keys.forEach(k => {
        totals[k] += Number(r[k]) || 0;
      });
    });
    return totals;
  };

  const grandTotals = calcTotals();

  const handleSubmit = () => {
    // Validate rows
    const validRows = rows.filter(r => r.dateRec && r.tripSlip.trim());
    if (validRows.length === 0) {
      onShowAlert("No valid rows to submit. At least Date and Trip Slip are required.");
      return;
    }

    const hasDups = validRows.some(r => r.isDuplicate);
    if (hasDups) {
      onShowAlert("⚠️ Warning: One or more rows have duplicate Trip Slip numbers (highlighted red). Please review them before saving.");
      return;
    }

    onShowConfirm(`Save all ${validRows.length} remittance records to the database?`, async () => {
      setIsSubmitting(true);
      try {
        const payload = validRows.map(r => ({
          dateRec: r.dateRec,
          plate: r.plate.trim().toUpperCase(),
          orNo: r.orNo.trim(),
          tripSlip: r.tripSlip.trim(),
          driver: r.driver.trim(),
          route: r.route.trim().toUpperCase(),
          remark: r.remark.trim(),
          gross: Number(r.gross) || 0,
          disc: Number(r.disc) || 0,
          terminal: Number(r.terminal) || 0,
          fuel: Number(r.fuel) || 0,
          meals: Number(r.meals) || 0,
          repair: Number(r.repair) || 0,
          othersexp: Number(r.othersexp) || 0,
          subTotal: Number(r.subTotal) || 0,
          pakyaw: Number(r.pakyaw) || 0,
          mgtfee: Number(r.mgtfee) || 0,
          cbu: Number(r.cbu) || 0,
          tire: Number(r.tire) || 0,
          loan: Number(r.loan) || 0,
          others: Number(r.others) || 0,
          totalNet: Number(r.totalNet) || 0
        }));

        await onSaveBatch(payload);
        setRows([createEmptyRow()]);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  // Unique driver display names
  const driverNames = Array.from(new Set(staff.map(s => {
    const initial = s.lastName ? s.lastName.charAt(0).toUpperCase() + '.' : '';
    return `${s.firstName} ${initial}`.trim();
  }))).filter(Boolean);

  return (
    <div className="max-w-[100vw] px-2 sm:px-4 lg:px-6 py-4 space-y-3">
      {/* Datalists */}
      <datalist id="plateListSuggestions">
        {vehicles.map(v => <option key={v.id} value={v.plate}>{v.driver ? `(${v.driver})` : ''}</option>)}
      </datalist>
      <datalist id="driverListSuggestions">
        {driverNames.map((d, i) => <option key={i} value={d} />)}
      </datalist>
      <datalist id="tripSlipDatalist">
        {TRIP_SLIP_SUGGESTIONS.map(s => <option key={s} value={s} />)}
      </datalist>
      <datalist id="routeListSuggestions">
        {ROUTE_SUGGESTIONS.map(r => <option key={r} value={r} />)}
      </datalist>

      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-sky-400 flex items-center gap-2">
            📋 Excel Data Entry Batch
            <span className="text-xs font-normal text-slate-400 hidden md:inline">
              (Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono text-[10px]">Enter</kbd> to navigate cells. Last cell adds a new row.)
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={addRow}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-sky-500/40 text-sky-300 rounded-full text-xs font-semibold shadow transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Row
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-xs font-bold shadow-lg transition disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {isSubmitting ? 'Saving Batch...' : 'Submit Batch Data'}
          </button>
        </div>
      </div>

      {/* Spreadsheet Table Container */}
      <div 
        ref={containerRef}
        className="overflow-x-auto overflow-y-auto max-h-[72vh] border border-slate-700 rounded-xl shadow-inner bg-slate-950 font-sans"
      >
        <table className="w-full text-[12px] border-collapse text-slate-200 min-w-[2100px]">
          <thead className="sticky top-0 z-20 bg-slate-900 text-slate-200 border-b-2 border-sky-500 shadow">
            <tr>
              <th className="p-2 border border-slate-700 text-center w-[120px]">Date</th>
              <th className="p-2 border border-slate-700 text-center w-[100px]">Plate</th>
              <th className="p-2 border border-slate-700 text-center w-[90px]">OR No.</th>
              <th className="p-2 border border-slate-700 text-center w-[110px]">Trip Slip</th>
              <th className="p-2 border border-slate-700 text-center w-[130px]">Driver</th>
              <th className="p-2 border border-slate-700 text-center w-[100px]">Route</th>
              <th className="p-2 border border-slate-700 text-center w-[140px]">Remark</th>
              <th className="p-2 border border-slate-700 text-right text-emerald-400 w-[95px]">Gross</th>
              <th className="p-2 border border-slate-700 text-right text-red-400 w-[80px]">Disc</th>
              <th className="p-2 border border-slate-700 text-right text-red-400 w-[80px]">Terminal</th>
              <th className="p-2 border border-slate-700 text-right text-red-400 w-[85px]">Fuel</th>
              <th className="p-2 border border-slate-700 text-right text-red-400 w-[80px]">Meals</th>
              <th className="p-2 border border-slate-700 text-right text-red-400 w-[85px]">Repair</th>
              <th className="p-2 border border-slate-700 text-right text-red-400 w-[85px]">Others Exp</th>
              <th className="p-2 border border-slate-700 text-right text-sky-400 font-bold bg-sky-950/40 w-[100px]">Sub Total</th>
              <th className="p-2 border border-slate-700 text-right text-emerald-400 w-[90px]">Pakyaw</th>
              <th className="p-2 border border-slate-700 text-right text-red-400 w-[85px]">Mgt Fee</th>
              <th className="p-2 border border-slate-700 text-right text-amber-400 w-[80px]">CBU</th>
              <th className="p-2 border border-slate-700 text-right text-amber-400 w-[80px]">Tire</th>
              <th className="p-2 border border-slate-700 text-right text-amber-400 w-[80px]">Loan</th>
              <th className="p-2 border border-slate-700 text-right text-amber-400 w-[80px]">Others</th>
              <th className="p-2 border border-slate-700 text-right text-sky-300 font-bold bg-sky-950/60 w-[105px]">Total Net</th>
              <th className="p-2 border border-slate-700 text-center w-[50px]">Action</th>
            </tr>
          </thead>

          {/* Regular / Incomes Body */}
          <tbody>
            {incomeRows.map((r, rIdx) => renderBatchRow(r, rIdx))}
          </tbody>

          {/* Expenses Separator Row if any */}
          {expenseRows.length > 0 && (
            <tbody>
              <tr className="bg-red-950/70 border-y-2 border-red-500 font-bold text-red-300">
                <td colSpan={23} className="py-1 px-4 text-center tracking-widest text-[11px] uppercase">
                  ▼ EXPENSES / PAYMENTS / CASH OUTFLOWS ▼
                </td>
              </tr>
            </tbody>
          )}

          {/* Expenses Body */}
          {expenseRows.length > 0 && (
            <tbody>
              {expenseRows.map((r, rIdx) => renderBatchRow(r, incomeRows.length + rIdx, true))}
            </tbody>
          )}

          {/* Sticky Footer Grand Totals */}
          <tfoot className="sticky bottom-0 z-20 bg-slate-900 border-t-2 border-sky-400 text-slate-100 font-bold shadow-lg">
            <tr>
              <th colSpan={7} className="p-2 border border-slate-700 text-right text-slate-300 uppercase">
                Grand Totals ({rows.length} rows):
              </th>
              <th className="p-2 border border-slate-700 text-right text-emerald-400">
                {formatCurrency(grandTotals.gross) || '0.00'}
              </th>
              <th className="p-2 border border-slate-700 text-right text-red-400">
                {formatCurrency(grandTotals.disc) || '0.00'}
              </th>
              <th className="p-2 border border-slate-700 text-right text-red-400">
                {formatCurrency(grandTotals.terminal) || '0.00'}
              </th>
              <th className="p-2 border border-slate-700 text-right text-red-400">
                {formatCurrency(grandTotals.fuel) || '0.00'}
              </th>
              <th className="p-2 border border-slate-700 text-right text-red-400">
                {formatCurrency(grandTotals.meals) || '0.00'}
              </th>
              <th className="p-2 border border-slate-700 text-right text-red-400">
                {formatCurrency(grandTotals.repair) || '0.00'}
              </th>
              <th className="p-2 border border-slate-700 text-right text-red-400">
                {formatCurrency(grandTotals.othersexp) || '0.00'}
              </th>
              <th className="p-2 border border-slate-700 text-right text-sky-400 bg-sky-950/50">
                {formatCurrency(grandTotals.subTotal) || '0.00'}
              </th>
              <th className="p-2 border border-slate-700 text-right text-emerald-400">
                {formatCurrency(grandTotals.pakyaw) || '0.00'}
              </th>
              <th className="p-2 border border-slate-700 text-right text-red-400">
                {formatCurrency(grandTotals.mgtfee) || '0.00'}
              </th>
              <th className="p-2 border border-slate-700 text-right text-amber-400">
                {formatCurrency(grandTotals.cbu) || '0.00'}
              </th>
              <th className="p-2 border border-slate-700 text-right text-amber-400">
                {formatCurrency(grandTotals.tire) || '0.00'}
              </th>
              <th className="p-2 border border-slate-700 text-right text-amber-400">
                {formatCurrency(grandTotals.loan) || '0.00'}
              </th>
              <th className="p-2 border border-slate-700 text-right text-amber-400">
                {formatCurrency(grandTotals.others) || '0.00'}
              </th>
              <th className="p-2 border border-slate-700 text-right text-sky-300 bg-sky-950/70">
                {formatCurrency(grandTotals.totalNet) || '0.00'}
              </th>
              <th className="p-2 border border-slate-700"></th>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  function renderBatchRow(r: BatchRow, rIdx: number, isExp = false) {
    const rowClass = isExp ? 'bg-red-950/20' : (rIdx % 2 === 0 ? 'bg-slate-900/60' : 'bg-slate-950');

    return (
      <tr key={r.id} className={`${rowClass} hover:bg-slate-800/80 transition-colors`}>
        {/* Date */}
        <td className="p-0 border border-slate-700">
          <input
            type="date"
            value={r.dateRec}
            onChange={(e) => updateRowField(r.id, 'dateRec', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, rIdx, 0, 22)}
            className="w-full bg-transparent px-2 py-1.5 text-xs text-slate-200 outline-none focus:bg-sky-950/50 focus:ring-1 focus:ring-sky-400"
          />
        </td>

        {/* Plate */}
        <td className="p-0 border border-slate-700">
          <input
            type="text"
            list="plateListSuggestions"
            value={r.plate}
            placeholder="ITC-..."
            onChange={(e) => updateRowField(r.id, 'plate', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, rIdx, 1, 22)}
            className="w-full bg-transparent px-2 py-1.5 text-xs text-slate-200 uppercase outline-none focus:bg-sky-950/50 focus:ring-1 focus:ring-sky-400"
          />
        </td>

        {/* OR No. */}
        <td className="p-0 border border-slate-700">
          <input
            type="text"
            value={r.orNo}
            placeholder="OR-..."
            onChange={(e) => updateRowField(r.id, 'orNo', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, rIdx, 2, 22)}
            className="w-full bg-transparent px-2 py-1.5 text-xs text-slate-200 outline-none focus:bg-sky-950/50 focus:ring-1 focus:ring-sky-400"
          />
        </td>

        {/* Trip Slip (with duplicate highlight) */}
        <td className={`p-0 border border-slate-700 ${r.isDuplicate ? 'bg-red-600/80 text-white font-bold animate-pulse' : ''}`}>
          <input
            type="text"
            list="tripSlipDatalist"
            value={r.tripSlip}
            placeholder="Slip #"
            title={r.isDuplicate ? '⚠️ Duplicate Trip Slip Number!' : ''}
            onChange={(e) => updateRowField(r.id, 'tripSlip', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, rIdx, 3, 22)}
            className={`w-full bg-transparent px-2 py-1.5 text-xs outline-none focus:bg-sky-950/50 focus:ring-1 focus:ring-sky-400 ${
              r.isDuplicate ? 'text-white placeholder-white' : 'text-slate-200'
            }`}
          />
        </td>

        {/* Driver */}
        <td className="p-0 border border-slate-700">
          <input
            type="text"
            list="driverListSuggestions"
            value={r.driver}
            placeholder="Driver"
            onChange={(e) => updateRowField(r.id, 'driver', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, rIdx, 4, 22)}
            className="w-full bg-transparent px-2 py-1.5 text-xs text-slate-200 outline-none focus:bg-sky-950/50 focus:ring-1 focus:ring-sky-400"
          />
        </td>

        {/* Route */}
        <td className="p-0 border border-slate-700">
          <input
            type="text"
            list="routeListSuggestions"
            value={r.route}
            placeholder="ORMOC / ISABEL"
            onChange={(e) => updateRowField(r.id, 'route', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, rIdx, 5, 22)}
            className="w-full bg-transparent px-2 py-1.5 text-xs text-slate-200 uppercase outline-none focus:bg-sky-950/50 focus:ring-1 focus:ring-sky-400"
          />
        </td>

        {/* Remark */}
        <td className="p-0 border border-slate-700">
          <input
            type="text"
            value={r.remark}
            placeholder="Note"
            onChange={(e) => updateRowField(r.id, 'remark', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, rIdx, 6, 22)}
            className="w-full bg-transparent px-2 py-1.5 text-xs text-slate-200 outline-none focus:bg-sky-950/50 focus:ring-1 focus:ring-sky-400"
          />
        </td>

        {/* Numbers */}
        {renderNumInput(r, 'gross', 'text-emerald-400', rIdx, 7)}
        {renderNumInput(r, 'disc', 'text-red-400', rIdx, 8)}
        {renderNumInput(r, 'terminal', 'text-red-400', rIdx, 9)}
        {renderNumInput(r, 'fuel', 'text-red-400 font-semibold', rIdx, 10)}
        {renderNumInput(r, 'meals', 'text-red-400', rIdx, 11)}
        {renderNumInput(r, 'repair', 'text-red-400', rIdx, 12)}
        {renderNumInput(r, 'othersexp', 'text-red-400', rIdx, 13)}

        {/* Sub Total (Read Only) */}
        <td className="p-0 border border-slate-700 bg-sky-950/30">
          <input
            type="text"
            readOnly
            value={r.subTotal}
            placeholder="0.00"
            className="w-full bg-transparent px-2 py-1.5 text-xs text-right font-bold text-sky-400 outline-none cursor-default"
          />
        </td>

        {renderNumInput(r, 'pakyaw', 'text-emerald-400', rIdx, 15)}
        {renderNumInput(r, 'mgtfee', 'text-red-400', rIdx, 16)}
        {renderNumInput(r, 'cbu', 'text-amber-400', rIdx, 17)}
        {renderNumInput(r, 'tire', 'text-amber-400', rIdx, 18)}
        {renderNumInput(r, 'loan', 'text-amber-400', rIdx, 19)}
        {renderNumInput(r, 'others', 'text-amber-400', rIdx, 20)}

        {/* Total Net (Read Only) */}
        <td className="p-0 border border-slate-700 bg-sky-950/50">
          <input
            type="text"
            readOnly
            value={r.totalNet}
            placeholder="0.00"
            className="w-full bg-transparent px-2 py-1.5 text-xs text-right font-extrabold text-sky-300 outline-none cursor-default"
          />
        </td>

        {/* Delete Row Button */}
        <td className="p-1 border border-slate-700 text-center">
          <button
            type="button"
            onClick={() => removeRow(r.id)}
            className="p-1 text-slate-500 hover:text-red-400 rounded transition"
            title="Delete Row"
          >
            <Trash2 className="w-3.5 h-3.5 mx-auto" />
          </button>
        </td>
      </tr>
    );
  }

  function renderNumInput(row: BatchRow, field: keyof Omit<BatchRow, 'isDuplicate'>, colorClass: string, rIdx: number, cIdx: number) {
    return (
      <td className="p-0 border border-slate-700">
        <input
          type="number"
          step="0.01"
          value={row[field] || ''}
          placeholder="0.00"
          onChange={(e) => updateRowField(row.id, field, e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, rIdx, cIdx, 22)}
          className={`w-full bg-transparent px-2 py-1.5 text-xs text-right outline-none focus:bg-sky-950/50 focus:ring-1 focus:ring-sky-400 ${colorClass}`}
        />
      </td>
    );
  }
};
