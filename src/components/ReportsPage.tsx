import React, { useState, useEffect, useRef } from 'react';
import { VehicleRecord } from '../types';
import { COL, formatCurrency, formatCurrencyStrict } from '../services/api';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement, 
  ArcElement, 
  Title, 
  Tooltip, 
  Legend,
  Filler
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { 
  TrendingUp, 
  DollarSign, 
  CreditCard, 
  Percent, 
  Printer, 
  RefreshCw, 
  Award, 
  Fuel, 
  X 
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ReportsPageProps {
  summaryData: any[];
  vehicles: VehicleRecord[];
  onRefresh: () => void;
  theme: 'dark' | 'light';
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  summaryData,
  vehicles,
  onRefresh,
  theme
}) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // '' = all months
  const [dateType, setDateType] = useState<'daterec' | 'timestamp'>('daterec');

  // Expense breakdown slice click modal
  const [expenseDetailModal, setExpenseDetailModal] = useState<{ label: string; items: { plate: string; amount: number }[] } | null>(null);

  const dateIdx = dateType === 'timestamp' ? COL.TIMESTAMP : COL.DATEREC;

  // Filter and compute statistics
  const busAndVanPlates = new Set(
    vehicles.filter(v => v.type === 'Bus' || v.type === 'Van').map(v => v.plate.toUpperCase())
  );

  // Compute metrics for selected period & previous period for MoM
  const isSelectedPeriod = (dt: Date) => {
    const y = dt.getFullYear();
    const m = dt.getMonth() + 1;
    if (selectedMonth === '') return y === selectedYear;
    return y === selectedYear && m === Number(selectedMonth);
  };

  const isPreviousPeriod = (dt: Date) => {
    const y = dt.getFullYear();
    const m = dt.getMonth() + 1;
    if (selectedMonth === '') {
      return y === selectedYear - 1;
    } else {
      const targetM = Number(selectedMonth) === 1 ? 12 : Number(selectedMonth) - 1;
      const targetY = Number(selectedMonth) === 1 ? selectedYear - 1 : selectedYear;
      return y === targetY && m === targetM;
    }
  };

  let curGross = 0;
  let curExpenses = 0;
  let curNet = 0;
  let curExpensesBreakdown = { disc: 0, terminal: 0, fuel: 0, meals: 0, repair: 0, othersexp: 0 };

  let prevGross = 0;
  let prevExpenses = 0;
  let prevNet = 0;

  // Monthly or Daily series for revenue line chart
  const lineLabels: string[] = [];
  const lineIncomeData: number[] = [];
  const lineNetData: number[] = [];
  const lineExpData: number[] = [];

  // Plate stats
  const plateStats: Record<string, { trips: number; gross: number; pakyaw: number; exp: number; fuel: number; net: number }> = {};
  // Driver stats
  const driverStats: Record<string, { trips: number; gross: number; fuel: number; net: number }> = {};

  const currentPeriodRows: any[] = [];

  if (selectedMonth === '') {
    // 12 months
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    lineLabels.push(...months);
    for (let i = 0; i < 12; i++) {
      lineIncomeData.push(0);
      lineNetData.push(0);
      lineExpData.push(0);
    }
  } else {
    // Days of selected month
    const dim = new Date(selectedYear, Number(selectedMonth), 0).getDate();
    for (let d = 1; d <= dim; d++) {
      lineLabels.push(String(d));
      lineIncomeData.push(0);
      lineNetData.push(0);
      lineExpData.push(0);
    }
  }

  summaryData.forEach(r => {
    const dateStr = r[dateIdx];
    if (!dateStr) return;
    const dt = new Date(dateStr);
    if (isNaN(dt.getTime())) return;

    const ts = String(r[COL.TRIPSLIP] || '').toUpperCase();
    const isSpecialExpense = ts.includes('EXPENSE') || ts.includes('PAYMENT');

    const rowExp = (Number(r[COL.DISC]) || 0) + (Number(r[COL.TERMINAL]) || 0) + (Number(r[COL.FUEL]) || 0) +
                   (Number(r[COL.MEALS]) || 0) + (Number(r[COL.REPAIR]) || 0) + (Number(r[COL.OTHERSEXP]) || 0);
    const rowIncome = (Number(r[COL.GROSS]) || 0) + (Number(r[COL.PAKYAW]) || 0);
    const rowNet = Number(r[COL.TOTALNET]) || 0;

    // Current period
    if (isSelectedPeriod(dt)) {
      currentPeriodRows.push(r);
      curGross += rowIncome;
      curExpenses += rowExp;
      curNet += rowNet;

      curExpensesBreakdown.disc += Number(r[COL.DISC]) || 0;
      curExpensesBreakdown.terminal += Number(r[COL.TERMINAL]) || 0;
      curExpensesBreakdown.fuel += Number(r[COL.FUEL]) || 0;
      curExpensesBreakdown.meals += Number(r[COL.MEALS]) || 0;
      curExpensesBreakdown.repair += Number(r[COL.REPAIR]) || 0;
      curExpensesBreakdown.othersexp += Number(r[COL.OTHERSEXP]) || 0;

      // Line chart bucketing
      if (selectedMonth === '') {
        const mIdx = dt.getMonth();
        lineIncomeData[mIdx] += rowIncome;
        lineNetData[mIdx] += rowNet;
        lineExpData[mIdx] += rowExp;
      } else {
        const dIdx = dt.getDate() - 1;
        if (dIdx >= 0 && dIdx < lineIncomeData.length) {
          lineIncomeData[dIdx] += rowIncome;
          lineNetData[dIdx] += rowNet;
          lineExpData[dIdx] += rowExp;
        }
      }

      // Per Plate & Driver breakdowns
      if (!isSpecialExpense) {
        const p = String(r[COL.PLATE] || 'Unknown').trim().toUpperCase();
        if (!plateStats[p]) {
          plateStats[p] = { trips: 0, gross: 0, pakyaw: 0, exp: 0, fuel: 0, net: 0 };
        }
        plateStats[p].trips++;
        plateStats[p].gross += Number(r[COL.GROSS]) || 0;
        plateStats[p].pakyaw += Number(r[COL.PAKYAW]) || 0;
        plateStats[p].exp += rowExp;
        plateStats[p].fuel += Number(r[COL.FUEL]) || 0;
        plateStats[p].net += rowNet;

        const drv = String(r[COL.DRIVER] || 'Unknown').trim();
        if (!driverStats[drv]) {
          driverStats[drv] = { trips: 0, gross: 0, fuel: 0, net: 0 };
        }
        driverStats[drv].trips++;
        driverStats[drv].gross += rowIncome;
        driverStats[drv].fuel += Number(r[COL.FUEL]) || 0;
        driverStats[drv].net += rowNet;
      }
    }

    // Previous period
    if (isPreviousPeriod(dt)) {
      prevGross += rowIncome;
      prevExpenses += rowExp;
      prevNet += rowNet;
    }
  });

  const curMargin = curGross > 0 ? (curNet / curGross) * 100 : 0;
  const prevMargin = prevGross > 0 ? (prevNet / prevGross) * 100 : 0;

  const renderMoM = (current: number, prev: number, invert = false) => {
    if (!prev) return <span className="text-[11px] text-slate-500">No prior data</span>;
    const diff = ((current - prev) / prev) * 100;
    const isGood = invert ? diff <= 0 : diff >= 0;
    const color = isGood ? 'text-emerald-400' : 'text-red-400';
    return (
      <span className={`text-[11px] font-bold ${color}`}>
        {diff >= 0 ? '↑' : '↓'} {Math.abs(diff).toFixed(1)}% vs prev
      </span>
    );
  };

  // Line Chart Config
  const lineChartData = {
    labels: lineLabels,
    datasets: [
      {
        label: 'Total Income',
        data: lineIncomeData,
        borderColor: '#34d399',
        backgroundColor: 'rgba(52, 211, 153, 0.1)',
        tension: 0.3,
        fill: true
      },
      {
        label: 'Net Remittance',
        data: lineNetData,
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        tension: 0.3,
        fill: true
      },
      {
        label: 'Expenses',
        data: lineExpData,
        borderColor: '#f87171',
        backgroundColor: 'rgba(248, 113, 113, 0.1)',
        tension: 0.3,
        fill: false
      }
    ]
  };

  // Doughnut Chart Config
  const doughnutData = {
    labels: ['Discount', 'Terminal', 'Fuel', 'Meals', 'Repair', 'Others'],
    datasets: [
      {
        data: [
          curExpensesBreakdown.disc,
          curExpensesBreakdown.terminal,
          curExpensesBreakdown.fuel,
          curExpensesBreakdown.meals,
          curExpensesBreakdown.repair,
          curExpensesBreakdown.othersexp
        ],
        backgroundColor: ['#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#eab308', '#64748b'],
        borderWidth: 2,
        borderColor: '#0f172a'
      }
    ]
  };

  // Vehicle Performance Bar Chart
  const sortedPlatesForChart = Object.keys(plateStats)
    .filter(p => busAndVanPlates.size === 0 || busAndVanPlates.has(p))
    .sort();

  const vehicleBarData = {
    labels: sortedPlatesForChart,
    datasets: [
      {
        label: 'Income (Gross + Pakyaw)',
        data: sortedPlatesForChart.map(p => plateStats[p].gross + plateStats[p].pakyaw),
        backgroundColor: '#10b981',
        borderRadius: 4
      }
    ]
  };

  // Fuel Horizontal Bar Chart
  const fuelBarData = {
    labels: sortedPlatesForChart,
    datasets: [
      {
        label: 'Fuel Cost (₱)',
        data: sortedPlatesForChart.map(p => plateStats[p].fuel),
        backgroundColor: '#f59e0b',
        borderRadius: 4
      }
    ]
  };

  // Handle click on doughnut slice
  const handleDoughnutClick = (event: any, elements: any[]) => {
    if (!elements || elements.length === 0) return;
    const index = elements[0].index;
    const colMap = [COL.DISC, COL.TERMINAL, COL.FUEL, COL.MEALS, COL.REPAIR, COL.OTHERSEXP];
    const labelMap = ['Discount', 'Terminal Fee', 'Fuel / Diesel', 'Meals', 'Repair & Maintenance', 'Others Exp'];

    const targetCol = colMap[index];
    const targetLabel = labelMap[index];

    const sums: Record<string, number> = {};
    currentPeriodRows.forEach(r => {
      const val = Number(r[targetCol]) || 0;
      if (val > 0) {
        const p = String(r[COL.PLATE] || 'Unassigned').trim();
        sums[p] = (sums[p] || 0) + val;
      }
    });

    const items = Object.entries(sums)
      .map(([plate, amount]) => ({ plate, amount }))
      .sort((a, b) => b.amount - a.amount);

    setExpenseDetailModal({ label: targetLabel, items });
  };

  // Top Drivers
  const topDrivers = Object.entries(driverStats)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.net - a.net)
    .slice(0, 10);

  // Per Plate Detailed Report totals
  let totTrips = 0, totGross = 0, totPakyaw = 0, totFuel = 0, totNet = 0;
  sortedPlatesForChart.forEach(p => {
    const s = plateStats[p];
    totTrips += s.trips;
    totGross += s.gross;
    totPakyaw += s.pakyaw;
    totFuel += s.fuel;
    totNet += s.net;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-sky-400 flex items-center gap-2">
            📈 Operational & Financial Analytics
          </h2>
          <p className="text-xs text-slate-400">
            Performance metrics, vehicle consumption ratings, and visual revenue trends.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={dateType}
            onChange={(e) => setDateType(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
          >
            <option value="daterec">By Date Rec</option>
            <option value="timestamp">By Timestamp</option>
          </select>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
          >
            <option value="">All Months</option>
            <option value="1">January</option>
            <option value="2">February</option>
            <option value="3">March</option>
            <option value="4">April</option>
            <option value="5">May</option>
            <option value="6">June</option>
            <option value="7">July</option>
            <option value="8">August</option>
            <option value="9">September</option>
            <option value="10">October</option>
            <option value="11">November</option>
            <option value="12">December</option>
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
          >
            {[currentYear, currentYear - 1, currentYear - 2].map(y => (
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
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-300 rounded-lg text-xs font-semibold shadow transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            PDF / Print
          </button>
        </div>
      </div>

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Income Card */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-emerald-800/40 bg-gradient-to-br from-emerald-950 via-emerald-900/60 to-slate-950 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Total Income</span>
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <h3 className="text-2xl font-black text-white">{formatCurrencyStrict(curGross)}</h3>
          <div className="mt-2 flex items-center justify-between">
            {renderMoM(curGross, prevGross)}
            <span className="text-[10px] text-emerald-300/70">Gross + Pakyaw</span>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-red-800/40 bg-gradient-to-br from-red-950 via-red-900/60 to-slate-950 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-red-400">Total Expenses</span>
            <CreditCard className="w-5 h-5 text-red-400" />
          </div>
          <h3 className="text-2xl font-black text-white">{formatCurrencyStrict(curExpenses)}</h3>
          <div className="mt-2 flex items-center justify-between">
            {renderMoM(curExpenses, prevExpenses, true)}
            <span className="text-[10px] text-red-300/70">Fuel, terminal & repairs</span>
          </div>
        </div>

        {/* Net Remittance Card */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-sky-800/40 bg-gradient-to-br from-sky-950 via-sky-900/60 to-slate-950 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Net Remittance</span>
            <TrendingUp className="w-5 h-5 text-sky-400" />
          </div>
          <h3 className="text-2xl font-black text-white">{formatCurrencyStrict(curNet)}</h3>
          <div className="mt-2 flex items-center justify-between">
            {renderMoM(curNet, prevNet)}
            <span className="text-[10px] text-sky-300/70">Remitted to Coop</span>
          </div>
        </div>

        {/* Profit Margin Card */}
        <div className="relative overflow-hidden rounded-2xl p-5 border border-amber-800/40 bg-gradient-to-br from-amber-950 via-amber-900/60 to-slate-950 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Profit Margin</span>
            <Percent className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="text-2xl font-black text-white">{curMargin.toFixed(1)}%</h3>
          <div className="mt-2 flex items-center justify-between">
            {renderMoM(curMargin, prevMargin)}
            <span className="text-[10px] text-amber-300/70">Net efficiency ratio</span>
          </div>
        </div>
      </div>

      {/* Row 1: Line Chart & Doughnut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
          <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" /> Daily Revenue & Remittance Trend
          </h3>
          <div className="h-[280px]">
            <Line
              data={lineChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } } },
                scales: {
                  x: { grid: { color: '#1e293b' }, ticks: { font: { size: 10 } } },
                  y: { grid: { color: '#1e293b' }, ticks: { font: { size: 10 } } }
                }
              }}
            />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-sky-400" /> Expense Breakdown
            </h3>
            <span className="text-[10px] text-slate-400">(Click slice for detail)</span>
          </div>
          <div className="h-[260px] relative">
            <Doughnut
              data={doughnutData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
                },
                onClick: handleDoughnutClick
              }}
            />
          </div>
        </div>
      </div>

      {/* Row 2: Top Staff & Vehicle Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top Staff Table */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md flex flex-col">
          <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" /> Top Performing Staff & Drivers
          </h3>
          <div className="overflow-y-auto max-h-[300px] border border-slate-800 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="p-2">Staff</th>
                  <th className="p-2 text-right">Trips</th>
                  <th className="p-2 text-right">Income</th>
                  <th className="p-2 text-right">Fuel</th>
                  <th className="p-2 text-right">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {topDrivers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-500">No driver data</td>
                  </tr>
                ) : (
                  topDrivers.map((d, i) => (
                    <tr key={d.name} className="hover:bg-slate-850">
                      <td className="p-2 font-medium text-slate-200">
                        {i === 0 ? '🏆 ' : ''}{d.name}
                      </td>
                      <td className="p-2 text-right text-slate-400">{d.trips}</td>
                      <td className="p-2 text-right text-emerald-400">{formatCurrency(d.gross)}</td>
                      <td className="p-2 text-right text-red-400">{formatCurrency(d.fuel)}</td>
                      <td className="p-2 text-right text-sky-400 font-bold">{formatCurrency(d.net)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vehicle Performance Bar */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
          <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" /> Total Income by Vehicle Plate
          </h3>
          <div className="h-[280px]">
            <Bar
              data={vehicleBarData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                  y: { grid: { color: '#1e293b' }, ticks: { font: { size: 10 } } }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Row 3: Fuel Consumption Analysis Horizontal Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
        <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
          <Fuel className="w-4 h-4 text-amber-400" /> Fleet Fuel Consumption Analysis (₱)
        </h3>
        <div className="h-[260px]">
          <Bar
            data={fuelBarData}
            options={{
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { grid: { color: '#1e293b' }, ticks: { font: { size: 10 } } },
                y: { grid: { display: false }, ticks: { font: { size: 10 } } }
              }
            }}
          />
        </div>
      </div>

      {/* Detailed Per-Plate Report Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            📋 Detailed Report Per Plate (Financial & Fuel Efficiency)
          </h3>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Tip: High Fuel % (&gt;35%) indicates potential mechanical inspection or routing issue.
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-300 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-2.5">Plate No.</th>
                <th className="p-2.5 text-right">Trips</th>
                <th className="p-2.5 text-right text-emerald-400">Gross Income</th>
                <th className="p-2.5 text-right text-emerald-400">Pakyaw</th>
                <th className="p-2.5 text-right text-sky-400">Avg Net / Trip</th>
                <th className="p-2.5 text-right text-amber-400">Avg Fuel / Trip</th>
                <th className="p-2.5 text-right text-red-400">Fuel Cost</th>
                <th className="p-2.5 text-center">Fuel % (Gross+Pakyaw)</th>
                <th className="p-2.5 text-right text-sky-300 font-bold">Net Remittance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sortedPlatesForChart.map(p => {
                const s = plateStats[p];
                const totalIncome = s.gross + s.pakyaw;
                const fuelEff = totalIncome > 0 ? (s.fuel / totalIncome) * 100 : 0;

                let effBadge = 'bg-emerald-950 text-emerald-400 border-emerald-700/50';
                if (fuelEff > 35) effBadge = 'bg-red-950 text-red-400 border-red-700/50';
                else if (fuelEff > 25) effBadge = 'bg-amber-950 text-amber-400 border-amber-700/50';

                const avgNet = s.trips > 0 ? s.net / s.trips : 0;
                const avgFuel = s.trips > 0 ? s.fuel / s.trips : 0;

                return (
                  <tr key={p} className="hover:bg-slate-850">
                    <td className="p-2.5 font-bold text-white">{p}</td>
                    <td className="p-2.5 text-right text-slate-300">{s.trips}</td>
                    <td className="p-2.5 text-right text-emerald-400">{formatCurrency(s.gross)}</td>
                    <td className="p-2.5 text-right text-emerald-400">{formatCurrency(s.pakyaw)}</td>
                    <td className="p-2.5 text-right text-sky-400">{formatCurrency(avgNet)}</td>
                    <td className="p-2.5 text-right text-amber-400">{formatCurrency(avgFuel)}</td>
                    <td className="p-2.5 text-right text-red-400 font-medium">{formatCurrency(s.fuel)}</td>
                    <td className="p-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${effBadge}`}>
                        {fuelEff.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-2.5 text-right font-black text-sky-300">{formatCurrency(s.net)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-950 text-slate-200 font-bold border-t-2 border-slate-700">
              <tr>
                <td className="p-2.5">TOTAL (Fleet):</td>
                <td className="p-2.5 text-right">{totTrips}</td>
                <td className="p-2.5 text-right text-emerald-400">{formatCurrency(totGross)}</td>
                <td className="p-2.5 text-right text-emerald-400">{formatCurrency(totPakyaw)}</td>
                <td className="p-2.5 text-right text-sky-400">{formatCurrency(totTrips > 0 ? totNet / totTrips : 0)}</td>
                <td className="p-2.5 text-right text-amber-400">{formatCurrency(totTrips > 0 ? totFuel / totTrips : 0)}</td>
                <td className="p-2.5 text-right text-red-400">{formatCurrency(totFuel)}</td>
                <td className="p-2.5 text-center text-slate-400">-</td>
                <td className="p-2.5 text-right font-black text-sky-300">{formatCurrency(totNet)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Expense Breakdown Click Modal */}
      {expenseDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h4 className="font-bold text-sky-400 text-sm">
                {expenseDetailModal.label} Breakdown by Plate
              </h4>
              <button
                onClick={() => setExpenseDetailModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-[350px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-2 text-left">Rank</th>
                    <th className="p-2 text-left">Plate</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {expenseDetailModal.items.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-slate-500">No recorded expenses for this category.</td>
                    </tr>
                  ) : (
                    expenseDetailModal.items.map((item, idx) => (
                      <tr key={item.plate}>
                        <td className="p-2 text-slate-500">{idx + 1}</td>
                        <td className="p-2 font-bold text-white">{item.plate}</td>
                        <td className="p-2 text-right text-emerald-400 font-semibold">{formatCurrencyStrict(item.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-800 text-right">
              <button
                onClick={() => setExpenseDetailModal(null)}
                className="px-4 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
