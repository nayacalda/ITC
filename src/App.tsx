import React, { useState, useEffect, useCallback } from 'react';
import { 
  UserAccount, 
  VehicleRecord, 
  StaffProfile, 
  MaintenanceRecord, 
  LoginHistoryItem, 
  OfflineQueueItem 
} from './types';
import { SimpleDB, seedInitialDataIfEmpty } from './services/db';
import { apiCall, saveOfflineAction, COL, generateSafeUUID, checkDuplicateStrict } from './services/api';

import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { DashboardPage } from './components/DashboardPage';
import { RemittanceBatchPage } from './components/RemittanceBatchPage';
import { SummaryPage } from './components/SummaryPage';
import { ReportsPage } from './components/ReportsPage';
import { TripReportPage } from './components/TripReportPage';
import { MaintenancePage } from './components/MaintenancePage';
import { VehiclePage } from './components/VehiclePage';
import { StaffPage } from './components/StaffPage';
import { AdminPage } from './components/AdminPage';
import { Toast, ToastMessage } from './components/Toast';
import { ConfirmModal } from './components/ConfirmModal';
import { SyncQueueModal } from './components/SyncQueueModal';

export default function App() {
  // Authentication & Session
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const u = localStorage.getItem('userData');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });
  const [currentPage, setCurrentPage] = useState<string>(() => {
    try {
      const u = localStorage.getItem('userData');
      return u ? 'dashboardPage' : 'loginPage';
    } catch {
      return 'loginPage';
    }
  });

  // UI States
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('itc_app_theme') as any) || 'dark';
  });
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [syncProgress, setSyncProgress] = useState<number | null>(null);
  const [syncMessage, setSyncMessage] = useState<string>('Syncing...');

  // Database Collections
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>([]);

  // Modals & Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {}
  });
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = generateSafeUUID();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const showAlert = useCallback((msg: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Notification",
      message: msg,
      onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false }))
    });
  }, []);

  const showConfirm = useCallback((msg: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title: "Confirmation",
      message: msg,
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        onConfirm();
      }
    });
  }, []);

  // Theme Sync
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('itc_app_theme', next);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme);
  }, [theme]);

  // Network Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast("Online connection restored.", "info");
      processSyncQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast("Offline Mode active. Local data safe in device storage.", "info");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load IndexedDB state on mount
  const loadDatabase = useCallback(async () => {
    await seedInitialDataIfEmpty();

    const [vListRaw, sList, sumRaw, mList, uList, hListRaw, qList] = await Promise.all([
      SimpleDB.get<any[]>('cachedVehicles'),
      SimpleDB.get<StaffProfile[]>('cachedStaffProfiles'),
      SimpleDB.get<any[]>('cachedSummary'),
      SimpleDB.get<MaintenanceRecord[]>('cachedMaintenance'),
      SimpleDB.get<UserAccount[]>('cachedUsers'),
      SimpleDB.get<any[]>('cachedHistory'),
      SimpleDB.get<OfflineQueueItem[]>('offlineQueue')
    ]);

    // Format vehicles
    if (vListRaw) {
      const vFormatted: VehicleRecord[] = vListRaw.map(v => {
        if (Array.isArray(v)) {
          return { id: v[0], plate: v[1], driver: v[2], type: v[3], dateAdded: v[4] };
        }
        return v;
      });
      setVehicles(vFormatted);
    }

    if (sList) setStaffList(sList);
    if (sumRaw) setSummaryData(sumRaw);
    if (mList) setMaintenanceRecords(mList);
    if (uList) setUsers(uList);
    if (qList) setOfflineQueue(qList);

    if (hListRaw) {
      const hFormatted: LoginHistoryItem[] = hListRaw.map(h => {
        if (Array.isArray(h)) {
          return { time: h[0], username: h[1], event: h[2], token: h[3], userAgent: h[4] };
        }
        return h;
      });
      setLoginHistory(hFormatted);
    }
  }, []);

  useEffect(() => {
    loadDatabase();
  }, [loadDatabase]);

  // Sync Queue Processor
  const processSyncQueue = useCallback(async () => {
    const queue = (await SimpleDB.get<OfflineQueueItem[]>('offlineQueue')) || [];
    if (queue.length === 0 || !navigator.onLine) return;

    setSyncProgress(10);
    setSyncMessage("Syncing offline records...");

    const updatedQueue = [...queue];
    let syncedCount = 0;

    for (let i = 0; i < updatedQueue.length; i++) {
      const item = updatedQueue[i];

      try {
        let res;
        if (item.action === 'saveRemittance') {
          res = await apiCall('saveRemittance', { data: item.data });
        } else if (item.action === 'saveRemittanceUpdate') {
          res = await apiCall('saveRemittanceUpdate', { data: item.data });
        } else if (item.action === 'deleteRemittance') {
          res = await apiCall('deleteRemittance', { id: item.data.id });
        } else if (item.action === 'saveVehicle') {
          res = await apiCall('saveVehicle', { data: item.data });
        } else if (item.action === 'updateVehicle') {
          res = await apiCall('updateVehicle', { data: item.data });
        } else if (item.action === 'deleteVehicle') {
          res = await apiCall('deleteVehicle', { id: item.data.id });
        } else if (item.action === 'saveStaffProfile') {
          res = await apiCall('saveDriverProfile', { data: item.data });
        } else if (item.action === 'updateStaffProfile') {
          res = await apiCall('updateDriverProfile', { data: item.data });
        } else if (item.action === 'deleteStaffProfile') {
          res = await apiCall('deleteDriverProfile', { id: item.data.id });
        }

        if (res && res.success !== false) {
          updatedQueue.splice(i, 1);
          i--;
          syncedCount++;
        } else if (res && res.message?.includes('Duplicate')) {
          item.status = 'duplicate';
          item.errorMsg = 'Duplicate rejected by server.';
        }
      } catch (err: any) {
        item.status = 'error';
        item.errorMsg = 'Network or timeout error.';
      }
    }

    await SimpleDB.set('offlineQueue', updatedQueue);
    setOfflineQueue(updatedQueue);
    setSyncProgress(100);
    setTimeout(() => setSyncProgress(null), 1500);

    if (syncedCount > 0) {
      showToast(`✅ Synced ${syncedCount} queued record(s) with cloud server!`);
      await loadDatabase();
    }
  }, [loadDatabase, showToast]);

  // Refresh data from cloud
  const handleRefreshCloudData = useCallback(async () => {
    if (!navigator.onLine) {
      showToast("Device is currently offline. Loaded cached data.", "info");
      return;
    }

    setSyncProgress(25);
    setSyncMessage("Updating fleet data...");

    try {
      const [vRes, sRes, sumRes] = await Promise.allSettled([
        apiCall('getVehicles', { options: { page: 1, pageSize: 3000 } }),
        apiCall('getStaffProfiles', {}),
        apiCall('getSummary', { options: { page: 1, pageSize: 5000 } })
      ]);

      setSyncProgress(75);

      if (vRes.status === 'fulfilled' && vRes.value?.rows) {
        await SimpleDB.set('cachedVehicles', vRes.value.rows);
      }
      if (sRes.status === 'fulfilled' && sRes.value?.rows) {
        await SimpleDB.set('cachedStaffProfiles', sRes.value.rows);
      }
      if (sumRes.status === 'fulfilled' && sumRes.value?.rows) {
        await SimpleDB.set('cachedSummary', sumRes.value.rows);
      }

      await loadDatabase();
      setSyncProgress(100);
      showToast("Data refreshed successfully!");
    } catch (err) {
      console.warn("Cloud refresh error:", err);
    } finally {
      setTimeout(() => setSyncProgress(null), 1200);
    }
  }, [loadDatabase, showToast]);

  // Auth Handlers
  const handleLoginSuccess = (user: UserAccount, token: string) => {
    localStorage.setItem('userData', JSON.stringify(user));
    localStorage.setItem('token', token);
    setCurrentUser(user);
    setCurrentPage('dashboardPage');
    showToast(`Welcome back, ${user.fullName || user.username}!`);

    // Log history
    const historyItem: LoginHistoryItem = {
      time: new Date().toISOString(),
      username: user.username,
      event: 'LOGIN_SUCCESS',
      token,
      userAgent: navigator.userAgent
    };
    setLoginHistory(prev => {
      const next = [historyItem, ...prev];
      SimpleDB.set('cachedHistory', next);
      return next;
    });

    handleRefreshCloudData();
  };

  const handleLogout = () => {
    localStorage.removeItem('userData');
    localStorage.removeItem('token');
    setCurrentUser(null);
    setCurrentPage('loginPage');
    showToast("Logged out successfully.", "info");
  };

  // Remittance Batch Save
  const handleSaveBatchRemittances = async (records: any[]) => {
    let currentSummary = (await SimpleDB.get<any[]>('cachedSummary')) || [];

    for (const d of records) {
      const tempId = "TEMP_" + Date.now() + Math.random().toString(36).substring(2, 7);
      const row = [
        tempId,
        new Date().toISOString(),
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
        currentUser?.username || "Encoder"
      ];

      currentSummary.unshift(row);

      if (!navigator.onLine) {
        await saveOfflineAction('saveRemittance', d);
      } else {
        try {
          const res = await apiCall('saveRemittance', { data: d });
          if (res && res.success && res.id) {
            row[COL.ID] = res.id;
          } else {
            await saveOfflineAction('saveRemittance', d);
          }
        } catch {
          await saveOfflineAction('saveRemittance', d);
        }
      }
    }

    await SimpleDB.set('cachedSummary', currentSummary);
    setSummaryData([...currentSummary]);
    const updatedQueue = (await SimpleDB.get<OfflineQueueItem[]>('offlineQueue')) || [];
    setOfflineQueue(updatedQueue);

    showToast(`✅ Submitted ${records.length} remittance records!`);
  };

  // Update single remittance
  const handleUpdateRemittance = async (d: any) => {
    let currentSummary = (await SimpleDB.get<any[]>('cachedSummary')) || [];
    const idx = currentSummary.findIndex(r => String(r[COL.ID]) === String(d.id));

    if (idx !== -1) {
      const orig = currentSummary[idx];
      currentSummary[idx] = [
        d.id,
        orig[COL.TIMESTAMP],
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
        orig[COL.ENCODER]
      ];
      await SimpleDB.set('cachedSummary', currentSummary);
      setSummaryData([...currentSummary]);
    }

    if (navigator.onLine) {
      try {
        await apiCall('saveRemittanceUpdate', { data: d });
      } catch {
        await saveOfflineAction('saveRemittanceUpdate', d);
      }
    } else {
      await saveOfflineAction('saveRemittanceUpdate', d);
    }

    showToast("Remittance entry updated.");
  };

  // Delete single remittance
  const handleDeleteRemittance = async (id: string) => {
    let currentSummary = (await SimpleDB.get<any[]>('cachedSummary')) || [];
    currentSummary = currentSummary.filter(r => String(r[COL.ID]) !== String(id));
    await SimpleDB.set('cachedSummary', currentSummary);
    setSummaryData([...currentSummary]);

    if (!id.startsWith('OFFLINE_')) {
      if (navigator.onLine) {
        apiCall('deleteRemittance', { id }).catch(() => saveOfflineAction('deleteRemittance', { id }));
      } else {
        await saveOfflineAction('deleteRemittance', { id });
      }
    }

    showToast("Remittance entry deleted.");
  };

  // Delete multiple remittances
  const handleDeleteMultipleRemittances = async (ids: string[]) => {
    const idSet = new Set(ids);
    let currentSummary = (await SimpleDB.get<any[]>('cachedSummary')) || [];
    currentSummary = currentSummary.filter(r => !idSet.has(String(r[COL.ID])));
    await SimpleDB.set('cachedSummary', currentSummary);
    setSummaryData([...currentSummary]);

    for (const id of ids) {
      if (!id.startsWith('OFFLINE_')) {
        if (navigator.onLine) {
          apiCall('deleteRemittance', { id }).catch(() => saveOfflineAction('deleteRemittance', { id }));
        } else {
          await saveOfflineAction('deleteRemittance', { id });
        }
      }
    }

    showToast(`Deleted ${ids.length} entries.`);
  };

  // Vehicle operations
  const handleSaveVehicle = async (vData: Omit<VehicleRecord, 'id' | 'dateAdded'>) => {
    const newV: VehicleRecord = {
      id: 'V_' + Date.now(),
      plate: vData.plate,
      driver: vData.driver,
      type: vData.type,
      dateAdded: new Date().toISOString()
    };
    const updated = [newV, ...vehicles];
    setVehicles(updated);
    await SimpleDB.set('cachedVehicles', updated);

    if (navigator.onLine) {
      apiCall('saveVehicle', { data: vData }).catch(() => saveOfflineAction('saveVehicle', vData));
    } else {
      await saveOfflineAction('saveVehicle', vData);
    }
    showToast(`Vehicle ${vData.plate} registered!`);
  };

  const handleUpdateVehicle = async (v: VehicleRecord) => {
    const updated = vehicles.map(x => x.id === v.id ? v : x);
    setVehicles(updated);
    await SimpleDB.set('cachedVehicles', updated);

    if (navigator.onLine) {
      apiCall('updateVehicle', { data: v }).catch(() => saveOfflineAction('updateVehicle', v));
    } else {
      await saveOfflineAction('updateVehicle', v);
    }
    showToast(`Vehicle ${v.plate} updated.`);
  };

  const handleDeleteVehicle = async (id: string) => {
    const updated = vehicles.filter(x => x.id !== id);
    setVehicles(updated);
    await SimpleDB.set('cachedVehicles', updated);

    if (navigator.onLine) {
      apiCall('deleteVehicle', { id }).catch(() => saveOfflineAction('deleteVehicle', { id }));
    } else {
      await saveOfflineAction('deleteVehicle', { id });
    }
    showToast("Vehicle record removed.");
  };

  // Staff operations
  const handleSaveStaff = async (s: StaffProfile) => {
    const updated = [s, ...staffList];
    setStaffList(updated);
    await SimpleDB.set('cachedStaffProfiles', updated);

    if (navigator.onLine) {
      apiCall('saveDriverProfile', { data: s }).catch(() => saveOfflineAction('saveStaffProfile', s));
    } else {
      await saveOfflineAction('saveStaffProfile', s);
    }
    showToast(`Staff profile for ${s.firstName} recorded!`);
  };

  const handleUpdateStaff = async (s: StaffProfile) => {
    const updated = staffList.map(x => x.id === s.id ? s : x);
    setStaffList(updated);
    await SimpleDB.set('cachedStaffProfiles', updated);

    if (navigator.onLine) {
      apiCall('updateDriverProfile', { data: s }).catch(() => saveOfflineAction('updateStaffProfile', s));
    } else {
      await saveOfflineAction('updateStaffProfile', s);
    }
    showToast(`Staff profile updated.`);
  };

  const handleDeleteStaff = async (id: string) => {
    const updated = staffList.filter(x => x.id !== id);
    setStaffList(updated);
    await SimpleDB.set('cachedStaffProfiles', updated);

    if (navigator.onLine) {
      apiCall('deleteDriverProfile', { id }).catch(() => saveOfflineAction('deleteStaffProfile', { id }));
    } else {
      await saveOfflineAction('deleteStaffProfile', { id });
    }
    showToast("Staff profile removed.");
  };

  // Maintenance operations
  const handleSaveMaintenance = async (m: MaintenanceRecord) => {
    const updated = [m, ...maintenanceRecords];
    setMaintenanceRecords(updated);
    await SimpleDB.set('cachedMaintenance', updated);
    showToast(`Maintenance log saved for ${m.plate}!`);
  };

  const handleDeleteMaintenance = async (id: string) => {
    const updated = maintenanceRecords.filter(x => x.id !== id);
    setMaintenanceRecords(updated);
    await SimpleDB.set('cachedMaintenance', updated);
    showToast("Maintenance log removed.");
  };

  // Admin user operations
  const handleAddUser = async (u: UserAccount) => {
    const updated = [...users, u];
    setUsers(updated);
    await SimpleDB.set('cachedUsers', updated);
    if (navigator.onLine) {
      apiCall('addUser', { data: u }).catch(() => {});
    }
    showToast(`User account '${u.username}' added!`);
  };

  const handleDeleteUser = async (username: string) => {
    const updated = users.filter(x => x.username !== username);
    setUsers(updated);
    await SimpleDB.set('cachedUsers', updated);
    if (navigator.onLine) {
      apiCall('deleteUser', { username }).catch(() => {});
    }
    showToast(`User '${username}' deleted.`);
  };

  const handleClearQueue = async () => {
    showConfirm("Clear all items currently in the sync queue?", async () => {
      await SimpleDB.set('offlineQueue', []);
      setOfflineQueue([]);
      showToast("Offline queue cleared.", "info");
    });
  };

  const handleDeleteQueueItem = async (index: number) => {
    const queue = [...offlineQueue];
    queue.splice(index, 1);
    await SimpleDB.set('offlineQueue', queue);
    setOfflineQueue(queue);
    showToast("Queue item deleted.", "info");
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col font-sans pt-16 selection:bg-sky-500 selection:text-white">
      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Sync Queue Inspector Modal */}
      <SyncQueueModal
        isOpen={isQueueModalOpen}
        onClose={() => setIsQueueModalOpen(false)}
        queue={offlineQueue}
        onRetryAll={processSyncQueue}
        onDeleteItem={handleDeleteQueueItem}
      />

      {/* Navbar */}
      <Navbar
        currentUser={currentUser}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
        isOnline={isOnline}
        syncProgress={syncProgress}
        syncMessage={syncMessage}
      />

      {/* Main Screen Views */}
      <main className="flex-1 pb-16">
        {!currentUser || currentPage === 'loginPage' ? (
          <LoginPage onLoginSuccess={handleLoginSuccess} isOnline={isOnline} />
        ) : currentPage === 'dashboardPage' ? (
          <DashboardPage
            currentUser={currentUser}
            queueCount={offlineQueue.length}
            onNavigate={setCurrentPage}
            onSyncNow={processSyncQueue}
            onViewQueue={() => setIsQueueModalOpen(true)}
            onRefreshData={handleRefreshCloudData}
            isSyncing={syncProgress !== null}
            vehicleCount={vehicles.length}
            staffCount={staffList.length}
            totalRemittances={summaryData.length}
          />
        ) : currentPage === 'remitFormPage' ? (
          <RemittanceBatchPage
            vehicles={vehicles}
            staff={staffList}
            onSaveBatch={handleSaveBatchRemittances}
            onShowAlert={showAlert}
            onShowConfirm={showConfirm}
          />
        ) : currentPage === 'summaryPage' ? (
          <SummaryPage
            summaryData={summaryData}
            vehicles={vehicles}
            staff={staffList}
            offlineQueue={offlineQueue}
            onRefresh={handleRefreshCloudData}
            onUpdateRemittance={handleUpdateRemittance}
            onDeleteRemittance={handleDeleteRemittance}
            onDeleteMultiple={handleDeleteMultipleRemittances}
            onShowAlert={showAlert}
            onShowConfirm={showConfirm}
          />
        ) : currentPage === 'reportsPage' ? (
          <ReportsPage
            summaryData={summaryData}
            vehicles={vehicles}
            onRefresh={handleRefreshCloudData}
            theme={theme}
          />
        ) : currentPage === 'tripPage' ? (
          <TripReportPage
            summaryData={summaryData}
            vehicles={vehicles}
            offlineQueue={offlineQueue}
            onRefresh={handleRefreshCloudData}
          />
        ) : currentPage === 'maintenancePage' ? (
          <MaintenancePage
            maintenanceRecords={maintenanceRecords}
            vehicles={vehicles}
            onSaveMaintenance={handleSaveMaintenance}
            onDeleteMaintenance={handleDeleteMaintenance}
            onShowAlert={showAlert}
            onShowConfirm={showConfirm}
          />
        ) : currentPage === 'vehiclePage' ? (
          <VehiclePage
            vehicles={vehicles}
            onSaveVehicle={handleSaveVehicle}
            onUpdateVehicle={handleUpdateVehicle}
            onDeleteVehicle={handleDeleteVehicle}
            onRefreshVehicles={handleRefreshCloudData}
            onShowAlert={showAlert}
            onShowConfirm={showConfirm}
          />
        ) : currentPage === 'staffPage' ? (
          <StaffPage
            staffList={staffList}
            currentUser={currentUser}
            onSaveStaff={handleSaveStaff}
            onUpdateStaff={handleUpdateStaff}
            onDeleteStaff={handleDeleteStaff}
            onRefreshStaff={handleRefreshCloudData}
            onShowAlert={showAlert}
            onShowConfirm={showConfirm}
          />
        ) : currentPage === 'adminPage' && currentUser.role === 'admin' ? (
          <AdminPage
            users={users}
            loginHistory={loginHistory}
            offlineQueue={offlineQueue}
            onAddUser={handleAddUser}
            onDeleteUser={handleDeleteUser}
            onClearQueue={handleClearQueue}
            onRetryQueue={processSyncQueue}
            onShowAlert={showAlert}
            onShowConfirm={showConfirm}
          />
        ) : null}
      </main>
    </div>
  );
}
