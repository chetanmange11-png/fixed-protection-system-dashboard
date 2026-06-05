import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, QueryConstraint, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COLLECTIONS } from '../constants/collectionConstants';
import { SystemCategory, SubSystem, Plant, TestRecord } from '../types';

export function useLiveSync<T = any>(
  collectionName?: keyof typeof COLLECTIONS | string, 
  queryConstraints?: QueryConstraint[] | null
) {
  // Generic returns
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // App-specific combined returns
  const [categories, setCategories] = useState<any[]>([]);
  const [subSystems, setSubSystems] = useState<any[]>([]);
  const [plants, setPlants] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [activeYear, setActiveYear] = useState<string>('2024-25');

  useEffect(() => {
    // If collectionName is provided, we use the specific generic sync behavior
    if (collectionName) {
      if (queryConstraints === null) {
        setData([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      // fallback to raw collectionName if not in COLLECTIONS
      const resolvedName = COLLECTIONS[collectionName as keyof typeof COLLECTIONS] || collectionName;
      const q = query(collection(db, resolvedName), ...(queryConstraints || []));
      
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const result: T[] = [];
          snapshot.forEach((doc) => {
            result.push({ id: doc.id, ...doc.data() } as unknown as T);
          });
          setData(result);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error(`LiveSync Error [${collectionName}]:`, err.message);
          setError(new Error(err.message || 'Unknown error'));
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } 
    
    // Otherwise, we use the original behavior: fetch the main dashboard data streams
    setLoading(true);
    
    // Fetch activeYear directly from localStorage or default
    const storedYear = localStorage.getItem('fy') || '2024-25'; // Try to match other apps, or just stick to 2024-25
    setActiveYear(storedYear);

    const unsubCategories = onSnapshot(collection(db, 'categories'), (snap) => {
      setCategories(snap.docs.map(d => ({id: d.id, ...d.data()})));
    }, err => console.error(err));

    const unsubSub = onSnapshot(collection(db, 'subsystems'), (snap) => {
      setSubSystems(snap.docs.map(d => ({id: d.id, ...d.data()})));
    }, err => console.error(err));

    const unsubPlants = onSnapshot(collection(db, 'plants'), (snap) => {
      setPlants(snap.docs.map(d => ({id: d.id, ...d.data()})));
    }, err => console.error(err));

    const unsubRecords = onSnapshot(collection(db, 'testRecords'), (snap) => {
      setRecords(snap.docs.map(d => ({id: d.id, ...d.data()})));
    }, err => console.error(err));

    setLoading(false);

    return () => {
      unsubCategories();
      unsubSub();
      unsubPlants();
      unsubRecords();
    };
  }, [collectionName, queryConstraints]);

  return { 
    data, loading, error,
    categories, subSystems, plants, records, activeYear
  };
}
