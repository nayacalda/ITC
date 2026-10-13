import React, { useState, useMemo, useRef } from 'react';
import { VehicleRecord, StaffProfile, OfflineQueueItem } from '../types';
import { COL, REMIT_CONFIG, formatCurrency, checkDuplicateStrict } from '../services/api';
import { 
  Filter, 
  Download, 
  Printer, 
  RotateCw, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Layers, 
  CheckSquare, 
  Square, 
  X,
  Edit2
} from 'lucide-react';

interface SummaryPageProps {
  summaryData: any[];
  vehicles: VehicleRecord[];
  staff: StaffProfile[];
  offlineQueue: OfflineQueueItem[];
  onRefresh: () => void;
  onUpdateRemittance: (record: any) => Promise<void>;
  onDeleteRemittance: (id: string) => Promise<void>;
  onDeleteMultiple: (ids: string[]) => Promise<void>;
  onShowAlert: (msg: string) => void;
  onShowConfirm: (msg: string, onConfirm: () => void) => void;
}

const EXPORT_COLUMNS = [
  { label: "Timestamp", idx: 1, cat: "Identity", hideInGroup: true },
  { label: "Date Rec", idx: 2, cat: "Identity", hideInGroup: true },
  { label: "Plate", idx: 3, cat: "Identity" },
  { label: "OR No.", idx: 4, cat: "Identity", hideInGroup: true },
  { label: "Trip Slip", idx: 5, cat: "Identity" },
  { label: "Driver", idx: 6, cat: "Identity", hideInGroup: true },
  { label: "Route", idx: 7, cat: "Identity", hideInGroup: true },
  { label: "Remark", idx: 8, cat: "Identity" },
  { label: "Gross", idx: 9, key: 'gross', cat: "Income & Exp" },
  { label: "Disc", idx: 10, key: 'disc', cat: "Income & Exp" },
  { label: "Terminal", idx: 11, key: 'terminal', cat: "Income & Exp" },
  { label: "Fuel", idx: 12, key: 'fuel', cat: "Income & Exp" },
  { label: "Meals", idx: 13, key: 'meals', cat: "Income & Exp" },
  { label: "Repair", idx: 14, key: 'repair', cat: "Income & Exp" },
  { label: "Others Exp", idx: 15, key: 'othersexp', cat: "Income & Exp" },
  { label: "Sub Total", idx: 16, key: 'subtotal', cat: "Income & Exp" },
  { label: "Pakyaw", idx: 17, key: 'pakyaw', cat: "Deductions" },
  { label: "Mgt Fee", idx: 18, key: 'mgtfee', cat: "Deductions" },
  { label: "CBU", idx: 19, key: 'cbu', cat: "Deductions" },
  { label: "Tire", idx: 20, key: 'tire', cat: "Deductions" },
  { label: "Loan", idx: 21, key: 'loan', cat: "Deductions" },
  { label: "Others", idx: 22, key: 'others', cat: "Deductions" },
  { label: "Total Net", idx: 23, key: 'totalnet', cat: "Deductions" },
  { label: "Encoder", idx: 24, cat: "Identity", hideInGroup: true }
];

export const SummaryPage: React.FC<SummaryPageProps> = ({
  summaryData,
  vehicles,
  staff,
  offlineQueue,
  onRefresh,
  onUpdateRemittance,
  onDeleteRemittance,
  onDeleteMultiple,
  onShowAlert,
  onShowConfirm
}) => {
  // Date filters defaulting to current month
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA');
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString('en-CA');

  const [dateFilterCol, setDateFilterCol] = useState<'daterec' | 'timestamp'>('daterec');
  const [filterFrom, setFilterFrom] = useState(firstDay);
  const [filterTo, setFilterTo] = useState(lastDay);
  const [driverSearch, setDriverSearch] = useState('');
  const [tripSlipSearch, setTripSlipSearch] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('');
  const [selectedPlates, setSelectedPlates] = useState<string[]>([]);
  const [plateMenuOpen, setPlateMenuOpen] = useState(false);
  const [isGroupedByPlate, setIsGroupedByPlate] = useState(false);

  // Sorting
  const [sortCol, setSortCol] = useState<string>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(1000);

  // Selection & Color Highlighting
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [highlightMap, setHighlightMap] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('itc_highlight_map') || '{}');
    } catch {
      return {};
    }
  });

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  // Export Modal State
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedExportCols, setSelectedExportCols] = useState<number[]>(
    EXPORT_COLUMNS.map((_, i) => i)
  );

  // Combine live/cached summary with offline queue items
  const combinedData = useMemo(() => {
    const queueRows = offlineQueue
      .filter(q => q.action === 'saveRemittance')
      .map((q, idx) => {
        const d = q.data;
        const isErr = q.status === 'error';
        const msg = isErr ? "Sync Failed" : "Pending Sync";
        return [
          `OFFLINE_${idx}`,
          new Date(q.time).toISOString(),
          d.dateRec,
          d.plate,
          d.orNo,
          d.tripSlip,
          d.driver,
          d.route,
          d.remark,
          d.gross,
          d.disc,
          d.terminal,
          d.fuel,
          d.meals,
          d.repair,
          d.othersexp,
          d.subTotal,
          d.pakyaw,
          d.mgtfee,
          d.cbu,
          d.tire,
          d.loan,
          d.others,
          d.totalNet,
          msg,
          true,
          idx,
          isErr
        ];
      });

    return [...queueRows, ...summaryData];
  }, [summaryData, offlineQueue]);

  // Available plates extracted from data
  const availablePlates = useMemo(() => {
    const set = new Set<string>();
    combinedData.forEach(r => {
      const p = String(r[COL.PLATE] || '').trim();
      if (p) set.add(p);
    });
    return Array.from(set).sort();
  }, [combinedData]);

  // Filter combined data
  const filteredData = useMemo(() => {
    const terms = driverSearch.toLowerCase().trim().split(' ').filter(Boolean);

    // Filter by vehicle type mapping
    const typePlateSet = vehicleTypeFilter
      ? new Set(
          vehicles
            .filter(v => v.type.toLowerCase() === vehicleTypeFilter.toLowerCase())
            .map(v => v.plate.trim().toUpperCase())
        )
      : null;

    return combinedData.filter(r => {
      const dateVal = r[dateFilterCol === 'timestamp' ? COL.TIMESTAMP : COL.DATEREC];
      if (!dateVal) return false;

      const dt = new Date(dateVal);
      if (isNaN(dt.getTime())) return false;

      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      const rowDate = `${y}-${m}-${d}`;

      if (filterFrom && rowDate < filterFrom) return false;
      if (filterTo && rowDate > filterTo) return false;

      // Trip Slip Search
      if (tripSlipSearch && !String(r[COL.TRIPSLIP] || '').toLowerCase().includes(tripSlipSearch.toLowerCase())) {
        return false;
      }

      // Driver/Operator Search
      if (terms.length > 0) {
        const drv = String(r[COL.DRIVER] || '').toLowerCase();
        const matches = terms.every(t => drv.includes(t));
        if (!matches) return false;
      }

      // Plate Dropdown Filter
      const plate = String(r[COL.PLATE] || '').trim();
      if (selectedPlates.length > 0 && !selectedPlates.includes(plate)) {
        return false;
      }

      // Vehicle Type
      if (typePlateSet && !typePlateSet.has(plate.toUpperCase())) {
        return false;
      }

      return true;
    });
  }, [combinedData, dateFilterCol, filterFrom, filterTo, tripSlipSearch, driverSearch, selectedPlates, vehicleTypeFilter, vehicles]);

  // Process Plate Grouping if enabled
  const processedData = useMemo(() => {
    if (!isGroupedByPlate) return filteredData;

    const grp: Record<string, { plate: string; count: number; driver: string; sums: number[] }> = {};
    const suggestions = ["CASH IN", "CASH OUT", "EXPENSE", "PAYMENT", "SALARY"];

    filteredData.forEach(r => {
      let groupKey = r[COL.PLATE] || "Unknown";
      const ts = String(r[COL.TRIPSLIP] || "").toUpperCase().trim();
      const matchedCat = suggestions.find(s => ts.includes(s));
      if (matchedCat) {
        groupKey = `[ ${matchedCat} ]`;
      }

      if (!grp[groupKey]) {
        grp[groupKey] = {
          plate: groupKey,
          count: 0,
          driver: r[COL.DRIVER] || '',
          sums: new Array(24).fill(0)
        };
      }
      grp[groupKey].count++;
      if (grp[groupKey].driver !== r[COL.DRIVER]) {
        grp[groupKey].driver = "Multiple";
      }
      for (let i = COL.GROSS; i <= COL.TOTALNET; i++) {
        grp[groupKey].sums[i] += Number(r[i] || 0);
      }
    });

    return Object.values(grp).map((g, idx) => {
      const row = new Array(28).fill('');
      row[COL.ID] = `GROUP_${idx}`;
      row[COL.PLATE] = g.plate;
      row[COL.TRIPSLIP] = `${g.count} Entry(s)`;
      for (let i = COL.GROSS; i <= COL.TOTALNET; i++) {
        row[i] = g.sums[i];
      }
      row[COL.IS_OFFLINE] = false;
      return row;
    });
  }, [filteredData, isGroupedByPlate]);

  // Sort processed data
  const sortedData = useMemo(() => {
    const list = [...processedData];
    const idxMap: Record<string, number> = {
      timestamp: COL.TIMESTAMP,
      daterec: COL.DATEREC,
      plate: COL.PLATE,
      driver: COL.DRIVER,
      gross: COL.GROSS,
      totalnet: COL.TOTALNET
    };
    const colIdx = idxMap[sortCol] ?? COL.TIMESTAMP;

    list.sort((a, b) => {
      if (sortCol === 'timestamp' && sortOrder === 'desc') {
        if (a[COL.IS_OFFLINE] && !b[COL.IS_OFFLINE]) return -1;
        if (!a[COL.IS_OFFLINE] && b[COL.IS_OFFLINE]) return 1;
      }
      const valA = a[colIdx];
      const valB = b[colIdx];

      if (sortCol === 'gross' || sortCol === 'totalnet') {
        const numA = Number(valA) || 0;
        const numB = Number(valB) || 0;
        return sortOrder === 'asc' ? numA - numB : numB - numA;
      }
      const strA = String(valA || '');
      const strB = String(valB || '');
      return sortOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });

    return list;
  }, [processedData, sortCol, sortOrder]);

  // Totals
  const grandTotals = useMemo(() => {
    const totals = new Array(24).fill(0);
    processedData.forEach(r => {
      for (let i = COL.GROSS; i <= COL.TOTALNET; i++) {
        totals[i] += Number(r[i] || 0);
      }
    });
    return totals;
  }, [processedData]);

  // Paginated records
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Sorting toggle
  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortOrder('asc');
    }
  };

  // Row selection handler
  const handleRowClick = (id: string, e: React.MouseEvent) => {
    // If Shift/Ctrl or already in selection mode
    if (selectedRowIds.size > 0 || e.shiftKey || e.metaKey || e.ctrlKey) {
      toggleRowSelection(id);
    }
  };

  const toggleRowSelection = (id: string) => {
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyHighlight = (color: string) => {
    const updated = { ...highlightMap };
    selectedRowIds.forEach(id => {
      if (!color) delete updated[id];
      else updated[id] = color;
    });
    setHighlightMap(updated);
    localStorage.setItem('itc_highlight_map', JSON.stringify(updated));
    setSelectedRowIds(new Set());
  };

  const handleDeleteSelected = () => {
    if (selectedRowIds.size === 0) return;
    onShowConfirm(`Permanently delete ${selectedRowIds.size} selected items?`, async () => {
      await onDeleteMultiple(Array.from(selectedRowIds));
      setSelectedRowIds(new Set());
    });
  };

  // Open Edit Modal
  const openEditModal = (row: any) => {
    if (String(row[COL.ID]).startsWith('GROUP_')) return;
    setEditingRecord(row);

    let dRec = row[COL.DATEREC] || '';
    try {
      dRec = new Date(row[COL.DATEREC]).toISOString().split('T')[0];
    } catch {}

    const initData: any = {
      id: row[COL.ID],
      dateRec: dRec,
      plate: row[COL.PLATE] || '',
      orNo: row[COL.ORNO] || '',
      tripSlip: row[COL.TRIPSLIP] || '',
      driver: row[COL.DRIVER] || '',
      route: row[COL.ROUTE] || '',
      remark: row[COL.REMARK] || ''
    };

    const numMap: Record<string, number> = {
      gross: COL.GROSS, disc: COL.DISC, terminal: COL.TERMINAL, fuel: COL.FUEL,
      meals: COL.MEALS, repair: COL.REPAIR, othersexp: COL.OTHERSEXP,
      pakyaw: COL.PAKYAW, mgtfee: COL.MGTFEE, cbu: COL.CBU, tire: COL.TIRE,
      loan: COL.LOAN, others: COL.OTHERS
    };

    Object.keys(numMap).forEach(k => {
      const v = row[numMap[k]];
      initData[k] = (v === 0 || v === "0" || v === "" || v === undefined) ? "" : String(v);
    });

    // Auto-calc subTotal & totalNet
    calculateModalTotals(initData);
    setEditFormData(initData);
  };

  const calculateModalTotals = (data: any) => {
    const num = (k: string) => Number(data[k]) || 0;
    const g = num('gross');
    const m = num('mgtfee');
    const exp = num('disc') + num('terminal') + num('fuel') + num('meals') + num('repair') + num('othersexp');
    const sub = g - (g > 0 ? m : 0) - exp;

    const p = num('pakyaw');
    const ded = num('cbu') + num('tire') + num('loan') + num('others');
    const net = sub + p + m + ded;

    data.subTotal = sub !== 0 ? sub.toFixed(2) : '0.00';
    data.totalNet = net !== 0 ? net.toFixed(2) : '0.00';
  };

  const handleEditFieldChange = (field: string, val: string) => {
    const updated = { ...editFormData, [field]: val };
    calculateModalTotals(updated);
    setEditFormData(updated);
  };

  const handleSaveEdit = async () => {
    if (!editFormData.dateRec || !editFormData.tripSlip) {
      onShowAlert("Date and Trip Slip are required.");
      return;
    }

    const isDup = await checkDuplicateStrict(editFormData.tripSlip, editFormData.id);
    if (isDup) {
      onShowAlert("⛔ Duplicate Trip Slip detected! This slip number already exists.");
      return;
    }

    onShowConfirm("Save changes to this remittance record?", async () => {
      const payload = {
        id: editFormData.id,
        dateRec: editFormData.dateRec,
        plate: editFormData.plate.trim().toUpperCase(),
        orNo: editFormData.orNo.trim(),
        tripSlip: editFormData.tripSlip.trim(),
        driver: editFormData.driver.trim(),
        route: editFormData.route.trim().toUpperCase(),
        remark: editFormData.remark.trim(),
        gross: Number(editFormData.gross) || 0,
        disc: Number(editFormData.disc) || 0,
        terminal: Number(editFormData.terminal) || 0,
        fuel: Number(editFormData.fuel) || 0,
        meals: Number(editFormData.meals) || 0,
        repair: Number(editFormData.repair) || 0,
        othersexp: Number(editFormData.othersexp) || 0,
        subTotal: Number(editFormData.subTotal) || 0,
        pakyaw: Number(editFormData.pakyaw) || 0,
        mgtfee: Number(editFormData.mgtfee) || 0,
        cbu: Number(editFormData.cbu) || 0,
        tire: Number(editFormData.tire) || 0,
        loan: Number(editFormData.loan) || 0,
        others: Number(editFormData.others) || 0,
        totalNet: Number(editFormData.totalNet) || 0
      };

      await onUpdateRemittance(payload);
      setEditingRecord(null);
    });
  };

  const handleDeleteEdit = () => {
    if (!editingRecord) return;
    onShowConfirm("Permanently delete this remittance entry?", async () => {
      await onDeleteRemittance(editingRecord[COL.ID]);
      setEditingRecord(null);
    });
  };

  // CSV Export
  const handleExportCSV = () => {
    const activeCols = EXPORT_COLUMNS.filter((_, i) => selectedExportCols.includes(i));
    if (activeCols.length === 0) {
      onShowAlert("Please select at least one column to export.");
      return;
    }

    const headers = activeCols.map(c => `"${c.label}"`).join(',');
    const rowsCSV = processedData.map(r => {
      return activeCols.map(c => {
        let val = r[c.idx] ?? '';
        if (c.key) val = Number(val || 0);
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    });

    // Total row
    const totalsRow = activeCols.map((c, i) => {
      if (i === 0) return '"TOTAL"';
      if (c.key) return `"${grandTotals[c.idx] || 0}"`;
      return '""';
    }).join(',');

    const csvContent = "\uFEFF" + [headers, ...rowsCSV, totalsRow].join("\r\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ITC_Remittance_${new Date().toLocaleDateString('en-CA')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportModalOpen(false);
  };

  // Print Report
  const handlePrint = () => {
    window.print();
    setExportModalOpen(false);
  };

  return (
    <div className="max-w-[100vw] px-2 sm:px-4 lg:px-6 py-4 space-y-3">
      {/* Filters & Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md space-y-3">
        {/* Title & Group Switch */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-sky-400 flex items-center gap-2">
              📊 Remittance Summary Ledger
              <span className="text-xs font-normal text-slate-400">
                ({filteredData.length} records found)
              </span>
            </h2>
          </div>

          <label className="flex items-center gap-2 cursor-pointer bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold text-slate-200">
            <input
              type="checkbox"
              checked={isGroupedByPlate}
              onChange={(e) => setIsGroupedByPlate(e.target.checked)}
              className="rounded bg-slate-800 border-slate-600 text-sky-500 focus:ring-0"
            />
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            Group by Plate / Category
          </label>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Type Selector */}
          <select
            value={dateFilterCol}
            onChange={(e) => setDateFilterCol(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="daterec">By Date Rec</option>
            <option value="timestamp">By Timestamp</option>
          </select>

          {/* Date Range */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300">
            <span className="text-slate-400">From:</span>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="bg-transparent text-slate-100 outline-none text-xs"
            />
            <span className="text-slate-400 ml-1">To:</span>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="bg-transparent text-slate-100 outline-none text-xs"
            />
          </div>

          {/* Driver Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search Operator..."
              value={driverSearch}
              onChange={(e) => setDriverSearch(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 w-36 sm:w-44"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2" />
          </div>

          {/* Plate Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setPlateMenuOpen(!plateMenuOpen)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 flex items-center gap-1.5 hover:bg-slate-800 transition"
            >
              <span>{selectedPlates.length === 0 ? 'All Plates' : `${selectedPlates.length} Plates`}</span>
            </button>

            {plateMenuOpen && (
              <div className="absolute left-0 mt-1 w-52 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-2 z-50 max-h-60 overflow-y-auto space-y-1">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800 px-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Select Plates</span>
                  <div className="flex gap-2 text-[10px]">
                    <button
                      onClick={() => setSelectedPlates([...availablePlates])}
                      className="text-sky-400 hover:underline"
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSelectedPlates([])}
                      className="text-red-400 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                {availablePlates.map(p => (
                  <label key={p} className="flex items-center gap-2 px-1 py-1 text-xs text-slate-300 hover:bg-slate-800 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPlates.includes(p)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedPlates(prev => [...prev, p]);
                        else setSelectedPlates(prev => prev.filter(x => x !== p));
                      }}
                      className="rounded bg-slate-800 border-slate-600 text-sky-500"
                    />
                    <span>{p}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Trip Slip Search */}
          <input
            type="text"
            placeholder="Trip Slip..."
            value={tripSlipSearch}
            onChange={(e) => setTripSlipSearch(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 w-28"
          />

          {/* Vehicle Type Filter */}
          <select
            value={vehicleTypeFilter}
            onChange={(e) => setVehicleTypeFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="">All Types</option>
            <option value="Bus">Bus</option>
            <option value="Van">Van</option>
            <option value="Truck">Truck</option>
          </select>

          {/* Page Size */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value={100}>100 rows</option>
            <option value={500}>500 rows</option>
            <option value={1000}>1,000 rows</option>
            <option value={5000}>5,000 rows</option>
          </select>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-400 rounded-lg text-xs font-semibold shadow transition cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Reload
            </button>

            <button
              onClick={() => setExportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export / Print
            </button>
          </div>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="overflow-x-auto overflow-y-auto max-h-[68vh] border border-slate-700 rounded-xl shadow-inner bg-slate-950">
        <table className="w-full text-[12px] border-collapse text-slate-200 min-w-[2100px]">
          <thead className="sticky top-0 z-20 bg-slate-900 border-b-2 border-sky-400 text-slate-200 select-none shadow">
            <tr>
              {!isGroupedByPlate && (
                <th 
                  onClick={() => handleSort('timestamp')}
                  className="p-2 border border-slate-700 text-center cursor-pointer hover:bg-slate-800 w-[110px]"
                >
                  Timestamp {sortCol === 'timestamp' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
              )}
              {!isGroupedByPlate && (
                <th 
                  onClick={() => handleSort('daterec')}
                  className="p-2 border border-slate-700 text-center cursor-pointer hover:bg-slate-800 w-[100px]"
                >
                  DATE REC {sortCol === 'daterec' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
              )}
              <th 
                onClick={() => handleSort('plate')}
                className="p-2 border border-slate-700 text-left pl-3 cursor-pointer hover:bg-slate-800 w-[110px]"
              >
                PLATE {sortCol === 'plate' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
              </th>
              {!isGroupedByPlate && <th className="p-2 border border-slate-700 text-center w-[90px]">OR NO.</th>}
              <th className="p-2 border border-slate-700 text-center w-[120px]">TRIP SLIP</th>
              {!isGroupedByPlate && (
                <th 
                  onClick={() => handleSort('driver')}
                  className="p-2 border border-slate-700 text-left pl-3 cursor-pointer hover:bg-slate-800 w-[130px]"
                >
                  STAFF/DRIVER {sortCol === 'driver' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </th>
              )}
              {!isGroupedByPlate && <th className="p-2 border border-slate-700 text-center w-[95px]">ROUTE</th>}
              <th className="p-2 border border-slate-700 text-left pl-2 w-[140px]">REMARK</th>

              <th 
                onClick={() => handleSort('gross')}
                className="p-2 border border-slate-700 text-right text-emerald-400 cursor-pointer hover:bg-slate-800 w-[95px]"
              >
                GROSS {sortCol === 'gross' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
              </th>
              <th className="p-2 border border-slate-700 text-right text-red-400 w-[80px]">DISC</th>
              <th className="p-2 border border-slate-700 text-right text-red-400 w-[80px]">TERMINAL</th>
              <th className="p-2 border border-slate-700 text-right text-red-400 w-[85px]">FUEL</th>
              <th className="p-2 border border-slate-700 text-right text-red-400 w-[80px]">MEALS</th>
              <th className="p-2 border border-slate-700 text-right text-red-400 w-[85px]">REPAIR</th>
              <th className="p-2 border border-slate-700 text-right text-red-400 w-[85px]">OTHERS EXP</th>
              <th className="p-2 border border-slate-700 text-right text-sky-400 bg-sky-950/40 w-[100px]">SUB TOTAL</th>
              <th className="p-2 border border-slate-700 text-right text-emerald-400 w-[90px]">PAKYAW</th>
              <th className="p-2 border border-slate-700 text-right text-red-400 w-[85px]">MGT FEE</th>
              <th className="p-2 border border-slate-700 text-right text-amber-400 w-[80px]">CBU</th>
              <th className="p-2 border border-slate-700 text-right text-amber-400 w-[80px]">TIRE</th>
              <th className="p-2 border border-slate-700 text-right text-amber-400 w-[80px]">LOAN</th>
              <th className="p-2 border border-slate-700 text-right text-amber-400 w-[80px]">OTHERS</th>
              <th 
                onClick={() => handleSort('totalnet')}
                className="p-2 border border-slate-700 text-right text-sky-300 bg-sky-950/60 cursor-pointer hover:bg-slate-800 w-[105px]"
              >
                TOTAL NET {sortCol === 'totalnet' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
              </th>
              {!isGroupedByPlate && <th className="p-2 border border-slate-700 text-center text-slate-400 w-[90px]">ENCODER</th>}
            </tr>
          </thead>

          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={25} className="py-12 text-center text-slate-500">
                  No records matching the selected filters.
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => {
                const id = String(row[COL.ID]);
                const isOffline = row[COL.IS_OFFLINE] === true;
                const isSelected = selectedRowIds.has(id);
                const isGroup = id.startsWith('GROUP_');
                const customHighlight = highlightMap[id];

                let rowBg = isSelected
                  ? 'bg-sky-950/90 text-sky-200 border-l-4 border-l-sky-400'
                  : customHighlight
                  ? customHighlight
                  : isGroup
                  ? 'bg-slate-800 font-bold text-sky-300'
                  : isOffline
                  ? 'bg-amber-950/40 text-amber-200 border-l-4 border-l-amber-500'
                  : 'hover:bg-slate-850';

                return (
                  <tr
                    key={id}
                    onClick={(e) => handleRowClick(id, e)}
                    onDoubleClick={() => !isGroup && openEditModal(row)}
                    className={`${rowBg} border-b border-slate-800 cursor-pointer transition select-none`}
                    title="Double click to edit. Click to select."
                  >
                    {!isGroupedByPlate && (
                      <td className="p-2 border border-slate-700 text-center text-slate-400 whitespace-nowrap">
                        {row[COL.TIMESTAMP] ? new Date(row[COL.TIMESTAMP]).toLocaleDateString() : ''}
                      </td>
                    )}
                    {!isGroupedByPlate && (
                      <td className="p-2 border border-slate-700 text-center whitespace-nowrap font-medium">
                        {row[COL.DATEREC] ? new Date(row[COL.DATEREC]).toLocaleDateString() : ''}
                      </td>
                    )}
                    <td className="p-2 border border-slate-700 font-bold text-white whitespace-nowrap">
                      {row[COL.PLATE]}
                    </td>
                    {!isGroupedByPlate && (
                      <td className="p-2 border border-slate-700 text-center text-slate-300">
                        {row[COL.ORNO]}
                      </td>
                    )}
                    <td className="p-2 border border-slate-700 text-center font-semibold text-sky-300">
                      {row[COL.TRIPSLIP]}
                    </td>
                    {!isGroupedByPlate && (
                      <td className="p-2 border border-slate-700 text-slate-200">
                        {row[COL.DRIVER]}
                      </td>
                    )}
                    {!isGroupedByPlate && (
                      <td className="p-2 border border-slate-700 text-center text-slate-300 uppercase">
                        {row[COL.ROUTE]}
                      </td>
                    )}
                    <td className="p-2 border border-slate-700 text-slate-300 truncate max-w-[150px]">
                      {row[COL.REMARK]}
                    </td>

                    {/* Numeric Columns */}
                    <td className="p-2 border border-slate-700 text-right text-emerald-400 font-medium">
                      {formatCurrency(row[COL.GROSS])}
                    </td>
                    <td className="p-2 border border-slate-700 text-right text-red-400">
                      {formatCurrency(row[COL.DISC])}
                    </td>
                    <td className="p-2 border border-slate-700 text-right text-red-400">
                      {formatCurrency(row[COL.TERMINAL])}
                    </td>
                    <td className="p-2 border border-slate-700 text-right text-red-400 font-medium">
                      {formatCurrency(row[COL.FUEL])}
                    </td>
                    <td className="p-2 border border-slate-700 text-right text-red-400">
                      {formatCurrency(row[COL.MEALS])}
                    </td>
                    <td className="p-2 border border-slate-700 text-right text-red-400">
                      {formatCurrency(row[COL.REPAIR])}
                    </td>
                    <td className="p-2 border border-slate-700 text-right text-red-400">
                      {formatCurrency(row[COL.OTHERSEXP])}
                    </td>
                    <td className="p-2 border border-slate-700 text-right font-bold text-sky-400 bg-sky-950/30">
                      {formatCurrency(row[COL.SUBTOTAL])}
                    </td>
                    <td className="p-2 border border-slate-700 text-right text-emerald-400 font-medium">
                      {formatCurrency(row[COL.PAKYAW])}
                    </td>
                    <td className="p-2 border border-slate-700 text-right text-red-400">
                      {formatCurrency(row[COL.MGTFEE])}
                    </td>
                    <td className="p-2 border border-slate-700 text-right text-amber-400">
                      {formatCurrency(row[COL.CBU])}
                    </td>
                    <td className="p-2 border border-slate-700 text-right text-amber-400">
                      {formatCurrency(row[COL.TIRE])}
                    </td>
                    <td className="p-2 border border-slate-700 text-right text-amber-400">
                      {formatCurrency(row[COL.LOAN])}
                    </td>
                    <td className="p-2 border border-slate-700 text-right text-amber-400">
                      {formatCurrency(row[COL.OTHERS])}
                    </td>
                    <td className="p-2 border border-slate-700 text-right font-black text-sky-300 bg-sky-950/60">
                      {formatCurrency(row[COL.TOTALNET])}
                    </td>
                    {!isGroupedByPlate && (
                      <td className="p-2 border border-slate-700 text-center text-slate-400 text-[11px]">
                        {row[COL.ENCODER]}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Sticky Grand Totals Footer */}
          <tfoot className="sticky bottom-0 z-20 bg-slate-900 border-t-2 border-sky-400 font-bold text-slate-100 shadow-2xl">
            <tr>
              <td
                colSpan={isGroupedByPlate ? 3 : 5}
                className="p-2 border border-slate-700 text-right uppercase text-slate-300"
              >
                GRAND TOTAL ({filteredData.length} entries):
              </td>
              {!isGroupedByPlate && <td colSpan={3} className="p-2 border border-slate-700"></td>}
              <td className="p-2 border border-slate-700 text-right text-emerald-400">
                {formatCurrency(grandTotals[COL.GROSS]) || '0.00'}
              </td>
              <td className="p-2 border border-slate-700 text-right text-red-400">
                {formatCurrency(grandTotals[COL.DISC]) || '0.00'}
              </td>
              <td className="p-2 border border-slate-700 text-right text-red-400">
                {formatCurrency(grandTotals[COL.TERMINAL]) || '0.00'}
              </td>
              <td className="p-2 border border-slate-700 text-right text-red-400">
                {formatCurrency(grandTotals[COL.FUEL]) || '0.00'}
              </td>
              <td className="p-2 border border-slate-700 text-right text-red-400">
                {formatCurrency(grandTotals[COL.MEALS]) || '0.00'}
              </td>
              <td className="p-2 border border-slate-700 text-right text-red-400">
                {formatCurrency(grandTotals[COL.REPAIR]) || '0.00'}
              </td>
              <td className="p-2 border border-slate-700 text-right text-red-400">
                {formatCurrency(grandTotals[COL.OTHERSEXP]) || '0.00'}
              </td>
              <td className="p-2 border border-slate-700 text-right text-sky-400 bg-sky-950/40">
                {formatCurrency(grandTotals[COL.SUBTOTAL]) || '0.00'}
              </td>
              <td className="p-2 border border-slate-700 text-right text-emerald-400">
                {formatCurrency(grandTotals[COL.PAKYAW]) || '0.00'}
              </td>
              <td className="p-2 border border-slate-700 text-right text-red-400">
                {formatCurrency(grandTotals[COL.MGTFEE]) || '0.00'}
              </td>
              <td className="p-2 border border-slate-700 text-right text-amber-400">
                {formatCurrency(grandTotals[COL.CBU]) || '0.00'}
              </td>
              <td className="p-2 border border-slate-700 text-right text-amber-400">
                {formatCurrency(grandTotals[COL.TIRE]) || '0.00'}
              </td>
              <td className="p-2 border border-slate-700 text-right text-amber-400">
                {formatCurrency(grandTotals[COL.LOAN]) || '0.00'}
              </td>
              <td className="p-2 border border-slate-700 text-right text-amber-400">
                {formatCurrency(grandTotals[COL.OTHERS]) || '0.00'}
              </td>
              <td className="p-2 border border-slate-700 text-right text-sky-300 bg-sky-950/60 font-black">
                {formatCurrency(grandTotals[COL.TOTALNET]) || '0.00'}
              </td>
              {!isGroupedByPlate && <td className="p-2 border border-slate-700"></td>}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
        <div>
          Showing {paginatedData.length} of {sortedData.length} rows (Page {currentPage} of {totalPages})
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-semibold text-slate-300">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Selection Toolbar */}
      {selectedRowIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-slate-700 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
          <span className="text-xs font-bold text-sky-300">
            {selectedRowIds.size} Selected
          </span>
          <div className="h-4 w-[1px] bg-slate-700" />
          <button
            onClick={handleDeleteSelected}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-full text-xs font-semibold shadow transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>

          {/* Color Dots */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-full border border-slate-800">
            <button
              onClick={() => applyHighlight('bg-amber-950/70 text-amber-200')}
              title="Yellow Highlight"
              className="w-5 h-5 rounded-full bg-amber-600 hover:scale-110 transition border border-white/20"
            />
            <button
              onClick={() => applyHighlight('bg-emerald-950/70 text-emerald-200')}
              title="Green Highlight"
              className="w-5 h-5 rounded-full bg-emerald-600 hover:scale-110 transition border border-white/20"
            />
            <button
              onClick={() => applyHighlight('bg-rose-950/70 text-rose-200')}
              title="Red Highlight"
              className="w-5 h-5 rounded-full bg-rose-600 hover:scale-110 transition border border-white/20"
            />
            <button
              onClick={() => applyHighlight('bg-sky-950/70 text-sky-200')}
              title="Blue Highlight"
              className="w-5 h-5 rounded-full bg-sky-600 hover:scale-110 transition border border-white/20"
            />
            <button
              onClick={() => applyHighlight('')}
              title="Clear Highlight"
              className="w-5 h-5 rounded-full bg-slate-800 hover:bg-slate-700 text-[10px] text-white flex items-center justify-center transition border border-white/20"
            >
              ✖
            </button>
          </div>

          <button
            onClick={() => setSelectedRowIds(new Set())}
            className="text-xs text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Edit Remittance Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sky-400 text-base flex items-center gap-2">
                <Edit2 className="w-4 h-4" /> Edit Remittance Transaction
              </h3>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Date Rec</label>
                  <input
                    type="date"
                    value={editFormData.dateRec || ''}
                    onChange={(e) => handleEditFieldChange('dateRec', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Plate</label>
                  <input
                    type="text"
                    value={editFormData.plate || ''}
                    onChange={(e) => handleEditFieldChange('plate', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 uppercase"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">OR No.</label>
                  <input
                    type="text"
                    value={editFormData.orNo || ''}
                    onChange={(e) => handleEditFieldChange('orNo', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Trip Slip</label>
                  <input
                    type="text"
                    value={editFormData.tripSlip || ''}
                    onChange={(e) => handleEditFieldChange('tripSlip', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Driver</label>
                  <input
                    type="text"
                    value={editFormData.driver || ''}
                    onChange={(e) => handleEditFieldChange('driver', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Route</label>
                  <input
                    type="text"
                    value={editFormData.route || ''}
                    onChange={(e) => handleEditFieldChange('route', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold mb-1 block">Remark</label>
                <input
                  type="text"
                  value={editFormData.remark || ''}
                  onChange={(e) => handleEditFieldChange('remark', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-slate-800">
                {/* Left: Expenses */}
                <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <h4 className="font-bold text-sky-400 mb-2 uppercase tracking-wider text-[11px]">
                    Trip Incomes & Expenses
                  </h4>
                  {REMIT_CONFIG.filter(f => f.group === 'expenses').map(f => (
                    <div key={f.key} className="flex items-center justify-between gap-3">
                      <span className="text-slate-300 font-medium">{f.label}:</span>
                      <input
                        type="number"
                        step="0.01"
                        value={editFormData[f.key] || ''}
                        onChange={(e) => handleEditFieldChange(f.key, e.target.value)}
                        placeholder="0.00"
                        className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right text-slate-100 font-mono"
                      />
                    </div>
                  ))}

                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
                    <span className="font-bold text-sky-400">SUB TOTAL:</span>
                    <input
                      type="text"
                      readOnly
                      value={editFormData.subTotal || '0.00'}
                      className="w-32 bg-sky-950/80 border border-sky-600 rounded px-2 py-1 text-right text-sky-300 font-bold font-mono"
                    />
                  </div>
                </div>

                {/* Right: Deductions */}
                <div className="space-y-2 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <h4 className="font-bold text-amber-400 mb-2 uppercase tracking-wider text-[11px]">
                    Pakyaw & Deductions
                  </h4>
                  {REMIT_CONFIG.filter(f => f.group === 'deductions').map(f => (
                    <div key={f.key} className="flex items-center justify-between gap-3">
                      <span className="text-slate-300 font-medium">{f.label}:</span>
                      <input
                        type="number"
                        step="0.01"
                        value={editFormData[f.key] || ''}
                        onChange={(e) => handleEditFieldChange(f.key, e.target.value)}
                        placeholder="0.00"
                        className="w-32 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right text-slate-100 font-mono"
                      />
                    </div>
                  ))}

                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-800">
                    <span className="font-bold text-emerald-400">TOTAL NET:</span>
                    <input
                      type="text"
                      readOnly
                      value={editFormData.totalNet || '0.00'}
                      className="w-32 bg-emerald-950/80 border border-emerald-600 rounded px-2 py-1 text-right text-emerald-300 font-black font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={handleDeleteEdit}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold text-xs transition cursor-pointer"
              >
                Delete Record
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold text-xs shadow-md transition cursor-pointer"
                >
                  Update Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export / Print Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-400" /> Export & Print Options
              </h3>
              <button
                onClick={() => setExportModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-semibold text-slate-300">Choose Columns to Include:</span>
                <div className="flex gap-2 text-[11px]">
                  <button
                    onClick={() => setSelectedExportCols(EXPORT_COLUMNS.map((_, i) => i))}
                    className="text-sky-400 hover:underline"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setSelectedExportCols([])}
                    className="text-red-400 hover:underline"
                  >
                    Unselect All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                {EXPORT_COLUMNS.map((col, idx) => (
                  <label key={col.idx} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-800 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={selectedExportCols.includes(idx)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedExportCols(prev => [...prev, idx]);
                        else setSelectedExportCols(prev => prev.filter(x => x !== idx));
                      }}
                      className="rounded bg-slate-800 border-slate-600 text-emerald-500"
                    />
                    <span>{col.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold text-xs transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Table
              </button>
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-md transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
