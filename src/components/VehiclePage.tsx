import React, { useState, useMemo } from 'react';
import { VehicleRecord } from '../types';
import { Car, Plus, Search, RotateCw, Edit2, Trash2, X } from 'lucide-react';

interface VehiclePageProps {
  vehicles: VehicleRecord[];
  onSaveVehicle: (v: Omit<VehicleRecord, 'id' | 'dateAdded'>) => Promise<void>;
  onUpdateVehicle: (v: VehicleRecord) => Promise<void>;
  onDeleteVehicle: (id: string) => Promise<void>;
  onRefreshVehicles: () => Promise<void>;
  onShowAlert: (msg: string) => void;
  onShowConfirm: (msg: string, onConfirm: () => void) => void;
}

export const VehiclePage: React.FC<VehiclePageProps> = ({
  vehicles,
  onSaveVehicle,
  onUpdateVehicle,
  onDeleteVehicle,
  onRefreshVehicles,
  onShowAlert,
  onShowConfirm
}) => {
  const [plate, setPlate] = useState('');
  const [driver, setDriver] = useState('');
  const [type, setType] = useState<'Bus' | 'Van' | 'Truck'>('Bus');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReloading, setIsReloading] = useState(false);

  // Edit Modal State
  const [editingVehicle, setEditingVehicle] = useState<VehicleRecord | null>(null);
  const [editPlate, setEditPlate] = useState('');
  const [editDriver, setEditDriver] = useState('');
  const [editType, setEditType] = useState<'Bus' | 'Van' | 'Truck'>('Bus');

  const filteredVehicles = useMemo(() => {
    const s = searchTerm.toLowerCase().trim();
    if (!s) return vehicles;
    return vehicles.filter(v =>
      v.plate.toLowerCase().includes(s) ||
      v.driver.toLowerCase().includes(s) ||
      v.type.toLowerCase().includes(s)
    );
  }, [vehicles, searchTerm]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate.trim() || !driver.trim()) {
      onShowAlert("Plate number and Driver name are required.");
      return;
    }

    // Check duplicate plate
    if (vehicles.some(v => v.plate.toUpperCase() === plate.trim().toUpperCase())) {
      onShowAlert("A vehicle with this plate number is already registered.");
      return;
    }

    setIsSubmitting(true);
    await onSaveVehicle({
      plate: plate.trim().toUpperCase(),
      driver: driver.trim(),
      type
    });
    setPlate('');
    setDriver('');
    setIsSubmitting(false);
  };

  const openEditModal = (v: VehicleRecord) => {
    setEditingVehicle(v);
    setEditPlate(v.plate);
    setEditDriver(v.driver);
    setEditType(v.type);
  };

  const handleUpdate = async () => {
    if (!editingVehicle) return;
    if (!editPlate.trim() || !editDriver.trim()) {
      onShowAlert("Plate and Driver are required.");
      return;
    }

    onShowConfirm("Save changes to this vehicle?", async () => {
      await onUpdateVehicle({
        ...editingVehicle,
        plate: editPlate.trim().toUpperCase(),
        driver: editDriver.trim(),
        type: editType
      });
      setEditingVehicle(null);
    });
  };

  const handleDelete = (id: string) => {
    onShowConfirm("Are you sure you want to permanently delete this vehicle?", async () => {
      await onDeleteVehicle(id);
      setEditingVehicle(null);
    });
  };

  const handleReload = async () => {
    setIsReloading(true);
    await onRefreshVehicles();
    setIsReloading(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Registration Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
        <h3 className="text-base sm:text-lg font-bold text-sky-400 mb-4 flex items-center gap-2">
          <Car className="w-5 h-5 text-sky-400" /> Vehicle Registration & Fleet Registry
        </h3>

        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Plate Number *</label>
            <input
              type="text"
              placeholder="e.g. ITC-105"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 uppercase"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Assigned Driver / Operator *</label>
            <input
              type="text"
              placeholder="e.g. Juan Dela Cruz"
              value={driver}
              onChange={(e) => setDriver(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Vehicle Classification</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
            >
              <option value="Bus">Bus</option>
              <option value="Van">Van</option>
              <option value="Truck">Truck</option>
            </select>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {isSubmitting ? 'Registering...' : 'Save Vehicle'}
            </button>
          </div>
        </form>
      </div>

      {/* Vehicle List Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-white text-sm">
              Registered Cooperative Fleet ({filteredVehicles.length} vehicles)
            </h4>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="Search plate, driver, or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            </div>

            <button
              onClick={handleReload}
              disabled={isReloading}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-400 rounded-lg text-xs font-semibold shadow transition cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin' : ''}`} />
              Reload
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-300 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">Plate</th>
                <th className="p-3">Driver</th>
                <th className="p-3">Classification</th>
                <th className="p-3">Date Added</th>
                <th className="p-3 text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No vehicles registered matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map(v => (
                  <tr key={v.id} className="hover:bg-slate-850 transition">
                    <td className="p-3 font-bold text-white whitespace-nowrap">{v.plate}</td>
                    <td className="p-3 text-slate-200">{v.driver}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        v.type === 'Bus'
                          ? 'bg-sky-950 text-sky-400 border border-sky-800/40'
                          : v.type === 'Van'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                          : 'bg-amber-950 text-amber-400 border border-amber-800/40'
                      }`}>
                        {v.type}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">
                      {v.dateAdded ? new Date(v.dateAdded).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => openEditModal(v)}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded text-[11px] transition cursor-pointer"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Vehicle Modal */}
      {editingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h4 className="font-bold text-sky-400 text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4" /> Edit Vehicle Record
              </h4>
              <button
                onClick={() => setEditingVehicle(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-semibold mb-1 block">Plate Number</label>
                <input
                  type="text"
                  value={editPlate}
                  onChange={(e) => setEditPlate(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 uppercase font-bold"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold mb-1 block">Assigned Driver</label>
                <input
                  type="text"
                  value={editDriver}
                  onChange={(e) => setEditDriver(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold mb-1 block">Classification</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                >
                  <option value="Bus">Bus</option>
                  <option value="Van">Van</option>
                  <option value="Truck">Truck</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => handleDelete(editingVehicle.id)}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Delete Vehicle
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingVehicle(null)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition shadow cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
