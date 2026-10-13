import React, { useState, useMemo } from 'react';
import { VehicleRecord, OfflineQueueItem } from '../types';
import { COL } from '../services/api';
import { CalendarCheck2, Printer, RefreshCw } from 'lucide-react';

interface TripReportPageProps {
  summaryData: any[];
  vehicles: VehicleRecord[];
  offlineQueue: OfflineQueueItem[];
  onRefresh: () => void;
}

export const TripReportPage: React.FC<TripReportPageProps> = ({
  summaryData,
  vehicles,
  offlineQueue,
  onRefresh
}) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Eligible buses and vans
  const busAndVanPlates = useMemo(() => {
    return vehicles
      .filter(v => v.type === 'Bus' || v.type === 'Van')
      .map(v => v.plate.toUpperCase())
      .sort();
  }, [vehicles]);

  // Combine live/cached summary with offline queue
  const combinedRemittances = useMemo(() => {
    const queueRows = offlineQueue
      .filter(q => q.action === 'saveRemittance')
      .map(q => {
        const d = q.data;
        const row = [];
        row[COL.DATEREC] = d.dateRec;
        row[COL.PLATE] = d.plate;
        row[COL.TRIPSLIP] = d.tripSlip;
        row[COL.ROUTE] = d.route;
        return row;
      });
    return [...queueRows, ...summaryData];
  }, [summaryData, offlineQueue]);

  // Compute Matrix: Plate -> Day counts + Route counts
  const { matrix, routes, dayTotals, routeTotals, grandTotalTrips } = useMemo(() => {
    const mat: Record<string, { days: number[]; routes: Record<string, number> }> = {};
    const routeSet = new Set<string>();

    busAndVanPlates.forEach(p => {
      mat[p] = {
        days: new Array(daysInMonth + 1).fill(0),
        routes: {}
      };
    });

    combinedRemittances.forEach(r => {
      const dStr = r[COL.DATEREC];
      const p = String(r[COL.PLATE] || '').trim().toUpperCase();
      const ts = String(r[COL.TRIPSLIP] || '').trim();
      const rt = (String(r[COL.ROUTE] || '').trim().toUpperCase()) || 'UNSPECIFIED';

      // Skip non-numeric expense slips (e.g. EXPENSE #101)
      if (!/^\d+$/.test(ts)) return;

      if (dStr && p && mat[p]) {
        const dt = new Date(dStr);
        if (dt.getFullYear() === selectedYear && dt.getMonth() === selectedMonth) {
          const d = dt.getDate();
          if (d >= 1 && d <= daysInMonth) {
            mat[p].days[d]++;
            mat[p].routes[rt] = (mat[p].routes[rt] || 0) + 1;
            routeSet.add(rt);
          }
        }
      }
    });

    // Custom sort: Ormoc, Isabel, then alphabetical
    const sortedRoutes = Array.from(routeSet).sort((a, b) => {
      if (a === 'ORMOC') return -1;
      if (b === 'ORMOC') return 1;
      if (a === 'ISABEL') return -1;
      if (b === 'ISABEL') return 1;
      return a.localeCompare(b);
    });

    const dayTots = new Array(daysInMonth + 1).fill(0);
    const routeTots: Record<string, number> = {};
    sortedRoutes.forEach(r => routeTots[r] = 0);
    let totalTrips = 0;

    busAndVanPlates.forEach(p => {
      for (let d = 1; d <= daysInMonth; d++) {
        dayTots[d] += mat[p].days[d];
        totalTrips += mat[p].days[d];
      }
      sortedRoutes.forEach(rt => {
        routeTots[rt] += mat[p].routes[rt] || 0;
      });
    });

    return {
      matrix: mat,
      routes: sortedRoutes,
      dayTotals: dayTots,
      routeTotals: routeTots,
      grandTotalTrips: totalTrips
    };
  }, [busAndVanPlates, combinedRemittances, selectedMonth, selectedYear, daysInMonth]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-sky-400 flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-teal-400" /> Trip Monitoring Matrix
          </h2>
          <p className="text-xs text-slate-400">
            Daily dispatched trips per vehicle with Ormoc and Isabel route distributions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
          >
            {monthNames.map((name, idx) => (
              <option key={idx} value={idx}>{name}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
          >
            {[now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-400 rounded-lg text-xs font-semibold shadow transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Matrix
          </button>
        </div>
      </div>

      {/* Matrix Table Container */}
      <div className="overflow-x-auto border border-slate-700 rounded-xl shadow-inner bg-slate-950 max-h-[70vh]">
        <table className="w-full text-[11px] border-collapse text-slate-200 min-w-[1400px]">
          <thead className="sticky top-0 z-20 bg-slate-900 border-b-2 border-sky-400 font-bold text-center">
            <tr>
              <th className="p-2 border border-slate-700 sticky left-0 z-30 bg-slate-900 text-left pl-3 w-[110px]">
                Plate No.
              </th>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                <th key={day} className="p-1 border border-slate-700 w-7 text-slate-300">
                  {day}
                </th>
              ))}
              <th className="p-2 border border-slate-700 bg-amber-950 text-amber-300 border-l-2 border-amber-500 w-12">
                TOTAL
              </th>
              {routes.map(r => (
                <th key={r} className="p-2 border border-slate-700 text-sky-300 w-16 uppercase">
                  {r}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {busAndVanPlates.length === 0 ? (
              <tr>
                <td colSpan={daysInMonth + routes.length + 2} className="py-8 text-center text-slate-500">
                  No registered Buses or Vans found.
                </td>
              </tr>
            ) : (
              busAndVanPlates.map(plate => {
                const row = matrix[plate];
                let rowSum = 0;
                for (let d = 1; d <= daysInMonth; d++) rowSum += row.days[d];

                // Skip plates with 0 trips in this month if desired, or show
                return (
                  <tr key={plate} className="hover:bg-slate-850 transition">
                    <td className="p-2 border border-slate-700 sticky left-0 z-10 bg-slate-900 font-bold text-white pl-3 whitespace-nowrap">
                      {plate}
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => {
                      const count = row.days[d];
                      return (
                        <td
                          key={d}
                          className={`p-1 border border-slate-700 text-center font-bold ${
                            count > 0 ? 'bg-sky-950/70 text-sky-400' : 'text-slate-600'
                          }`}
                        >
                          {count > 0 ? count : ''}
                        </td>
                      );
                    })}
                    <td className="p-2 border border-slate-700 bg-amber-950/80 text-amber-300 font-extrabold text-center border-l-2 border-amber-500">
                      {rowSum}
                    </td>
                    {routes.map(rt => {
                      const rc = row.routes[rt] || 0;
                      return (
                        <td key={rt} className="p-2 border border-slate-700 text-center text-slate-300 font-semibold">
                          {rc > 0 ? rc : ''}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>

          <tfoot className="sticky bottom-0 z-20 bg-amber-950 text-amber-200 font-bold border-t-2 border-amber-500 text-center">
            <tr>
              <td className="p-2 border border-slate-700 sticky left-0 z-30 bg-amber-950 text-left pl-3">
                TOTAL TRIPS:
              </td>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => (
                <td key={d} className="p-1 border border-slate-700 text-amber-100">
                  {dayTotals[d] > 0 ? dayTotals[d] : ''}
                </td>
              ))}
              <td className="p-2 border border-slate-700 text-amber-300 font-black border-l-2 border-amber-500 text-xs">
                {grandTotalTrips}
              </td>
              {routes.map(rt => (
                <td key={rt} className="p-2 border border-slate-700 text-amber-200">
                  {routeTotals[rt] || 0}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
