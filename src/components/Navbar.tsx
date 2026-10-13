import React, { useState } from 'react';
import { UserAccount } from '../types';
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  BarChart3, 
  Car, 
  Users, 
  ShieldCheck, 
  LogOut, 
  Sun, 
  Moon, 
  ChevronDown, 
  Menu, 
  X,
  FileText,
  CalendarCheck2,
  Wrench,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';

interface NavbarProps {
  currentUser: UserAccount | null;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isOnline: boolean;
  syncProgress: number | null;
  syncMessage: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentPage,
  onNavigate,
  onLogout,
  theme,
  onToggleTheme,
  isOnline,
  syncProgress,
  syncMessage
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [reportDropdownOpen, setReportDropdownOpen] = useState(false);

  const handleNavClick = (page: string) => {
    onNavigate(page);
    setMobileMenuOpen(false);
    setReportDropdownOpen(false);
  };

  const isReportActive = ['reportsPage', 'tripPage', 'maintenancePage'].includes(currentPage);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0f172a] text-slate-100 border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNavClick('dashboardPage')}>
            <img 
              src="https://i.imghippo.com/files/NjI5638I.png" 
              alt="ITC Logo" 
              className="h-9 w-auto object-contain rounded"
            />
            <span className="font-extrabold text-sm sm:text-base tracking-wide text-white uppercase select-none">
              Isabel Transport Cooperative
            </span>
          </div>

          {/* Center Info: Online Status & Sync */}
          <div className="hidden lg:flex items-center gap-3">
            {currentUser && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-950/80 border border-sky-600/40 text-sky-300">
                <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                {currentUser.fullName || currentUser.username}
                {currentUser.role === 'admin' && (
                  <span className="ml-1 text-[10px] bg-sky-500 text-slate-900 font-bold px-1.5 py-0.2 rounded uppercase">
                    Admin
                  </span>
                )}
              </span>
            )}

            {syncProgress !== null && (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1 rounded-full text-xs">
                <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                <span className="text-slate-300 truncate max-w-[140px]">{syncMessage}</span>
                <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-sky-400 h-full transition-all duration-300" style={{ width: `${syncProgress}%` }} />
                </div>
              </div>
            )}

            <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
              isOnline ? 'bg-emerald-950/70 border border-emerald-600/30 text-emerald-300' : 'bg-red-950/70 border border-red-600/30 text-red-300'
            }`}>
              {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-red-400" />}
              {isOnline ? 'Online' : 'Offline'}
            </div>

            <button
              onClick={onToggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-300" />}
            </button>
          </div>

          {/* Desktop Nav Items */}
          {currentUser && (
            <nav className="hidden lg:flex items-center gap-1">
              <button
                onClick={() => handleNavClick('dashboardPage')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  currentPage === 'dashboardPage' ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                Dashboard
              </button>

              <button
                onClick={() => handleNavClick('remitFormPage')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  currentPage === 'remitFormPage' ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                Remittance Form
              </button>

              <button
                onClick={() => handleNavClick('summaryPage')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  currentPage === 'summaryPage' ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                Summary
              </button>

              {/* Reports Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setReportDropdownOpen(!reportDropdownOpen)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                    isReportActive ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  Reports
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {reportDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-50">
                    <button
                      onClick={() => handleNavClick('reportsPage')}
                      className={`w-full text-left px-4 py-2 text-xs flex items-center gap-2 hover:bg-slate-800 ${
                        currentPage === 'reportsPage' ? 'text-sky-400 font-bold' : 'text-slate-200'
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      Statistic Report
                    </button>
                    <button
                      onClick={() => handleNavClick('tripPage')}
                      className={`w-full text-left px-4 py-2 text-xs flex items-center gap-2 hover:bg-slate-800 ${
                        currentPage === 'tripPage' ? 'text-sky-400 font-bold' : 'text-slate-200'
                      }`}
                    >
                      <CalendarCheck2 className="w-3.5 h-3.5" />
                      Trip Report
                    </button>
                    <button
                      onClick={() => handleNavClick('maintenancePage')}
                      className={`w-full text-left px-4 py-2 text-xs flex items-center gap-2 hover:bg-slate-800 ${
                        currentPage === 'maintenancePage' ? 'text-sky-400 font-bold' : 'text-slate-200'
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      Maintenance Report
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleNavClick('vehiclePage')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  currentPage === 'vehiclePage' ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                Vehicle
              </button>

              <button
                onClick={() => handleNavClick('staffPage')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  currentPage === 'staffPage' ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                Staff
              </button>

              {currentUser.role === 'admin' && (
                <button
                  onClick={() => handleNavClick('adminPage')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                    currentPage === 'adminPage' ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  Admin
                </button>
              )}

              <button
                onClick={onLogout}
                title="Logout"
                className="ml-2 px-2.5 py-1.5 rounded-md text-xs font-semibold text-red-400 hover:bg-red-950/60 transition flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Logout</span>
              </button>
            </nav>
          )}

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-md text-slate-300 hover:bg-slate-800"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-300" />}
            </button>
            {currentUser && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-slate-300 hover:bg-slate-800"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && currentUser && (
        <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-1">
          <div className="py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Signed in as <b className="text-sky-300">{currentUser.fullName || currentUser.username}</b></span>
            <span className={`px-2 py-0.5 rounded-full ${isOnline ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          <button
            onClick={() => handleNavClick('dashboardPage')}
            className="w-full text-left px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 flex items-center gap-2"
          >
            <LayoutDashboard className="w-4 h-4 text-sky-400" /> Dashboard
          </button>
          <button
            onClick={() => handleNavClick('remitFormPage')}
            className="w-full text-left px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Remittance Form
          </button>
          <button
            onClick={() => handleNavClick('summaryPage')}
            className="w-full text-left px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 flex items-center gap-2"
          >
            <FileText className="w-4 h-4 text-sky-400" /> Summary
          </button>
          <button
            onClick={() => handleNavClick('reportsPage')}
            className="w-full text-left px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4 text-amber-400" /> Statistic Report
          </button>
          <button
            onClick={() => handleNavClick('tripPage')}
            className="w-full text-left px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 flex items-center gap-2"
          >
            <CalendarCheck2 className="w-4 h-4 text-teal-400" /> Trip Report
          </button>
          <button
            onClick={() => handleNavClick('maintenancePage')}
            className="w-full text-left px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 flex items-center gap-2"
          >
            <Wrench className="w-4 h-4 text-rose-400" /> Maintenance Report
          </button>
          <button
            onClick={() => handleNavClick('vehiclePage')}
            className="w-full text-left px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 flex items-center gap-2"
          >
            <Car className="w-4 h-4 text-indigo-400" /> Vehicle
          </button>
          <button
            onClick={() => handleNavClick('staffPage')}
            className="w-full text-left px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 flex items-center gap-2"
          >
            <Users className="w-4 h-4 text-purple-400" /> Staff
          </button>
          {currentUser.role === 'admin' && (
            <button
              onClick={() => handleNavClick('adminPage')}
              className="w-full text-left px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-sky-400" /> Admin
            </button>
          )}
          <button
            onClick={onLogout}
            className="w-full text-left px-3 py-2 text-sm font-medium text-red-400 rounded-md hover:bg-red-950/50 flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      )}
    </header>
  );
};
