import { RemittanceRecord, VehicleRecord, StaffProfile, MaintenanceRecord, UserAccount, LoginHistoryItem, OfflineQueueItem } from '../types';

export const SimpleDB = {
  dbName: "TransportCoopDB",
  storeName: "appData",
  db: null as IDBDatabase | null,

  async init(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      req.onsuccess = (e: any) => {
        this.db = e.target.result;
        resolve(this.db!);
      };
      req.onerror = (e: any) => {
        console.error("SimpleDB init error:", e.target.error);
        reject(e.target.error);
      };
    });
  },

  async get<T>(key: string): Promise<T | null> {
    await this.init();
    return new Promise((resolve) => {
      const tx = this.db!.transaction([this.storeName], "readonly");
      const store = tx.objectStore(this.storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  },

  async set<T>(key: string, value: T): Promise<void> {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([this.storeName], "readwrite");
      const store = tx.objectStore(this.storeName);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = (e: any) => reject(e.target.error);
    });
  }
};

// Initial Seed Data for Isabel Transport Cooperative (ITC)
export async function seedInitialDataIfEmpty() {
  const existingVehicles = await SimpleDB.get<VehicleRecord[]>('cachedVehicles');
  if (existingVehicles && existingVehicles.length > 0) return;

  const initialVehicles: VehicleRecord[] = [
    { id: 'V1', plate: 'ITC-101', driver: 'Juan Dela Cruz', type: 'Bus', dateAdded: '2026-01-15' },
    { id: 'V2', plate: 'ITC-102', driver: 'Pedro Santos', type: 'Bus', dateAdded: '2026-01-20' },
    { id: 'V3', plate: 'ITC-201', driver: 'Mario Reyes', type: 'Van', dateAdded: '2026-02-01' },
    { id: 'V4', plate: 'ITC-202', driver: 'Arnel Mendoza', type: 'Van', dateAdded: '2026-02-10' },
    { id: 'V5', plate: 'ITC-301', driver: 'Rodrigo Bautista', type: 'Truck', dateAdded: '2026-03-01' },
    { id: 'V6', plate: 'ITC-203', driver: 'Danilo Cruz', type: 'Van', dateAdded: '2026-03-05' },
  ];

  const initialStaff: StaffProfile[] = [
    {
      id: 'STF_1',
      firstName: 'Juan',
      middleName: 'G',
      lastName: 'Dela Cruz',
      suffix: '',
      position: 'Driver',
      provCity: 'Isabel, Leyte',
      brgy: 'Poblacion',
      contact: '0917-123-4567',
      bdate: '1985-04-12',
      age: 41,
      sex: 'Male',
      license: 'N02-05-99881',
      dateHired: '2023-01-15',
      sss: '04-1234567-8',
      pagibig: '1210-9876-5432',
      philhealth: '12-345678901-2',
      tin: '123-456-789-000',
      silRequests: [
        { startDate: '2026-04-02', endDate: '2026-04-03', days: 2, reason: 'Family emergency', status: 'Approved' }
      ],
      violations: []
    },
    {
      id: 'STF_2',
      firstName: 'Pedro',
      middleName: 'L',
      lastName: 'Santos',
      suffix: '',
      position: 'Driver',
      provCity: 'Ormoc City',
      brgy: 'San Pablo',
      contact: '0928-555-8821',
      bdate: '1988-08-25',
      age: 38,
      sex: 'Male',
      license: 'N03-08-11223',
      dateHired: '2022-06-10',
      sss: '04-8765432-1',
      pagibig: '1210-1234-9876',
      philhealth: '12-987654321-0',
      tin: '987-654-321-000',
      silRequests: [
        { startDate: '2026-05-10', endDate: '2026-05-11', days: 2, reason: 'Personal matters', status: 'Approved' }
      ],
      violations: [
        { date: '2026-02-14', offense: 'Late trip departure without notice', action: 'Verbal Warning' }
      ]
    },
    {
      id: 'STF_3',
      firstName: 'Mario',
      middleName: 'B',
      lastName: 'Reyes',
      suffix: '',
      position: 'Driver',
      provCity: 'Isabel, Leyte',
      brgy: 'Matlang',
      contact: '0919-777-3344',
      bdate: '1992-11-03',
      age: 33,
      sex: 'Male',
      license: 'N01-12-44556',
      dateHired: '2024-03-01',
      sss: '04-3322114-5',
      pagibig: '1210-4455-6677',
      philhealth: '12-445566778-9',
      tin: '445-566-778-000',
      silRequests: [],
      violations: []
    },
    {
      id: 'STF_4',
      firstName: 'Elena',
      middleName: 'M',
      lastName: 'Torres',
      suffix: '',
      position: 'Dispatcher',
      provCity: 'Ormoc City',
      brgy: 'Linao',
      contact: '0945-888-9900',
      bdate: '1990-02-18',
      age: 36,
      sex: 'Female',
      dateHired: '2021-09-01',
      silRequests: [],
      violations: []
    },
    {
      id: 'STF_5',
      firstName: 'Carlos',
      middleName: 'D',
      lastName: 'Villanueva',
      suffix: '',
      position: 'General Manager',
      provCity: 'Isabel, Leyte',
      brgy: 'Poblacion',
      contact: '0917-999-1122',
      bdate: '1975-07-22',
      age: 51,
      sex: 'Male',
      dateHired: '2019-01-01',
      silRequests: [],
      violations: []
    }
  ];

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  // Sample remittance records for Ormoc & Isabel routes
  const initialRemittances: any[] = [
    [
      "REM_101", `${year}-${month}-02T06:30:00.000Z`, `${year}-${month}-02`, "ITC-101", "OR-88201", "1041",
      "Juan D.", "ORMOC", "First morning run", 8500, 200, 300, 2400, 350, 0, 150,
      5100, 0, 425, 100, 150, 200, 50, 5575, "admin"
    ],
    [
      "REM_102", `${year}-${month}-03T07:15:00.000Z`, `${year}-${month}-03`, "ITC-101", "OR-88202", "1042",
      "Juan D.", "ISABEL", "Regular commute run", 9200, 250, 300, 2550, 350, 100, 150,
      5500, 500, 460, 100, 150, 200, 50, 6040, "admin"
    ],
    [
      "REM_103", `${year}-${month}-04T08:00:00.000Z`, `${year}-${month}-04`, "ITC-102", "OR-88203", "1043",
      "Pedro S.", "ORMOC", "Full passenger load", 8800, 200, 300, 2450, 350, 0, 100,
      5400, 0, 440, 100, 150, 200, 50, 5860, "admin"
    ],
    [
      "REM_104", `${year}-${month}-05T08:45:00.000Z`, `${year}-${month}-05`, "ITC-201", "OR-88204", "1044",
      "Mario R.", "ISABEL", "Van express dispatch", 7600, 150, 250, 2100, 300, 0, 100,
      4700, 0, 380, 100, 150, 200, 50, 5120, "admin"
    ],
    [
      "REM_105", `${year}-${month}-06T09:10:00.000Z`, `${year}-${month}-06`, "ITC-202", "OR-88205", "1045",
      "Arnel M.", "ORMOC", "Van express return", 7900, 150, 250, 2200, 300, 0, 100,
      4900, 1200, 395, 100, 150, 200, 50, 6205, "admin"
    ],
    [
      "REM_106", `${year}-${month}-07T10:00:00.000Z`, `${year}-${month}-07`, "ITC-101", "OR-88206", "1046",
      "Juan D.", "ORMOC", "Midday trip", 8300, 200, 300, 2350, 350, 0, 100,
      5000, 0, 415, 100, 150, 200, 50, 5485, "admin"
    ],
    [
      "REM_107", `${year}-${month}-08T11:20:00.000Z`, `${year}-${month}-08`, "ITC-102", "OR-88207", "1047",
      "Pedro S.", "ISABEL", "Rainy route delay cleared", 8600, 200, 300, 2500, 350, 200, 150,
      4900, 0, 430, 100, 150, 200, 50, 5370, "admin"
    ],
    [
      "REM_EXP1", `${year}-${month}-05T14:00:00.000Z`, `${year}-${month}-05`, "COOP-OFFICE", "OR-EXP-01", "EXPENSE #101",
      "Office", "HQ", "Terminal water & electricity", 0, 0, 0, 0, 0, 0, 3500,
      -3500, 0, 0, 0, 0, 0, 0, -3500, "admin"
    ]
  ];

  const initialMaintenance: MaintenanceRecord[] = [
    {
      id: 'M_1',
      date: `${year}-${month}-01`,
      plate: 'ITC-101',
      odo: 148500,
      type: 'Change Oil',
      replaced: 'Engine Oil & Filter',
      cost: 4800,
      orNo: 'INV-7712',
      remarks: 'Standard 10,000km PMS at Isabel Service Center'
    },
    {
      id: 'M_2',
      date: `${year}-${month}-04`,
      plate: 'ITC-201',
      odo: 92400,
      type: 'PMS',
      replaced: 'Brake Pads',
      cost: 3200,
      orNo: 'INV-7789',
      remarks: 'Front brake pads replaced'
    },
    {
      id: 'M_3',
      date: `${year}-${month}-06`,
      plate: 'ITC-102',
      odo: 161200,
      type: 'Aircon Maintenance',
      replaced: 'Aircon Filter & Freon',
      cost: 2500,
      orNo: 'INV-7801',
      remarks: 'Cleaned condenser coil and topped up refrigerant'
    }
  ];

  const initialUsers: UserAccount[] = [
    { fullName: 'System Administrator', username: 'admin', password: '123', role: 'admin' },
    { fullName: 'Dispatcher Isabel', username: 'dispatcher1', password: '123', role: 'user' },
    { fullName: 'Cashier Ormoc', username: 'cashier1', password: '123', role: 'user' }
  ];

  const initialHistory: LoginHistoryItem[] = [
    {
      time: new Date().toISOString(),
      username: 'admin',
      event: 'LOGIN_SUCCESS',
      token: 'SESSION_' + Date.now().toString(36),
      userAgent: navigator.userAgent
    }
  ];

  const plateMap: Record<string, string> = {};
  initialVehicles.forEach(v => {
    plateMap[v.plate] = v.driver;
  });

  await SimpleDB.set('cachedVehicles', initialVehicles.map(v => [v.id, v.plate, v.driver, v.type, v.dateAdded]));
  await SimpleDB.set('cachedStaffProfiles', initialStaff);
  await SimpleDB.set('cachedSummary', initialRemittances);
  await SimpleDB.set('cachedMaintenance', initialMaintenance);
  await SimpleDB.set('cachedUsers', initialUsers);
  await SimpleDB.set('cachedHistory', initialHistory.map(h => [h.time, h.username, h.event, h.token, h.userAgent]));
  await SimpleDB.set('cachedPlates', plateMap);
}
