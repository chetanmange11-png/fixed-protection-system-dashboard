import { create } from 'zustand';
import { collection, onSnapshot, query, where, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../constants/collectionConstants';

const normalizeData = (obj: any, seen = new WeakSet()): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (typeof obj.toDate === 'function') return obj.toDate().toISOString();
  if (obj.firestore) return obj.id;
  
  if (seen.has(obj)) return undefined;
  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj.map(item => normalizeData(item, seen));
  }

  const result: any = {};
  for (const key of Object.keys(obj)) {
    result[key] = normalizeData(obj[key], seen);
  }
  return result;
};

const safeParseDoc = (doc: any) => {
  const data = doc.data();
  const normalized = normalizeData(data);
  return { id: doc.id, ...normalized };
};

interface GlobalState {
  categories: any[];
  subSystems: any[];
  plants: any[];
  masterPlants: import('../types').MasterPlant[];
  records: any[];
  loading: boolean;
  showAnalysis: boolean;
  theme: 'modern' | 'traditional';
  activeCycle: string;
  setTheme: (theme: 'modern' | 'traditional') => void;
  setShowAnalysis: (val: boolean) => void;
  setActiveCycle: (cycle: string) => void;
  initSync: () => () => void;
  initGlobal: () => () => void;
  currentUser: any | null;
  setCurrentUser: (user: any) => void;
}

let globalUnsubActiveYear: (() => void) | null = null;
let globalUnsubUser: (() => void) | null = null;

export const useGlobalStore = create<GlobalState>((set, get) => {
  let currentCycleSync = '';
  let unsubscribes: (() => void)[] = [];

  const storedTheme = (localStorage.getItem('appTheme') as 'modern' | 'traditional') || 'modern';
  
  // Get initial user from localStorage
  const savedUserStr = localStorage.getItem('fps_current_user');
  const initialUser = savedUserStr ? JSON.parse(savedUserStr) : null;

  return {
    categories: [],
    subSystems: [],
    plants: [],
    masterPlants: [],
    records: [],
    loading: true,
    showAnalysis: false,
    theme: storedTheme,
    activeCycle: '2026-27',
    currentUser: initialUser,
    setCurrentUser: (user: any) => set({ currentUser: user }),
    setTheme: (theme: 'modern' | 'traditional') => {
      localStorage.setItem('appTheme', theme);
      set({ theme });
    },
    setShowAnalysis: (val: boolean) => set({ showAnalysis: val }),
    setActiveCycle: (cycle: string) => {
      set({ activeCycle: cycle });
      get().initSync();
    },

    initSync: () => {
      const activeCycle = get().activeCycle;
      if (currentCycleSync === activeCycle) return () => {};
      
      unsubscribes.forEach(unsub => unsub());
      unsubscribes = [];
      
      currentCycleSync = activeCycle;
      set({ loading: true });

      const filterByYear = (d: any) => !d.financialYear || d.financialYear === activeCycle;

      const unsubCat = onSnapshot(collection(db, COLLECTIONS.EQUIPMENT_TYPES), (snap) => {
        set({ categories: snap.docs.map(safeParseDoc).filter(filterByYear) });
      }, (error) => console.error(error));

      const unsubSub = onSnapshot(collection(db, 'subsystems'), (snap) => {
        set({ subSystems: snap.docs.map(safeParseDoc).filter(filterByYear) });
      }, (error) => console.error(error));

      const unsubPlants = onSnapshot(collection(db, COLLECTIONS.PLANTS), (snap) => {
        set({ plants: snap.docs.map(safeParseDoc).filter(filterByYear) });
      }, (error) => console.error(error));
      
      const unsubMasterPlants = onSnapshot(collection(db, 'masterPlants'), (snap) => {
        // Master plants are solid, NOT filtered by year
        set({ masterPlants: snap.docs.map(safeParseDoc) as any[] });
      }, (error) => console.error(error));

      const unsubRec = onSnapshot(collection(db, COLLECTIONS.TEST_RECORDS), (snap) => {
        set({ records: snap.docs.map(safeParseDoc).filter(filterByYear), loading: false });
      }, (error) => console.error(error));

      unsubscribes = [unsubCat, unsubSub, unsubPlants, unsubMasterPlants, unsubRec];

      return () => {
        unsubscribes.forEach(unsub => unsub());
        unsubscribes = [];
        currentCycleSync = '';
      };
    },
    
    initGlobal: () => {
      if (globalUnsubActiveYear) return () => {};
      let firstLoad = true;
      globalUnsubActiveYear = onSnapshot(doc(db, 'activeYear', 'current'), (docSnap) => {
        if (docSnap.exists()) {
          const year = docSnap.data().year;
          // Only force the view state to the active year on the very first load 
          // OR if someone explicitly pushed an update to the DB (real-time sync).
          // This prevents fighting with the user's manual dropdown selections for viewing history.
          if (year && (firstLoad || get().activeCycle !== year)) {
            set({ activeCycle: year });
            get().initSync();
          }
        }
        firstLoad = false;
      }, (error) => console.error(error));

      // Sync active session user details if logged in
      const currentUserId = get().currentUser?.id;
      if (currentUserId && currentUserId !== 'admin-id') {
         globalUnsubUser = onSnapshot(doc(db, 'users', currentUserId), (docSnap) => {
             if (docSnap.exists()) {
                 const updatedUser = { id: docSnap.id, ...docSnap.data() };
                 set({ currentUser: updatedUser });
                 // Update local storage so page refresh retains details
                 localStorage.setItem('fps_current_user', JSON.stringify(updatedUser));
             }
         });
      }

      return () => {
        if (globalUnsubActiveYear) {
          globalUnsubActiveYear();
          globalUnsubActiveYear = null;
        }
        if (globalUnsubUser) {
           globalUnsubUser();
           globalUnsubUser = null;
        }
      };
    }
  };
});
