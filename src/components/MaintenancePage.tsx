import React, { useState, useMemo } from 'react';
import { VehicleRecord, MaintenanceRecord } from '../types';
import { formatCurrency, formatCurrencyStrict } from '../services/api';
import { 
  Wrench, 
  DollarSign, 
  Layers, 
  Calendar, 
  Camera, 
  FileText, 
  Trash2, 
  Image as ImageIcon,
  X 
} from 'lucide-react';

interface MaintenancePageProps {
  maintenanceRecords: MaintenanceRecord[];
  vehicles: VehicleRecord[];
  onSaveMaintenance: (record: MaintenanceRecord) => Promise<void>;
  onDeleteMaintenance: (id: string) => Promise<void>;
  onShowAlert: (msg: string) => void;
  onShowConfirm: (msg: string, onConfirm: () => void) => void;
}

const REPAIR_TYPES = [
  "PMS",
  "Change Oil",
  "Engine Repair",
  "Aircon Maintenance",
  "Electrical",
  "Underchassis / Suspension",
  "Brake System",
  "Transmission"
];

const PARTS_LIST = [
  "Engine Oil & Filter",
  "Tire/s",
  "Brake Pads",
  "Battery",
  "Fan Belt",
  "Alternator",
  "Fuel Filter",
  "Air Filter",
  "Suspension Bushing"
];

export const MaintenancePage: React.FC<MaintenancePageProps> = ({
  maintenanceRecords,
  vehicles,
  onSaveMaintenance,
  onDeleteMaintenance,
  onShowAlert,
  onShowConfirm
}) => {
  const today = new Date().toLocaleDateString('en-CA');
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA');
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('en-CA');

  // Form State
  const [mDate, setMDate] = useState(today);
  const [mPlate, setMPlate] = useState('');
  const [mOdo, setMOdo] = useState<number | ''>('');
  const [mType, setMType] = useState('');
  const [mReplaced, setMReplaced] = useState('');
  const [mCost, setMCost] = useState<number | ''>('');
  const [mOrNo, setMOrNo] = useState('');
  const [mRemarks, setMRemarks] = useState('');
  const [mPartPhoto, setMPartPhoto] = useState<string | undefined>();
  const [mReceiptPhoto, setMReceiptPhoto] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter for summary by plate
  const [filterStart, setFilterStart] = useState(firstDay);
  const [filterEnd, setFilterEnd] = useState(lastDay);

  // Photo viewer modal
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);

  // Find latest ODO for the selected plate
  const lastOdoHint = useMemo(() => {
    if (!mPlate.trim()) return '';
    const plateRecords = maintenanceRecords
      .filter(r => r.plate.toUpperCase() === mPlate.trim().toUpperCase())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (plateRecords.length > 0 && plateRecords[0].odo) {
      return `Last recorded ODO: ${plateRecords[0].odo.toLocaleString()} km`;
    }
    return '';
  }, [mPlate, maintenanceRecords]);

  // Statistics
  const totalSpent = useMemo(() => {
    return maintenanceRecords.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
  }, [maintenanceRecords]);

  const mostFrequentPart = useMemo(() => {
    const counts: Record<string, number> = {};
    maintenanceRecords.forEach(r => {
      const p = (r.replaced || '').trim();
      if (p) counts[p] = (counts[p] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? `${sorted[0][0]} (${sorted[0][1]} times)` : 'N/A';
  }, [maintenanceRecords]);

  // Maintenance summary by plate (filtered by date)
  const plateSummaries = useMemo(() => {
    const map: Record<string, { latestOdo: number; totalCost: number }> = {};

    maintenanceRecords.forEach(r => {
      if (filterStart && r.date < filterStart) return;
      if (filterEnd && r.date > filterEnd) return;

      const p = r.plate.toUpperCase();
      if (!map[p]) {
        map[p] = { latestOdo: 0, totalCost: 0 };
      }
      map[p].totalCost += Number(r.cost) || 0;
      if (r.odo > map[p].latestOdo) {
        map[p].latestOdo = r.odo;
      }
    });

    return Object.entries(map).map(([plate, data]) => ({
      plate,
      ...data
    })).sort((a, b) => b.totalCost - a.totalCost);
  }, [maintenanceRecords, filterStart, filterEnd]);

  // Compress image to base64
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        setter(canvas.toDataURL('image/jpeg', 0.65));
      };
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mDate || !mPlate.trim() || mCost === '') {
      onShowAlert("Date, Plate No., and Cost are required.");
      return;
    }

    setIsSubmitting(true);
    const newRecord: MaintenanceRecord = {
      id: 'M_' + Date.now(),
      date: mDate,
      plate: mPlate.trim().toUpperCase(),
      odo: Number(mOdo) || 0,
      type: mType.trim(),
      replaced: mReplaced.trim(),
      cost: Number(mCost) || 0,
      orNo: mOrNo.trim(),
      partPhoto: mPartPhoto,
      receiptPhoto: mReceiptPhoto,
      remarks: mRemarks.trim()
    };

    await onSaveMaintenance(newRecord);
    setIsSubmitting(false);

    // Clear form
    setMPlate('');
    setMOdo('');
    setMType('');
    setMReplaced('');
    setMCost('');
    setMOrNo('');
    setMRemarks('');
    setMPartPhoto(undefined);
    setMReceiptPhoto(undefined);
  };

  const handleDelete = (id: string) => {
    onShowConfirm("Permanently delete this maintenance log?", async () => {
      await onDeleteMaintenance(id);
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Datalists */}
      <datalist id="mPlateList">
        {vehicles.map(v => <option key={v.id} value={v.plate} />)}
      </datalist>
      <datalist id="mRepairTypesList">
        {REPAIR_TYPES.map(t => <option key={t} value={t} />)}
      </datalist>
      <datalist id="mPartsList">
        {PARTS_LIST.map(p => <option key={p} value={p} />)}
      </datalist>

      {/* Entry Form Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
        <h3 className="text-base sm:text-lg font-bold text-sky-400 mb-4 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-rose-400" /> Maintenance Report Entry
        </h3>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Date *</label>
              <input
                type="date"
                max={today}
                value={mDate}
                onChange={(e) => setMDate(e.target.value)}
                className="w-full bg-slate-950 border border-sky-500/50 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Plate No. *</label>
              <input
                type="text"
                list="mPlateList"
                placeholder="Select Plate"
                value={mPlate}
                onChange={(e) => setMPlate(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-sky-500/50 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 uppercase"
                required
              />
              {lastOdoHint && <span className="text-[10px] text-sky-400 font-bold block mt-1">{lastOdoHint}</span>}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">ODO Reading (km)</label>
              <input
                type="number"
                placeholder="e.g. 150000"
                value={mOdo}
                onChange={(e) => setMOdo(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Kind of Repair</label>
              <input
                type="text"
                list="mRepairTypesList"
                placeholder="e.g. PMS, Change Oil"
                value={mType}
                onChange={(e) => setMType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Part Replaced</label>
              <input
                type="text"
                list="mPartsList"
                placeholder="e.g. Engine Oil, Tires"
                value={mReplaced}
                onChange={(e) => setMReplaced(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-rose-400 block mb-1">Cost (₱) *</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={mCost}
                onChange={(e) => setMCost(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-slate-950 border border-rose-500/50 rounded-lg px-2.5 py-1.5 text-xs text-rose-300 font-mono font-bold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-emerald-400 block mb-1">O.R. No. / Receipt #</label>
              <input
                type="text"
                placeholder="Receipt OR No."
                value={mOrNo}
                onChange={(e) => setMOrNo(e.target.value)}
                className="w-full bg-slate-950 border border-emerald-500/50 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-sky-400" /> Upload Part Photo (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePhotoUpload(e, (val) => setMPartPhoto(val))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-300 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-slate-800 file:text-sky-300"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-amber-400" /> Upload Receipt Photo (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePhotoUpload(e, (val) => setMReceiptPhoto(val))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-300 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-slate-800 file:text-amber-300"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Remarks / Shop / Warranty Info</label>
            <input
              type="text"
              placeholder="e.g. Isabel Auto Repair Shop, 3 months warranty"
              value={mRemarks}
              onChange={(e) => setMRemarks(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Save Maintenance Record'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMPlate('');
                setMOdo('');
                setMType('');
                setMReplaced('');
                setMCost('');
                setMOrNo('');
                setMRemarks('');
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              Clear Form
            </button>
          </div>
        </form>
      </div>

      {/* Maintenance Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-red-950 via-slate-900 to-slate-950 border border-red-800/40 rounded-2xl p-5 shadow-md flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-red-400">Total Maintenance Spent</span>
            <h3 className="text-2xl font-black text-white mt-1">{formatCurrencyStrict(totalSpent)}</h3>
            <p className="text-[11px] text-red-300/70 mt-1">Accumulated fleet repair expenditures</p>
          </div>
          <div className="p-3 bg-red-950 rounded-xl text-red-400 border border-red-800/50">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-950 via-slate-900 to-slate-950 border border-amber-800/40 rounded-2xl p-5 shadow-md flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Most Frequently Replaced Part</span>
            <h3 className="text-lg font-bold text-white mt-1">{mostFrequentPart}</h3>
            <p className="text-[11px] text-amber-300/70 mt-1">High-wear component indicator</p>
          </div>
          <div className="p-3 bg-amber-950 rounded-xl text-amber-400 border border-amber-800/50">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Maintenance Summary by Plate */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h4 className="font-bold text-white text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" /> Maintenance Summary by Plate
          </h4>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">From:</span>
            <input
              type="date"
              value={filterStart}
              onChange={(e) => setFilterStart(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs"
            />
            <span className="text-slate-400">To:</span>
            <input
              type="date"
              value={filterEnd}
              onChange={(e) => setFilterEnd(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[260px] border border-slate-800 rounded-xl">
          <table className="w-full text-xs">
            <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
              <tr>
                <th className="p-2 text-left">Plate No.</th>
                <th className="p-2 text-right">Latest ODO (km)</th>
                <th className="p-2 text-right text-red-400">Total Repair Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {plateSummaries.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-slate-500">No records for this range.</td>
                </tr>
              ) : (
                plateSummaries.map(s => (
                  <tr key={s.plate} className="hover:bg-slate-850">
                    <td className="p-2 font-bold text-white">{s.plate}</td>
                    <td className="p-2 text-right text-slate-300 font-mono">
                      {s.latestOdo ? `${s.latestOdo.toLocaleString()} km` : '-'}
                    </td>
                    <td className="p-2 text-right text-red-400 font-bold font-mono">
                      {formatCurrencyStrict(s.totalCost)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed ODO Maintenance Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-3">
        <h4 className="font-bold text-white text-sm flex items-center gap-2">
          📋 ODO Maintenance Detailed Log
        </h4>

        <div className="overflow-x-auto max-h-[400px] border border-slate-800 rounded-xl">
          <table className="w-full text-xs">
            <thead className="bg-slate-950 text-slate-300 sticky top-0 border-b border-slate-800 font-semibold">
              <tr>
                <th className="p-2 text-center">Date</th>
                <th className="p-2 text-left">Plate</th>
                <th className="p-2 text-right">ODO</th>
                <th className="p-2 text-left">Kind of Repair</th>
                <th className="p-2 text-left">Part Replaced</th>
                <th className="p-2 text-left text-emerald-400">OR No.</th>
                <th className="p-2 text-left">Remarks</th>
                <th className="p-2 text-center">Photos</th>
                <th className="p-2 text-right text-red-400">Cost</th>
                <th className="p-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {maintenanceRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">No maintenance logs registered yet.</td>
                </tr>
              ) : (
                maintenanceRecords.map(r => (
                  <tr key={r.id} className="hover:bg-slate-850">
                    <td className="p-2 text-center whitespace-nowrap text-slate-400">
                      {new Date(r.date).toLocaleDateString()}
                    </td>
                    <td className="p-2 font-bold text-white whitespace-nowrap">{r.plate}</td>
                    <td className="p-2 text-right font-mono text-slate-300">
                      {r.odo ? r.odo.toLocaleString() : '-'}
                    </td>
                    <td className="p-2 text-slate-200">{r.type}</td>
                    <td className="p-2 text-slate-200">{r.replaced}</td>
                    <td className="p-2 font-mono text-emerald-400">{r.orNo}</td>
                    <td className="p-2 text-slate-400 max-w-xs truncate">{r.remarks}</td>
                    <td className="p-2 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {r.partPhoto && (
                          <button
                            onClick={() => setViewPhotoUrl(r.partPhoto!)}
                            className="p-1 rounded bg-slate-800 text-sky-400 hover:bg-slate-700"
                            title="View Part Photo"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {r.receiptPhoto && (
                          <button
                            onClick={() => setViewPhotoUrl(r.receiptPhoto!)}
                            className="p-1 rounded bg-slate-800 text-emerald-400 hover:bg-slate-700"
                            title="View Receipt Photo"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {!r.partPhoto && !r.receiptPhoto && <span className="text-slate-600">-</span>}
                      </div>
                    </td>
                    <td className="p-2 text-right font-bold text-red-400 font-mono">
                      {formatCurrencyStrict(r.cost)}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1 text-slate-500 hover:text-red-400 rounded transition"
                        title="Delete log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Photo Viewer Modal */}
      {viewPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="relative max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl">
            <button
              onClick={() => setViewPhotoUrl(null)}
              className="absolute -top-3 -right-3 p-1.5 bg-slate-800 border border-slate-600 rounded-full text-white hover:bg-slate-700 shadow"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={viewPhotoUrl} alt="Maintenance Attachment" className="max-h-[80vh] w-auto rounded-xl object-contain mx-auto" />
          </div>
        </div>
      )}
    </div>
  );
};
