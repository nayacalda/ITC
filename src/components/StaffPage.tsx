import React, { useState, useMemo } from 'react';
import { StaffProfile, SILRequest, ViolationRecord, UserAccount } from '../types';
import { 
  Users, 
  UserCheck, 
  Clock, 
  Plus, 
  Search, 
  RotateCw, 
  Camera, 
  ShieldAlert, 
  Calendar, 
  X, 
  Edit2, 
  Trash2, 
  Award,
  AlertCircle
} from 'lucide-react';

interface StaffPageProps {
  staffList: StaffProfile[];
  currentUser: UserAccount;
  onSaveStaff: (s: StaffProfile) => Promise<void>;
  onUpdateStaff: (s: StaffProfile) => Promise<void>;
  onDeleteStaff: (id: string) => Promise<void>;
  onRefreshStaff: () => Promise<void>;
  onShowAlert: (msg: string) => void;
  onShowConfirm: (msg: string, onConfirm: () => void) => void;
}

export const StaffPage: React.FC<StaffPageProps> = ({
  staffList,
  currentUser,
  onSaveStaff,
  onUpdateStaff,
  onDeleteStaff,
  onRefreshStaff,
  onShowAlert,
  onShowConfirm
}) => {
  const today = new Date().toLocaleDateString('en-CA');

  // Registration Form State
  const [fName, setFName] = useState('');
  const [mName, setMName] = useState('');
  const [lName, setLName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [contact, setContact] = useState('');
  const [bdate, setBdate] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [sex, setSex] = useState<'Male' | 'Female'>('Male');
  const [provCity, setProvCity] = useState('');
  const [brgy, setBrgy] = useState('');
  const [position, setPosition] = useState('');
  const [dateHired, setDateHired] = useState(today);
  const [license, setLicense] = useState('');
  const [sss, setSss] = useState('');
  const [pagibig, setPagibig] = useState('');
  const [philhealth, setPhilhealth] = useState('');
  const [tin, setTin] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [photoUrl, setPhotoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [sortCol, setSortCol] = useState<'position' | 'name' | 'contact' | 'age' | 'sex' | 'license' | 'sil' | 'violations'>('position');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Detailed Profile Modal
  const [activeProfile, setActiveProfile] = useState<StaffProfile | null>(null);

  // Profile Modal SIL Inputs
  const [silStart, setSilStart] = useState('');
  const [silEnd, setSilEnd] = useState('');
  const [silReason, setSilReason] = useState('');

  // Profile Modal Violation Inputs
  const [vioDate, setVioDate] = useState(today);
  const [vioOffense, setVioOffense] = useState('');
  const [vioAction, setVioAction] = useState('');

  // Edit Staff Modal
  const [editingStaff, setEditingStaff] = useState<StaffProfile | null>(null);

  // Calculate age from birthdate
  const handleBdateChange = (val: string) => {
    setBdate(val);
    if (!val) { setAge(''); return; }
    const b = new Date(val);
    const now = new Date();
    let a = now.getFullYear() - b.getFullYear();
    const m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
    setAge(a >= 0 ? a : 0);
  };

  // Metrics
  const totalStaff = staffList.length;
  const activeDrivers = staffList.filter(s => (s.position || '').toLowerCase().includes('driver')).length;
  const pendingSILCount = staffList.reduce((acc, s) => {
    return acc + (s.silRequests || []).filter(r => r.status === 'Pending').length;
  }, 0);

  // Image compressor
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 400;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > MAX_DIM) { h *= MAX_DIM / w; w = MAX_DIM; }
        } else {
          if (h > MAX_DIM) { w *= MAX_DIM / h; h = MAX_DIM; }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, w, h);
        setPhoto(canvas.toDataURL('image/jpeg', 0.7));
      };
    };
    reader.readAsDataURL(file);
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fName.trim() || !lName.trim() || !position.trim() || !dateHired) {
      onShowAlert("First Name, Last Name, Job Position, and Date Hired are required.");
      return;
    }

    setIsSubmitting(true);
    const newStaff: StaffProfile = {
      id: 'STF_' + Date.now(),
      firstName: fName.trim(),
      middleName: mName.trim(),
      lastName: lName.trim(),
      suffix: suffix.trim(),
      position: position.trim(),
      provCity: provCity.trim(),
      brgy: brgy.trim(),
      contact: contact.trim(),
      bdate,
      age: age || undefined,
      sex,
      license: license.trim(),
      dateHired,
      sss: sss.trim(),
      pagibig: pagibig.trim(),
      philhealth: philhealth.trim(),
      tin: tin.trim(),
      photo: photo || (photoUrl.trim() || undefined),
      silRequests: [],
      violations: []
    };

    await onSaveStaff(newStaff);
    setIsSubmitting(false);

    // Clear form
    setFName('');
    setMName('');
    setLName('');
    setSuffix('');
    setContact('');
    setBdate('');
    setAge('');
    setPosition('');
    setLicense('');
    setSss('');
    setPagibig('');
    setPhilhealth('');
    setTin('');
    setPhoto(undefined);
    setPhotoUrl('');
  };

  // Filtered & Sorted Staff
  const processedStaff = useMemo(() => {
    let list = [...staffList];
    const s = searchTerm.toLowerCase().trim();

    if (s) {
      list = list.filter(item => {
        const full = `${item.firstName} ${item.lastName} ${item.position} ${item.contact} ${item.license}`.toLowerCase();
        return full.includes(s);
      });
    }

    list.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      switch (sortCol) {
        case 'name':
          valA = `${a.lastName} ${a.firstName}`.toLowerCase();
          valB = `${b.lastName} ${b.firstName}`.toLowerCase();
          break;
        case 'contact':
          valA = (a.contact || '').toLowerCase();
          valB = (b.contact || '').toLowerCase();
          break;
        case 'age':
          valA = Number(a.age) || 0;
          valB = Number(b.age) || 0;
          break;
        case 'sex':
          valA = (a.sex || '').toLowerCase();
          valB = (b.sex || '').toLowerCase();
          break;
        case 'license':
          valA = (a.license || '').toLowerCase();
          valB = (b.license || '').toLowerCase();
          break;
        case 'sil':
          valA = (a.silRequests || []).filter(r => r.status === 'Pending').length;
          valB = (b.silRequests || []).filter(r => r.status === 'Pending').length;
          break;
        case 'violations':
          valA = (a.violations || []).length;
          valB = (b.violations || []).length;
          break;
        case 'position':
        default:
          valA = (a.position || '').toUpperCase();
          valB = (b.position || '').toUpperCase();
          break;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [staffList, searchTerm, sortCol, sortOrder]);

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortOrder('asc');
    }
  };

  // SIL Helpers
  const checkSILEligible = (hiredDate?: string) => {
    if (!hiredDate) return false;
    const hired = new Date(hiredDate);
    if (isNaN(hired.getTime())) return false;
    const now = new Date();
    const diffMonths = (now.getFullYear() - hired.getFullYear()) * 12 + (now.getMonth() - hired.getMonth());
    if (diffMonths > 12) return true;
    if (diffMonths === 12 && now.getDate() >= hired.getDate()) return true;
    return false;
  };

  const getUsedSIL = (s: StaffProfile) => {
    const curYear = new Date().getFullYear();
    return (s.silRequests || []).reduce((acc, r) => {
      const dt = r.startDate || '';
      if (dt && new Date(dt).getFullYear() === curYear && r.status !== 'Rejected') {
        return acc + (r.days || 1);
      }
      return acc;
    }, 0);
  };

  const handleAddSIL = async () => {
    if (!activeProfile) return;
    if (!silStart || !silEnd || !silReason.trim()) {
      onShowAlert("Start date, End date, and Reason are required.");
      return;
    }

    const start = new Date(silStart);
    const end = new Date(silEnd);
    const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    if (days < 1) {
      onShowAlert("End date cannot be prior to Start date.");
      return;
    }

    const used = getUsedSIL(activeProfile);
    if (used + days > 5) {
      onShowAlert(`Request exceeds 5-day annual entitlement. Only ${Math.max(0, 5 - used)} days remaining.`);
      return;
    }

    const newReq: SILRequest = {
      startDate: silStart,
      endDate: silEnd,
      days,
      reason: silReason.trim(),
      status: 'Pending'
    };

    const updatedProfile: StaffProfile = {
      ...activeProfile,
      silRequests: [newReq, ...(activeProfile.silRequests || [])]
    };

    await onUpdateStaff(updatedProfile);
    setActiveProfile(updatedProfile);
    setSilStart('');
    setSilEnd('');
    setSilReason('');
  };

  const handleChangeSILStatus = async (idx: number, newStatus: SILRequest['status']) => {
    if (!activeProfile) return;
    const requests = [...(activeProfile.silRequests || [])];
    requests[idx].status = newStatus;
    const updated = { ...activeProfile, silRequests: requests };
    await onUpdateStaff(updated);
    setActiveProfile(updated);
  };

  const handleDeleteSIL = async (idx: number) => {
    if (!activeProfile) return;
    onShowConfirm("Remove this SIL record?", async () => {
      const requests = [...(activeProfile.silRequests || [])];
      requests.splice(idx, 1);
      const updated = { ...activeProfile, silRequests: requests };
      await onUpdateStaff(updated);
      setActiveProfile(updated);
    });
  };

  // Violation Helpers
  const handleAddViolation = async () => {
    if (!activeProfile) return;
    if (!vioDate || !vioOffense.trim() || !vioAction.trim()) {
      onShowAlert("Date, Offense, and Action are required.");
      return;
    }

    const newVio: ViolationRecord = {
      date: vioDate,
      offense: vioOffense.trim(),
      action: vioAction.trim()
    };

    const updated = {
      ...activeProfile,
      violations: [newVio, ...(activeProfile.violations || [])]
    };

    await onUpdateStaff(updated);
    setActiveProfile(updated);
    setVioOffense('');
    setVioAction('');
  };

  const handleDeleteViolation = async (idx: number) => {
    if (!activeProfile) return;
    onShowConfirm("Delete this violation record?", async () => {
      const violations = [...(activeProfile.violations || [])];
      violations.splice(idx, 1);
      const updated = { ...activeProfile, violations };
      await onUpdateStaff(updated);
      setActiveProfile(updated);
    });
  };

  // Edit Staff Modal Handler
  const openEditModal = (s: StaffProfile) => {
    setEditingStaff({ ...s });
  };

  const handleSaveEditStaff = async () => {
    if (!editingStaff) return;
    if (!editingStaff.firstName || !editingStaff.lastName || !editingStaff.position) {
      onShowAlert("First name, last name, and position are required.");
      return;
    }

    onShowConfirm("Save changes to this staff member's profile?", async () => {
      await onUpdateStaff(editingStaff);
      setEditingStaff(null);
    });
  };

  const handleDeleteStaff = (id: string) => {
    onShowConfirm("Are you sure you want to completely delete this staff profile and all attached records?", async () => {
      await onDeleteStaff(id);
      if (activeProfile?.id === id) setActiveProfile(null);
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 border border-emerald-800/40 rounded-2xl p-5 shadow-md flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Total Registered Staff</span>
            <h3 className="text-3xl font-black text-white mt-1">{totalStaff}</h3>
            <p className="text-[11px] text-emerald-300/70 mt-1">Cooperative workforce</p>
          </div>
          <div className="p-3 bg-emerald-950 rounded-xl text-emerald-400 border border-emerald-800/40">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-sky-950 via-slate-900 to-slate-950 border border-sky-800/40 rounded-2xl p-5 shadow-md flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Active Drivers</span>
            <h3 className="text-3xl font-black text-white mt-1">{activeDrivers}</h3>
            <p className="text-[11px] text-sky-300/70 mt-1">Licensed route operators</p>
          </div>
          <div className="p-3 bg-sky-950 rounded-xl text-sky-400 border border-sky-800/40">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-950 via-slate-900 to-slate-950 border border-amber-800/40 rounded-2xl p-5 shadow-md flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Pending SIL Requests</span>
            <h3 className="text-3xl font-black text-white mt-1">{pendingSILCount}</h3>
            <p className="text-[11px] text-amber-300/70 mt-1">Awaiting management review</p>
          </div>
          <div className="p-3 bg-amber-950 rounded-xl text-amber-400 border border-amber-800/40">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Staff Registration Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
        <h3 className="text-base sm:text-lg font-bold text-sky-400 flex items-center gap-2">
          👤 Staff Registration & Onboarding
        </h3>

        <form onSubmit={handleCreateStaff} className="space-y-4">
          {/* Personal Information */}
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block pb-2 border-b border-slate-800 mb-3">
              Personal Information
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-xs font-semibold text-sky-400 block mb-1">First Name *</label>
                <input
                  type="text"
                  placeholder="First Name"
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Middle Name</label>
                <input
                  type="text"
                  placeholder="Middle Name"
                  value={mName}
                  onChange={(e) => setMName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-sky-400 block mb-1">Last Name *</label>
                <input
                  type="text"
                  placeholder="Last Name"
                  value={lName}
                  onChange={(e) => setLName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Suffix</label>
                <input
                  type="text"
                  placeholder="e.g. Jr, III"
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Contact No.</label>
                <input
                  type="text"
                  placeholder="0917-..."
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Birth Date</label>
                <input
                  type="date"
                  max={today}
                  value={bdate}
                  onChange={(e) => handleBdateChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Age</label>
                <input
                  type="text"
                  readOnly
                  placeholder="Auto"
                  value={age}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Sex</label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Province/City</label>
                <input
                  type="text"
                  placeholder="e.g. Isabel, Leyte"
                  value={provCity}
                  onChange={(e) => setProvCity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Barangay</label>
                <input
                  type="text"
                  placeholder="e.g. Poblacion"
                  value={brgy}
                  onChange={(e) => setBrgy(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* Employment & Govt Records */}
          <div className="pt-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block pb-2 border-b border-slate-800 mb-3">
              Employment & Government Records
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-semibold text-sky-400 block mb-1">Job Position *</label>
                <input
                  type="text"
                  placeholder="Driver, Dispatcher, Cashier"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full bg-slate-950 border border-sky-500/50 rounded-lg px-3 py-2 text-xs text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-sky-400 block mb-1">Date Hired *</label>
                <input
                  type="date"
                  max={today}
                  value={dateHired}
                  onChange={(e) => setDateHired(e.target.value)}
                  className="w-full bg-slate-950 border border-sky-500/50 rounded-lg px-3 py-2 text-xs text-slate-100"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">License No. (Drivers)</label>
                <input
                  type="text"
                  placeholder="e.g. N02-05-99881"
                  value={license}
                  onChange={(e) => setLicense(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-sky-400" /> Photo Profile
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-300 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:bg-slate-800 file:text-sky-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">SSS No.</label>
                <input
                  type="text"
                  placeholder="04-..."
                  value={sss}
                  onChange={(e) => setSss(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Pag-IBIG No.</label>
                <input
                  type="text"
                  placeholder="1210-..."
                  value={pagibig}
                  onChange={(e) => setPagibig(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">PhilHealth No.</label>
                <input
                  type="text"
                  placeholder="12-..."
                  value={philhealth}
                  onChange={(e) => setPhilhealth(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">TIN No.</label>
                <input
                  type="text"
                  placeholder="123-..."
                  value={tin}
                  onChange={(e) => setTin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-full text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Recording...' : 'Record Staff Profile'}
            </button>
            <button
              type="button"
              onClick={() => {
                setFName('');
                setMName('');
                setLName('');
                setSuffix('');
                setContact('');
                setPosition('');
                setLicense('');
              }}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-full text-xs transition cursor-pointer"
            >
              Clear Form
            </button>
          </div>
        </form>
      </div>

      {/* Recorded Staff Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-white text-sm">
              Recorded Staff Directory <span className="text-xs font-normal text-slate-400">(Double-click row to open profile & records)</span>
            </h4>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <input
                type="text"
                placeholder="Search staff, role, license..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
            </div>

            <button
              onClick={onRefreshStaff}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-400 rounded-lg text-xs font-semibold shadow transition cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Reload
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-300 font-semibold border-b border-slate-800 select-none">
              <tr>
                <th className="p-3 text-center w-12">Photo</th>
                <th onClick={() => toggleSort('name')} className="p-3 cursor-pointer hover:text-sky-400">
                  Name {sortCol === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th onClick={() => toggleSort('position')} className="p-3 cursor-pointer hover:text-sky-400">
                  Position {sortCol === 'position' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th onClick={() => toggleSort('contact')} className="p-3 cursor-pointer hover:text-sky-400">
                  Contact {sortCol === 'contact' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th onClick={() => toggleSort('age')} className="p-3 text-center cursor-pointer hover:text-sky-400 w-16">
                  Age {sortCol === 'age' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th onClick={() => toggleSort('sex')} className="p-3 text-center cursor-pointer hover:text-sky-400 w-16">
                  Sex {sortCol === 'sex' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th onClick={() => toggleSort('license')} className="p-3 cursor-pointer hover:text-sky-400">
                  License No. {sortCol === 'license' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th onClick={() => toggleSort('sil')} className="p-3 text-center cursor-pointer hover:text-sky-400">
                  SIL (P | A | R) {sortCol === 'sil' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th onClick={() => toggleSort('violations')} className="p-3 text-center cursor-pointer hover:text-rose-400">
                  Violations {sortCol === 'violations' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th className="p-3 text-center w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {processedStaff.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    No staff profiles registered yet.
                  </td>
                </tr>
              ) : (
                processedStaff.map(s => {
                  const fullName = `${s.lastName || ''}, ${s.firstName || ''} ${s.middleName || ''} ${s.suffix || ''}`.trim();

                  let pCount = 0, aCount = 0, rCount = 0;
                  (s.silRequests || []).forEach(r => {
                    if (r.status === 'Pending') pCount++;
                    else if (r.status === 'Approved') aCount++;
                    else if (r.status === 'Rejected') rCount++;
                  });

                  const vioCount = (s.violations || []).length;

                  return (
                    <tr
                      key={s.id}
                      onDoubleClick={() => setActiveProfile(s)}
                      className="hover:bg-slate-850 transition cursor-pointer select-none"
                      title="Double click to view full profile & SIL"
                    >
                      <td className="p-2 text-center">
                        {s.photo ? (
                          <img
                            src={s.photo}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover mx-auto border border-sky-400"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto text-xs font-bold border border-slate-700">
                            👤
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-bold text-white whitespace-nowrap">{fullName}</td>
                      <td className="p-3 text-sky-400 font-medium">{s.position}</td>
                      <td className="p-3 text-slate-300">{s.contact || '-'}</td>
                      <td className="p-3 text-center text-slate-300">{s.age || '-'}</td>
                      <td className="p-3 text-center text-slate-300">{s.sex || '-'}</td>
                      <td className="p-3 text-slate-400 font-mono">{s.license || '-'}</td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <span className="text-amber-400 font-bold" title="Pending">{pCount > 0 ? pCount : '-'}</span>
                        <span className="text-slate-600 mx-1">|</span>
                        <span className="text-emerald-400 font-bold" title="Approved">{aCount > 0 ? aCount : '-'}</span>
                        <span className="text-slate-600 mx-1">|</span>
                        <span className="text-rose-400 font-bold" title="Rejected">{rCount > 0 ? rCount : '-'}</span>
                      </td>
                      <td className="p-3 text-center">
                        {vioCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-950 text-red-400 font-bold border border-red-800 text-[11px]">
                            {vioCount}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditModal(s); }}
                          className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded text-[11px] mr-1.5 transition cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteStaff(s.id); }}
                          className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-[11px] transition cursor-pointer"
                        >
                          Del
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed View Staff Profile Modal (with SIL & Violations) */}
      {activeProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sky-400 text-base flex items-center gap-2">
                👤 Staff Profile & Comprehensive Records
              </h3>
              <button
                onClick={() => setActiveProfile(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Header profile info */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
                <div className="text-center shrink-0">
                  {activeProfile.photo ? (
                    <img
                      src={activeProfile.photo}
                      alt=""
                      className="w-24 h-24 rounded-full object-cover border-4 border-sky-400 shadow-lg mx-auto"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-4xl border-4 border-sky-400 shadow-lg mx-auto">
                      👤
                    </div>
                  )}
                  <h4 className="font-bold text-white text-base mt-2">
                    {activeProfile.firstName} {activeProfile.lastName}
                  </h4>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-950 text-sky-400 border border-sky-700">
                    {activeProfile.position}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Date Hired:</span>
                    <span className="font-bold text-white">{activeProfile.dateHired || 'Not Set'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Contact:</span>
                    <span className="font-bold text-white">{activeProfile.contact || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">License No:</span>
                    <span className="font-mono font-bold text-sky-300">{activeProfile.license || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Age & Sex:</span>
                    <span className="font-bold text-white">{activeProfile.age || 'N/A'} yrs • {activeProfile.sex}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">SSS No:</span>
                    <span className="font-mono text-slate-200">{activeProfile.sss || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Pag-IBIG No:</span>
                    <span className="font-mono text-slate-200">{activeProfile.pagibig || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">PhilHealth:</span>
                    <span className="font-mono text-slate-200">{activeProfile.philhealth || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">TIN:</span>
                    <span className="font-mono text-slate-200">{activeProfile.tin || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Two columns: SIL Management & Violations */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left 7 cols: Service Incentive Leave */}
                <div className="lg:col-span-7 bg-slate-950/70 p-5 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-emerald-400 text-sm flex items-center gap-2">
                      <Award className="w-4 h-4" /> Service Incentive Leave (SIL)
                    </h5>
                    <div>
                      {(() => {
                        const isEligible = checkSILEligible(activeProfile.dateHired);
                        const used = getUsedSIL(activeProfile);
                        if (!isEligible) {
                          return <span className="text-xs font-bold text-rose-400">❌ Not Eligible (&lt; 1 Yr service)</span>;
                        }
                        if (used >= 5) {
                          return <span className="text-xs font-bold text-rose-400">0 Days Remaining</span>;
                        }
                        return <span className="text-xs font-bold text-emerald-400">✅ Eligible ({5 - used} Days Rem)</span>;
                      })()}
                    </div>
                  </div>

                  {getUsedSIL(activeProfile) >= 5 && (
                    <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-lg text-xs text-rose-300 font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      Used up all 5 days SIL. From here on all absences are not covered by paid leave.
                    </div>
                  )}

                  {/* Add SIL Request Input */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Start Date</span>
                      <input
                        type="date"
                        value={silStart}
                        onChange={(e) => setSilStart(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">End Date</span>
                      <input
                        type="date"
                        value={silEnd}
                        onChange={(e) => setSilEnd(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Reason</span>
                      <input
                        type="text"
                        placeholder="Reason..."
                        value={silReason}
                        onChange={(e) => setSilReason(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleAddSIL}
                        disabled={!checkSILEligible(activeProfile.dateHired) || getUsedSIL(activeProfile) >= 5}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded font-bold text-xs transition cursor-pointer"
                      >
                        Submit
                      </button>
                    </div>
                  </div>

                  {/* SIL History Table */}
                  <div className="overflow-x-auto max-h-[220px] border border-slate-800 rounded-xl">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800">
                        <tr>
                          <th className="p-2 text-left">Dates</th>
                          <th className="p-2 text-center">Days</th>
                          <th className="p-2 text-left">Reason</th>
                          <th className="p-2 text-left">Status</th>
                          {currentUser.role === 'admin' && <th className="p-2 text-center">Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {(activeProfile.silRequests || []).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-4 text-center text-slate-500">No SIL requests on record.</td>
                          </tr>
                        ) : (
                          activeProfile.silRequests.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-900">
                              <td className="p-2 whitespace-nowrap text-slate-300">
                                {r.startDate === r.endDate ? r.startDate : `${r.startDate} to ${r.endDate}`}
                              </td>
                              <td className="p-2 text-center font-bold text-white">{r.days}</td>
                              <td className="p-2 text-slate-400 max-w-[120px] truncate">{r.reason}</td>
                              <td className="p-2">
                                {currentUser.role === 'admin' ? (
                                  <select
                                    value={r.status}
                                    onChange={(e) => handleChangeSILStatus(i, e.target.value as any)}
                                    className={`bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-bold ${
                                      r.status === 'Approved' ? 'text-emerald-400' : r.status === 'Rejected' ? 'text-rose-400' : 'text-amber-400'
                                    }`}
                                  >
                                    <option value="Pending">Pending</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Rejected">Rejected</option>
                                  </select>
                                ) : (
                                  <span className={`font-bold ${
                                    r.status === 'Approved' ? 'text-emerald-400' : r.status === 'Rejected' ? 'text-rose-400' : 'text-amber-400'
                                  }`}>
                                    {r.status}
                                  </span>
                                )}
                              </td>
                              {currentUser.role === 'admin' && (
                                <td className="p-2 text-center">
                                  <button
                                    onClick={() => handleDeleteSIL(i)}
                                    className="p-1 text-slate-500 hover:text-rose-400"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mx-auto" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right 5 cols: Act of Violation Records */}
                <div className="lg:col-span-5 bg-slate-950/70 p-5 rounded-2xl border border-slate-800 space-y-3">
                  <h5 className="font-bold text-rose-400 text-sm flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" /> Act of Violation Records
                  </h5>

                  {/* Add Violation Input */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Date</span>
                      <input
                        type="date"
                        max={today}
                        value={vioDate}
                        onChange={(e) => setVioDate(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Offense</span>
                      <input
                        type="text"
                        placeholder="Offense..."
                        value={vioOffense}
                        onChange={(e) => setVioOffense(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Action</span>
                      <input
                        type="text"
                        placeholder="Action..."
                        value={vioAction}
                        onChange={(e) => setVioAction(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleAddViolation}
                    className="w-full py-1.5 bg-rose-700 hover:bg-rose-600 text-white rounded font-bold text-xs shadow transition cursor-pointer"
                  >
                    Record Violation
                  </button>

                  {/* Violations Table */}
                  <div className="overflow-x-auto max-h-[200px] border border-slate-800 rounded-xl">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800">
                        <tr>
                          <th className="p-2 text-left">Date</th>
                          <th className="p-2 text-left">Offense</th>
                          <th className="p-2 text-left">Action</th>
                          {currentUser.role === 'admin' && <th className="p-2 text-center w-12">Action</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {(activeProfile.violations || []).length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-4 text-center text-slate-500">
                              Clean record. No violations recorded.
                            </td>
                          </tr>
                        ) : (
                          activeProfile.violations.map((v, i) => (
                            <tr key={i} className="hover:bg-slate-900">
                              <td className="p-2 whitespace-nowrap text-rose-300 font-medium">
                                {new Date(v.date).toLocaleDateString()}
                              </td>
                              <td className="p-2 text-slate-200 max-w-[120px] truncate">{v.offense}</td>
                              <td className="p-2 text-slate-400 max-w-[120px] truncate">{v.action}</td>
                              {currentUser.role === 'admin' && (
                                <td className="p-2 text-center">
                                  <button
                                    onClick={() => handleDeleteViolation(i)}
                                    className="p-1 text-slate-500 hover:text-rose-400"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 mx-auto" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 text-right">
              <button
                onClick={() => setActiveProfile(null)}
                className="px-5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h4 className="font-bold text-sky-400 text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4" /> Edit Staff Information
              </h4>
              <button
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">First Name</label>
                  <input
                    type="text"
                    value={editingStaff.firstName}
                    onChange={(e) => setEditingStaff({ ...editingStaff, firstName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editingStaff.lastName}
                    onChange={(e) => setEditingStaff({ ...editingStaff, lastName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Job Position</label>
                  <input
                    type="text"
                    value={editingStaff.position}
                    onChange={(e) => setEditingStaff({ ...editingStaff, position: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Contact No</label>
                  <input
                    type="text"
                    value={editingStaff.contact || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, contact: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">License No</label>
                  <input
                    type="text"
                    value={editingStaff.license || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, license: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Date Hired</label>
                  <input
                    type="date"
                    value={editingStaff.dateHired || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, dateHired: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Sex</label>
                  <select
                    value={editingStaff.sex || 'Male'}
                    onChange={(e) => setEditingStaff({ ...editingStaff, sex: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-100"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingStaff(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditStaff}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg shadow"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
