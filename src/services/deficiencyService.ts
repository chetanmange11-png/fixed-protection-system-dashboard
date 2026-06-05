import { createDocument, updateDocument } from './firestoreService';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { COLLECTIONS } from '../constants/collectionConstants';

export interface DeficiencyRecord {
  id?: string;
  testRecordId: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Closed';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  remarks?: string;
}

export const createDeficiency = async (data: Omit<DeficiencyRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
  const timestamp = new Date().toISOString();
  const deficiencyData = {
    ...data,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  return await createDocument('DEFICIENCIES', deficiencyData);
};

export const updateDeficiencyStatus = async (
  deficiencyId: string, 
  status: DeficiencyRecord['status'], 
  remarks?: string
) => {
  const updateData: Partial<DeficiencyRecord> = {
    status,
    updatedAt: new Date().toISOString(),
  };
  
  if (remarks) {
    updateData.remarks = remarks;
  }

  if (status === 'Closed') {
    updateData.resolvedAt = new Date().toISOString();
  }

  return await updateDocument('DEFICIENCIES', deficiencyId, updateData);
};

export const updateDeficiencySeverity = async (
  deficiencyId: string, 
  severity: DeficiencyRecord['severity']
) => {
  return await updateDocument('DEFICIENCIES', deficiencyId, {
    severity,
    updatedAt: new Date().toISOString(),
  });
};

export const getDeficienciesByTestRecord = async (testRecordId: string): Promise<DeficiencyRecord[]> => {
  const q = query(
    collection(db, COLLECTIONS.DEFICIENCIES),
    where('testRecordId', '==', testRecordId)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DeficiencyRecord));
};
