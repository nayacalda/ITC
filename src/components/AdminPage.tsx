import React, { useState } from 'react';
import { UserAccount, LoginHistoryItem, OfflineQueueItem } from '../types';
import { ShieldCheck, UserPlus, Trash2, History, RotateCw, AlertTriangle } from 'lucide-react';

interface AdminPageProps {
  users: UserAccount[];
  loginHistory: LoginHistoryItem[];
  offlineQueue: OfflineQueueItem[];
  onAddUser: (user: UserAccount) => Promise<void>;
  onDeleteUser: (username: string) => Promise<void>;
  onClearQueue: () => Promise<void>;
  onRetryQueue: () => Promise<void>;
  onShowAlert: (msg: string) => void;
  onShowConfirm: (msg: string, onConfirm: () => void) => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  users,
  loginHistory,
  offlineQueue,
  onAddUser,
  onDeleteUser,
  onClearQueue,
  onRetryQueue,
  onShowAlert,
  onShowConfirm
}) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      onShowAlert("Username and password are required.");
      return;
    }

    if (users.some(u => u.username.toLowerCase() === username.trim().toLowerCase())) {
      onShowAlert("A user with this username already exists.");
      return;
    }

    setIsSubmitting(true);
    await onAddUser({
      fullName: fullName.trim(),
      username: username.trim(),
      password: password.trim(),
      role
    });

    setFullName('');
    setUsername('');
    setPassword('');
    setIsSubmitting(false);
  };

  const handleDeleteUser = (u: string) => {
    if (u === 'admin') {
      onShowAlert("The primary admin account cannot be deleted.");
      return;
    }
    onShowConfirm(`Are you sure you want to delete user account '${u}'?`, async () => {
      await onDeleteUser(u);
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* User Management Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
        <h3 className="text-base sm:text-lg font-bold text-sky-400 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-sky-400" /> Cooperative System User Management
        </h3>

        {/* Add User Form */}
        <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Full Name</label>
            <input
              type="text"
              placeholder="e.g. Maria Santos"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Username *</label>
            <input
              type="text"
              placeholder="e.g. msantos"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Password *</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Assigned Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
            >
              <option value="user">User (Staff / Cashier)</option>
              <option value="admin">Admin (Full Access)</option>
            </select>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </button>
          </div>
        </form>

        {/* Users Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl mt-4">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-300 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">Full Name</th>
                <th className="p-3">Username</th>
                <th className="p-3">Role</th>
                <th className="p-3 text-center w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map(u => (
                <tr key={u.username} className="hover:bg-slate-850">
                  <td className="p-3 font-medium text-white">{u.fullName || '-'}</td>
                  <td className="p-3 font-mono text-sky-400">{u.username}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                      u.role === 'admin'
                        ? 'bg-sky-950 text-sky-400 border border-sky-800'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {u.username !== 'admin' && (
                      <button
                        onClick={() => handleDeleteUser(u.username)}
                        className="p-1 text-slate-500 hover:text-red-400 transition"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Offline Queue Inspector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-white text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> Offline Synchronization Queue ({offlineQueue.length} pending)
          </h4>
          <div className="flex items-center gap-2">
            <button
              onClick={onRetryQueue}
              className="inline-flex items-center gap-1 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Retry Sync
            </button>
            <button
              onClick={onClearQueue}
              className="inline-flex items-center gap-1 px-3 py-1 bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              Clear Queue
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[220px] border border-slate-800 rounded-xl">
          <table className="w-full text-xs">
            <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
              <tr>
                <th className="p-2 text-left">Time</th>
                <th className="p-2 text-left">Action</th>
                <th className="p-2 text-left">Details</th>
                <th className="p-2 text-center">Status</th>
                <th className="p-2 text-left">Error Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {offlineQueue.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-500">Queue is completely synced and empty.</td>
                </tr>
              ) : (
                offlineQueue.map(item => (
                  <tr key={item.id} className="hover:bg-slate-850">
                    <td className="p-2 text-slate-400 whitespace-nowrap">
                      {new Date(item.time).toLocaleTimeString()}
                    </td>
                    <td className="p-2 font-mono text-sky-400">{item.action}</td>
                    <td className="p-2 text-slate-300">
                      {item.data?.tripSlip ? `Slip: ${item.data.tripSlip} • Plate: ${item.data.plate}` : JSON.stringify(item.data).substring(0, 40)}
                    </td>
                    <td className="p-2 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === 'error'
                          ? 'bg-red-950 text-red-400'
                          : item.status === 'duplicate'
                          ? 'bg-amber-950 text-amber-400'
                          : 'bg-sky-950 text-sky-400'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="p-2 text-rose-400 truncate max-w-xs">{item.errorMsg || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Login History Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-3">
        <h4 className="font-bold text-white text-sm flex items-center gap-2">
          <History className="w-4 h-4 text-sky-400" /> Recent Security & Login History
        </h4>

        <div className="overflow-x-auto max-h-[260px] border border-slate-800 rounded-xl">
          <table className="w-full text-xs">
            <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800 font-semibold">
              <tr>
                <th className="p-2.5 text-left">Timestamp</th>
                <th className="p-2.5 text-left">User</th>
                <th className="p-2.5 text-left">Event</th>
                <th className="p-2.5 text-left">Token</th>
                <th className="p-2.5 text-left">Device / Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loginHistory.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-850">
                  <td className="p-2.5 text-slate-400 whitespace-nowrap">
                    {new Date(item.time).toLocaleString()}
                  </td>
                  <td className="p-2.5 font-bold text-white">{item.username}</td>
                  <td className="p-2.5 text-emerald-400 font-semibold">{item.event}</td>
                  <td className="p-2.5 font-mono text-slate-500 text-[11px] truncate max-w-[120px]">
                    {item.token || '-'}
                  </td>
                  <td className="p-2.5 text-slate-400 text-[11px] truncate max-w-xs">
                    {item.userAgent || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
