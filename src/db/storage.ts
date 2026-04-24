import { 
  Plant, 
  SystemCategory, 
  SubSystem, 
  TestRecord, 
  User, 
  AppSettings,
  RecycledItem,
  FinancialYear,
  IsolationReport,
  EquipmentIssue
} from '../types';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  updateDoc, 
  writeBatch,
  setIndexConfiguration
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const STORAGE_KEYS = {
  PLANTS: 'fps_plants',
  CATEGORIES: 'fps_categories',
  SUB_SYSTEMS: 'fps_sub_systems',
  TEST_RECORDS: 'fps_test_records',
  USERS: 'fps_users',
  SETTINGS: 'fps_settings',
  HISTORICAL_REPORTS: 'fps_historical_reports',
  RECYCLE_BIN: 'fps_recycle_bin',
  PLANT_EQUIPMENT: 'fps_plant_equipment',
  ACTIVE_YEAR: 'fps_active_year',
  ISOLATION_REPORTS: 'fps_isolation_reports',
  EQUIPMENT_ISSUES: 'fps_equipment_issues'
};

const DEFAULT_FY: FinancialYear = '2026-27';

const DEFAULT_CATEGORIES: SystemCategory[] = [
  { id: '1', name: 'Fixed System' },
  { id: '2', name: 'Foam System' },
  { id: '3', name: 'Sprinkler System' },
  { id: '4', name: 'Rim Seal Protection' }
];

const DEFAULT_SUB_SYSTEMS: SubSystem[] = [
  { id: '1-1', categoryId: '1', name: 'MVWS First Semiannual' },
  { id: '1-2', categoryId: '1', name: 'MVWS Second Semiannual' },
  { id: '1-3', categoryId: '1', name: 'MVWS Quarterly' },
  { id: '1-4', categoryId: '1', name: 'ROV' },
  { id: '1-5', categoryId: '1', name: 'Water Curtain' },
  { id: '1-6', categoryId: '1', name: 'Manual Water Spray' },
  { id: '2-1', categoryId: '2', name: 'Semi Fixed Foam' },
  { id: '2-2', categoryId: '2', name: 'Fixed Foam System' },
  { id: '3-1', categoryId: '3', name: 'Annual Sprinkler Testing' },
  { id: '4-1', categoryId: '4', name: 'Rim Seal Automatic System' },
  { id: '4-2', categoryId: '4', name: 'Rim Seal Manual System' }
];

const DEFAULT_PLANTS: Plant[] = Array.from({ length: 20 }, (_, i) => ({
  id: `plant-${i + 1}`,
  code: `UNIT-${i + 1}`,
  name: `Plant Unit ${i + 1}`
}));

export const dbApi = {
  // Initialization & Migration
  init: async () => {
    // Check if migration is needed
    let migrated = localStorage.getItem('fps_firestore_migrated');
    const categoriesSnap = await getDocs(collection(db, 'categories'));
    
    // If we've never migrated, OR if the DB is completely empty (happens if previous migration bug occurred), force a re-seed.
    if (!migrated || categoriesSnap.empty) {
      console.log("Starting backend migration/seeding...");
      await dbApi.syncLocalToFirestore();
      localStorage.setItem('fps_firestore_migrated', 'true');
    }
    
    // Set default active year if not present
    const activeYearDoc = await getDoc(doc(db, 'activeYear', 'current'));
    if (!activeYearDoc.exists()) {
      await setDoc(doc(db, 'activeYear', 'current'), { year: DEFAULT_FY });
    }
  },

  syncLocalToFirestore: async () => {
    const batch = writeBatch(db);
    
    const getStoredOrFallback = (key: string, fallback: any) => {
      const stored = localStorage.getItem(key);
      if (!stored) return fallback;
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length === 0) return fallback;
        return parsed;
      } catch (e) {
        return fallback;
      }
    };
    
    // Migration logic for each collection...
    const cats = getStoredOrFallback(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES);
    cats.forEach((c: any) => batch.set(doc(db, 'categories', c.id), c));
    
    const subs = getStoredOrFallback(STORAGE_KEYS.SUB_SYSTEMS, DEFAULT_SUB_SYSTEMS);
    subs.forEach((s: any) => batch.set(doc(db, 'subsystems', s.id), s));
    
    const plants = getStoredOrFallback(STORAGE_KEYS.PLANTS, DEFAULT_PLANTS);
    plants.forEach((p: any) => batch.set(doc(db, 'plants', p.id), p));
    
    const records = getStoredOrFallback(STORAGE_KEYS.TEST_RECORDS, []);
    records.forEach((r: any) => batch.set(doc(db, 'testRecords', r.id), r));
    
    const users = getStoredOrFallback(STORAGE_KEYS.USERS, []);
    users.forEach((u: any) => batch.set(doc(db, 'users', u.id), u));
    
    const isolations = getStoredOrFallback(STORAGE_KEYS.ISOLATION_REPORTS, []);
    isolations.forEach((i: any) => batch.set(doc(db, 'isolationReports', i.id), i));
    
    const issues = getStoredOrFallback(STORAGE_KEYS.EQUIPMENT_ISSUES, []);
    issues.forEach((is: any) => batch.set(doc(db, 'equipmentIssues', is.id), is));
    
    let settingsStr = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    let settings = settingsStr ? JSON.parse(settingsStr) : { adminId: "admin", adminPassword: "admin" };
    batch.set(doc(db, 'settings', 'global'), settings);

    await batch.commit();
  },

  // Active Year Management
  getActiveYear: async (): Promise<FinancialYear> => {
    const docSnap = await getDoc(doc(db, 'activeYear', 'current'));
    return (docSnap.data()?.year as FinancialYear) || DEFAULT_FY;
  },
  setActiveYear: async (year: FinancialYear) => {
    await setDoc(doc(db, 'activeYear', 'current'), { year });
    window.dispatchEvent(new Event('fy-change'));
  },

  // Plants
  getPlants: async (subSystemId?: string): Promise<Plant[]> => {
    const querySnapshot = await getDocs(collection(db, 'plants'));
    const all = querySnapshot.docs.map(d => d.data() as Plant);
    
    if (!subSystemId) return all;
    return all.filter(p => !p.subSystemId || p.subSystemId === subSystemId);
  },
  savePlant: async (plant: Plant) => {
    const activeYear = await dbApi.getActiveYear();
    const id = plant.id || Math.random().toString(36).substr(2, 9);
    const finalPlant = { ...plant, id, financialYear: plant.financialYear || activeYear };
    await setDoc(doc(db, 'plants', id), finalPlant);
  },
  deletePlant: async (id: string) => {
    const plants = await dbApi.getPlants();
    const plant = plants.find(p => p.id === id);
    if (plant) {
      await dbApi.moveToBin('plant', plant);
      await deleteDoc(doc(db, 'plants', id));
    }
  },

  // Categories
  getCategories: async (): Promise<SystemCategory[]> => {
    const querySnapshot = await getDocs(collection(db, 'categories'));
    return querySnapshot.docs.map(d => d.data() as SystemCategory);
  },
  saveCategory: async (category: SystemCategory) => {
    const activeYear = await dbApi.getActiveYear();
    const id = category.id || Math.random().toString(36).substr(2, 9);
    await setDoc(doc(db, 'categories', id), {
      ...category,
      id,
      financialYear: category.financialYear || activeYear
    });
  },
  renameCategory: async (id: string, newName: string) => {
    const docRef = doc(db, 'categories', id);
    await updateDoc(docRef, { name: newName });
  },
  deleteCategory: async (id: string) => {
    const querySnapshot = await getDocs(collection(db, 'categories'));
    const cats = querySnapshot.docs.map(d => d.data() as SystemCategory);
    const cat = cats.find(c => c.id === id);
    if (cat) {
      await dbApi.moveToBin('category', cat);
      await deleteDoc(doc(db, 'categories', id));
    }
  },

  // Sub Systems
  getSubSystems: async (categoryId?: string): Promise<SubSystem[]> => {
    const querySnapshot = await getDocs(collection(db, 'subsystems'));
    const all = querySnapshot.docs.map(d => d.data() as SubSystem);
    return categoryId ? all.filter((s: SubSystem) => s.categoryId === categoryId) : all;
  },
  saveSubSystem: async (subSystem: SubSystem) => {
    const activeYear = await dbApi.getActiveYear();
    const id = subSystem.id || Math.random().toString(36).substr(2, 9);
    await setDoc(doc(db, 'subsystems', id), {
      ...subSystem,
      id,
      financialYear: subSystem.financialYear || activeYear
    });
  },
  renameSubSystem: async (id: string, newName: string) => {
    const docRef = doc(db, 'subsystems', id);
    await updateDoc(docRef, { name: newName });
  },
  deleteSubSystem: async (id: string) => {
    const querySnapshot = await getDocs(collection(db, 'subsystems'));
    const subs = querySnapshot.docs.map(d => d.data() as SubSystem);
    const sub = subs.find(s => s.id === id);
    if (sub) {
      await dbApi.moveToBin('subsystem', sub);
      await deleteDoc(doc(db, 'subsystems', id));
    }
  },

  // Test Records
  getTestRecords: async (): Promise<TestRecord[]> => {
    const querySnapshot = await getDocs(collection(db, 'testRecords'));
    return querySnapshot.docs.map(d => d.data() as TestRecord);
  },
  saveTestRecord: async (record: TestRecord) => {
    const activeYear = await dbApi.getActiveYear();
    const id = record.id || Math.random().toString(36).substr(2, 9);
    const finalRecord = { 
      ...record, 
      id,
      financialYear: record.financialYear || activeYear,
      updatedAt: new Date().toISOString() 
    };
    await setDoc(doc(db, 'testRecords', id), finalRecord);
  },
  deleteTestRecord: async (id: string) => {
    const querySnapshot = await getDocs(collection(db, 'testRecords'));
    const records = querySnapshot.docs.map(d => d.data() as TestRecord);
    const record = records.find(r => r.id === id);
    if (record) {
      await dbApi.moveToBin('testrecord', record);
      await deleteDoc(doc(db, 'testRecords', id));
    }
  },

  // Users
  getUsers: async (): Promise<User[]> => {
    const querySnapshot = await getDocs(collection(db, 'users'));
    return querySnapshot.docs.map(d => d.data() as User);
  },
  saveUser: async (user: User) => {
    await setDoc(doc(db, 'users', user.id), user);
  },
  deleteUser: async (id: string) => {
    await deleteDoc(doc(db, 'users', id));
  },

  // Settings
  getSettings: async (): Promise<AppSettings> => {
    const docSnap = await getDoc(doc(db, 'settings', 'global'));
    return (docSnap.data() as AppSettings) || { adminId: 'admin' };
  },
  saveSettings: async (settings: AppSettings) => {
    await setDoc(doc(db, 'settings', 'global'), settings);
  },

  // Isolation Reports
  getIsolationReports: async (): Promise<IsolationReport[]> => {
    const activeYear = await dbApi.getActiveYear();
    const q = query(collection(db, 'isolationReports'), where('financialYear', '==', activeYear));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => d.data() as IsolationReport);
  },
  saveIsolationReport: async (report: IsolationReport) => {
    const activeYear = await dbApi.getActiveYear();
    const id = report.id || Math.random().toString(36).substr(2, 9);
    const finalReport = {
      ...report,
      id,
      financialYear: report.financialYear || activeYear,
      createdAt: report.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'isolationReports', id), finalReport);
  },
  deleteIsolationReport: async (id: string) => {
    await deleteDoc(doc(db, 'isolationReports', id));
  },

  // Equipment Issues
  getEquipmentIssues: async (): Promise<EquipmentIssue[]> => {
    const activeYear = await dbApi.getActiveYear();
    const q = query(collection(db, 'equipmentIssues'), where('financialYear', '==', activeYear));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => d.data() as EquipmentIssue);
  },
  saveEquipmentIssue: async (issue: EquipmentIssue) => {
    const activeYear = await dbApi.getActiveYear();
    const id = issue.id || Math.random().toString(36).substr(2, 9);
    const finalIssue = {
      ...issue,
      id,
      financialYear: issue.financialYear || activeYear,
      createdAt: issue.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'equipmentIssues', id), finalIssue);
  },
  deleteEquipmentIssue: async (id: string) => {
    await deleteDoc(doc(db, 'equipmentIssues', id));
  },

  // Recycle Bin
  getRecycleBin: async (): Promise<RecycledItem[]> => {
    const querySnapshot = await getDocs(collection(db, 'recycleBin'));
    return querySnapshot.docs.map(d => d.data() as RecycledItem);
  },
  moveToBin: async (type: 'category' | 'subsystem' | 'plant' | 'testrecord', data: any) => {
    const id = Math.random().toString(36).substr(2, 9);
    await setDoc(doc(db, 'recycleBin', id), {
      id,
      type,
      data,
      deletedAt: new Date().toISOString()
    });
  },
  restoreFromBin: async (id: string) => {
    const docRef = doc(db, 'recycleBin', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const item = docSnap.data() as RecycledItem;
      const collectionName = 
        item.type === 'category' ? 'categories' :
        item.type === 'subsystem' ? 'subsystems' :
        item.type === 'plant' ? 'plants' : 'testRecords';
      
      await setDoc(doc(db, collectionName, item.data.id), item.data);
      await deleteDoc(docRef);
    }
  },
  permanentlyDeleteFromBin: async (id: string) => {
    await deleteDoc(doc(db, 'recycleBin', id));
  },

  // Historical Reports
  getHistoricalReports: async (): Promise<any[]> => {
    const querySnapshot = await getDocs(collection(db, 'historicalReports'));
    return querySnapshot.docs.map(d => d.data());
  },
  saveHistoricalReport: async (report: any) => {
    const id = report.id || Math.random().toString(36).substr(2, 9);
    await setDoc(doc(db, 'historicalReports', id), { ...report, id });
  },
  deleteHistoricalReport: async (id: string) => {
    await deleteDoc(doc(db, 'historicalReports', id));
  },

  // Plant Equipment
  getPlantEquipment: async (plantId: string): Promise<any[]> => {
    const q = query(collection(db, 'plantEquipment'), where('plantId', '==', plantId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => d.data());
  },
  savePlantEquipment: async (equipment: any) => {
    const id = equipment.id || Math.random().toString(36).substr(2, 9);
    await setDoc(doc(db, 'plantEquipment', id), { ...equipment, id });
  },
  deletePlantEquipment: async (id: string) => {
    await deleteDoc(doc(db, 'plantEquipment', id));
  },

  startNewCycle: async (nextYear: FinancialYear) => {
    const activeYear = await dbApi.getActiveYear();
    const batch = writeBatch(db);
    
    // 1. Clone Categories
    const categoriesSnapshot = await getDocs(collection(db, 'categories'));
    const oldCats = categoriesSnapshot.docs.map(d => d.data() as SystemCategory).filter(c => c.financialYear === activeYear);
    const catMap = new Map();
    
    oldCats.forEach((c: any) => {
      const newId = Math.random().toString(36).substr(2, 9);
      catMap.set(c.id, newId);
      batch.set(doc(db, 'categories', newId), { ...c, id: newId, financialYear: nextYear });
    });

    // 2. Clone SubSystems
    const subsSnapshot = await getDocs(collection(db, 'subsystems'));
    const oldSubs = subsSnapshot.docs.map(d => d.data() as SubSystem).filter(s => s.financialYear === activeYear);
    const subMap = new Map();
    
    oldSubs.forEach((s: any) => {
      const newId = Math.random().toString(36).substr(2, 9);
      subMap.set(s.id, newId);
      batch.set(doc(db, 'subsystems', newId), { 
        ...s, 
        id: newId, 
        categoryId: catMap.get(s.categoryId) || s.categoryId, 
        financialYear: nextYear 
      });
    });

    // 3. Clone Plants
    const plantsSnapshot = await getDocs(collection(db, 'plants'));
    const oldPlants = plantsSnapshot.docs.map(d => d.data() as Plant).filter(p => p.financialYear === activeYear);
    const plantMap = new Map();
    
    oldPlants.forEach((p: any) => {
      const newId = Math.random().toString(36).substr(2, 9);
      plantMap.set(p.id, newId);
      batch.set(doc(db, 'plants', newId), { 
        ...p, 
        id: newId, 
        subSystemId: subMap.get(p.subSystemId) || p.subSystemId, 
        financialYear: nextYear 
      });
    });

    // 4. Clone Test Records
    const recordsSnapshot = await getDocs(collection(db, 'testRecords'));
    const oldRecords = recordsSnapshot.docs.map(d => d.data() as TestRecord).filter(r => r.financialYear === activeYear);
    
    oldRecords.forEach(r => {
      const newId = Math.random().toString(36).substr(2, 9);
      batch.set(doc(db, 'testRecords', newId), {
        ...r,
        id: newId,
        status: 'Pending' as const,
        financialYear: nextYear,
        categoryId: catMap.get(r.categoryId) || r.categoryId,
        subSystemId: subMap.get(r.subSystemId) || r.subSystemId,
        plantId: plantMap.get(r.plantId) || r.plantId,
        dateOfTesting: '',
        deficiency: '',
        actionTaken: '',
        healthCondition: 'Satisfactory' as const,
        attachmentUrl: '',
        updatedAt: new Date().toISOString()
      });
    });
    
    await batch.commit();
    await dbApi.setActiveYear(nextYear);
  }
};
