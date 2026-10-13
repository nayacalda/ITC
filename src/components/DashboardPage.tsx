import React from 'react';
import { UserAccount } from '../types';
import { 
  FileSpreadsheet, 
  FileText, 
  BarChart3, 
  Car, 
  Users, 
  Wrench, 
  RefreshCw, 
  AlertTriangle,
  CalendarCheck2,
  TrendingUp,
  ShieldAlert
} from 'lucide-react';

interface DashboardPageProps {
  currentUser: UserAccount;
  queueCount: number;
  onNavigate: (page: string) => void;
  onSyncNow: () => void;
  onViewQueue: () => void;
  onRefreshData: () => void;
  isSyncing: boolean;
  vehicleCount: number;
  staffCount: number;
  totalRemittances: number;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  currentUser,
  queueCount,
  onNavigate,
  onSyncNow,
  onViewQueue,
  onRefreshData,
  isSyncing,
  vehicleCount,
  staffCount,
  totalRemittances
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Hero */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 border border-slate-700/60 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
          <div className="text-center sm:text-left space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 border border-sky-400/20 text-sky-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              ITC Transportation Management System
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome, <span className="text-sky-400">{currentUser.fullName || currentUser.username}</span> 👋
            </h1>
            <p className="text-sm text-slate-300 max-w-xl">
              Track vehicle dispatches, batch remittances, maintenance intervals, and official cooperative reports in real-time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onRefreshData}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-semibold text-sky-300 shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Refresh Local Data'}
            </button>
          </div>
        </div>

        {/* Subtle decorative background watermark */}
        <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
          <img src="https://i.imghippo.com/files/wqL8436kA.png" alt="" className="w-64 h-64 object-contain" />
        </div>
      </div>

      {/* Offline Queue Alert Banner if pending */}
      {queueCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-amber-950/60 border border-amber-600/40 text-amber-200 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">
                ⚠️ {queueCount} Remittance transaction{queueCount > 1 ? 's' : ''} in Offline Queue
              </p>
              <p className="text-xs text-amber-300/80">
                Data is saved safely in device storage and ready to sync to the master database.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onSyncNow}
              disabled={isSyncing}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow transition cursor-pointer"
            >
              {isSyncing ? 'Processing...' : 'Sync Now'}
            </button>
            <button
              onClick={onViewQueue}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-700/50 transition cursor-pointer"
            >
              View Queue
            </button>
          </div>
        </div>
      )}

      {/* Quick Overview KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Registered Vehicles</p>
            <h3 className="text-2xl font-black text-white mt-1">{vehicleCount}</h3>
            <p className="text-[11px] text-emerald-400 mt-1">Buses, Vans & Trucks</p>
          </div>
          <div className="p-3 bg-sky-950/80 border border-sky-800/40 rounded-xl text-sky-400">
            <Car className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Staff & Drivers</p>
            <h3 className="text-2xl font-black text-white mt-1">{staffCount}</h3>
            <p className="text-[11px] text-sky-400 mt-1">Active drivers & dispatchers</p>
          </div>
          <div className="p-3 bg-purple-950/80 border border-purple-800/40 rounded-xl text-purple-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Remittances</p>
            <h3 className="text-2xl font-black text-white mt-1">{totalRemittances}</h3>
            <p className="text-[11px] text-amber-400 mt-1">Processed Trip Slips</p>
          </div>
          <div className="p-3 bg-emerald-950/80 border border-emerald-800/40 rounded-xl text-emerald-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Offline Queue</p>
            <h3 className={`text-2xl font-black mt-1 ${queueCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              {queueCount}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {queueCount > 0 ? 'Pending server upload' : 'All transactions synced'}
            </p>
          </div>
          <div className="p-3 bg-amber-950/80 border border-amber-800/40 rounded-xl text-amber-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Navigation Quick Action Modules */}
      <div>
        <h2 className="text-base font-bold text-slate-200 mb-4 uppercase tracking-wider text-xs">
          Operations & Management Modules
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            onClick={() => onNavigate('remitFormPage')}
            className="group p-5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-600/50 rounded-2xl shadow-sm hover:shadow-lg transition cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-700/40 text-emerald-400 group-hover:scale-105 transition">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Excel Data Entry Batch</h3>
            </div>
            <p className="text-xs text-slate-400">
              High-speed spreadsheet interface with auto-calculations, duplicate detection, and instant Sub Total/Net updates.
            </p>
          </div>

          <div
            onClick={() => onNavigate('summaryPage')}
            className="group p-5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-sky-600/50 rounded-2xl shadow-sm hover:shadow-lg transition cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-sky-950/80 border border-sky-700/40 text-sky-400 group-hover:scale-105 transition">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Summary Ledger</h3>
            </div>
            <p className="text-xs text-slate-400">
              Comprehensive grid with plate grouping, multi-plate filters, row color highlighting, export to CSV, and printing.
            </p>
          </div>

          <div
            onClick={() => onNavigate('reportsPage')}
            className="group p-5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-600/50 rounded-2xl shadow-sm hover:shadow-lg transition cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-700/40 text-amber-400 group-hover:scale-105 transition">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Statistic Report & Charts</h3>
            </div>
            <p className="text-xs text-slate-400">
              Interactive revenue line trend, expense doughnut breakdown, fuel consumption efficiency, and per-plate analytics.
            </p>
          </div>

          <div
            onClick={() => onNavigate('tripPage')}
            className="group p-5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-teal-600/50 rounded-2xl shadow-sm hover:shadow-lg transition cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-teal-950/80 border border-teal-700/40 text-teal-400 group-hover:scale-105 transition">
                <CalendarCheck2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Trip Monitoring Matrix</h3>
            </div>
            <p className="text-xs text-slate-400">
              Monthly calendar matrix tracking daily runs per plate, route distributions (Ormoc vs Isabel), and printable tallies.
            </p>
          </div>

          <div
            onClick={() => onNavigate('maintenancePage')}
            className="group p-5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-rose-600/50 rounded-2xl shadow-sm hover:shadow-lg transition cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-700/40 text-rose-400 group-hover:scale-105 transition">
                <Wrench className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Maintenance & Repair Log</h3>
            </div>
            <p className="text-xs text-slate-400">
              ODO readings, parts replaced, PMS records, photo attachments for parts and receipts, and maintenance cost stats.
            </p>
          </div>

          <div
            onClick={() => onNavigate('staffPage')}
            className="group p-5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-purple-600/50 rounded-2xl shadow-sm hover:shadow-lg transition cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-700/40 text-purple-400 group-hover:scale-105 transition">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Staff & Driver Management</h3>
            </div>
            <p className="text-xs text-slate-400">
              Profiles with photos, government numbers (SSS, PhilHealth, TIN), Service Incentive Leave (SIL) tracker, and violations log.
            </p>
          </div>
        </div>
      </div>

      {/* Cooperative Emblem Footer */}
      <div className="pt-8 pb-4 text-center">
        <img
          src="https://i.imghippo.com/files/wqL8436kA.png"
          alt="ITC Seal"
          className="h-20 w-auto mx-auto object-contain opacity-60 mb-2"
        />
        <p className="text-xs text-slate-500 font-medium">
          Isabel Transport Cooperative • Registered Cooperative Transport System
        </p>
      </div>
    </div>
  );
};
