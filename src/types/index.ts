export interface RemittanceRecord {
  id: string;
  timestamp: string;
  dateRec: string;
  plate: string;
  orNo: string;
  tripSlip: string;
  driver: string;
  route: string;
  remark: string;
  gross: number;
  disc: number;
  terminal: number;
  fuel: number;
  meals: number;
  repair: number;
  othersexp: number;
  subTotal: number;
  pakyaw: number;
  mgtfee: number;
  cbu: number;
  tire: number;
  loan: number;
  others: number;
  totalNet: number;
  encoder: string;
  isOffline?: boolean;
  queueIdx?: number;
  isError?: boolean;
}

export interface VehicleRecord {
  id: string;
  plate: string;
  driver: string;
  type: 'Bus' | 'Van' | 'Truck';
  dateAdded: string;
}

export interface SILRequest {
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface ViolationRecord {
  date: string;
  offense: string;
  action: string;
}

export interface StaffProfile {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
  position: string;
  provCity?: string;
  brgy?: string;
  contact?: string;
  bdate?: string;
  age?: number | string;
  sex?: 'Male' | 'Female';
  license?: string;
  dateHired: string;
  sss?: string;
  pagibig?: string;
  philhealth?: string;
  tin?: string;
  photo?: string;
  silRequests: SILRequest[];
  violations: ViolationRecord[];
}

export interface MaintenanceRecord {
  id: string;
  date: string;
  plate: string;
  odo: number;
  type: string;
  replaced: string;
  cost: number;
  orNo: string;
  partPhoto?: string;
  receiptPhoto?: string;
  remarks?: string;
}

export interface UserAccount {
  fullName: string;
  username: string;
  password?: string;
  role: 'admin' | 'user';
}

export interface LoginHistoryItem {
  time: string;
  username: string;
  event: string;
  token?: string;
  userAgent?: string;
}

export interface OfflineQueueItem {
  id: string;
  action: string;
  data: any;
  time: number;
  status: 'pending' | 'error' | 'duplicate';
  errorMsg?: string;
}
